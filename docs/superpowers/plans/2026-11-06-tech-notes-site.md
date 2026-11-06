# tech-notes 학습 사이트 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 기술 스택 노트·학습 워크플로우·내 프로젝트·예상질문 4개 탭을 가진 MkDocs Material 사이트를 새 저장소 `kimyonghwan1996/tech-notes`에 만들고 GitHub Pages로 배포한다.

**Architecture:** 모든 내용은 `docs/` 아래 마크다운. MkDocs Material이 탭·검색·다크모드·Mermaid를 제공한다. 표시 기능은 `docs/javascripts/marks.js` 하나가 h2/h3 옆에 버튼을 붙이고 localStorage에 저장한다. `scripts/check.sh`가 strict 빌드, 금지 용어, 페이지 템플릿 준수를 한 번에 검사한다. GitHub Actions 워크플로우 하나가 main 푸시 시 빌드·배포한다.

**Tech Stack:** Python 3.12, mkdocs-material (Mermaid는 pymdownx.superfences custom fence), Node 26 (`node --test`, marks.js 단위 테스트 전용), GitHub Actions `actions/deploy-pages`.

**Spec:** `docs/superpowers/specs/2026-11-06-tech-notes-site-design.md` (첫 커밋 때 tech-notes 저장소의 같은 경로로 복사한다)

## Global Constraints

