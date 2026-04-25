# 🛡️ Insurance & Finance IT Management Platform (Backend)

보험 및 금융 IT 인프라의 외부 인터페이스를 통합적으로 관리하고, 장애 상황을 실시간으로 모니터링하기 위한 **중앙 집중형 관리 시스템의 백엔드 서버**입니다.

---

## 🛠️ Technology Stack

### Core

- **NestJS (v10)**  
  모듈형 아키텍처를 기반으로 인터페이스 관리, 실행, 로그 기능을 독립적으로 구성

- **TypeScript**  
  명확한 타입 정의를 통해 금융 인터페이스 명세의 안정성과 일관성 확보

### Database & Persistence

- **Supabase (PostgreSQL)**  
  관계형 데이터베이스 기반 트랜잭션 무결성 보장 및 안정적인 데이터 관리

- **Prisma ORM**  
  스키마 기반 데이터 접근으로 쿼리 안정성과 개발 생산성 향상

### Communication

- **Axios (HttpModule)**  
  외부 API 통신 처리 및 인터셉터 기반 전역 에러 핸들링, 로깅 구현

---

## 📐 Architecture & Modules

### 1. 📂 ApiConfigs Module (인터페이스 설정 관리)

**설계 목표: 설정 기반의 동적 인터페이스 관리**

- 기관별 API 연동 정보(URL, Method, 인증 등)를 DB로 관리
- 코드 수정 없이 DB 설정만으로 신규 인터페이스 등록 가능
- 운영 환경에서 확장성과 유지보수성을 고려한 구조

---

### 2. ⚡ External Module (제휴 기관 시스템 에뮬레이션)

**설계 목표: 실제 외부 환경과의 연동 테스트 자동화**

- 금감원, 보험사 등 실제 외부 기관의 API 서버 역할을 수행하는 에뮬레이터를 구현
- 다양한 통신 상황(정상 / 인증 실패 / 서버 오류 등) 재현
- 의도적인 **응답 지연(4초 이상)**을 통해 Timeout 상황 테스트
- 대시보드에서 지연 및 장애 감지 로직 검증 지원

---

### 3. 📜 Logs Module (운영 데이터 가공)

**설계 목표: 운영 효율성과 추적성 강화**

- 모든 인터페이스 호출의 요청/응답 데이터 기록
- 장애 발생 시 근본 원인 분석(Root Cause Analysis)을 지원
- 복잡한 시스템 에러 메시지를 운영자가 즉시 이해할 수 있도록 한글 문구 안내
- 운영 업무의 직관성을 높임

---

## 🚀 Getting Started

### 1. 의존성 설치

```bash
npm install
```

### 2. 환경 변수 설정

\*\* 프로젝트 루트 디렉토리에 .env 파일을 생성하고 다음 정보를 설정

DATABASE_URL="your_postgresql_url"
DIRECT_URL="your_direct_url"
JWT_SECRET="your_secret_key"

### 3. 서버 실행

# Prisma Client 생성 및 스키마 반영

```bash
npx prisma generate
```

# 개발 서버 실행

```bash
npm run start:dev
```
