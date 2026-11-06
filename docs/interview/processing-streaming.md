# 처리·스트리밍 예상질문

Spark, Kafka, RabbitMQ, Redis 질문입니다. 개념 정리는 [Spark](../stack/processing/spark.md), [Kafka](../stack/processing/kafka.md), [RabbitMQ · Redis](../stack/messaging/rabbitmq-redis.md) 노트에 있습니다.

## Spark {#spark}

### Spark의 transformation과 action은 무엇이고, lazy evaluation을 하는 이유는요? {#spark-lazy-evaluation}

??? answer "답 보기"
    transformation은 `filter`, `select`, `join`처럼 새 DataFrame을 만드는 연산이고 바로 실행되지 않습니다. action은 `count`, `write`, `collect`처럼 결과를 요구하는 연산이고, 이때 실제 계산이 시작됩니다.

    미루는 이유는 최적화입니다. action이 올 때까지 연산을 모아 두면 Catalyst가 전체 계획을 보고 필요한 컬럼만 읽거나(column pruning), 필터를 소스 쪽으로 내리는(predicate pushdown) 식으로 한 번에 고칩니다. 그래서 코드상 순서와 실제 실행 순서가 다를 수 있습니다.

    반대로 action을 여러 번 부르면 그때마다 처음부터 다시 계산하므로, 중간 결과를 여러 번 재사용할 때만 `cache()`를 씁니다.

    꼬리: Job, Stage, Task는 각각 어떤 기준으로 나뉘나요?

### shuffle이 무엇이고 왜 비싼가요? 줄이는 방법은요? {#spark-shuffle}

??? answer "답 보기"
    shuffle은 `groupBy`, `join`, 윈도우 함수처럼 같은 키의 데이터를 한곳에 모으려고 노드 사이로 데이터를 다시 나누는 단계입니다. 디스크에 shuffle 파일을 쓰고 네트워크로 주고받기 때문에 가장 비싼 연산이고, Stage가 나뉘는 경계가 됩니다.

    줄이는 방법은 먼저 필터와 컬럼 선택을 앞에 두어 shuffle되는 양 자체를 줄이는 것이고, 한쪽이 작은 테이블이면 broadcast join으로 큰 쪽을 움직이지 않게 합니다. shuffle 이후 partition 수(`spark.sql.shuffle.partitions`, 기본 200)도 데이터 크기에 맞춥니다. Spark 3 이상은 AQE가 작은 partition을 실행 중에 합쳐 줍니다.

    꼬리: narrow dependency와 wide dependency의 차이는요?

### Spark Job이 OOM으로 죽으면 어떻게 접근하나요? {#spark-oom}

??? answer "답 보기"
    Driver가 죽었는지 Executor가 죽었는지부터 나눕니다. Driver OOM은 대부분 `collect()`나 큰 결과를 `toPandas()`로 가져온 경우라서, 결과를 Driver로 모으지 말고 파일로 쓰게 바꿉니다.

    Executor OOM이면 Spark UI에서 특정 task만 크고 오래 걸리는지(data skew), 불필요한 `.cache()`가 메모리를 잡고 있는지, partition 하나가 너무 큰지 봅니다. partition 수를 늘리거나 skew 키를 쪼개고, 한 번만 쓰는 DataFrame의 캐시를 지웁니다. 개인 Spark 배치 프로젝트에서도 불필요한 `count()`와 `.cache()`를 빼서 OOM을 피했습니다.

    메모리 설정을 올리는 것은 원인을 확인한 뒤 마지막 수단으로 둡니다.

    꼬리: data skew는 어떻게 확인하고 어떻게 푸나요?

### `repartition`과 `coalesce`는 어떻게 다른가요? {#spark-repartition-coalesce}

