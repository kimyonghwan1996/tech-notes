# LLM 에이전트 구축 과정

LLM이 도구(SQL 실행, 검색, API 호출)를 골라 쓰며 여러 단계로 일을 처리하는 에이전트를 만들 때 보통 거치는 순서다. 여기서 에이전트는 "LLM이 다음 행동을 고르는 루프"뿐 아니라, 단계가 정해진 LLM 파이프라인(분석 → 생성 → 검수)까지 넓게 포함한다.

## 전체 흐름 { #overview }

<iframe src="flows/agent.html" title="에이전트 구축 흐름 인터랙티브 다이어그램" loading="lazy" style="width:100%;height:640px;border:1px solid var(--md-default-fg-color--lightest);border-radius:6px;background:transparent"></iframe>

[전체 화면으로 열기](flows/agent.html){ target=_blank } · 단계 상자를 클릭하면 연결이 강조되고, 위쪽 보기 메뉴로 단계 묶음을 차례로 따라갈 수 있습니다.

에이전트의 품질은 모델보다 도구 설계와 검증 단계에서 크게 갈린다. 처음에는 고정된 순서의 파이프라인으로 시작하고, 정말 분기가 필요한 곳에만 LLM 판단을 넣는 편이 디버깅이 쉽다.

## 1단계. 목표 · 도구 정의 { #step-1-goal-tools }

**목적**: 에이전트가 끝내야 할 일과, 그 일을 위해 쓸 수 있는 도구의 경계를 정한다.

**하는 일**

- 사용자 요청 예시 10~20개를 모으고 기대 출력(답, 표, 차트, 파일)을 적는다
- 요청을 처리하는 데 필요한 도구를 나열한다: SQL 실행, 문서 검색, 외부 API, 계산
- 도구마다 이름, 설명, 입력 스키마, 출력 형식을 정한다
- 도구가 할 수 없는 일(쓰기 권한, 삭제)을 명시적으로 막는다

**흔한 선택지**

| 선택 | 언제 고르나 |
|------|-------------|
| 고정 파이프라인 | 처리 순서가 늘 같을 때(예: 분석 → 스크립트 → 이미지 → 음성 → 합성) |
| 도구 호출 에이전트 | 요청마다 필요한 도구와 순서가 달라질 때 |
| 둘의 혼합 | 큰 흐름은 고정하고 일부 단계만 LLM이 고를 때 |

**흔한 실수**

- 도구 설명이 모호해 LLM이 비슷한 도구 중 엉뚱한 것을 고른다
- 도구 하나가 너무 많은 일을 해 실패 원인을 나눌 수 없다
- 읽기 전용이어야 할 DB 연결에 쓰기 권한을 준다

**관련 기술 노트**: [LangChain · LangGraph](../stack/llm/langchain-langgraph.md), [LLM API](../stack/llm/llm-apis.md)

**관련 내 프로젝트**

- Smart Factory Data Agent <!-- PROJECT-LINK: [Smart Factory Data Agent](../projects/personal-smart-factory-agent.md) -->
- AI 기반 숏폼 영상 생성 시스템 <!-- PROJECT-LINK: [AI 기반 숏폼 영상 생성 시스템](../projects/personal-shortform-video.md) -->

## 2단계. 상태 · 그래프 설계 { #step-2-state-graph }

**목적**: 단계 사이에 주고받는 데이터(state)와 단계 연결(graph)을 코드로 명확히 한다.

**하는 일**

- 상태 객체에 담을 필드를 정한다: 원래 질문, 중간 결과, 오류, 재시도 횟수
- 각 단계를 노드로, 단계 사이 이동을 엣지로 그린다
- 조건 분기(성공·실패·추가 질문 필요)를 조건부 엣지로 표현한다
- 상태 스키마를 Pydantic 같은 타입으로 고정한다

**흔한 선택지**

| 선택 | 언제 고르나 |
|------|-------------|
| 일반 Python 함수 연결 | 단계가 적고 분기가 거의 없을 때 |
| LangChain 체인 | 프롬프트 → 모델 → 파서처럼 직선 흐름 |
| LangGraph | 분기, 반복, 재시도, 사람 확인 단계가 있을 때 |

