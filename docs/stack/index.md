# 기술 스택

사용하는 기술을 정의, 개념, 동작 원리, 내 사용처 순서로 정리합니다.

| 기술 | 묶음 | 어디서 썼나 | 페이지 |
|------|------|-------------|--------|
| Airflow | 오케스트레이션 | 지식기반 검색 RAG 파이프라인, 데이터 수집 API · ETL 파이프라인, 데이터 수집 · 감성 분석 대시보드 운영, 외부 소스 수집 워크플로우 (서브 프로젝트), User Behavior Data Warehouse, NLP 기반 한국어 텍스트 처리 Pipeline | [Airflow](orchestration/airflow.md) |
| Spark | 처리·스트리밍 | Backpacker (개인, Spark 배치), NLP 기반 한국어 텍스트 처리 Pipeline, 데이터 수집 · 감성 분석 대시보드 운영 | [Spark](processing/spark.md) |
| Kafka | 처리·스트리밍 | 데이터 수집 · 감성 분석 대시보드 운영 (점검·장애 조치) | [Kafka](processing/kafka.md) |
| RabbitMQ · Redis | 메시징·캐시 | 데이터 수집 API · ETL 파이프라인 | [RabbitMQ · Redis](messaging/rabbitmq-redis.md) |
| PostgreSQL | 저장소 | 해외 법령 적재 · DB 관리, 데이터 수집 API · ETL 파이프라인, 외부 소스 수집 워크플로우 (서브 프로젝트), User Behavior Data Warehouse, DW 기반 이벤트 로그 ELT Pipeline, Smart Factory Data Agent | [PostgreSQL](storage/postgresql.md) |
| MongoDB | 저장소 | Scrapy 기반 데이터 수집 Pipeline, 외부 소스 수집 워크플로우 (서브 프로젝트), 데이터 수집 · 감성 분석 대시보드 운영 | [MongoDB](storage/mongodb.md) |
| Elasticsearch | 저장소 | 지식기반 검색 RAG 파이프라인, 데이터 수집 · 감성 분석 대시보드 운영 | [Elasticsearch](storage/elasticsearch.md) |
| S3 · Hive · Parquet | 저장소 | Backpacker (개인, Spark 배치), 데이터 수집 API · ETL 파이프라인 (S3) | [S3 · Hive · Parquet](storage/s3-hive-parquet.md) |
| ETL · ELT · 계층 | 데이터 모델링 | DW ELT, User Behavior DW, 데이터 수집 API · ETL | [ETL · ELT와 계층](modeling/etl-elt-layers.md) |
| Dim · Fact · SCD | 데이터 모델링 | DW ELT, User Behavior DW | [Dim · Fact · SCD](modeling/dim-fact-scd.md) |
| 웹 스크래핑 | 수집 | Scrapy 도서 수집, 데이터 수집 API · ETL, NLP 텍스트 처리 | [웹 스크래핑](ingestion/scraping.md) |
| FastAPI · Django | 서빙 | Smart Factory, 데이터 수집 API · ETL, 외부 소스 수집, 올리브영 클론 | [FastAPI · Django](serving/fastapi-django.md) |
| Streamlit · SQLAlchemy · Pydantic | 서빙 | Smart Factory, 올리브영 클론 | [Streamlit · SQLAlchemy · Pydantic](serving/streamlit-sqlalchemy-pydantic.md) |
| Docker · Compose | 인프라 | DW ELT, User Behavior DW, NLP 텍스트 처리, Backpacker, 올리브영 클론 | [Docker · Compose](infra/docker.md) |
| Kubernetes · ECK | 인프라 | 지식기반 검색 RAG | [Kubernetes · ECK](infra/kubernetes.md) |
| Kibana | 인프라 | 감성 분석 대시보드, 지식기반 검색 RAG | [Kibana](infra/kibana.md) |
| GitHub Actions | 인프라 | 이 사이트 배포, 숏폼 영상 생성 | [GitHub Actions](infra/github-actions.md) |
| PDF · HTML 표 처리 | 문서 처리 | 지식기반 검색 RAG | [PDF · HTML 표 처리](docs/pdf-html-tables.md) |
| LangChain · LangGraph | LLM · RAG | 데이터 수집 API · ETL, 해외 법령, LLM & Agent 실습 | [LangChain · LangGraph](llm/langchain-langgraph.md) |
| 임베딩 | LLM · RAG | 지식기반 검색 RAG, 올리브영 클론 | [임베딩](llm/embeddings.md) |
| 청킹 | LLM · RAG | 지식기반 검색 RAG | [청킹](llm/chunking.md) |
| 하이브리드 검색 | LLM · RAG | 지식기반 검색 RAG | [하이브리드 검색](llm/hybrid-search.md) |
| RAG 평가 | LLM · RAG | 지식기반 검색 RAG | [RAG 평가](llm/rag-evaluation.md) |
| NL2SQL | LLM · RAG | Smart Factory | [NL2SQL](llm/nl2sql.md) |
| VLM | LLM · RAG | 지식기반 검색 RAG, 숏폼 영상 생성 | [VLM](llm/vlm.md) |
| LLM API | LLM · RAG | 지식기반 검색 RAG, 데이터 수집 API · ETL, Smart Factory, 숏폼 영상 생성, 올리브영 클론, LLM & Agent 실습 | [LLM API](llm/llm-apis.md) |
