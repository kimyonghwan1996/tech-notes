# 데이터 모델링 예상질문

ETL · ELT 계층 설계와 Dim · Fact · SCD 질문입니다. 개념 정리는 [ETL · ELT와 계층](../stack/modeling/etl-elt-layers.md), [Dim · Fact · SCD](../stack/modeling/dim-fact-scd.md) 노트에 있습니다.

## ETL · ELT {#etl-elt}

### ETL과 ELT의 차이는 무엇이고, 어떻게 고르나요? {#etl-vs-elt}

??? answer "답 보기"
    변환을 어디서 하느냐의 차이입니다. ETL은 적재 전에 애플리케이션 코드(Python, Spark)에서 변환하고, ELT는 원본을 먼저 웨어하우스에 넣고 그 안에서 SQL로 변환합니다.

    ELT는 원본이 남아 있어 변환 로직을 고친 뒤 Raw에서 SQL만 다시 돌려 과거 데이터를 다시 만들 수 있고, 변환이 SQL이라 분석가도 읽고 고칩니다. 대신 HTML 파싱, LLM 추출처럼 SQL로 표현하기 어려운 변환은 앞단 코드가 필요합니다. 그래서 실무에서는 섞어 씁니다. 형태가 불규칙한 소스는 앞단에서 ETL로 정리해 넣고, 웨어하우스 안에서는 ELT로 계층을 쌓습니다.

    개인 프로젝트 DW 기반 이벤트 로그 ELT Pipeline이 ELT 쪽 예입니다. 원본 JSONL을 Staging 테이블에 먼저 로드한 뒤 SQL로 Dim과 Fact를 만들었습니다.

    꼬리: dbt는 어떤 문제를 풀어 주나요?

### Raw, Staging, Marts로 계층을 나누는 이유는요? 각 계층에는 무엇을 두나요? {#raw-staging-marts}

??? answer "답 보기"
    문제가 생겼을 때 어디서 값이 틀어졌는지 좁히고, 원본에서 다시 만들 수 있게 하기 위해서입니다. Raw는 소스 그대로의 사본, Staging은 컬럼을 펼치고 타입을 맞추고 null·중복·형식을 걸러 낸 정제본, Marts는 Dim/Fact나 집계 테이블처럼 사용자가 직접 조회하는 최종 테이블입니다.

    경계를 지키는 것이 핵심입니다. Raw를 "정리해서" 저장하면 Raw가 아니고, Staging에 업무 로직을 넣기 시작하면 계층 구분이 무너집니다. 개인 프로젝트 DW 기반 이벤트 로그 ELT Pipeline에서는 원본 유실을 막으려고 이벤트를 DB에 바로 넣지 않고 `data/raw/`에 JSONL로 먼저 덤프한 뒤 Staging에 로드했습니다.

    꼬리: Raw를 영구 보관하면 저장 비용은 어떻게 관리하나요?

### 적재 방식(full refresh, append, delete-insert, upsert)은 어떻게 고르나요? {#load-strategy}

??? answer "답 보기"
    멱등성과 데이터 크기로 고릅니다. 작은 차원·집계 테이블은 전체를 다시 쓰는 full refresh가 가장 단순합니다. 날짜 파티션 단위 fact는 그 구간을 지우고 다시 넣는 delete-insert, 키가 분명한 차원이나 이벤트는 upsert를 씁니다.

    append는 재실행하면 행이 두 배가 되므로 중복 제거 키가 따로 있을 때만 씁니다. 개인 프로젝트 User Behavior Data Warehouse에서는 `dim_product`는 upsert, Fact는 event_id 기준 중복 방지로 적재해 재실행해도 결과가 같게 했습니다.

### 증분 적재에서 늦게 도착한 데이터는 어떻게 처리하나요? {#incremental-late-data}

??? answer "답 보기"
    이전 구간을 겹쳐 읽고 멱등하게 씁니다. watermark를 "마지막 실행 시각"이나 "현재 시각"으로 딱 잘라 잡으면, 그 뒤에 도착한 과거 시각 데이터를 영원히 놓칩니다.

    그래서 예를 들어 지난 하루나 이틀을 겹쳐 다시 읽고, upsert나 구간 delete-insert로 써서 겹친 부분이 중복되지 않게 합니다. 겹치는 폭은 실제로 데이터가 얼마나 늦게 오는지 측정해 정합니다.

    꼬리: updated_at 기준 증분과 날짜 파티션 기준 증분은 어떻게 다른가요?

### 데이터 품질 검사는 무엇을, 어디서 하나요? {#data-quality-checks}

??? answer "답 보기"
    단계 사이에 두고, 실패하면 다음 단계를 막습니다. 보는 항목은 필수 컬럼 null, 키 중복, 이전 단계 대비 건수 비율, 값 범위입니다.

    개인 프로젝트 User Behavior Data Warehouse에서는 Airflow DAG 마지막에 품질 검사 SQL을 두고 필수 컬럼 null, staging 대비 fact 적재 비율, 중복 event_id를 확인해 실패하면 DAG를 중단했습니다. 로그만 남기고 진행하면 오염된 데이터가 Marts까지 가기 때문입니다.

    꼬리: 건수 비율 기준은 어떻게 정하나요?

### LLM으로 비정형 데이터에서 값을 추출하는 단계는 파이프라인 어디에 두나요? {#llm-extraction-stage}

