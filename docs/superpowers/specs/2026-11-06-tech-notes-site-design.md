# tech-notes: 개인 기술 학습 사이트 설계

작성일: 2026-11-06. 이 문서는 새 저장소 `tech-notes`의 첫 커밋에 `docs/superpowers/specs/`로 옮긴다.

## 의도

데이터 엔지니어링·RAG·에이전트 기술을 평소에 복기하고 헷갈리는 것을 찾아보며, 그 결과로 면접에서 막힘없이 설명하기 위한 **개인 학습 사이트**. 블로그(kimyonghwan1996.github.io)와 분리된 별도 저장소. career-bot의 주간 자동 갱신과는 무관하다. 내용은 Claude가 처음에 채우고, 이후 사용자가 "이거 추가해줘"라고 할 때 Claude가 마크다운을 고쳐 푸시한다.

사용 장면: 노트북 한 대에서 수시로 열어 본다. 항목마다 "이해함 / 헷갈림 / 중요" 표시를 찍고, 첫 페이지에서 헷갈림·중요로 찍은 것만 모아 본다.

## 목표 / 비목표 / 실패 조건

**목표**
- 탭 4개: 기술 스택 노트, 학습 워크플로우, 내 프로젝트 워크플로우, 예상질문.
- 각 기술은 초급~중급 수준. 핵심 개념, 사용자가 실제 썼던 방식, 장단점, 비교 대상이 있으면 비교표.
- 모든 흐름은 단계별로 읽히는 흐름도 + 단계 설명.
- 푸시하면 GitHub Actions가 빌드해 GitHub Pages로 배포.
- 항목별 이해도 표시(브라우저 저장)와 모아보기, 내보내기.

**비목표**
- 자동 콘텐츠 생성 봇, 주기 실행, career.yml 연동.
- 여러 기기 동기화, 로그인, 서버.
- 블로그 스타일의 글 목록·날짜·댓글.

**실패 조건**
- 읽기보다 장식이 많아 학습에 방해됨.
- 내용 추가가 어려움(마크다운 파일 하나 고치는 것 이상이 필요하면 실패).
- 표시를 찍어도 다시 찾을 수 없음.
- 사실과 다른 내용(사용자가 쓰지 않은 방식을 "주로 썼던 방법"으로 적는 것). 사용자 경험 부분은 career.yml과 저장소 README에서 확인된 것만 쓰고, 일반 기술 설명과 구분한다.

## 제약

- 공개 저장소. 회사명·고객사명은 career.yml에 있는 수준(애자일소다, 더존비즈온, "금융권 고객사")까지만. career-bot의 `banned_terms.txt`에 있는 용어는 쓰지 않는다.
- 한국어. 기술 용어는 영문 그대로.
- 정적 사이트. JS는 표시 기능 하나만.

## 만드는 방식 (Claude의 선택, 사용자 확인 완료)

- 저장소: `kimyonghwan1996/tech-notes`, 공개, main 브랜치.
- 생성기: **MkDocs Material**. 이유: 파이썬 스택과 일치, 상단 탭·검색·다크 모드·접이식 박스·탭 블록·Mermaid를 설정만으로 지원.
- 흐름도: Mermaid (마크다운 안에 포함).
- 배포: GitHub Actions 워크플로우 하나. main 푸시 시 `mkdocs build` 후 Pages 배포. Pages 소스는 Actions.
- 표시 기능: `docs/javascripts/marks.js` 하나. 각 h2/h3 제목 옆에 작은 토글 버튼 3개(이해함·헷갈림·중요). 상태는 `localStorage`에 `페이지경로#제목id` 키로 저장. 첫 페이지(index)에 "헷갈림", "중요" 목록을 렌더링하고, "내보내기" 버튼은 `- [페이지] 제목 (헷갈림)` 형식 텍스트를 클립보드로 복사한다. 사용자가 이 텍스트를 Claude에게 주면 Claude가 내용에 반영한다.
- 표시 상태 집계를 위해 MkDocs의 instant navigation은 끄거나, 켜면 `document$` 구독으로 재바인딩한다(빌더 결정).

## 정보 구조