??? answer "답 보기"
    `repartition(n)`은 shuffle을 일으켜 데이터를 n개로 고르게 다시 나누고, `coalesce(n)`은 shuffle 없이 기존 partition을 합쳐 개수만 줄입니다.

    병렬도를 늘리거나 키 기준으로 고르게 나눠야 하면 `repartition`, 쓰기 직전에 출력 파일 수만 줄이고 싶으면 `coalesce`를 씁니다. 다만 `coalesce`로 너무 많이 줄이면 앞 단계의 병렬도까지 같이 떨어질 수 있습니다.

    꼬리: 작은 파일이 너무 많이 생기는 문제는 왜 생기고 어떻게 막나요?

### Spark 배치를 다시 돌려도 결과가 중복되지 않게 하려면요? {#spark-idempotent-rerun}

??? answer "답 보기"
    날짜 파티션 단위로 덮어쓰게 만듭니다. 다만 `mode("overwrite")`는 기본적으로 출력 경로 전체를 지우므로 `spark.sql.sources.partitionOverwriteMode=dynamic`을 켜서 이번에 쓰는 파티션만 바꿉니다.

    개인 Spark 배치 프로젝트에서는 날짜 파티션마다 `_SUCCESS` 마커를 확인해 이미 끝난 날짜는 건너뛰고, Dynamic Partition Overwrite로 해당 파티션만 다시 썼습니다. 그래서 중간에 실패해도 재실행 시 완료분을 다시 처리하지 않았습니다.

    꼬리: 출력 경로가 Hive 테이블이면 재실행 후 무엇을 더 해야 하나요?

### 데이터가 작을 때도 Spark를 쓰나요? PySpark UDF는요? {#spark-when-not-to-use}

??? answer "답 보기"
    한 머신에서 충분히 처리되는 수 GB 이하라면 보통 Pandas, DuckDB, DB 안의 SQL이 더 단순하고 빠릅니다. Spark는 클러스터 기동과 스케줄링 오버헤드가 있어서 작은 데이터에서는 그 시간이 처리 시간보다 큽니다.

    PySpark에서는 내장 함수(`pyspark.sql.functions`)를 먼저 씁니다. Python UDF는 JVM과 Python 프로세스 사이에서 데이터를 직렬화해 주고받아 느립니다. 내장 함수로 안 될 때만 UDF를 쓰고, 써야 하면 Pandas UDF로 완화합니다.

    꼬리: PySpark와 Scala Spark의 성능 차이는 어디서 나나요?

## Kafka {#kafka}

### Kafka와 RabbitMQ는 어떻게 다르고, 각각 언제 쓰나요? {#kafka-vs-rabbitmq}

??? answer "답 보기"
    Kafka는 메시지를 보존하는 분산 로그이고, RabbitMQ는 처리되면 지우는 메시지 브로커입니다. 데이터를 흘려 보내고 여러 시스템이 각자 다시 읽어야 하면 Kafka, 일을 나눠 맡기고 끝나면 지워도 되면 RabbitMQ입니다.

    Kafka는 consumer가 offset을 관리하며 pull하고, 보존 기간 안이면 offset을 되돌려 재처리할 수 있습니다. RabbitMQ는 broker가 push하고 ack되면 메시지가 사라지는 대신, exchange로 라우팅이 유연하고 재전달·DLX 같은 작업 단위 제어가 풍부합니다. 로그 수집, CDC, 여러 곳으로 데이터 분배는 Kafka, 요청별 비동기 작업 큐는 RabbitMQ가 맞습니다.

    꼬리: Kafka로 작업 큐를 만들면 무엇이 불편한가요?

### Kafka에서 순서는 어디까지 보장되나요? {#kafka-ordering}

??? answer "답 보기"
    partition 안에서만 보장됩니다. topic 전체 순서는 보장되지 않습니다. 그래서 순서가 중요한 단위(예: 사용자 한 명의 이벤트)를 message key로 정하면, 같은 key는 같은 partition으로 가서 그 안에서는 순서가 지켜집니다.

    전체 순서가 꼭 필요하면 partition을 1개로 둬야 하는데, 그러면 병렬 소비를 잃습니다. 또 partition 수를 나중에 늘리면 key → partition 배정이 바뀌어 같은 key의 순서가 깨질 수 있어서, 처음에 여유 있게 잡습니다.

    꼬리: partition 수는 어떤 기준으로 정하나요?

