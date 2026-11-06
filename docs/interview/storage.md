# 저장소 예상질문

PostgreSQL, MongoDB, Elasticsearch, S3 · Hive · Parquet 질문입니다. 개념 정리는 [PostgreSQL](../stack/storage/postgresql.md), [MongoDB](../stack/storage/mongodb.md), [Elasticsearch](../stack/storage/elasticsearch.md), [S3 · Hive · Parquet](../stack/storage/s3-hive-parquet.md) 노트에 있습니다.

## PostgreSQL {#postgresql}

### 재실행해도 중복이 생기지 않게 적재하려면 PostgreSQL에서 어떻게 하나요? {#pg-upsert}

??? answer "답 보기"
    `INSERT ... ON CONFLICT (키) DO UPDATE` 또는 `DO NOTHING`으로 upsert합니다. 있으면 갱신하고 없으면 삽입하므로 같은 배치를 다시 돌려도 결과가 같습니다. 날짜 단위 fact처럼 구간이 분명하면 트랜잭션 안에서 해당 구간을 지우고 다시 넣는 delete-insert도 씁니다.

    주의할 점은 `ON CONFLICT`의 대상 컬럼에 UNIQUE 제약이나 인덱스가 있어야 동작한다는 것입니다. 개인 프로젝트 User Behavior Data Warehouse에서는 `dim_product`를 upsert로, Fact는 event_id 기준 중복 방지로 적재해 DAG 재실행에도 행이 늘지 않게 했습니다.

    꼬리: upsert만으로는 소스에서 삭제된 행이 어떻게 되나요?

### 인덱스를 만들었는데 쿼리가 여전히 느립니다. 어떻게 확인하나요? {#pg-index-not-used}

??? answer "답 보기"
    `EXPLAIN ANALYZE`로 실제 실행 계획을 보고 인덱스를 타는지(Index Scan)와 각 단계의 시간·행 수를 확인합니다. 예상 행 수와 실제 행 수가 크게 다르면 통계가 오래된 것이라 `ANALYZE`를 돌립니다.

    인덱스를 안 타는 흔한 이유는 세 가지입니다. 인덱스 컬럼에 함수를 씌운 경우(`lower(name) = ...`)라 표현식 인덱스가 필요하고, 복합 인덱스 `(a, b)`인데 `b`로만 찾는 경우, 그리고 조건이 테이블 대부분을 읽어야 해서 옵티마이저가 순차 스캔이 더 싸다고 판단한 경우입니다.

    꼬리: B-tree가 아닌 GIN이나 BRIN은 언제 쓰나요?

### 계층 구조 데이터를 어떻게 조회하나요? {#pg-recursive-cte}

??? answer "답 보기"
    부모 id를 가진 테이블을 `WITH RECURSIVE` CTE로 조회합니다. 시작 노드를 고르는 부분과, 이전 결과에 자식을 조인해 붙여 나가는 부분을 `UNION ALL`로 잇습니다.

    더존비즈온의 해외 법령 적재 · DB 관리 프로젝트에서 국가별 법령문 약 20,000건을 적재하면서 국가별 법령 계층 구조를 서비스 스키마에 맞췄고, 인덱스 설정과 재귀 쿼리로 법령 계층 조회 속도를 개선했습니다. 재귀 조인에 쓰이는 부모 id 컬럼에 인덱스가 있어야 단계마다 전체 스캔을 하지 않습니다.

    함정은 순환 데이터입니다. 순환이 있으면 재귀가 끝나지 않으므로 깊이 제한이나 방문 경로 체크를 둡니다.

    꼬리: 계층이 아주 깊고 자주 조회되면 다른 저장 방식도 있나요?

### MVCC는 무엇이고, VACUUM은 왜 필요한가요? {#pg-mvcc-vacuum}

