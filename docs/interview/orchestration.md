# 오케스트레이션 예상질문

질문만 먼저 읽고 답을 소리 내어 말해 본 뒤 펼쳐서 확인합니다. 개념 정리는 [Airflow 노트](../stack/orchestration/airflow.md)에 있습니다.

## Airflow {#airflow}

### Airflow는 무엇이고, cron 대신 왜 쓰나요? {#airflow-vs-cron}

??? answer "답 보기"
    Airflow는 작업 순서와 의존성을 Python DAG로 정의하고 스케줄링·재시도·이력 관리를 해 주는 배치 오케스트레이터입니다. 데이터를 직접 처리하는 엔진이 아니라 "무엇을 언제 어떤 순서로" 돌릴지를 관리하고, 무거운 처리는 Spark나 DB, 컨테이너에 맡깁니다.

    cron은 시각만 정해 줄 뿐 단계 사이 의존성, 실패한 단계만 재실행, 과거 구간 재처리(backfill), 실행 이력 UI가 없습니다. 그래서 단계가 하나이고 실패해도 다음 주기에 다시 돌면 되는 작업은 cron으로 충분하고, 수집 → 적재 → 변환 → 품질 검사처럼 단계가 이어지면 Airflow가 맞습니다. 저는 더존비즈온의 데이터 수집 API · ETL 파이프라인에서 일 단위 증분 수집·적재를 Airflow DAG로 자동화했습니다.

    대신 스케줄러, 웹서버, 메타DB까지 운영할 구성요소가 늘어난다는 비용이 있습니다.

    꼬리: Prefect나 Dagster와는 무엇이 다른가요? / 초 단위 실시간 처리에도 Airflow를 쓸 수 있나요?

### `@daily` DAG의 11월 5일 Run은 언제 실행되나요? {#airflow-logical-date}

??? answer "답 보기"
    11월 6일 0시가 지난 뒤에 실행됩니다. 11월 5일은 logical date이고, 그 Run이 처리하는 구간(data interval)은 11월 5일 0시부터 6일 0시까지입니다. 구간이 끝나야 그 구간의 데이터가 다 모이므로 구간 끝에서 실행하는 구조입니다.

    그래서 task 안에서는 `datetime.now()`가 아니라 `ds`나 data interval 값을 기준으로 데이터를 읽어야 합니다. 그래야 재실행이나 backfill 때도 같은 구간을 처리합니다.

    꼬리: `start_date`를 `datetime.now()`로 주면 어떤 문제가 생기나요?

### 멱등한 task란 무엇이고, 어떻게 만드나요? {#airflow-idempotent-task}

??? answer "답 보기"
    같은 날짜로 몇 번을 다시 돌려도 결과가 한 번 돌린 것과 같은 task입니다. Airflow는 재시도, 수동 재실행, catchup, backfill이 흔하기 때문에 멱등하지 않으면 재실행할 때마다 중복 데이터가 생깁니다.

    만드는 방법은 적재 방식을 바꾸는 것입니다. 그냥 INSERT로 추가하지 않고, 해당 날짜 파티션을 지우고 다시 쓰거나(delete-insert), 고유 키 기준 upsert를 씁니다. 개인 프로젝트 User Behavior Data Warehouse에서는 Fact를 event_id 기준으로 중복 방지해 DAG를 다시 돌려도 행이 늘지 않게 했습니다.

    꼬리: 멱등성을 테스트로 어떻게 확인하나요? / 외부 API 호출처럼 결과가 매번 다른 task는요?

### Executor는 어떻게 고르나요? KubernetesExecutor와 CeleryExecutor를 비교해 주세요. {#airflow-executor-choice}

