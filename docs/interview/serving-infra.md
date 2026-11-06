# 서빙·인프라·문서 처리 예상질문

FastAPI, Streamlit, Docker, Kubernetes, Kibana, GitHub Actions, PDF · HTML 문서 처리 질문입니다. 개념 정리는 [기술 스택](../stack/index.md)의 서빙·인프라·문서 처리 노트에 있습니다.

## FastAPI {#fastapi}

### FastAPI를 Django나 Flask 대신 고르는 경우는 언제인가요? {#fastapi-vs-django}

??? answer "답 보기"
    JSON API, 데이터·ML·LLM 서빙처럼 화면 없이 API가 중심이면 FastAPI, 관리 화면이 있는 업무 웹이면 Django를 고릅니다.

    FastAPI는 타입 힌트와 Pydantic 모델 하나로 요청 검증, OpenAPI 문서(`/docs`), 에디터 자동완성이 같이 해결되고 ASGI 기반이라 async를 기본 지원합니다. 대신 ORM, 마이그레이션, 관리자 화면, 인증이 없어 SQLAlchemy·Alembic 등을 직접 고릅니다. Django는 ORM·Admin·인증·마이그레이션이 다 들어 있습니다. 더존비즈온에서 데이터 수집 API는 FastAPI 스택, 외부 소스 수집 워크플로우는 Django 스택이었고, 개인 프로젝트 Smart Factory Data Agent도 FastAPI 백엔드로 만들었습니다.

    꼬리: WSGI와 ASGI의 차이는요?

### `async def` 엔드포인트인데 동시 요청을 넣으면 오히려 느려집니다. 왜 그런가요? {#fastapi-async-blocking}

??? answer "답 보기"
    `async def` 안에서 동기 블로킹 호출(동기 DB 드라이버, `requests`, `time.sleep`)을 하면 이벤트 루프 전체가 멈추기 때문입니다. 그동안 다른 요청이 처리되지 못합니다.

    고치는 방법은 async 드라이버·클라이언트를 쓰거나, 동기 코드를 써야 하면 엔드포인트를 그냥 `def`로 선언하는 것입니다. 일반 `def`는 FastAPI가 스레드 풀에서 실행해 이벤트 루프를 막지 않습니다.

    꼬리: 운영에서는 Uvicorn을 어떻게 띄우나요?

### 요청 검증은 어떻게 하고, 검증에 실패하면 어떻게 되나요? {#fastapi-validation}

??? answer "답 보기"
    요청 body를 Pydantic 모델로 선언하면 FastAPI가 타입 변환과 검증을 자동으로 하고, 틀리면 어느 필드가 왜 틀렸는지 담아 422 응답을 돌려줍니다.

    응답 쪽도 `response_model`을 지정해 내보낼 필드를 고정합니다. 지정하지 않고 ORM 객체를 그대로 반환하면 비밀번호 해시 같은 내부 필드가 응답에 섞일 수 있습니다.

### DB 세션은 어떻게 관리하나요? {#fastapi-db-session}

??? answer "답 보기"
    요청마다 `Depends`로 세션을 열고 응답 후 닫습니다. 세션을 전역 하나로 쓰면 요청끼리 트랜잭션이 섞입니다.

    Engine(연결 풀)은 앱당 하나 만들고, 세션만 요청 단위로 씁니다. `Depends`로 주입하면 테스트에서 테스트용 DB 세션으로 바꿔 끼우기도 쉽습니다.

    꼬리: 오래 놀던 연결이 끊겨 첫 요청이 실패하면요?

### 브라우저에서만 API 요청이 막히고 curl로는 됩니다. 원인은요? {#fastapi-cors}

??? answer "답 보기"
    CORS 설정 누락일 가능성이 큽니다. 브라우저는 다른 출처(도메인·포트)의 API를 호출할 때 서버가 허용 헤더를 주는지 확인하고, 없으면 응답을 막습니다. curl은 이 검사를 하지 않아서 됩니다.

    FastAPI에 CORS 미들웨어를 추가하고 허용할 프론트엔드 출처를 명시합니다. 운영에서는 `*` 대신 실제 출처만 넣습니다.