??? answer "답 보기"
    MVCC는 행을 갱신할 때 덮어쓰지 않고 새 버전을 만드는 방식입니다. 덕분에 읽기와 쓰기가 서로를 막지 않습니다.

    대신 옛 버전(죽은 행)이 테이블에 남기 때문에 이를 정리하는 VACUUM이 필요합니다. 갱신·삭제가 많은 테이블은 정리가 밀리면 테이블이 부풀고 느려집니다. 보통은 autovacuum이 처리하지만, 대량 갱신 뒤에는 상태를 확인합니다.

### 수백만 건을 적재해야 합니다. 어떻게 넣으시겠어요? {#pg-bulk-load}

??? answer "답 보기"
    행 단위 INSERT 대신 `COPY`를 씁니다. 훨씬 빠릅니다. 빈 테이블에 처음 넣는 경우라면 인덱스를 적재 후에 만드는 것도 방법입니다. 적재 중에는 쓰기마다 인덱스를 갱신하지 않아도 되기 때문입니다.

    적재는 staging 테이블로 먼저 받고, 검증한 뒤 대상 테이블로 upsert하면 중간에 실패해도 대상 테이블이 반쯤 들어간 상태가 되지 않습니다.

### PostgreSQL을 분석용 웨어하우스로 써도 되나요? {#pg-as-warehouse}

??? answer "답 보기"
    규모에 따라 다릅니다. 수천만 행 정도까지의 학습·소규모 웨어하우스는 충분하지만, 기본이 행 기반 저장이라 수십억 행 집계는 Redshift나 BigQuery 같은 컬럼형 DW보다 느립니다.

    개인 프로젝트 User Behavior Data Warehouse에서는 Postgres를 웨어하우스로 두되 Redshift 호환 SQL로 설계했습니다. 이렇게 두면 나중에 컬럼형 DW로 옮길 때 SQL 수정이 적습니다. raw, staging, marts를 schema로 나누는 것도 PostgreSQL에서 그대로 됩니다.

    꼬리: 행 기반과 컬럼 기반 저장은 분석 쿼리에서 왜 차이가 나나요?

## MongoDB {#mongodb}

### MongoDB와 RDB는 언제 각각 고르나요? {#mongo-vs-rdb}

??? answer "답 보기"
    소스마다 형태가 다르거나 필드가 자주 바뀌는 원천 데이터는 MongoDB, 정합성이 중요하고 조인·집계가 많은 데이터는 RDB입니다.

    MongoDB는 스키마가 유연하고 함께 읽는 데이터를 한 문서에 담아 조인 없이 읽습니다. 반면 `$lookup` 조인은 RDB보다 약하고, 스키마를 강제하지 않아 같은 필드가 문서마다 다른 타입으로 쌓이기 쉽습니다. 수집 파이프라인에서는 원본을 MongoDB에 형태 그대로 받고, 정제한 결과를 RDB에 적재하는 조합이 흔합니다. 더존비즈온의 외부 소스 수집 워크플로우도 PostgreSQL과 MongoDB를 함께 쓰는 스택이었습니다.

    꼬리: PostgreSQL의 jsonb로도 비슷한 유연성을 얻을 수 있지 않나요?

### embedding과 referencing은 어떻게 고르나요? {#mongo-embed-vs-reference}

??? answer "답 보기"
    함께 읽는 데이터는 embedding, 따로 커지거나 여러 곳에서 공유되는 데이터는 referencing이 기본입니다.

    예를 들어 주문과 주문 상품 목록은 항상 같이 읽으니 embedding합니다. 반면 댓글처럼 계속 늘어나는 목록을 문서 안 배열에 계속 붙이면 16MB 문서 한도와 갱신 비용 문제가 생기므로 별도 컬렉션으로 빼고 `_id`로 참조합니다.

### 재수집할 때마다 중복 문서가 쌓입니다. 어떻게 막나요? {#mongo-dedupe-upsert}