- 저장소는 `kimyonghwan1996/tech-notes`, 공개, 기본 브랜치 main, 작업 경로 `~/tech-notes`.
- 한국어로 쓰고 기술 용어는 영문 그대로.
- 회사·고객사 표기는 career.yml 수준까지만: "애자일소다", "더존비즈온", "금융권 고객사". `banned_terms.txt`(career-bot에서 복사)의 단어는 docs/ 어디에도 쓰지 않는다.
- "내가 썼던 방식"과 프로젝트 페이지의 사실은 career.yml 또는 해당 저장소 README에서 확인된 것만 쓴다. 확인 안 되면 쓰지 않는다. 일반 기술 설명과 문단을 분리한다.
- 이모지를 아이콘으로 쓰지 않는다. 버튼은 글자 라벨과 aria-label을 가진다. 터치 영역 최소 44px.
- 질문과 답은 `docs/interview/` 안에만 둔다. 다른 페이지는 그 섹션으로 링크한다.
- 모든 커밋 전에 `scripts/check.sh`가 통과해야 한다.
- 커밋 메시지 끝에 `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.

## Review Focus

1. 제목 텍스트를 고치면 MkDocs가 생성하는 id가 바뀌어 저장된 표시가 사라진다. 사용자는 표시가 남길 기대한다. → Task 2의 `keyFor` 테스트에 "명시적 `{ #id }` 속성이 있으면 그것을 쓴다"는 케이스를 넣고, Task 3 이후 모든 h2/h3에 영문 고정 id를 붙이는 것을 템플릿 규칙으로 check.sh가 검사한다.
2. localStorage가 막힌 상태(시크릿 창)에서 페이지가 깨지면 안 된다. → Task 2에 `loadMarks`가 throw 대신 빈 객체를 돌려주는 테스트.
3. 내보내기 결과를 Claude가 바로 쓸 수 있어야 한다. → Task 2에 `exportText` 형식 테스트: 한 줄에 `- [페이지경로] 제목 (헷갈림)`, 페이지 경로 순 정렬.
4. 금지 용어가 코드블록이나 Mermaid 라벨에 들어가도 공개된다. → check.sh의 grep은 docs/ 전체 파일을 대상으로 한다(Task 1 테스트).
5. Mermaid 문법 오류는 strict 빌드가 못 잡고 브라우저에서 빈 박스가 된다. → Task 1에서 `@mermaid-js/mermaid-cli`로 docs 내 모든 mermaid 블록을 파싱하는 단계를 check.sh에 넣는다.

---

### Task 1: 저장소 골격, 빌드 검사, 배포

**Files:**
- Create: `~/tech-notes/mkdocs.yml`, `requirements.txt`, `banned_terms.txt`(career-bot에서 복사), `.gitignore`, `README.md`
- Create: `docs/index.md`, `docs/stack/index.md`, `docs/learn/index.md`, `docs/projects/index.md`, `docs/interview/index.md` (각각 h1과 한 줄 설명만)
- Create: `scripts/check.sh`, `scripts/check_templates.py`
- Create: `.github/workflows/deploy.yml`
- Copy: 설계 문서를 `docs/superpowers/specs/2026-11-06-tech-notes-site-design.md`로, 이 계획을 `docs/superpowers/plans/`로

**Interfaces:**
- Produces: `scripts/check.sh` (인자 없음, 실패 시 non-zero). `scripts/check_templates.py docs/` (섹션별 필수 h2 목록과 "모든 h2/h3에 `{ #id }`" 규칙을 검사, 위반 파일:줄 출력). mkdocs.yml의 `nav`는 탭 4개 순서 고정: 기술 스택, 학습 워크플로우, 내 프로젝트, 예상질문.

- [ ] **Step 1: 저장소와 가상환경**

```bash
mkdir -p ~/tech-notes && cd ~/tech-notes && git init -b main
python3 -m venv .venv && .venv/bin/pip install mkdocs-material
.venv/bin/pip freeze | grep -iE '^(mkdocs|mkdocs-material|pymdown-extensions)=' > requirements.txt
cp ~/career-bot/banned_terms.txt .
```

- [ ] **Step 2: mkdocs.yml**

`site_name: Tech Notes`, `theme: material` with `language: ko`, features `navigation.tabs`, `navigation.sections`, `navigation.top`, `search.highlight`, `content.code.copy`, `toc.follow`; palette 두 개(light `indigo`, dark `slate`+`indigo`)에 toggle; `extra_javascript: [javascripts/marks.js]`; `extra_css: [stylesheets/marks.css]`; markdown_extensions: `attr_list`, `md_in_html`, `admonition`, `pymdownx.details`, `pymdownx.superfences`(mermaid custom fence: `name: mermaid, class: mermaid, format: !!python/name:pymdownx.superfences.fence_code_format`), `pymdownx.tabbed` with `alternate_style: true`, `tables`, `toc` with `permalink: true`. `navigation.instant`는 켜지 않는다. `nav`는 설계 문서의 정보 구조 그대로 (아직 없는 파일은 넣지 않고, 각 Task에서 추가).

- [ ] **Step 3: check_templates.py**

`python scripts/check_templates.py docs/`. 규칙: (a) `docs/**/*.md`의 모든 `## `, `### ` 줄은 `{ #slug }`로 끝나야 한다. slug는 `[a-z0-9-]+`. (b) `docs/stack/**/*.md`(index 제외)는 h2 id 집합이 `{definition, concepts, how-it-works, my-usage, pros-cons, interview, links}`를 포함해야 한다(`comparison`은 선택). (c) `docs/learn/*.md`(index 제외): `{overview, checklist}` 포함. (d) `docs/projects/*.md`(index 제외): `{summary, flow, steps, key-points, interview, links}` 포함. (e) `docs/interview/*.md`(index 제외): 모든 h3 바로 아래 첫 비어있지 않은 줄이 `??? answer`로 시작해야 한다. 위반은 `path:line: message`로 출력하고 exit 1.

- [ ] **Step 4: check_templates.py 자체 검증**

임시 파일 하나를 `docs/stack/tmp.md`에 `## 정의` (id 없음)로 만들고 실행. Expected: 해당 줄 지적, exit 1. 파일 삭제.

- [ ] **Step 5: check.sh**

```bash
#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
.venv/bin/mkdocs build --strict -q
! grep -rnFf <(grep -v '^#' banned_terms.txt | sed '/^$/d') docs/ || { echo "banned term found"; exit 1; }
python3 scripts/check_templates.py docs/
# mermaid syntax: extract each ```mermaid block to a tmp file and parse with mmdc
python3 scripts/extract_mermaid.py docs/ /tmp/tn-mermaid && for f in /tmp/tn-mermaid/*.mmd; do npx -y @mermaid-js/mermaid-cli -i "$f" -o /tmp/tn-mermaid/out.svg -q >/dev/null; done
echo "check ok"
```

`scripts/extract_mermaid.py <docs> <outdir>`: 각 mermaid 펜스를 `<outdir>/<n>.mmd`로 쓴다. 블록이 없으면 outdir에 아무것도 없고 루프는 `shopt -s nullglob`로 건너뛴다. Node 26과 npx는 이 머신에 있다.

- [ ] **Step 6: check.sh 통과 확인**

Run: `scripts/check.sh` Expected: 마지막 줄 `check ok`. 먼저 docs/index.md에 `## 테스트 {#test}` 하나와 작은 mermaid 블록 하나를 넣어 둘 다 통과하는 것을 보고 제거.

- [ ] **Step 7: deploy.yml**

트리거 `push: branches: [main]` + `workflow_dispatch`. permissions `contents: read, pages: write, id-token: write`. job 하나: checkout → setup-python 3.12 → `pip install -r requirements.txt` → `mkdocs build --strict` → `actions/upload-pages-artifact` (path `site`) → `actions/deploy-pages`. environment `github-pages`. 워크플로우에서는 mermaid-cli 검사를 돌리지 않는다(로컬 check.sh 전용).

- [ ] **Step 8: 첫 커밋, 원격 생성, Pages 설정**

```bash
cd ~/tech-notes && git add -A && git commit -m "feat: mkdocs skeleton, checks, pages deploy"
gh repo create kimyonghwan1996/tech-notes --public --source=. --remote=origin --push
gh api -X POST repos/kimyonghwan1996/tech-notes/pages -f build_type=workflow
gh run watch --exit-status
curl -sI https://kimyonghwan1996.github.io/tech-notes/ | head -1
```

Expected: 마지막 줄에 `200`. Pages API가 409(이미 있음)면 무시.

---

### Task 2: 표시 기능 marks.js

**Files:**
- Create: `docs/javascripts/marks.js`, `docs/stylesheets/marks.css`, `tests/marks.test.mjs`, `package.json` (`"type": "commonjs"` 없이, scripts.test = `node --test tests/`)
- Modify: `docs/index.md` (모아보기 컨테이너와 내보내기 버튼), `scripts/check.sh` (끝에 `node --test tests/` 추가)

**Interfaces:**
- Produces (marks.js가 `globalThis.TechNotesMarks`로 노출, Node에서는 `module.exports`):
  - `keyFor(pathname: string, headingId: string): string` → `"${pathname}#${headingId}"`, pathname은 site 베이스(`/tech-notes/`) 제거 후 앞뒤 `/` 제거, 예: `stack/orchestration/airflow/`+`my-usage` → `stack/orchestration/airflow#my-usage`
  - `loadMarks(storage): Record<string, {state: 'ok'|'confused'|'important', title: string}>` — storage.getItem 이 throw 하거나 JSON이 깨지면 `{}`
  - `saveMarks(storage, marks): boolean` — 실패 시 false
  - `toggle(marks, key, state, title): marks` — 같은 state면 삭제, 다르면 덮어씀. 새 객체 반환
  - `exportText(marks): string` — key 순 정렬, 한 줄 `- [${page}] ${title} (${label})`, label은 ok→이해함, confused→헷갈림, important→중요
  - storage key: `technotes.marks.v1`
- DOM: `article h2[id], article h3[id]` 뒤에 `<span class="tn-marks" role="group" aria-label="이해도 표시">` 안에 버튼 3개 `<button type="button" class="tn-mark" data-state="ok" aria-pressed="false" aria-label="이해함으로 표시">이해함</button>` 등. 첫 페이지의 `#tn-confused`, `#tn-important`(`<ul>`)와 `#tn-export` 버튼이 있으면 채운다. 클립보드 복사 후 버튼 텍스트를 2초간 "복사됨"으로.

- [ ] **Step 1: 테스트 작성** `tests/marks.test.mjs`

`node:test`와 `node:assert/strict`. 케이스: `keyFor('/tech-notes/stack/orchestration/airflow/', 'my-usage')` → `'stack/orchestration/airflow#my-usage'`; `keyFor('/tech-notes/', 'intro')` → `'#intro'`가 아니라 `'index#intro'`; `loadMarks({getItem(){throw new Error('blocked')}})` → `{}`; `loadMarks({getItem:()=>'not json'})` → `{}`; `toggle({}, 'a#b', 'confused', 'T')` → `{'a#b':{state:'confused',title:'T'}}`; 같은 호출 두 번 → `{}`; `exportText({'stack/x#y':{state:'confused',title:'Y'}, 'learn/a#b':{state:'important',title:'B'}})` → `"- [learn/a] B (중요)\n- [stack/x] Y (헷갈림)"`.

- [ ] **Step 2: 실패 확인** Run: `node --test tests/` Expected: FAIL (module not found 또는 함수 없음)

- [ ] **Step 3: marks.js 구현**

순수 함수 블록 + `if (typeof module !== 'undefined') module.exports = {...}` + `if (typeof document !== 'undefined') document.addEventListener('DOMContentLoaded', init)`. `init`은 버튼 삽입, 클릭 시 `toggle`→`saveMarks`→`aria-pressed` 갱신, 첫 페이지 목록 채우기, 내보내기. 베이스 경로는 `document.querySelector('link[rel=canonical]')`가 아니라 `location.pathname`에서 `/tech-notes/` 접두사를 제거(접두사 상수 `BASE = '/tech-notes/'`; 로컬 `mkdocs serve`에서는 접두사가 없어도 동작해야 하므로 접두사가 있을 때만 제거).

- [ ] **Step 4: marks.css**

`.tn-marks{display:inline-flex;gap:.25rem;margin-left:.5rem;vertical-align:middle}` `.tn-mark{min-height:44px;min-width:44px;padding:0 .5rem;font-size:.75rem;border:1px solid var(--md-default-fg-color--lighter);border-radius:4px;background:transparent;color:var(--md-default-fg-color--light);cursor:pointer}` `.tn-mark[aria-pressed=true][data-state=ok]{background:var(--md-code-hl-string-color);color:#fff}` confused → `var(--md-code-hl-number-color)`, important → `var(--md-primary-fg-color)`. 모바일(`max-width:600px`)에서는 `.tn-marks{display:flex;margin:.25rem 0 0}`.

- [ ] **Step 5: 테스트 통과** Run: `node --test tests/` Expected: 모두 PASS

- [ ] **Step 6: 브라우저 수동 확인**

`.venv/bin/mkdocs serve` 후 아무 페이지에서 버튼 클릭 → 새로고침 후 유지 → 첫 페이지 목록에 보임 → 내보내기 클릭 → 붙여넣기 형식 확인. 결과를 커밋 메시지 본문에 한 줄로 기록.

- [ ] **Step 7: check.sh에 `node --test tests/` 추가, 실행, 커밋**

```bash
scripts/check.sh && git add -A && git commit -m "feat: per-heading understanding marks stored in localStorage"
git push
```

---

### Task 3: 기술 스택 노트 — 오케스트레이션·처리·메시징·저장소

**Files:**
- Create: `docs/stack/orchestration/airflow.md`, `docs/stack/processing/spark.md`, `docs/stack/processing/kafka.md`, `docs/stack/messaging/rabbitmq-redis.md`, `docs/stack/storage/postgresql.md`, `docs/stack/storage/mongodb.md`, `docs/stack/storage/elasticsearch.md`, `docs/stack/storage/s3-hive-parquet.md`
- Modify: `mkdocs.yml` nav, `docs/stack/index.md` (기술 한눈에 보기 표: 기술 | 묶음 | 어느 프로젝트에서 | 페이지 링크)

**Interfaces:**
- Consumes: 설계 문서 "페이지 템플릿 > 기술 스택 노트" 7+1 섹션. h2 id는 check_templates가 요구하는 `definition, concepts, how-it-works, my-usage, pros-cons, comparison(선택), interview, links`.
- Produces: `interview` 섹션은 `../../interview/<group>.md#<tech>` 로 링크 (Task 7에서 그 id를 만든다. 그룹 파일명: orchestration, processing-streaming, storage, modeling, ingestion, serving-infra, llm-rag, agent).

- [ ] **Step 1: 출처 읽기** `~/blog/kimyonghwan1996.github.io/_data/career.yml` 전체와 `gh api repos/kimyonghwan1996/{WareHouse,NLP_kote,backpacker,DW_ETL}/readme`. `my-usage`에 쓸 수 있는 사실만 메모(프로젝트 id와 함께).

- [ ] **Step 2: 8개 페이지 작성**

각 페이지: `how-it-works`에 Mermaid 1개. `comparison` 대상: Airflow vs cron vs Prefect/Dagster(표), Spark Python vs Scala와 배치 vs 스트리밍, Kafka vs RabbitMQ, Redis 캐시 패턴 비교(cache-aside vs write-through), PostgreSQL 인덱스 종류 표(B-tree/GIN/GiST)와 재귀 CTE, MongoDB vs RDB, Elasticsearch BM25 vs 벡터 vs 하이브리드 표와 매핑 필드 타입 표, Parquet vs CSV vs JSONL. `my-usage`는 career.yml 항목을 "프로젝트명: 무엇을" 형식의 bullet으로, 확인된 것만.

- [ ] **Step 3: nav와 index 표 갱신, 검사, 커밋**

Run: `scripts/check.sh` Expected: `check ok`.
```bash
git add -A && git commit -m "docs(stack): orchestration, processing, messaging, storage notes" && git push
```

---

### Task 4: 기술 스택 노트 — 모델링·수집·서빙·인프라·문서처리

**Files:**
- Create: `docs/stack/modeling/etl-elt-layers.md`, `docs/stack/modeling/dim-fact-scd.md`, `docs/stack/ingestion/scraping.md`, `docs/stack/serving/fastapi-django.md`, `docs/stack/serving/streamlit-sqlalchemy-pydantic.md`, `docs/stack/infra/docker.md`, `docs/stack/infra/kubernetes.md`, `docs/stack/infra/kibana.md`, `docs/stack/infra/github-actions.md`, `docs/stack/docs/pdf-html-tables.md`
- Modify: `mkdocs.yml` nav, `docs/stack/index.md`

**Interfaces:** Task 3과 동일 템플릿·링크 규칙. `interview` 링크 그룹: modeling, ingestion, serving-infra(serving·infra·docs 모두), 

- [ ] **Step 1: 출처 읽기** career.yml의 DW 두 프로젝트, 더존 4개, 애자일소다 1개; `smart_factory_agent`, `scrapy-crawling`, `oliveyoung-porject` README.

- [ ] **Step 2: 10개 페이지 작성**

비교: ETL vs ELT 표; Raw/Staging/Marts 각 계층 책임 표; SCD Type 1/2/3 표와 Type 2 Mermaid(행 유효기간); 멱등성 패턴(delete-insert vs merge/upsert); Scrapy vs Selenium vs Requests+BS4 vs Playwright 표(정적/동적, 속도, 동시성, 학습곡선); FastAPI vs Django vs Flask 표; Docker Compose vs Kubernetes 언제 뭐; KubernetesExecutor vs CeleryExecutor; ECK 구성 Mermaid; GitHub Actions 기본 개념(이 사이트의 deploy.yml을 예제로); PyMuPDF 좌표 기반 추출과 HTML 표 변환 규칙(career.yml 트러블슈팅에서 확인되는 것만).

- [ ] **Step 3: 검사, 커밋** Run: `scripts/check.sh` → `check ok`. Commit `docs(stack): modeling, ingestion, serving, infra, document processing notes`. Push.

---

### Task 5: 기술 스택 노트 — LLM·RAG

**Files:**
- Create: `docs/stack/llm/langchain-langgraph.md`, `embeddings.md`, `chunking.md`, `hybrid-search.md`, `rag-evaluation.md`, `nl2sql.md`, `vlm.md`, `llm-apis.md`
- Modify: `mkdocs.yml` nav, `docs/stack/index.md`

**Interfaces:** Task 3과 동일. `interview` 링크 그룹 llm-rag, agent(langchain-langgraph의 에이전트 부분).

- [ ] **Step 1: 출처 읽기** career.yml 애자일소다 항목(평가셋, bge-m3 bbq, 하이브리드 16/20→18/20, 이중 판정, 청커 15,458청크, VLM Qwen2.5-VL-7B, jsonl 캐시), `ds` 저장소 README와 파일 목록(LangGraph 실습 범위 확인), `smart_factory_agent`, `Create_Video` README.

- [ ] **Step 2: 8개 페이지 작성**

비교: LangChain vs LangGraph vs 직접 호출; 임베딩 모델 선택 기준 표와 양자화(int8/bbq) 표; 청킹 전략 표(고정 길이/문단/표 보존/부모-자식); BM25 vs dense vs hybrid(RRF) 표; 평가 지표 표(Hit@k, MRR, nDCG, 정답률, LLM 심판)와 평가 파이프라인 Mermaid; NL2SQL 흐름 Mermaid와 실패 유형; VLM 용도와 환각 대책; OpenAI vs Gemini API 표, 재시도·캐시·비용 패턴.

- [ ] **Step 3: 검사, 커밋** `scripts/check.sh` → `check ok`. Commit `docs(stack): LLM and RAG notes`. Push.

---

### Task 6: 학습 워크플로우 탭

**Files:**
- Create: `docs/learn/de-pipeline.md`, `docs/learn/dw-modeling.md`, `docs/learn/rag.md`, `docs/learn/agent.md`
- Modify: `docs/learn/index.md`(4개 카드 목록), `mkdocs.yml` nav

**Interfaces:**
- Consumes: Task 3~5 페이지 경로(단계별 "관련 기술 노트" 링크), Task 8·9 프로젝트 페이지 경로(설계 문서의 파일명을 미리 링크. strict 빌드가 깨지므로 Task 8·9 전에는 프로젝트 링크를 주석 `<!-- -->`로 두고 Task 9에서 푼다).
- h2 id: `overview`(Mermaid 전체 흐름), 단계마다 `step-N-<slug>`, 마지막 `checklist`.

- [ ] **Step 1: 4개 페이지 작성**

단계: de-pipeline = 요구 정의 → 수집 → 적재(Raw) → 변환 → 오케스트레이션 → 품질·모니터링 → 서빙. dw-modeling = 비즈니스 질문 → 그레인 정의 → Dim/Fact 설계 → SCD 결정 → 계층 구현 → 품질 검사 → KPI 서빙. rag = 문서 수집 → 파싱(PDF/HTML/표) → 청킹 → 임베딩 → 인덱스 설계 → 검색(하이브리드) → 생성(프롬프트) → 평가 → 운영(캐시·재처리). agent = 목표·도구 정의 → 상태/그래프 설계 → 계획·라우팅 → 도구 실행 → 검증·재시도 → 관측·평가. 각 단계: 목적 / 하는 일 / 흔한 선택지 / 흔한 실수 / 관련 노트 / 관련 내 프로젝트.

- [ ] **Step 2: 검사, 커밋** `scripts/check.sh` → `check ok`. Commit `docs(learn): DE pipeline, DW modeling, RAG, agent workflows`. Push.

---

### Task 7: 예상질문 탭 — 기술 섹션

**Files:**
- Create: `docs/interview/general.md`, `orchestration.md`, `processing-streaming.md`, `storage.md`, `modeling.md`, `ingestion.md`, `serving-infra.md`, `llm-rag.md`, `agent.md`
- Modify: `docs/interview/index.md`(사용법 3줄: 질문만 보고 답 떠올리기, 펼쳐 확인, 헷갈리면 표시), `mkdocs.yml` nav

**Interfaces:**
- Produces: 각 파일의 h2 id는 기술 slug(`airflow`, `spark`, `kafka`, `rabbitmq`, `redis`, `postgresql`, `mongodb`, `elasticsearch`, `s3-hive-parquet`, `etl-elt`, `dim-fact-scd`, `scraping`, `fastapi`, `streamlit`, `docker`, `kubernetes`, `kibana`, `github-actions`, `pdf-html`, `langchain`, `embeddings`, `chunking`, `hybrid-search`, `rag-evaluation`, `nl2sql`, `vlm`, `llm-apis`, `langgraph-agent`). Task 3~5의 `interview` 링크가 이 id를 가리킨다. 깨진 링크는 strict 빌드가 잡는다.
- 질문 h3 id는 `q-<n>` 대신 내용 slug(예 `#airflow-vs-cron`). 답은 `??? answer "답 보기"` 접이식. 기술 섹션당 질문 4~8개, general 10개.

- [ ] **Step 1: 9개 페이지 작성** (기술 설명은 노트 페이지와 중복하지 말고 "면접에서 말하는 순서"로 답을 쓴다. 숫자 근거가 있으면 넣는다.)

- [ ] **Step 2: Task 3~5 페이지의 `interview` 섹션 링크가 모두 존재하는 id를 가리키는지 확인** Run: `scripts/check.sh` Expected: `check ok` (strict 빌드가 anchor 누락을 경고로 잡으려면 mkdocs.yml에 `validation: anchors: warn` 추가).

- [ ] **Step 3: 커밋** `docs(interview): technical question sections`. Push.

---

### Task 8: 내 프로젝트 — 개인 7개 + 예상질문(개인)

**Files:**
- Create: `docs/projects/personal-smart-factory-agent.md`, `personal-shortform-video.md`, `personal-dw-elt.md`(DW_ETL + WareHouse), `personal-nlp-korean.md`, `personal-scrapy-books.md`, `personal-backpacker-spark.md`, `personal-oliveyoung-clone.md`, `docs/interview/projects-personal.md`
- Modify: `docs/projects/index.md`(표: 프로젝트 | 구분 | 기간 | 스택 | 한 줄), `mkdocs.yml` nav

**Interfaces:**
- h2 id: `summary, flow, steps, key-points, interview, links`. `flow`는 career.yml의 `architecture` Mermaid를 기반으로 하되 단계 라벨을 README 기준으로 보강. `interview`는 `../interview/projects-personal.md#<project-slug>`.
- `projects-personal.md`의 h2 id = 프로젝트 파일명에서 `personal-` 제거한 slug.

- [ ] **Step 1: 출처 읽기** 7개 저장소 README 전체와 주요 파일 트리(`gh api repos/.../git/trees/HEAD?recursive=1`로 디렉터리 구조만). 올리브영은 사용자가 구현한 부분(AI 챗봇 등)을 커밋 로그에서 확인: `gh api repos/kimyonghwan1996/oliveyoung-porject/commits --jq '.[].commit.message'`.

- [ ] **Step 2: 7개 프로젝트 페이지 + 예상질문 페이지 작성.** `key-points`는 "숫자 성과 / 설계 판단과 이유 / 트러블슈팅" 소제목 3개(h3, id `metrics`, `decisions`, `troubleshooting`). README에 근거가 없는 설계 이유는 쓰지 않고 "왜 이렇게 했는지 한 줄로 말할 수 있어야 한다"는 복기 메모로 남긴다.

- [ ] **Step 3: Task 6에서 주석 처리한 개인 프로젝트 링크 해제. 검사, 커밋.** `scripts/check.sh` → `check ok`. Commit `docs(projects): personal projects and their interview questions`. Push.

---

### Task 9: 회사 프로젝트 인터뷰 질문 목록 전달 (사용자 입력 대기)

**Files:**
- Create: `docs/superpowers/interview-questions-2026-11.md` (사용자에게 줄 질문 목록, 답을 받으면 같은 파일에 답을 적어 출처로 보관)

- [ ] **Step 1: 질문 목록 작성.** 프로젝트 5개 × 10~15개. 각 질문은 설계 판단("왜 X를 썼나", "대안으로 뭘 고려했나"), 숫자의 맥락("22문항 평가셋은 어떻게 만들었나"), 트러블슈팅의 발견 경위, 본인 역할 범위를 묻는다. career.yml에 이미 답이 있는 건 묻지 않는다.

- [ ] **Step 2: 사용자에게 채팅으로 전달하고 멈춘다.** 답은 채팅 또는 그 파일 직접 편집으로 받는다. 이 Task는 여기서 끝. Task 10은 답을 받은 뒤 시작.

---

### Task 10: 내 프로젝트 — 회사 5개 + 예상질문(회사)

**Files:**
- Create: `docs/projects/agilesoda-finance-rag.md`, `douzone-scraping-etl.md`, `douzone-foreign-law.md`, `douzone-sentiment-dashboard.md`, `douzone-external-sources.md`, `docs/interview/projects-work.md`
- Modify: `docs/projects/index.md`, `mkdocs.yml` nav, Task 6 learn 페이지의 회사 프로젝트 링크 주석 해제

**Interfaces:** Task 8과 동일 템플릿. 출처는 career.yml + `docs/superpowers/interview-questions-2026-11.md`의 답만. 답이 없는 항목은 비우고 `!!! note "채울 것"`으로 표시한다.

- [ ] **Step 1: 애자일소다 페이지 먼저 작성** (`flow`: 문서 수집 → 파싱(PDF/HTML/표/흐름도) → 청킹 → 임베딩(bge-m3 bbq) → ES 인덱스 → 하이브리드 검색 → 생성 → 평가 파이프라인, Airflow KubernetesExecutor가 적재 배치를 오케스트레이션). 트러블슈팅 7건을 `troubleshooting` h3 아래 "문제 → 조치 → 결과" 표로.

- [ ] **Step 2: 더존 4개 작성.** 답이 얇으면 설계 문서 규칙대로 합치되, 파일은 4개를 유지하고 짧은 페이지로 둔다(링크 안정성).

- [ ] **Step 3: `projects-work.md`** 프로젝트별 h2, 질문은 Task 9 목록에서 답이 온 것만 넣고 답은 사용자 답을 면접 어투로 정리. 사용자가 말하지 않은 사실을 보태지 않는다.

- [ ] **Step 4: 검사, 커밋, 배포 확인**

```bash
scripts/check.sh && git add -A && git commit -m "docs(projects): work projects and their interview questions" && git push
gh run watch --exit-status && curl -sI https://kimyonghwan1996.github.io/tech-notes/projects/agilesoda-finance-rag/ | head -1
```
Expected: `200`.

- [ ] **Step 5: 완료 보고.** 사이트 URL, 탭별 페이지 수, "채울 것"으로 남은 항목 목록, 내보내기 사용법 한 줄.
