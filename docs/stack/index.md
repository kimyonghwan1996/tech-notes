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