??? answer "답 보기"
    자연 키(원본 URL이나 상품 id 같은 소스 식별자)로 unique 인덱스를 걸고, insert 대신 `update_one(filter, {"$set": ...}, upsert=True)`로 적재합니다. 그러면 같은 대상을 다시 수집해도 기존 문서를 갱신합니다.

    개인 프로젝트 Scrapy 기반 데이터 수집 Pipeline에서는 Scrapy pipeline에서 MongoDB에 적재하면서 가격은 통화 기호를 뺀 float으로, 별점은 숫자로 바꿔 저장했고, 적재 결과를 중복·누락·타입 기준으로 검증했습니다. 타입을 적재 단계에서 맞춰 두지 않으면 가격 정렬이 문자열 순서로 틀리게 나옵니다.

### shard key는 어떻게 고르나요? {#mongo-shard-key}

??? answer "답 보기"
    값이 고르게 퍼지고 자주 쓰는 조회 조건에 들어가는 필드를 고릅니다. shard key는 나중에 바꾸기 어렵기 때문에 처음 선택이 중요합니다.

    시간이나 ObjectId처럼 단조 증가하는 값을 그대로 쓰면 새 쓰기가 모두 마지막 구간의 shard 하나로 몰립니다. 이럴 때는 해시 shard key를 쓰거나, 분산이 잘 되는 필드와 묶은 복합 키를 씁니다.

### 스키마가 없으니 데이터 품질은 어떻게 관리하나요? {#mongo-schema-quality}

??? answer "답 보기"
    스키마가 없다는 것은 품질 관리를 코드가 떠안는다는 뜻이라서, 적재 코드에서 타입을 정규화하고 필요하면 컬렉션에 JSON Schema 검증을 겁니다.

    그리고 적재 후 필수 필드 누락, 타입이 섞인 필드, 중복을 정기적으로 점검합니다. 문서 구조가 바뀌면 문서에 버전 필드를 두어 읽는 쪽이 구분할 수 있게 합니다.

## Elasticsearch {#elasticsearch}

### Elasticsearch가 텍스트 검색이 빠른 이유는 무엇인가요? {#es-inverted-index}

??? answer "답 보기"
    inverted index 덕분입니다. 문서마다 단어를 찾는 대신 "단어 → 그 단어가 나온 문서 목록"을 미리 만들어 두기 때문에, 질문 단어의 목록만 꺼내 합치면 됩니다. 책 뒤의 찾아보기와 같습니다.

    색인할 때 analyzer가 문자열을 token으로 쪼개고, 검색할 때도 같은 analyzer로 질문을 쪼갭니다. 관련도는 BM25로 매겨, 질문 단어가 문서에 자주 나오고 전체에서 드물수록 점수가 높습니다. 한국어는 형태소 분석기 nori 설정이 품질을 좌우합니다.

    꼬리: 색인 직후 검색이 안 되는 경우는 왜 생기나요?

### `text`와 `keyword` 타입은 어떻게 다른가요? {#es-text-vs-keyword}

??? answer "답 보기"
    `text`는 analyzer로 토큰화해 전문 검색과 BM25에 쓰고, `keyword`는 값을 그대로 색인해 정확 일치 필터, 정렬, 집계에 씁니다. 본문·제목은 `text`, 문서 id·문서 종류·태그는 `keyword`입니다.

    매핑 없이 넣으면 dynamic mapping이 문자열을 `text`와 `keyword` 둘 다로 만들어 인덱스가 커지고, 숫자를 문자열로 잘못 추론하기도 합니다. 그래서 운영 인덱스는 명시적 매핑으로 시작합니다. 애자일소다의 지식기반 검색 RAG 파이프라인에서는 문서 스키마 7종을 ES 인덱스 매핑으로 설계했습니다.

    꼬리: 객체 배열은 `object`와 `nested` 중 무엇으로 두나요?

### 운영 중인 인덱스의 필드 타입을 바꿔야 합니다. 어떻게 하나요? {#es-reindex-alias}