### at-least-once와 exactly-once는 무엇이고, 실무에서는 무엇을 쓰나요? {#kafka-delivery-semantics}

??? answer "답 보기"
    실무 기본은 at-least-once에 멱등 처리를 붙이는 것입니다. 처리를 끝낸 뒤 offset을 commit하면 메시지를 잃지는 않지만, commit 직전에 죽으면 같은 메시지를 다시 받습니다. 그 중복은 소비자 쪽에서 고유 키 upsert 같은 멱등 적재로 흡수합니다.

    at-most-once는 먼저 commit하고 처리해 유실이 생길 수 있습니다. exactly-once는 idempotent producer와 transaction으로 Kafka 안의 읽기-처리-쓰기를 한 번으로 만들지만, 외부 DB까지 포함하면 결국 멱등 적재가 필요합니다. auto commit을 켜 두면 처리 전에 commit되어 유실이 생길 수 있다는 점도 함께 말합니다.

    꼬리: 소비자를 멱등하게 만드는 구체적인 방법은요?

### consumer group은 어떻게 동작하나요? consumer를 늘리면 무조건 빨라지나요? {#kafka-consumer-group}

??? answer "답 보기"
    같은 group 안에서는 partition 하나가 consumer 하나에만 배정되어 일을 나눠 갖습니다. 그래서 consumer를 partition 수까지는 늘리면 빨라지지만, 그보다 많으면 남는 consumer는 놀게 됩니다. partition 수가 병렬 소비의 상한입니다.

    group이 다르면 offset을 따로 관리하므로 같은 데이터를 각자 처음부터 읽을 수 있습니다. 예를 들어 DW 적재 group과 검색 색인 group이 같은 topic을 독립적으로 소비합니다.

    꼬리: rebalance는 언제 일어나고 그동안 무슨 일이 생기나요?

### consumer lag이 계속 늘어납니다. 어떻게 보시겠어요? {#kafka-consumer-lag}

??? answer "답 보기"
    먼저 lag이 특정 partition에만 쌓이는지, 전체에 쌓이는지 봅니다. 특정 partition만이면 key가 한쪽에 몰린 skew이고, 전체면 소비 처리량이 생산 속도를 못 따라가는 것입니다.

    처리 쪽이 느리면 consumer를 partition 수까지 늘리거나, 처리 중 외부 호출을 배치로 묶습니다. 처리 시간이 `max.poll.interval.ms`를 넘어 consumer가 죽은 것으로 간주되고 rebalance가 반복되는 경우도 흔해서, 로그에 rebalance가 반복되는지 확인하고 `max.poll.records`를 줄입니다. lag은 평소에 모니터링 지표로 걸어 둬야 늦게 발견하지 않습니다.

    꼬리: partition을 늘리는 것으로 해결할 때 주의할 점은요?

### Kafka를 직접 운영해 보셨나요? {#kafka-experience}

??? answer "답 보기"
    클러스터를 설계한 경험은 없고, 운영 중인 파이프라인을 점검하고 장애를 조치한 경험이 있습니다. 더존비즈온의 데이터 수집 · 감성 분석 대시보드 운영 프로젝트에서 Airflow·Spark·Kafka·ES로 이어진 일 배치 파이프라인을 점검하고, 장애 구간 코드를 리팩토링해 운영 안정성을 유지했습니다.

    그래서 Kafka에 대해서는 offset과 consumer group이 어떻게 동작하는지, 소비 지연이나 중복이 생기면 어디부터 보는지를 중심으로 이해하고 있고, broker 설계나 튜닝은 공부로 보완하고 있다고 말합니다.

    !!! note "채울 것"
        그 프로젝트에서 실제로 겪은 장애 한 건(증상 → 원인 → 조치)을 한두 문장으로 적어 둡니다.

## RabbitMQ {#rabbitmq}

### 요청을 API에서 바로 처리하지 않고 큐에 넣는 이유는 무엇인가요? {#rabbitmq-why-queue}