??? answer "답 보기"
    적재 전 ETL 쪽에 둡니다. LLM 추출은 SQL로 표현할 수 없고 외부 호출이라, 웨어하우스 밖 코드에서 처리한 뒤 결과를 넣습니다. 이때 원본도 Raw에 같이 남겨야 프롬프트를 고친 뒤 다시 추출할 수 있습니다.

    LLM 출력은 그대로 믿지 않고 뒤에 검증 단계를 둡니다. 더존비즈온의 데이터 수집 API · ETL 파이프라인에서 LangChain·OpenAI로 초기 데이터와 파일에서 통합 데이터를 추출했고, 매핑·정제·분류 단계를 추가해 데이터 정합성과 LLM 추출 정확도를 개선했습니다.

    꼬리: 수천 건을 추출하다 중간에 실패하면 어떻게 하나요? ([LLM API](llm-rag.md#llm-apis) 참고)

## Dim · Fact · SCD {#dim-fact-scd}

### Fact 테이블과 Dim 테이블은 어떻게 다른가요? {#fact-vs-dim}

??? answer "답 보기"
    Fact는 측정값(매출, 수량, 건수)과 차원 키를 가진 테이블로 행이 많고 계속 늘어납니다. Dim은 누가·무엇을·어디서를 설명하는 속성 테이블(사용자, 상품, 날짜)로 행이 적고 컬럼이 넓습니다.

    Fact를 가운데 두고 Dim을 한 단계로 붙인 star schema로 만들면 분석 쿼리가 "Fact + Dim 몇 개 조인 + GROUP BY"로 단순해집니다. 개인 프로젝트 User Behavior Data Warehouse에서는 `fact_user_events`에 event_id, `user_key`·`product_key`, quantity, revenue를 두고 `dim_user`, `dim_product`를 붙였습니다.

    꼬리: star schema와 snowflake schema는 언제 각각 쓰나요?

### Grain은 무엇이고, 왜 먼저 정해야 하나요? {#fact-grain}

??? answer "답 보기"
    Fact 한 행이 무엇을 뜻하는지입니다. "이벤트 1건", "사용자별 하루 1행"처럼 먼저 정하고, 나머지 컬럼과 조인을 거기에 맞춥니다.

    안 정하고 만들면 조인 과정에서 같은 이벤트가 여러 행으로 불어나(fan-out) 합계가 부풀어도 알아채기 어렵습니다. 그래서 합계가 이상하면 Grain부터 의심합니다.

### SCD Type 1, 2, 3의 차이와 각각 언제 쓰는지 말해 주세요. {#scd-types}

??? answer "답 보기"
    차원 속성이 바뀔 때 이력을 어떻게 다루느냐입니다. Type 1은 덮어써서 이력이 없고, Type 2는 기존 행을 닫고 새 행을 추가해 전체 이력을 남기고, Type 3는 `previous_x` 컬럼에 직전 값 하나만 둡니다.

    오타 수정처럼 이력이 필요 없으면 Type 1, 요금제·등급·국가처럼 "그 당시 기준" 집계가 필요한 속성은 Type 2입니다. 다만 모든 속성을 Type 2로 추적하면 의미 없는 변경까지 행이 쌓이므로 추적할 속성을 골라야 합니다.

    꼬리: Type 0은 언제 쓰나요?

### SCD Type 2를 실제로 어떻게 구현했나요? {#scd2-implementation}

??? answer "답 보기"
    유효기간 컬럼 `valid_from`, `valid_to`와 현재 행 표시 `is_current`를 둡니다. 추적하는 속성이 바뀌면 기존 현재 행의 `valid_to`를 변경 시각으로 닫고 `is_current`를 false로 바꾼 뒤, 새 값으로 새 행을 추가합니다.

    개인 프로젝트 User Behavior Data Warehouse에서는 사용자의 device나 country가 바뀌면 이렇게 행을 닫고 새 행을 추가했고, DW 기반 이벤트 로그 ELT Pipeline에서는 회원 멤버십 등급이 바뀌어도 덮어쓰지 않고 과거 상태 이력을 남겼습니다.

    구현 함정은 두 가지입니다. `valid_to`를 NULL로 두면 범위 조건마다 `COALESCE`가 필요하니 9999-12-31 같은 먼 미래 날짜를 쓰고, 경계는 반열린 구간으로 조인합니다.

    꼬리: Natural key와 Surrogate key는 왜 따로 두나요?

### 이벤트에 "그 당시" 회원 상태를 붙이려면 어떻게 조인하나요? {#point-in-time-join}

??? answer "답 보기"
    이벤트 시각이 Dim 행의 유효기간 안에 드는 행과 조인합니다(point-in-time join). 조건은 `event_time >= valid_from AND event_time < valid_to`처럼 반열린 구간으로 씁니다. `BETWEEN`을 쓰면 경계 시각의 이벤트가 두 행에 매칭됩니다.

    DW 기반 이벤트 로그 ELT Pipeline에서 `fact_events`를 이벤트 발생 시점(`created_at`) 기준으로 그 당시 회원 상태 키(`user_sk`)와 조인해 적재했고, 이 모델로 요금제별 총 수익을 분석했습니다. 현재 기준 집계가 필요하면 `is_current` 행과 조인하면 되므로 두 관점이 다 가능합니다.

### Dim보다 이벤트가 먼저 도착하면 어떻게 하나요? {#late-arriving-dimension}

??? answer "답 보기"
    매칭할 Dim 행이 없으니 "unknown" 기본 행(key = -1)에 먼저 붙여 적재하고, Dim이 도착하면 해당 Fact의 키를 보정합니다. 이벤트를 버리거나 적재를 멈추는 것보다 안전합니다.

    이 문제를 줄이려면 적재 순서를 Dim 먼저, Fact 나중으로 두는 것이 기본입니다. 그래도 늦게 오는 경우가 있어 보정 배치를 따로 둡니다.

    꼬리: 소스에서 삭제된 차원 행은 어떻게 반영하나요?