??? answer "답 보기"
    이미 정한 필드 타입은 바꿀 수 없어서 새 매핑으로 새 인덱스를 만들고 재색인(reindex)합니다. 서비스 중단을 피하려면 애플리케이션이 인덱스 이름이 아니라 alias를 보게 해 두고, 새 인덱스가 준비되면 alias만 전환합니다.

    그래서 처음부터 인덱스 이름을 코드에 직접 박지 않는 것이 중요합니다. 전환 전에는 새 인덱스의 문서 수와 샘플 검색 결과를 기존과 비교합니다.

### 객체 배열을 `object`로 두면 어떤 문제가 생기나요? {#es-nested-vs-object}

??? answer "답 보기"
    배열 원소의 필드가 평평하게 섞여서 잘못된 매칭이 생깁니다. 예를 들어 `[{name: A, value: 1}, {name: B, value: 2}]`를 `object`로 두면 "name이 A이고 value가 2"인 조건에도 이 문서가 걸립니다.

    원소 단위로 조건을 걸어야 하면 `nested`로 매핑해 원소마다 숨은 문서로 따로 색인합니다. 대신 nested 쿼리는 더 비싸고 문서 수도 늘어나므로 정말 원소 단위 조건이 필요한 필드에만 씁니다.

### 벡터 검색을 붙였더니 메모리가 부족합니다. 어떻게 하시겠어요? {#es-vector-memory}

??? answer "답 보기"
    벡터 양자화를 먼저 검토합니다. HNSW 벡터 인덱스는 메모리에 올라가야 빠른데, float32 그대로면 문서 수 × 차원 × 4 byte가 듭니다. `int8_hnsw`는 약 1/4로, `bbq_hnsw`는 차원당 1비트로 줄이고 원본 벡터로 재채점합니다.

    중요한 것은 정확도 손실을 숫자로 확인하는 것입니다. 지식기반 검색 RAG 파이프라인에서 bge-m3 벡터의 양자화 방식을 비교 평가했고, bbq를 적용해 정확도 손실 없이 메모리를 1/7로 줄였습니다. 평가셋 없이 "메모리 몇 배"만 보고 바꾸면 검색 품질이 떨어져도 모릅니다.

    꼬리: 양자화 비교에서 어떤 지표를 봤나요?

### ES를 원본 저장소로 써도 되나요? {#es-not-source-of-truth}

??? answer "답 보기"
    권하지 않습니다. 트랜잭션이 없고 near real-time이라 쓴 직후(기본 1초 refresh 전)에는 검색에 안 보일 수 있고, 매핑을 바꾸려면 재색인해야 하기 때문입니다.

    원본은 RDB나 객체 저장소에 두고, ES는 거기서 만든 검색용 사본으로 둡니다. 그래야 매핑을 바꾸거나 인덱스가 깨져도 원본에서 다시 색인할 수 있습니다.

### 검색 방식을 바꾸면 좋아졌는지 어떻게 아나요? {#es-search-evaluation}