**흔한 실수**

- 모든 정보를 대화 메시지 목록 하나에 넣어 상태를 추적하기 어렵다
- 반복 엣지에 종료 조건이 없어 무한 루프가 생긴다

**관련 기술 노트**: [LangChain · LangGraph](../stack/llm/langchain-langgraph.md), [Streamlit · SQLAlchemy · Pydantic](../stack/serving/streamlit-sqlalchemy-pydantic.md)

**관련 내 프로젝트**: AI 기반 숏폼 영상 생성 시스템 <!-- PROJECT-LINK: [AI 기반 숏폼 영상 생성 시스템](../projects/personal-shortform-video.md) -->

## 3단계. 계획 · 라우팅 { #step-3-plan-route }

**목적**: 요청을 보고 어떤 경로·도구로 처리할지 고른다.

**하는 일**

- 요청 유형을 분류한다: 단순 조회, 분석, 범위 밖 질문
- 유형별로 다른 노드나 프롬프트로 보낸다
- 여러 단계가 필요하면 하위 작업 목록을 먼저 만들게 한다
- 범위 밖 요청은 정중히 거절하는 경로를 둔다

**흔한 선택지**

| 선택 | 언제 고르나 |
|------|-------------|
| 규칙 기반 라우팅 | 키워드나 형식으로 유형이 분명히 갈릴 때 |
| LLM 분류 라우팅 | 표현이 다양해 규칙으로 못 나눌 때 |
| Plan-and-execute | 하위 작업이 여러 개이고 순서가 중요할 때 |

**흔한 실수**

- 단순한 요청까지 매번 계획 단계를 거쳐 느리고 비싸진다
- 범위 밖 질문을 억지로 처리해 틀린 답을 낸다

**관련 기술 노트**: [LangChain · LangGraph](../stack/llm/langchain-langgraph.md), [NL2SQL](../stack/llm/nl2sql.md)

**관련 내 프로젝트**: Smart Factory Data Agent <!-- PROJECT-LINK: [Smart Factory Data Agent](../projects/personal-smart-factory-agent.md) -->

## 4단계. 도구 실행 { #step-4-tools }

**목적**: LLM이 만든 호출 인자로 실제 도구를 안전하게 실행하고 결과를 상태에 담는다.

**하는 일**

- NL2SQL이면 스키마 설명과 예시 쿼리를 프롬프트에 넣어 SQL을 만든다
- 실행 전에 인자를 스키마로 검증한다(타입, 허용 테이블, 행 수 제한)
- 타임아웃과 결과 크기 제한을 둔다
- 비정형 입력에서 필요한 필드를 뽑는 추출 도구는 출력 스키마를 고정한다
- 도구 결과를 LLM이 읽기 좋은 요약 형태로 돌려준다

**흔한 선택지**

| 선택 | 언제 고르나 |
|------|-------------|
| 모델의 function calling | 도구가 여러 개이고 인자가 구조화돼 있을 때 |
| 구조화 출력(JSON 스키마) | 추출처럼 한 번에 정해진 필드를 받을 때 |
| API 서버로 감싼 도구 | 여러 에이전트·서비스가 같은 도구를 쓸 때 |

**흔한 실수**

- LLM이 만든 SQL을 검증 없이 실행한다
- 도구 결과 원본(수만 행)을 그대로 다시 LLM에 넣어 컨텍스트가 터진다

**관련 기술 노트**: [NL2SQL](../stack/llm/nl2sql.md), [LLM API](../stack/llm/llm-apis.md), [FastAPI · Django](../stack/serving/fastapi-django.md)

**관련 내 프로젝트**

- Smart Factory Data Agent <!-- PROJECT-LINK: [Smart Factory Data Agent](../projects/personal-smart-factory-agent.md) -->
- 데이터 수집 API · ETL 파이프라인 <!-- PROJECT-LINK: [데이터 수집 API · ETL 파이프라인](../projects/douzone-scraping-etl.md) -->

## 5단계. 검증 · 재시도 { #step-5-verify-retry }