??? answer "답 보기"
    오래 걸리는 작업의 시간을 API 응답 시간과 분리하기 위해서입니다. 스크래핑, 파일 변환, LLM 호출처럼 오래 걸리는 일은 API가 작업을 큐에 넣고 바로 "접수됨"을 돌려주고, worker가 비동기로 처리합니다.

    요청이 몰려도 큐가 버퍼가 되어 흡수하고, worker 수로 처리 속도를 조절할 수 있습니다. worker가 죽어도 ack되지 않은 메시지는 다른 worker에게 다시 갑니다. 더존비즈온의 데이터 수집 API · ETL 파이프라인에서 스크래핑 모듈을 API로 제공하면서 수집 요청을 RabbitMQ 비동기 요청과 Redis 캐싱으로 구조화했습니다.

    대신 사용자는 결과를 나중에 받아야 하므로 작업 id로 상태를 조회하는 흐름이 필요합니다.

    꼬리: 작업 결과를 사용자에게 어떻게 돌려주나요?

### ack는 언제 보내야 하나요? auto ack를 켜면 어떻게 되나요? {#rabbitmq-ack}

??? answer "답 보기"
    처리가 끝난 뒤에 수동으로 보냅니다. auto ack를 켜면 메시지를 받는 순간 큐에서 지워지기 때문에, worker가 처리 도중 죽으면 그 작업은 사라집니다.

    수동 ack에서는 처리 중 죽으면 메시지가 다시 큐로 돌아가 다른 worker가 받습니다. 그래서 같은 메시지를 두 번 받을 수 있고, worker 처리를 멱등하게 짜야 합니다. 예를 들어 결과를 같은 키로 덮어쓰는 식입니다.

    꼬리: prefetch 값은 어떻게 정하나요?

### exchange 종류(direct, topic, fanout)는 어떻게 다른가요? {#rabbitmq-exchange-types}

??? answer "답 보기"
    producer는 큐가 아니라 exchange로 보내고, exchange가 규칙에 따라 큐를 고릅니다. direct는 routing key가 정확히 일치하는 큐로, topic은 `log.*.error` 같은 패턴으로, fanout은 묶인 모든 큐로 복사해 보냅니다. headers는 헤더 값으로 판단합니다.

    작업 종류별로 큐를 나누면 direct, 여러 조건으로 골라 받아야 하면 topic, 같은 이벤트를 여러 처리기가 각자 받아야 하면 fanout을 씁니다.

### 계속 실패하는 메시지가 큐를 막고 있습니다. 어떻게 하나요? {#rabbitmq-dlx}

??? answer "답 보기"
    재시도 횟수를 두고, 넘으면 DLX(Dead Letter Exchange)로 보내 별도 큐에 모읍니다. nack 후 requeue를 무한 반복하면 같은 실패 메시지가 계속 앞에 와서 정상 메시지까지 막힙니다.

    DLX 큐에 모인 메시지는 원인을 분석해 코드를 고친 뒤 다시 넣거나 폐기합니다. 재시도 사이에 지연을 두고 싶으면 TTL이 있는 대기 큐를 거쳐 원래 큐로 돌아오게 만들기도 합니다.

    꼬리: 실패 원인이 일시 오류인지 영구 오류인지 어떻게 나누나요?

### broker를 재시작했더니 메시지가 사라졌습니다. 원인은요? {#rabbitmq-durable}

??? answer "답 보기"
    큐와 메시지 둘 다 영속 설정이 되어 있어야 남습니다. 큐를 durable로 선언하고, 메시지도 persistent로 보내야 합니다. 큐만 durable이고 메시지가 persistent가 아니면 큐는 남아도 메시지는 사라집니다.

    여기에 publisher confirm까지 쓰면 broker가 메시지를 실제로 받았는지 producer가 확인할 수 있습니다. 다만 영속성은 디스크 쓰기 비용이 있어 처리량과 맞바꾸는 선택입니다.

## Redis {#redis}