## Streamlit {#streamlit}

### Streamlit은 어떻게 동작하고, 어디에 쓰나요? {#streamlit-rerun-model}

??? answer "답 보기"
    위젯 값이 바뀌거나 버튼을 누를 때마다 스크립트 전체를 위에서부터 다시 실행(rerun)하는 모델입니다. Python만으로 화면이 나와 대시보드, 내부 도구, 챗봇 데모에 빠르게 씁니다.

    개인 프로젝트 Smart Factory Data Agent에서 프론트엔드를 Streamlit + Plotly로, 백엔드를 FastAPI로 나눠 자연어 질문 결과와 KPI 차트를 보여 줬습니다. 반대로 rerun 모델 때문에 화면이 복잡해지면 느려지고 레이아웃·라우팅·권한 관리가 약해서 고객용 서비스 프론트엔드에는 맞지 않습니다.

    꼬리: Streamlit 앞단과 FastAPI 뒷단을 나눈 이유는 무엇인가요?

### 채팅 기록이 버튼을 누를 때마다 사라집니다. 왜 그런가요? {#streamlit-session-state}

??? answer "답 보기"
    rerun 때문입니다. 일반 변수는 스크립트가 다시 실행될 때마다 초기화됩니다. rerun 사이에 유지해야 하는 값은 `st.session_state`에 둡니다.

    비슷하게 비싼 결과는 캐시를 씁니다. DataFrame 같은 데이터는 `st.cache_data`, DB 엔진이나 모델처럼 공유 객체는 `st.cache_resource`입니다. DB 연결을 `cache_data`에 넣으면 직렬화 오류가 납니다.

### LLM이 만든 SQL을 SQLAlchemy로 실행할 때 무엇을 조심하나요? {#sqlalchemy-safe-sql}