??? answer "답 보기"
    task 성격으로 고릅니다. 짧은 task가 자주, 많이 돌면 CeleryExecutor, 무겁고 드문 배치이거나 task마다 필요한 이미지·자원이 다르면 KubernetesExecutor가 맞습니다.

    Celery는 worker가 상시 떠 있어 시작이 빠르지만, broker(Redis·RabbitMQ)가 필요하고 모든 worker에 의존성을 맞춰야 합니다. KubernetesExecutor는 task마다 Pod를 새로 띄워 task별로 CPU·메모리·이미지를 따로 줄 수 있고, 끝나면 자원을 반환합니다. 대신 Pod 생성 시간만큼 시작이 느립니다. 애자일소다의 지식기반 검색 RAG 파이프라인에서는 KubernetesExecutor 기반으로 데이터 적재 배치를 설계했습니다.

    둘을 섞은 CeleryKubernetesExecutor도 있어서, 기본은 Celery로 돌리고 특정 queue의 무거운 task만 Pod로 보낼 수 있습니다. 비교 표는 [Kubernetes 노트](../stack/infra/kubernetes.md#comparison)에 있습니다.

    꼬리: KubernetesExecutor에서 아주 짧은 task가 수백 개라면 어떻게 하시겠어요?

### 스케줄러가 느려지고 task가 늦게 뜨면 무엇부터 보나요? {#airflow-slow-scheduler}

??? answer "답 보기"
    가장 먼저 DAG 파일 최상위 코드를 봅니다. DAG 파일은 주기적으로 계속 파싱되는데, 최상위에서 DB 조회나 API 호출을 하면 파싱할 때마다 실행되어 스케줄러 전체가 느려집니다. 무거운 코드는 task 함수 안으로 옮깁니다.

    그다음 XCom에 큰 값을 넣고 있지 않은지(메타DB 비대), executor 슬롯이나 pool이 꽉 차 있지 않은지, task instance가 queued에 오래 머무는지 UI에서 확인합니다. KubernetesExecutor라면 Pod가 자원 부족으로 Pending 상태인지도 봅니다.

    꼬리: DAG 파싱 시간은 어떻게 측정하나요?

### task 사이에 데이터프레임 같은 큰 데이터를 넘겨야 하면 어떻게 하나요? {#airflow-xcom-large-data}

??? answer "답 보기"
    데이터 자체는 외부 저장소(S3, DB 테이블)에 쓰고, XCom으로는 경로나 테이블 이름, 건수 같은 작은 값만 넘깁니다. XCom은 메타DB에 저장되기 때문에 큰 값을 넣으면 메타DB가 커지고 스케줄러와 UI가 같이 느려집니다.

    이렇게 하면 중간 결과가 남아 실패한 뒤 다음 task만 다시 돌릴 수 있다는 장점도 있습니다. 대신 중간 저장소의 정리 정책(보존 기간)을 같이 정해야 합니다.

### 과거 `start_date`로 배포했더니 DAG Run이 수십 개 한꺼번에 생겼습니다. 왜 그렇고 어떻게 하나요? {#airflow-catchup-flood}

??? answer "답 보기"
    catchup 때문입니다. `catchup=True`이면 스케줄러가 `start_date`부터 지금까지 실행되지 않은 구간마다 DAG Run을 만듭니다. 우선 DAG를 일시 정지하고, 정말 과거 구간이 필요한지 판단합니다.

    필요 없으면 `catchup=False`로 바꾸고 생성된 Run을 정리합니다. 필요하다면 동시 실행 수(`max_active_runs`)를 제한해 원천 시스템에 부하가 몰리지 않게 돌립니다. 어느 쪽이든 task가 멱등해야 재처리가 안전합니다.

    꼬리: catchup과 backfill 명령은 어떻게 다른가요?

### 데이터 품질 검사가 실패하면 파이프라인을 어떻게 처리하나요? {#airflow-quality-gate}

??? answer "답 보기"
    품질 검사를 별도 task로 두고, 실패하면 task를 실패로 끝내 하위 task가 실행되지 않게 막습니다. 로그만 남기고 계속 진행하면 오염된 데이터가 Marts까지 갑니다.

    개인 프로젝트 User Behavior Data Warehouse에서는 DAG 마지막에 품질 검사 SQL을 두고 필수 컬럼 null, staging 대비 fact 적재 비율, 중복 event_id를 확인해 실패하면 DAG를 중단하게 했습니다. 검사 기준은 [ETL · ELT 노트](../stack/modeling/etl-elt-layers.md#pros-cons)의 함정 목록과 같습니다.

    꼬리: 품질 검사를 적재 전과 후 중 어디에 두나요? / 실패 알림은 어떻게 받나요?