??? answer "답 보기"
    평가셋으로 숫자를 봅니다. 질문과 정답 근거를 묶은 평가셋을 만들고, 바꾸기 전후의 Hit@k나 MRR을 비교합니다.

    지식기반 검색 RAG 파이프라인에서 검색 평가셋 22문항을 만들어 BM25·벡터·하이브리드의 Hit@5 비교를 자동화했습니다. 결합 방식 자체에 대한 질문은 [LLM · RAG의 하이브리드 검색](llm-rag.md#hybrid-search)에, 지표는 [RAG 평가](llm-rag.md#rag-evaluation)에 정리했습니다.

## S3 · Hive · Parquet {#s3-hive-parquet}

### 분석용 저장에 CSV 대신 Parquet를 쓰는 이유는요? {#parquet-vs-csv}

??? answer "답 보기"
    읽는 양이 크게 줄기 때문입니다. Parquet는 컬럼 단위로 저장해 필요한 컬럼만 읽고, 같은 타입끼리 모여 압축이 잘 됩니다. row group마다 min·max 통계가 있어 조건에 안 맞는 묶음은 아예 건너뜁니다(predicate pushdown). 타입도 파일에 저장되어 CSV처럼 추론할 필요가 없습니다.

    대신 사람이 바로 열어 볼 수 없고, 줄 단위 이어 쓰기가 안 됩니다. 그래서 Raw는 받은 그대로 JSONL·CSV로 보관하고 정제 이후 계층부터 Parquet로 바꾸는 조합이 흔합니다.

    꼬리: row group과 column chunk는 무엇인가요?

### 파티션은 어떻게 설계하나요? 너무 잘게 나누면요? {#partition-design}

??? answer "답 보기"
    가장 자주 거는 조회 조건, 보통 날짜로 나눕니다. `event_date=2026-11-05/`처럼 Hive 스타일 경로를 쓰면 엔진이 조건에 맞는 경로만 읽습니다(partition pruning).

    너무 잘게(날짜 + 사용자 등) 나누면 작은 파일이 폭증해 메타데이터와 파일 열기 비용이 처리 시간보다 커집니다. 쓰기 전에 `repartition`이나 `coalesce`로 파일 수를 조절합니다. 또 파티션 컬럼에 함수를 씌워 조건을 걸면 pruning이 안 될 수 있고, UTC 시각을 어느 시간대 날짜로 파티션할지 먼저 정하지 않으면 날짜가 하루씩 밀립니다.

    꼬리: 시간대 문제를 실제로 어떻게 처리했나요?

### 새 파티션을 썼는데 Hive 테이블 쿼리에 데이터가 안 보입니다. 왜 그런가요? {#hive-msck-repair}

??? answer "답 보기"
    메타스토어에 파티션이 등록되지 않았기 때문입니다. Hive 테이블은 메타스토어의 파티션 목록을 보고 읽을 경로를 정하므로, 파일만 생기고 등록이 안 되면 데이터가 없는 것처럼 보입니다. `MSCK REPAIR TABLE`로 경로를 스캔해 등록하거나 `ALTER TABLE ... ADD PARTITION`으로 하나씩 등록합니다.

    개인 Spark 배치 프로젝트에서 Spark가 쓴 Parquet 경로를 LOCATION으로 하는 external table을 만들고, 적재 후 `MSCK REPAIR TABLE`로 파티션을 등록한 뒤 WAU를 SQL로 계산했습니다.

    꼬리: managed table과 external table의 차이는요?

### external table을 쓰는 이유는 무엇인가요? {#hive-external-table}

??? answer "답 보기"
    데이터 파일의 수명과 테이블 메타데이터를 분리하기 위해서입니다. external table은 DROP해도 메타데이터만 지워지고 파일은 남습니다.

    Spark 같은 엔진이 Parquet를 직접 만들고 Hive는 메타데이터로 등록만 하면, 같은 파일을 Trino나 Athena 같은 다른 엔진에서도 메타스토어를 통해 읽을 수 있습니다. 저장과 계산이 분리되어 각자 따로 늘리고 줄일 수 있다는 레이크 구조의 장점과 같은 이야기입니다.

### S3 위 Parquet 테이블에서 행 하나를 고치거나 지워야 하면 어떻게 하나요? {#lake-row-update}

??? answer "답 보기"
    기본 구조에서는 행 단위 수정이 어려워서 해당 파티션을 통째로 다시 씁니다. 파일 단위 저장이라 행 하나만 바꾸는 연산이 없고, 트랜잭션도 없어 쓰는 도중에 읽으면 반쯤 쓰인 결과를 볼 수 있습니다.

    행 단위 갱신·삭제가 잦거나 동시 읽기·쓰기의 일관성이 필요하면 Delta Lake, Iceberg, Hudi 같은 테이블 포맷을 얹습니다. 이들은 트랜잭션 로그로 원자적 커밋과 행 단위 merge를 제공합니다.