### 캐시 패턴 cache-aside와 write-through는 어떻게 다른가요? {#redis-cache-aside}

??? answer "답 보기"
    cache-aside는 앱이 캐시를 먼저 보고, 없으면 원천에서 읽어 캐시에 넣는 방식입니다. 실제로 요청된 것만 캐시에 들어가고 쓰기 비용이 낮지만, 첫 요청은 느리고 TTL 동안 오래된 값이 보일 수 있습니다. write-through는 쓸 때 캐시와 원천에 함께 써서 항상 최신이지만, 안 읽히는 데이터까지 캐시에 들어가고 쓰기 비용이 높습니다.

    읽기가 많고 약간 늦은 일관성이 괜찮으면 cache-aside, 쓴 직후 최신값이 중요하면 write-through입니다. 더존비즈온의 데이터 수집 API · ETL 파이프라인에서는 수집 요청 처리에 Redis 캐싱을 붙였는데, 수집 결과처럼 같은 요청이 반복되고 약간 늦어도 되는 데이터에는 cache-aside가 맞습니다.

    꼬리: 원천 데이터가 바뀌면 캐시는 어떻게 무효화하나요?

### TTL은 왜 필요하고, cache stampede는 어떻게 막나요? {#redis-ttl-stampede}

??? answer "답 보기"
    TTL이 없으면 오래된 값이 계속 남고 메모리가 찹니다. 그래서 캐시에는 기본적으로 만료 시간을 줍니다.

    stampede는 많은 key가 같은 시각에 만료되거나 인기 key 하나가 만료될 때 요청이 한꺼번에 원천으로 몰리는 현상입니다. TTL에 무작위 값을 더해 만료 시각을 흩거나, 락을 걸어 한 요청만 원천을 조회하고 나머지는 잠시 기다렸다가 캐시를 읽게 합니다.

### Redis 메모리가 가득 차면 어떻게 되나요? 재시작하면 데이터는요? {#redis-eviction-persistence}

??? answer "답 보기"
    eviction policy에 따라 다릅니다. `allkeys-lru` 같은 정책이면 오래 안 쓴 key부터 지우고, 정책이 `noeviction`이면 쓰기가 오류로 거절됩니다. 캐시 용도면 LRU 계열을 씁니다.

    재시작 시 데이터는 persistence 설정에 달려 있습니다. RDB는 주기적 스냅샷, AOF는 쓰기 명령 로그이고, 둘 다 꺼 두면 재시작하면 사라집니다. 캐시라면 사라져도 원천에서 다시 채우면 되지만, 원본 저장소처럼 쓰면 안 됩니다.

    꼬리: RDB와 AOF의 장단점은요?

### Redis를 작업 큐로 써도 되나요? {#redis-as-queue}

??? answer "답 보기"
    가볍고 유실이 괜찮은 작업이면 됩니다. List의 `LPUSH`/`BRPOP`으로 간단한 큐가 되지만 ack, 재전달, DLX가 없어서 worker가 꺼낸 뒤 죽으면 작업이 사라지기 쉽습니다.

    작업 유실이 문제 되면 RabbitMQ를 쓰고, Redis를 고집해야 하면 consumer group이 있는 Stream을 씁니다. 결국 "작업을 잃으면 안 되는가"가 기준입니다.

### 운영 중인 Redis가 갑자기 몇 초씩 멈춥니다. 무엇을 의심하나요? {#redis-blocking-command}

??? answer "답 보기"
    무거운 명령 하나를 먼저 의심합니다. Redis는 기본적으로 명령을 단일 스레드로 처리해서 `KEYS *`나 아주 큰 컬렉션 전체 조회 같은 명령 하나가 실행되는 동안 다른 요청이 모두 기다립니다.

    slowlog로 느린 명령을 찾고, `KEYS` 대신 `SCAN`으로 나눠 조회하게 바꿉니다. 큰 key는 쪼개서 저장합니다. 그 밖에 RDB 스냅샷 시점의 fork 지연이나 메모리 부족에 따른 swap도 확인합니다.