**목적**: 도구 결과와 최종 답이 맞는 형식·범위인지 확인하고, 틀리면 원인을 담아 다시 시도한다.

**하는 일**

- SQL 오류, 빈 결과, 스키마 불일치를 감지한다
- 오류 메시지를 상태에 넣어 다음 시도 프롬프트에 함께 준다
- 재시도 횟수 상한을 두고, 넘으면 실패를 사용자에게 알린다
- 추출 결과는 매핑·정제 규칙으로 한 번 더 걸러낸다

**흔한 선택지**

| 선택 | 언제 고르나 |
|------|-------------|
| 규칙 검증 | 형식, 범위, 필수 필드처럼 코드로 판정되는 것 |
| LLM 자기 검토 | 답이 질문에 맞는지처럼 규칙으로 못 재는 것 |
| 사람 확인 단계 | 되돌리기 어려운 행동 직전 |

**흔한 실수**

- 같은 프롬프트로 그대로 재시도해 같은 오류를 반복한다
- 빈 결과를 "데이터 없음"으로 단정하고 쿼리 오류 가능성을 보지 않는다

**관련 기술 노트**: [LangChain · LangGraph](../stack/llm/langchain-langgraph.md), [NL2SQL](../stack/llm/nl2sql.md)

**관련 내 프로젝트**: 데이터 수집 API · ETL 파이프라인 <!-- PROJECT-LINK: [데이터 수집 API · ETL 파이프라인](../projects/douzone-scraping-etl.md) -->

## 6단계. 관측 · 평가 { #step-6-observe-eval }

**목적**: 에이전트가 어떤 경로로 답했는지 추적하고, 바꾼 설정이 나아졌는지 숫자로 본다.

**하는 일**

- 요청마다 노드 경로, 도구 호출 인자, 결과, 토큰 수, 지연을 기록한다
- 대표 요청으로 평가셋을 만들고 정답 여부·도구 선택 정확도를 잰다
- 실패 사례를 유형별로 모아 도구 설명·프롬프트 개선에 쓴다
- 사람이 결과를 확인하는 화면을 둔다

**흔한 선택지**

| 선택 | 언제 고르나 |
|------|-------------|
| 구조화 로그 | 기본. 요청 ID로 단계별 기록을 묶는다 |
| 트레이싱 도구 | 노드가 많아 흐름을 눈으로 따라가야 할 때 |
| Streamlit 확인 화면 | 질문을 넣고 중간 결과·차트를 함께 볼 때 |

**흔한 실수**

- 최종 답만 저장해 어느 단계에서 틀렸는지 모른다
- 프롬프트를 고칠 때마다 평가 없이 몇 개 예시만 눈으로 확인한다

**관련 기술 노트**: [RAG 평가](../stack/llm/rag-evaluation.md), [Streamlit · SQLAlchemy · Pydantic](../stack/serving/streamlit-sqlalchemy-pydantic.md)

**관련 내 프로젝트**: Smart Factory Data Agent <!-- PROJECT-LINK: [Smart Factory Data Agent](../projects/personal-smart-factory-agent.md) -->

## 체크리스트 { #checklist }

- [ ] 고정 파이프라인과 도구 호출 에이전트 중 무엇을 고를지 기준을 말할 수 있다
- [ ] 도구마다 이름, 설명, 입력 스키마, 출력 형식을 정의했다
- [ ] 도구 권한이 필요한 최소 범위(읽기 전용 등)로 제한돼 있다
- [ ] 상태 객체의 필드를 나열하고 각 노드가 무엇을 읽고 쓰는지 안다
- [ ] 반복 엣지마다 종료 조건(재시도 상한)이 있다
- [ ] 범위 밖 요청을 처리하는 경로가 있다
- [ ] LLM이 만든 SQL을 실행 전에 검증한다
- [ ] 도구 결과가 크면 요약해서 LLM에 넘긴다
- [ ] 재시도 프롬프트에 직전 오류 내용이 들어간다
- [ ] 요청 하나의 노드 경로와 도구 호출을 로그로 다시 볼 수 있다
- [ ] 평가셋으로 정답률과 도구 선택 정확도를 잰다