??? answer "답 보기"
    쓰기 문장이 실행되지 않게 막는 것이 첫째입니다. 생성된 SQL이 SELECT 하나인지 검사하고, DB 계정도 읽기 전용으로 둡니다. 코드 검사와 DB 권한을 둘 다 겁니다.

    사용자 입력값이 들어가는 SQL은 f-string으로 만들지 않고 `text()`의 `:param` 바인딩을 씁니다. 개인 프로젝트 Smart Factory Data Agent에서 자연어 질문을 SELECT 전용 SQL로 변환해 SQLAlchemy로 PostgreSQL을 조회했습니다. NL2SQL 쪽 질문은 [NL2SQL](llm-rag.md#nl2sql)에 있습니다.

### 설정과 API 키는 어떻게 관리하나요? {#pydantic-settings}

??? answer "답 보기"
    코드 밖 환경 변수나 `.env`에 두고, `pydantic-settings`의 `BaseSettings`로 읽어 타입 검증을 합니다. 필수 값이 빠지면 앱이 시작할 때 바로 실패해서 운영 중에 늦게 터지지 않습니다.

    Smart Factory Data Agent에서도 `DATABASE_URL`과 `OPENAI_API_KEY`를 `.env`에서 읽었습니다. `.env`는 저장소와 이미지에 넣지 않습니다.

## Docker {#docker}

### 이미지와 컨테이너의 차이는요? {#docker-image-vs-container}

??? answer "답 보기"
    이미지는 실행에 필요한 파일 시스템과 설정을 읽기 전용 layer로 쌓은 묶음이고, 컨테이너는 그 이미지를 실행한 프로세스입니다. 컨테이너는 이미지 위에 쓰기 가능한 층을 하나 얹고, 컨테이너를 지우면 그 층도 사라집니다.

    그래서 DB 데이터처럼 남아야 하는 것은 volume이나 bind mount로 컨테이너 밖에 둡니다.

### 이미지 크기를 줄이고 빌드를 빠르게 하려면요? {#docker-multistage-cache}

??? answer "답 보기"
    두 가지입니다. 하나는 multi-stage build로 빌드 도구와 실행 환경을 나눠 최종 이미지에서 컴파일러·빌드 도구를 빼는 것이고, 다른 하나는 layer 캐시를 살리도록 순서를 잡는 것입니다. 의존성 목록만 먼저 복사해 설치하고 소스는 마지막에 복사하면, 소스만 바뀐 빌드는 설치 layer를 재사용합니다.

    개인 Spark 배치 프로젝트에서 1단계에서 SBT로 Fat JAR를 만들고 2단계 Spark 런타임 이미지에서 `spark-submit`만 실행하는 2단계 빌드로 최종 이미지를 줄였습니다.

### Compose로 앱과 DB를 띄웠는데 앱이 DB에 연결하지 못합니다. 무엇을 보나요? {#docker-compose-connection}

??? answer "답 보기"
    두 가지를 먼저 봅니다. 앱 설정에서 DB 주소를 `localhost`로 썼는지, 그리고 DB가 접속 가능해지기 전에 앱이 먼저 붙었는지입니다.

    컨테이너 안의 `localhost`는 그 컨테이너 자신이라 다른 서비스는 서비스 이름으로 접근해야 합니다. 개인 프로젝트 User Behavior Data Warehouse에서도 Airflow Connection의 Host를 웨어하우스 서비스 이름인 `warehouse`로 지정했습니다. 또 `depends_on`은 컨테이너 시작 순서만 보장하고 DB 준비는 기다리지 않으므로, healthcheck와 `condition: service_healthy`를 쓰거나 앱에서 재시도합니다.

    꼬리: `docker compose down -v`를 하면 무엇이 사라지나요?

### 이미지에 비밀번호나 `.env`가 들어가지 않게 하려면요? {#docker-secrets}

??? answer "답 보기"
    `.env`를 `.dockerignore`에 넣어 빌드 컨텍스트에서 빼고, 비밀값은 실행 시 환경 변수나 secret으로 넘깁니다. 이미지에 `COPY`된 파일은 이미지를 받은 누구나 볼 수 있고, 나중 layer에서 지워도 앞 layer에 남습니다.

### Mac에서 빌드한 이미지가 서버에서 실행되지 않습니다. 왜 그런가요? {#docker-platform}

??? answer "답 보기"
    CPU 아키텍처가 다를 가능성이 큽니다. Apple Silicon(arm64)에서 빌드한 이미지는 amd64 서버에서 실행되지 않습니다. `--platform linux/amd64`로 빌드하거나 multi-arch 이미지를 만듭니다.

### Docker Compose와 Kubernetes는 언제 각각 쓰나요? {#compose-vs-kubernetes}

??? answer "답 보기"
    로컬 재현, 데모, 단일 서버 소규모 서비스는 Compose, 여러 서버에서 자동 복구와 확장이 필요하면 Kubernetes(또는 ECS 같은 관리형 서비스)입니다.

    Compose는 파일 하나로 실행 문서 역할까지 해서, 개인 프로젝트들(DW 기반 이벤트 로그 ELT Pipeline, User Behavior Data Warehouse)을 `docker compose up` 한 번으로 재현되게 만들 때 썼습니다. 다만 한 호스트 기준이라 노드가 죽으면 다른 곳으로 옮겨 주지 않습니다.

## Kubernetes {#kubernetes}

### Pod, Deployment, Service는 각각 무엇인가요? {#k8s-core-objects}

??? answer "답 보기"
    Pod는 배포의 최소 단위로, 컨테이너 하나 이상이 네트워크와 저장소를 공유합니다. 언제든 죽고 다시 만들어질 수 있습니다. Deployment는 상태 없는 Pod를 원하는 개수로 유지하고 이미지가 바뀌면 순차 교체(rolling update)합니다. Service는 Pod 앞의 고정 DNS 이름과 로드밸런싱이라, Pod IP가 바뀌어도 같은 이름으로 접근합니다.

    DB나 Elasticsearch처럼 고정 이름과 Pod별 저장소가 필요하면 Deployment 대신 StatefulSet과 PVC를 씁니다.

    꼬리: ConfigMap과 Secret의 차이는요?

### Operator와 CRD는 무엇이고, ECK를 쓰면 무엇이 좋아지나요? {#k8s-operator-eck}

??? answer "답 보기"
    CRD는 `Elasticsearch`, `Kibana` 같은 새 리소스 종류를 정의하는 것이고, Operator는 그 선언을 보고 실제 리소스를 만들고 관리하는 컨트롤러입니다. 운영 절차를 코드로 자동화한 것이라고 설명합니다.

    ECK를 쓰면 TLS 인증서 생성·갱신, 노드 순차 교체를 통한 버전 업그레이드, Kibana 연결(`elasticsearchRef` 한 줄)을 Operator가 처리합니다. 대신 Operator가 허용하는 범위 안에서만 설정할 수 있습니다. 애자일소다의 지식기반 검색 RAG 파이프라인 스택에 Kubernetes(ECK)가 있었습니다.

### Pod가 OOMKilled나 Evicted로 계속 죽습니다. 어떻게 보나요? {#k8s-oomkilled}

??? answer "답 보기"
    `kubectl describe pod`로 종료 사유와 이벤트를 보고, 자원 `requests`/`limits` 설정부터 확인합니다. limit을 넘으면 OOMKilled, 노드 메모리가 부족하면 다른 Pod가 Evicted됩니다. requests/limits를 안 주면 한 Pod가 노드 메모리를 다 써서 이웃 Pod까지 쫓겨납니다.

    Elasticsearch처럼 JVM을 쓰는 서비스는 heap과 컨테이너 메모리 limit을 같이 맞춰야 합니다. heap은 보통 메모리의 절반 이하로 두고 나머지는 파일 시스템 캐시에 남깁니다.

    꼬리: Pod가 Pending에서 안 넘어가면 무엇을 보나요?

### Secret에 넣었으니 안전한가요? {#k8s-secret}

??? answer "답 보기"
    아닙니다. Secret은 base64 인코딩일 뿐 암호화가 아닙니다. 그래서 Secret YAML을 Git에 올리면 누구나 디코딩할 수 있습니다.

    RBAC로 Secret 읽기 권한을 제한하고, 저장소에는 암호화된 형태나 외부 비밀 저장소 참조만 둡니다.

### Airflow KubernetesExecutor를 쓸 때 주의할 점은요? {#k8s-airflow-executor}

??? answer "답 보기"
    task마다 Pod를 새로 띄우기 때문에 시작에 수 초에서 수십 초가 걸립니다. 아주 짧은 task가 많으면 실제 일보다 Pod 생성 오버헤드가 커집니다. 이런 task는 묶거나 CeleryKubernetesExecutor로 일부만 Pod로 보냅니다.

    장점은 task별로 이미지와 CPU·메모리를 따로 줄 수 있고, 끝나면 자원을 반환한다는 것입니다. 이미지는 `latest` 대신 고정 태그를 써야 노드마다 다른 버전이 도는 일을 막습니다. Executor 비교는 [Airflow 질문](orchestration.md#airflow-executor-choice)에 있습니다.

## Kibana {#kibana}

### Kibana로 무엇을 하나요? Grafana와는 어떻게 다른가요? {#kibana-vs-grafana}

??? answer "답 보기"
    Kibana는 Elasticsearch에 쌓인 데이터를 검색·탐색하고 대시보드로 만드는 도구입니다. 로그나 텍스트 분석 결과를 시간 범위와 필터로 바꿔 가며 보는 데 강합니다. Grafana는 Prometheus 같은 시계열 지표 모니터링과 알림에 강합니다.

    더존비즈온의 데이터 수집 · 감성 분석 대시보드 운영 프로젝트에서 일 배치 적재·감성 분석 결과를 Kibana 대시보드로 시각화했습니다. 한계는 ES 데이터만 보고 조인이 없다는 점이라, 분석에 필요한 필드는 적재할 때 문서에 미리 넣어 둬야 합니다.

### 일 집계 차트의 날짜가 하루씩 어긋나 보입니다. 원인은요? {#kibana-timezone}

??? answer "답 보기"
    시간대나 시간 필드 문제입니다. ES는 UTC로 저장하고 Kibana는 브라우저 시간대로 보여 줘서 일 집계 경계가 9시간 어긋날 수 있습니다. 또 Data View의 시간 필드를 수집 시각으로 잘못 골랐다면 이벤트가 엉뚱한 날짜에 쌓입니다.

    Data View의 시간 필드가 이벤트 시각인지 확인하고, 적재 시 시간대를 명시한 값으로 넣고, Kibana의 표시 시간대 설정을 맞춥니다.

### 원하는 필드가 집계(Visualize) 목록에 나오지 않습니다. 왜 그런가요? {#kibana-field-not-aggregatable}

??? answer "답 보기"
    필드가 `text`로 매핑돼 있기 때문일 가능성이 큽니다. `text`는 토큰화된 전문 검색용이라 terms 집계를 할 수 없습니다. 집계·필터용 필드는 `keyword`로 매핑해야 합니다.

    이미 들어간 인덱스는 타입을 바꿀 수 없어 재색인이 필요하므로, 인덱스 템플릿에서 미리 정의해 두는 것이 맞습니다.

### 파이프라인 장애가 의심될 때 Kibana로 무엇부터 확인하나요? {#kibana-pipeline-check}

??? answer "답 보기"
    Discover에서 시간대별 문서 건수를 보고 "언제부터 건수가 줄었나"를 찾습니다. 그 시점이 곧 장애가 시작된 배치 구간이라 Airflow 실행 이력과 맞춰 봅니다.

    그다음 Dev Tools에서 `GET _cat/indices`로 인덱스 상태와 문서 수를 보고, 최근 문서의 필드 값이 비거나 형식이 바뀌지 않았는지 확인합니다. 대시보드에는 긴 시간 범위와 큰 terms 크기를 기본으로 두지 않아야 ES에 부하를 주지 않습니다.

    !!! note "채울 것"
        데이터 수집 · 감성 분석 대시보드 운영에서 실제로 장애를 발견하고 조치한 순서가 있으면 한두 문장으로 적어 둡니다.

## GitHub Actions {#github-actions}

### GitHub Actions의 workflow, job, step은 어떻게 구성되나요? {#gha-structure}

??? answer "답 보기"
    workflow는 `.github/workflows/*.yml` 파일 하나로, 언제(`on`) 무엇을(`jobs`) 실행할지 정합니다. job은 같은 runner에서 순서대로 도는 step 묶음이고, job끼리는 기본 병렬이며 `needs`로 순서를 겁니다. step은 셸 명령(`run`)이나 재사용 action(`uses`)입니다.

    이 학습 사이트도 main에 push하면 `mkdocs build --strict`로 빌드하고 GitHub Pages에 배포하는 workflow로 돌아갑니다.

### workflow 권한과 secret은 어떻게 다루나요? {#gha-permissions-secrets}

??? answer "답 보기"
    `permissions`에 필요한 권한만 명시합니다. 쓰지 않으면 저장소 기본값을 따르는데, 쓰기 권한이 넓게 열려 있을 수 있습니다. Pages 배포라면 `contents: read`, `pages: write`, `id-token: write` 정도입니다.

    비밀값은 저장소 secret에 넣고 `${{ secrets.NAME }}`으로 꺼냅니다. 로그에서는 가려집니다. 외부 action은 `@main` 대신 버전 태그나 커밋 SHA로 고정해 그쪽 변경이 그대로 들어오지 않게 합니다.

    꼬리: fork에서 온 PR에서 배포 step이 실패하는 이유는요?

### 로컬에서는 통과하는데 CI에서만 실패합니다. 무엇을 보나요? {#gha-local-vs-ci}

??? answer "답 보기"
    환경 차이부터 봅니다. Python 버전, OS 차이(macOS는 파일명 대소문자를 구분하지 않고 Linux는 구분), CI에 설치되지 않은 시스템 패키지, 커밋하지 않은 로컬 파일입니다.

    CI 쪽 버전을 로컬과 맞춰 고정하고, 실패 로그에서 첫 오류 줄을 찾습니다. 의존성 설치가 오래 걸리면 cache를 붙입니다.

### 데이터 파이프라인 스케줄링을 GitHub Actions의 schedule로 하면 안 되나요? {#gha-vs-airflow}

??? answer "답 보기"
    가벼운 정기 작업은 되지만 데이터 파이프라인 스케줄러로는 부족합니다. `schedule`은 정확한 시각을 보장하지 않고 부하가 높으면 지연되며, 저장소에 60일간 활동이 없으면 자동으로 꺼집니다. task별 재시도, 과거 구간 backfill, 의존성 그래프도 없습니다.

    그래서 코드가 바뀔 때 도는 빌드·테스트·배포는 GitHub Actions, 데이터가 쌓일 때 도는 일 증분 적재나 다단계 ETL은 Airflow가 맡도록 나눕니다.

## PDF · HTML 문서 처리 {#pdf-html}

### RAG에서 문서 파싱 품질이 왜 그렇게 중요한가요? {#doc-parsing-importance}

??? answer "답 보기"
    검색과 답변 모두 파싱 결과 위에서 동작하기 때문입니다. 파싱에서 글자가 빠지거나 표의 열 이름이 틀리면 임베딩, 검색, 답변이 다 틀린 근거로 일합니다. 모델을 바꿔도 회복되지 않습니다.

    그래서 파싱 품질도 숫자로 봅니다. 애자일소다의 지식기반 검색 RAG 파이프라인에서 HTML 전처리 파서를 구축해 원본 대비 본문 누락 단어를 374개에서 0개로 줄였고, 파서를 플러그인 규격으로 개편해 문서 328건을 오류 없이 처리했습니다.

    꼬리: 누락 단어 수는 어떻게 셌나요?

### 표를 RAG에 넣을 때 어떤 문제가 생기고, 어떻게 처리했나요? {#table-to-chunks}

??? answer "답 보기"
    표를 통째로 넣으면 청크 크기 상한을 넘고, 글자 수로 자르면 뒤쪽 청크에 머리글이 없어 숫자가 무슨 값인지 모르게 됩니다. 그래서 행 단위로 나누고 각 청크에 머리글을 다시 붙이는 표 구조 보존 청커를 만들었고, HTML 234건을 15,458청크로 나눠 크기 초과 청크 0건을 확인했습니다.

    복잡한 표는 행을 "행 이름의 열 이름은 값이다" 같은 문장으로 바꿔 검색이 값의 맥락을 잡게 했습니다. 다단 머리글 등 복잡한 표의 문장 변환 규칙을 구현해 원본 대조 검수 104/104를 통과했습니다. 변환 규칙이 틀리면 값의 의미가 조용히 바뀌므로 원본 대조 검수가 필수입니다.

    꼬리: 머리글 반복으로 청크가 너무 커지면요? ([청킹](llm-rag.md#chunking) 참고)

### 표 열 이름이 `----`로 적재된 문제를 어떻게 찾고 고쳤나요? {#table-separator-bug}

??? answer "답 보기"
    표 열 이름이 `----`로 잘못 적재된 청크가 7개 있었습니다. 원인을 추적해 보니 PDF 파서가 표의 구분선 행을 데이터 행(머리글)으로 오인한 것이었습니다.

    구분선 행을 제거하는 규칙을 넣고 재적재해 오류 청크를 7개에서 0개로 줄였고, 표 질의의 벡터 검색 MRR이 0.85에서 0.92로 올랐습니다. 일반화하면 구분선이나 빈 행처럼 열 이름이 기호뿐인 행은 데이터로 받지 않게 걸러야 합니다.

    !!! note "채울 것"
        처음에 이 문제를 어떤 신호로 알아챘는지(평가셋 실패, 육안 검수 등) 실제 경위를 한 문장으로 적어 둡니다.

### 병합 셀(rowspan, colspan)은 어떻게 다뤘나요? {#merged-cells}

??? answer "답 보기"
    병합 셀을 펼칠 때 값을 어느 열에 둘지 규칙이 없으면 합계·소계가 엉뚱한 열에 붙어 값의 의미가 바뀝니다. 실제로 여러 열에 병합된 합계 숫자가 첫 열에 배치되는 문제가 있었습니다.

    숫자 병합값은 마지막 열에 배치하고, 값이 하나뿐인 행은 예외로 처리하는 규칙으로 바꿨습니다. 그 결과 의도치 않게 바뀐 표가 54개에서 2개로 줄었습니다. 이런 규칙은 변경 전후 표를 비교해 의도치 않게 바뀐 표 수로 효과를 확인합니다.

### 표 앞 소제목이 빠져 답이 틀린 사례를 설명해 주세요. {#table-caption-context}

??? answer "답 보기"
    표만 떼어 청크로 만들면 표 바로 위 소제목에 있던 기간 정보가 사라집니다. 그래서 당기와 전기 수치를 묻는 질문에 답이 서로 뒤바뀌었습니다.

    표 앞의 짧은 소제목을 표 이름표로 붙여 청크에 함께 넣었고, 해당 문항이 정답 처리됐습니다. 일반화하면 단위 표기, 기준 시점처럼 짧지만 숫자 해석에 꼭 필요한 문장은 표와 떨어지면 안 됩니다.

### PDF에서 표나 도형 밖 텍스트처럼 구조 태그가 없는 정보는 어떻게 살리나요? {#coordinate-based-extraction}

??? answer "답 보기"
    좌표(bbox)로 판단합니다. 글자와 도형의 위치를 보고 읽기 순서, 같은 행·열 여부, 표 안팎을 정합니다. 좌표형 HTML에서 표 밖 텍스트를 좌표 기반으로 복구해 106줄을 복구했고 손실은 0건이었습니다.

    벡터 PDF 업무흐름도는 도형과 글자 좌표로 노드·간선 그래프를 만들어 7건 모두 원본과 일치시키고 Mermaid로 산출했습니다. 조각난 연결선은 끝점 거리(36pt) 기준으로 잇고, 선 중간의 갈래선은 점-선분 거리로 묶고, 화살촉 도형은 따로 분리했습니다. 단점은 양식마다 기준값이 달라 규칙이 늘어난다는 것이라 양식별 검수 세트가 필요합니다.

    꼬리: 스캔 PDF라면 어떻게 하시겠어요?

### PyMuPDF, pdfplumber, BeautifulSoup 같은 도구는 어떻게 고르나요? {#doc-tool-choice}

??? answer "답 보기"
    문서 형식과 필요한 정보로 고릅니다. 텍스트 PDF에서 글자·블록·도형 좌표와 표 감지를 빠르게 얻으려면 PyMuPDF, 표 추출 설정을 세밀하게 조정하려면 pdfplumber, 표만 뽑으면 Camelot·Tabula입니다. HTML은 lxml이 빠르고, 깨진 HTML에는 BeautifulSoup(파서는 보통 lxml)이 관대합니다.

    스캔 PDF는 글자 정보가 없어 OCR이나 레이아웃 모델이 필요하고, 차트·그림 의미는 VLM이 보조합니다. 지식기반 검색 RAG 파이프라인 스택에는 PyMuPDF가 있었습니다.