```
docs/
  index.md                  # 사용법 한 줄 + 헷갈림/중요 모아보기
  stack/                    # 탭 1 기술 스택 노트
    index.md                # 기술 한눈에 보기 표(묶음, 어디서 썼는지)
    orchestration/airflow.md
    processing/spark.md
    processing/kafka.md
    messaging/rabbitmq-redis.md
    storage/postgresql.md
    storage/mongodb.md
    storage/elasticsearch.md
    storage/s3-hive-parquet.md
    modeling/etl-elt-layers.md      # ETL vs ELT, Raw/Staging/Marts
    modeling/dim-fact-scd.md        # Dim/Fact, SCD Type 2, 멱등성, 품질검사
    ingestion/scraping.md           # Scrapy vs Selenium vs BS4 vs Playwright
    serving/fastapi-django.md
    serving/streamlit-sqlalchemy-pydantic.md
    infra/docker.md
    infra/kubernetes.md             # ECK, KubernetesExecutor
    infra/kibana.md
    infra/github-actions.md
    llm/langchain-langgraph.md
    llm/embeddings.md               # bge-m3, 양자화(bbq)
    llm/chunking.md
    llm/hybrid-search.md            # BM25 vs 벡터 vs 하이브리드
    llm/rag-evaluation.md           # Hit@k, MRR, LLM 심판, 이중 판정
    llm/nl2sql.md
    llm/vlm.md
    llm/llm-apis.md                 # OpenAI vs Gemini, 캐시·재시도
    docs/pdf-html-tables.md         # PyMuPDF, HTML 파싱, 표 변환
  learn/                    # 탭 2 학습 워크플로우
    index.md
    de-pipeline.md          # 수집→적재→변환→오케스트레이션→모니터링
    dw-modeling.md          # 요구사항→계층→Dim/Fact→SCD→품질→서빙
    rag.md                  # 문서 수집→파싱→청킹→임베딩→인덱스→검색→생성→평가
    agent.md                # 도구 정의→상태/그래프→계획→실행→검증→관측
  projects/                 # 탭 3 내 프로젝트 워크플로우
    index.md                # 프로젝트 표(회사/기간/스택/한 줄)
    agilesoda-finance-rag.md
    douzone-scraping-etl.md
    douzone-foreign-law.md
    douzone-sentiment-dashboard.md
    douzone-external-sources.md
    personal-smart-factory-agent.md
    personal-shortform-video.md
    personal-dw-elt.md               # DW_ETL + WareHouse 묶음
    personal-nlp-korean.md
    personal-scrapy-books.md
    personal-backpacker-spark.md
    personal-oliveyoung-clone.md
  interview/                # 탭 4 예상질문
    index.md                # 사용법 + 섹션 목록
    general.md              # 자기소개·경험 전반·지원 동기류
    orchestration.md
    processing-streaming.md
    storage.md
    modeling.md
    ingestion.md
    serving-infra.md
    llm-rag.md
    agent.md
    projects-work.md        # 회사 프로젝트 5개, 프로젝트별 소제목
    projects-personal.md    # 개인 프로젝트 7개, 프로젝트별 소제목
```

페이지 수는 목표가 아니다. 내용이 얇으면 합치고, 두꺼우면 나눈다.

## 페이지 템플릿

**기술 스택 노트 (stack/*)**
1. 한 줄 정의와 "언제 쓰나"
2. 핵심 개념 (초급): 꼭 알아야 할 용어 5~10개, 각 한두 문장
3. 동작 원리 (중급): 구조 그림(Mermaid) 1개 + 설명
4. 내가 썼던 방식: career.yml·README에서 확인된 사용 맥락. 어느 프로젝트에서 어떻게. 확인 안 된 것은 쓰지 않는다.
5. 장점 / 단점 / 주의할 함정
6. 비교: 대안과 표 (해당 시)
7. 예상질문 탭의 해당 섹션 링크 (질문·답은 거기에만 둔다)
8. 더 보기 링크 (공식 문서)

**학습 워크플로우 (learn/*)**
1. 전체 흐름 Mermaid 1개
2. 단계별 섹션: 목적, 하는 일, 흔한 선택지, 흔한 실수, 관련 기술 노트 링크, 관련 내 프로젝트 링크
3. 체크리스트

**내 프로젝트 워크플로우 (projects/*)**
1. 한 줄 요약 + 역할 + 기간 + 스택
2. 입력→출력 흐름 Mermaid (career.yml의 architecture가 있으면 그것을 기반으로)
3. 단계별 설명: 각 단계에서 무엇을, 왜 그렇게
4. 면접 핵심 포인트: 숫자 있는 성과, 설계 판단과 이유, 트러블슈팅(문제→조치→결과)
5. 예상질문 탭의 해당 프로젝트 섹션 링크
6. 관련 기술 노트 링크

**예상질문 (interview/*)**
1. 섹션(묶음 또는 프로젝트)마다 h2
2. 질문 하나가 h3. 답은 접이식 박스(`??? answer`)에 두어 질문만 보고 답을 떠올린 뒤 펼쳐 확인한다.
3. 답은 한 문단에서 세 문단. 숫자 있는 근거와 "왜 그 선택을 했나"를 포함. 꼬리질문이 있으면 답 아래 `꼬리:`로 한두 개.
4. 질문 h3마다 표시 버튼이 붙으므로 "헷갈림" 질문만 모아 다시 볼 수 있다.
5. 회사 프로젝트 질문의 답은 사용자 인터뷰 답변(아래 콘텐츠 출처 참조)에서만 채운다.

## 디자인 방향

콘텐츠 중심, 장식 최소. ui-ux-pro-max 가이드 기준: 본문 16px 이상, 줄간격 1.5, 명도 대비 4.5:1, 다크 모드 지원(Material의 palette toggle), 휴대폰 폭에서 가로 스크롤 없음, 표시 버튼은 44px 터치 영역과 aria-label, 아이콘 대신 글자 라벨. 색은 Material 기본 팔레트 중 차분한 한 가지(빌더 결정). 이모지를 아이콘으로 쓰지 않는다.

## 콘텐츠 출처

- `~/blog/kimyonghwan1996.github.io/_data/career.yml` (프로젝트 10개, 성과, 트러블슈팅, Mermaid architecture)
- GitHub 저장소 README·의존성: smart_factory_agent, Create_Video, DW_ETL, WareHouse, NLP_kote, scrapy-crawling, backpacker, oliveyoung-porject, ds(LangGraph 실습)
- 사용자 인터뷰: 회사 프로젝트 5개에 대해 Claude가 프로젝트별 10~15개 질문 목록을 먼저 주고, 사용자가 답한 내용으로 프로젝트 페이지의 설계 판단과 예상질문 답을 채운다. 답을 받기 전에는 해당 부분을 비워 두고 나머지를 먼저 만든다.
- 제외: trading, todai-blog, 프로필 README의 R/Stata/SPSS

## 빌더에게 맡기는 것

- MkDocs Material 설정 세부(테마 색, 플러그인, nav 순서)
- marks.js 구현 세부와 instant navigation 처리
- 각 기술 노트의 비교표 구성과 면접 질문 선택
- 페이지 분할·병합 판단
- 저장소 생성과 Pages 설정 순서

## 작업 순서와 전제

- 전제: career.yml의 프로젝트 제목 정리는 이미 반영돼 있다(id 문자열만 옛 이름이 남아 있고 화면에 나오지 않는다). tech-notes에서는 career-bot의 `banned_terms.txt`를 복사해 두고 빌드 검사에서 docs/ 전체를 grep해 금지 용어가 없음을 확인한다.
- 커밋 순서: 골격·marks.js·Actions → 기술 스택 노트 → 학습 워크플로우 → 개인 프로젝트 → 예상질문(기술·개인) → (인터뷰 답 수신 후) 회사 프로젝트와 그 예상질문.
- 완성 보고는 전부 채워진 뒤에 한다.

## 변경 흐름 (완성 후)

사용자: "X 추가해줘" 또는 내보내기 텍스트 전달 → Claude가 해당 마크다운 수정 → main 푸시 → Actions 배포. PR 없이 main 직접 푸시.
