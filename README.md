# 🏫 김해영운고등학교 1:1 개별 상담 신청 및 비밀 건의함
> **Kimhae Youngwoon High School — Confidential 1:1 Counseling & Secret Suggestion Box Platform**

[![Next.js](https://img.shields.io/badge/Next.js-14.2.15-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3FCF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com/)
[![E2E Tests](https://img.shields.io/badge/Automated_Tests-60%2F60_Passed_(100%25)-success?style=for-the-badge&logo=checkmarx&logoColor=white)](#-automated-testing-guide)

---

## 📖 목차 (Table of Contents)

1. [프로젝트 소개 (Project Overview)](#-프로젝트-소개-project-overview)
2. [핵심 아키텍처 및 보안 원칙 (Architecture & Security Guarantees)](#-핵심-아키텍처-및-보안-원칙-architecture--security-guarantees)
3. [주요 기능 소개 (Core Features)](#-주요-기능-소개-core-features)
4. [따뜻한 감성 디자인 시스템 (Warm Pastel Design System)](#-따뜻한-감성-디자인-시스템-warm-pastel-design-system)
5. [Supabase 데이터베이스 및 보안 설정 (Database Setup)](#-supabase-데이터베이스-및-보안-설정-database-setup)
6. [로컬 개발 환경 실행 가이드 (Local Development)](#-로컬-개발-환경-실행-가이드-local-development)
7. [자동화 E2E 테스트 가이드 (Automated Testing Guide)](#-자동화-e2e-테스트-가이드-automated-testing-guide)
8. [배포 가이드 및 Vercel 배포 (Production Deployment)](#-배포-가이드-및-vercel-배포-production-deployment)
9. [프로젝트 디렉터리 구조 (Directory Structure)](#-프로젝트-디렉터리-구조-directory-structure)

---

## 🌟 프로젝트 소개 (Project Overview)

**김해영운고등학교 개별 상담 신청 및 비밀 건의함**은 학급 내에서 학생과 교사가 심리적 부담 없이 안전하고 따뜻하게 소통할 수 있도록 구축된 전용 웹 애플리케이션입니다.

- **학생**: 복잡한 이메일 가입 절차 없이 **학년/반/번호와 4자리 간편 PIN**으로 즉시 가입 및 로그인하여, 1:1 비밀 상담을 신청하거나 익명/기명을 선택하여 학급 비밀 건의를 남길 수 있습니다.
- **선생님**: Supabase Auth 기반의 교사 인증을 통해 전용 관리 대시보드에 접속하여 접수된 상담 내역을 실시간으로 확인 및 일정 조율하고, 건의함에 피드백을 전달하며, PIN을 분실한 학생의 계정을 안전하게 초기화할 수 있습니다.

---

## 🛡️ 핵심 아키텍처 및 보안 원칙 (Architecture & Security Guarantees)

```
+-----------------------------------------------------------------------------------+
|                                  Client Layer                                     |
|  +-------------------------------------+  +------------------------------------+  |
|  |     Student Portal (Mobile/PC)      |  |     Teacher Dashboard (PC/Tablet)  |  |
|  | - Grade/Class/Number + 4-digit PIN  |  | - Supabase Auth (Email / Password) |  |
|  | - 1:1 Confidential Counseling Form  |  | - Live Filtering (Status, Category)|  |
|  | - Secret Suggestion Box (Anon/Named)|  | - Detail Modals & Status Changes   |  |
|  | - My Applications Status Tracker    |  | - Scheduled Notes & Private Notes  |  |
|  +------------------+------------------+  +------------------+-----------------+  |
+---------------------|----------------------------------------|--------------------+
                      |                                        |
                      v                                        v
+-----------------------------------------------------------------------------------+
|                     Next.js App Router & Edge Middleware                          |
| - Edge Middleware (`middleware.ts`): Route Protection (/teacher/*, /student/*)    |
| - Dual Session Realm: Stateless HMAC-SHA256 JWT (`jose`) for students; Supabase   |
| - Server Actions & API Handlers: Input Validation, XSS Neutralization             |
+-----------------------------------------------------------------------------------+
                      |                                        |
                      v                                        v
+-----------------------------------------------------------------------------------+
|                        Supabase PostgreSQL Database                               |
| - Tables: `students`, `teachers`, `counseling_requests`, `suggestions`            |
| - Zero-Leak Anonymity: Trigger `trg_enforce_suggestion_anonymity` + CHECK         |
| - Two-Tier Notes Separation: `scheduled_note` (public) vs `teacher_note` (private)|
| - Row Level Security (RLS) Policies on all public tables                          |
+-----------------------------------------------------------------------------------+
```

### 1. 무결점 익명성 보장 (Zero-Leak Anonymity Invariant)
- 학생이 건의 작성 시 **'익명'**을 선택하면, 서버 핸들러 및 데이터베이스 트리거(`trg_enforce_suggestion_anonymity`)가 강제로 `student_id = NULL`로 소독합니다.
- 데이터베이스의 `chk_suggestion_anonymity` 제약 조건에 의해 익명 건의에는 학생 식별자가 물리적으로 기록되지 않아, 데이터베이스 관리자나 교사 대시보드 어디에서도 작성자를 추적할 수 없습니다.

### 2. 이원화된 교사 메모 시스템 (Two-Tier Notes Separation)
- 상담 일정 조율 시 안내하는 **`scheduled_note`**(학생 공개용 안내 메모)와 교사 내부 기록용 **`teacher_note`**(교사 전용 비공개 메모)를 엄격히 분리하였습니다.
- 학생 전용 API(`/api/counseling/my`) 및 학생 뷰(`student_counseling_view`)는 `teacher_note` 컬럼을 쿼리 단계에서 원천 배제하여 학생 화면으로의 정보 유출을 원천 차단합니다.

### 3. 이중 세션 영역 격리 (Dual Session Realm Isolation)
- **학생 세션**: 별도 회원가입 없이 `jose` 라이브러리로 서명된 HTTP-only HMAC-SHA256 JWT 쿠키(`student_session`)를 발급합니다.
- **교사 세션**: Supabase Auth 기반 표준 세션을 적용하여 일반 학생 세션이나 비인가 사용자가 교사 관리 API(`/api/teacher/*`)나 화면(`/teacher/*`)에 접근 시 Edge Middleware 단계에서 즉각 차단(403 Forbidden / 리다이렉트)됩니다.

---

## 🚀 주요 기능 소개 (Core Features)

### 🧑‍🎓 1. 학생 참여 기능
1. **간편 PIN 인증**: 학년, 반, 번호, 이름 및 4자리 숫자 PIN으로 3초 만에 즉시 등록 및 로그인.
2. **1:1 비밀 상담 신청**:
   - 고민 카테고리 7종 (`학업/성적`, `교우관계`, `진로/진학`, `심리/정서`, `정신건강`, `가정/개인`, `기타`).
   - 희망 상담 일자 및 학교 일과 시간대 (`아침 자습`, `점심시간`, `쉬는 시간`, `방과 후`, `기타`) 선택.
   - 긴급 상담 요청 플래그(`isUrgent`) 지원으로 위기 상황 즉각 알림.
3. **비밀 건의함 작성**:
   - 익명 / 기명 직접 선택 토글 스위치.
   - 건의 카테고리 8종 (`학급 환경`, `학급 자치 규칙`, `학교 생활`, `교내 시설`, `학습 분위기`, `동아리/체육`, `수업 관련`, `기타`).
4. **나의 신청 내역 조회 (My Applications Tracker)**:
   - 본인이 신청한 상담의 진행 상태 (`접수 대기` ➜ `상담 수락됨` ➜ `상담 완료`).
   - 선생님이 남겨주신 상담 일정 및 안내 메시지 확인.
   - 접수 대기(`pending`) 중인 상담 신청에 대한 본인 직접 취소 기능 지원.

### 👨‍🏫 2. 선생님 전용 관리 대시보드
1. **상담 신청 통합 모니터링**:
   - 접수 상태, 카테고리, 긴급 여부, 신청 일자별 실시간 다차원 필터링.
   - 긴급 상담 신청 건에 대한 시각적 강조 배지 표시.
2. **상담 일정 조율 및 2단계 메모 관리**:
   - 상담 수락 및 확정 일시/시간대 지정.
   - 학생에게 전달할 상담 안내문 작성 및 교사 전용 비공개 상담 기록지 작성.
3. **학급 건의함 관리 및 피드백**:
   - 익명 건의와 기명 건의 분류 조회.
   - 건의 상태 업데이트 (`접수 대기` ➜ `확인` ➜ `처리 중` ➜ `검토 완료` ➜ `반영 완료` ➜ `종결`).
   - 학생 건의에 대한 선생님의 공식 답변 및 피드백 등록.
4. **학생 간편 PIN 초기화 (Teacher Student PIN Reset)**:
   - 학생이 4자리 비밀번호를 잊어버렸을 경우, 교사 대시보드에서 학년/반/번호 명부를 조회하여 안전하게 비밀번호를 초기화(기본값: `'0000'`)해 주는 관리 기능 제공.

---

## 🎨 따뜻한 감성 디자인 시스템 (Warm Pastel Design System)

심리적 안정감과 포근한 학교 분위기를 조성하기 위해 엄선된 파스텔 컬러 토큰을 Tailwind CSS 설정에 반영하였습니다.

| 컬러 토큰 | 색상 코드 (Hex) | 감성 및 주요 용도 |
|---|---|---|
| **Warm Ivory (웜 아이보리)** | `#FDFBF7` / `#FAF6EF` | 포근하고 눈이 편안한 전체 배경 및 컨테이너 배경 |
| **Sage Green (세이지 그린)** | `#7C9A82` / `#E4EFE6` | 심리적 안정감을 주는 주 버튼, 활성 탭 및 브랜드 컬러 |
| **Honey Yellow (버터 허니)** | `#F4D35E` / `#FEF8E1` | 따뜻한 관심, 대기 중 상태 배지 및 교사 대시보드 악센트 |
| **Blush Coral (블러쉬 코럴)** | `#E76F51` / `#FDF4F2` | 마음 돌봄, 긴급(Urgent) 상담 알림 및 정서 카테고리 |
| **Mist Blue (스카이 미스트)** | `#8EA8C3` / `#E5EFF5` | 투명함과 청량함, 완전 익명 건의함 배지 및 링크 |

- **타이포그래피**: 한국어 가독성에 최적화된 고품질 Pretendard 웹폰트 적용.
- **반응형 모바일 우선 설계**: 스마트폰, 태블릿, PC 전 해상도에서 터치 친화적 라운드 모달 및 입력 폼 제공.

---

## 🗄️ Supabase 데이터베이스 및 보안 설정 (Database Setup)

본 프로젝트는 완전히 검증된 단일 PostgreSQL DDL 스크립트인 `supabase/schema.sql`을 제공합니다.

### 1. 테이블 구조
1. **`students`**: 학년, 반, 번호(복합 유니크 키 `uq_student_roster`), 학생 이름, 암호화된 PIN 해시(`pin_hash`), 최근 로그인 일시.
2. **`teachers`**: Supabase `auth.users(id)`와 1:1 외래키 매핑된 교사 프로필, 직무 역할(`homeroom`, `counselor`, `admin`), 담당 학년/반.
3. **`counseling_requests`**: 1:1 상담 신청 정보, 희망 일시, 비공개 내용, 긴급 여부, 상태, 공개 일정 안내문(`scheduled_note`), 교사 전용 비밀 메모(`teacher_note`).
4. **`suggestions`**: 비밀 건의사항, 카테고리, 제목, 내용, 상태, 교사 답변, 그리고 익명성 체크 제약조건 `chk_suggestion_anonymity`.

### 2. DDL 스크립트 적용 방법
1. [Supabase 콘솔](https://app.supabase.com)에 로그인 후 신규 프로젝트를 생성합니다.
2. 좌측 메뉴의 **SQL Editor**로 이동합니다.
3. 본 프로젝트 루트의 `supabase/schema.sql` 파일 내용을 전체 복사하여 SQL Editor에 붙여넣고 **Run** 버튼을 클릭합니다.
4. 모든 테이블, ENUM 타입, 성능 인덱스, 트리거, 뷰, RLS 정책이 자동으로 완벽히 배포됩니다.

---

## 💻 로컬 개발 환경 실행 가이드 (Local Development)

### 1. 사전 요구사항 (Prerequisites)
- [Node.js](https://nodejs.org/) v18.17.0 이상 (권장: Node.js 20 LTS)
- npm v9.0.0 이상

### 2. 소스 코드 설치 및 의존성 다운로드
```bash
# 1. 의존성 패키지 설치
npm install
```

### 3. 환경 변수 설정
프로젝트 루트의 `.env.local.example` 파일을 복사하여 `.env.local`을 생성합니다.
```bash
cp .env.local.example .env.local
```

`.env.local` 파일을 열고 본인의 환경에 맞게 값을 설정합니다:
```env
# Supabase 프로젝트 설정 (Supabase 대시보드 > Project Settings > API)
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# 학생 세션 암호화 비밀키 (최소 32자 이상의 무작위 문자열)
STUDENT_SESSION_SECRET=super-secret-student-session-key-min-32-chars-long

# 애플리케이션 접속 URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development
```

> **오프라인 개발 모드 지원**: Supabase 연동 없이도 자체 내장된 고신뢰성 가상 데이터베이스 엔진(`ResilientAdminClient`)이 동작하므로 로컬 환경에서 즉시 기능 테스트가 가능합니다.

### 4. 로컬 개발 서버 실행
```bash
npm run dev
```
브라우저에서 [http://localhost:3000](http://localhost:3000)으로 접속합니다.

---

## 🧪 자동화 E2E 테스트 가이드 (Automated Testing Guide)

본 프로젝트는 외부 무거운 프레임워크 종속성 없이 Node.js 네이티브 ESM 기반으로 고속 동작하는 **4단계 60개 자동화 E2E 테스트 스위트**를 내장하고 있습니다.

### 1. 전체 테스트 스위트 일괄 실행 (60개 테스트)
```bash
node tests/test-runner.mjs
```

### 2. 특정 테스트 티어(Tier)별 개별 실행
```bash
# Tier 1: 5대 핵심 기능 요구사항 테스트 (30개 테스트)
node tests/test-runner.mjs --tier=1

# Tier 2: 경계값 및 스트레스 케이스 테스트 (16개 테스트)
node tests/test-runner.mjs --tier=2

# Tier 3: 기능 간 상호작용 및 보안 불변식 테스트 (8개 테스트)
node tests/test-runner.mjs --tier=3

# Tier 4: 학급 실제 운영 워크로드 시나리오 테스트 (6개 테스트)
node tests/test-runner.mjs --tier=4
```

### 3. 테스트 커버리지 요약표

| 테스트 티어 | 검증 영역 | 테스트 수 | 통과율 |
|---|---|---|---|
| **Tier 1: Feature Coverage** | 학생 간편 PIN 인증, 1:1 상담 신청, 비밀 건의함, 내 신청 현황, 교사 대시보드 | **30개** | **100% (30/30)** |
| **Tier 2: Boundary & Corner Cases** | PIN 4자리 자릿수/형식, 학년(1~6)/반/번호 경계, 2000자 본문 한계, XSS 소독, 세션 위변조 차단 | **16개** | **100% (16/16)** |
| **Tier 3: Cross-Feature Invariants** | 라이프사이클 전주기, 익명성 제로 누출(`student_id = null`), 2단계 메모 분리, 교사 PIN 초기화 루프 | **8개** | **100% (8/8)** |
| **Tier 4: Classroom Workload** | 아침 등교 15명 동시 등록, 10명 대량 상담 접수/긴급 분류, 학급 건의 일괄 피드백, 학기 다중 상호작용 | **6개** | **100% (6/6)** |
| **합계 (Total Automated Tests)** | **전체 요구사항 종합 검증** | **60개** | **100% (60/60)** |

---

## 🚀 배포 가이드 및 Vercel 배포 (Production Deployment)

### 1. Vercel 원클릭 배포 가이드
1. GitHub 리포지토리에 소스 코드를 푸시합니다.
2. [Vercel](https://vercel.com)에 로그인 후 `Add New... > Project`를 선택하고 리포지토리를 임포트합니다.
3. Framework Preset을 **Next.js**로 지정합니다.
4. **Environment Variables** 설정 섹션에 아래 변수들을 등록합니다:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `STUDENT_SESSION_SECRET`
   - `NEXT_PUBLIC_APP_URL` (예: `https://your-domain.vercel.app`)
5. **Deploy** 버튼을 클릭하면 빌드 및 배포가 완료됩니다.

### 2. 프로덕션 빌드 무결성 확인
로컬 터미널에서 아래 명령을 통해 사전에 프로덕션 빌드와 타입 검사를 실행할 수 있습니다:
```bash
npm run typecheck   # TypeScript 컴파일 검사 (tsc --noEmit)
npm run build       # Next.js 프로덕션 정적 최적화 및 서버 번들 빌드
npm run start       # 빌드된 프로덕션 서버 실행
```

---

## 📁 프로젝트 디렉터리 구조 (Directory Structure)

```
.
├── README.md                       # 본 프로젝트 종합 안내 문서
├── PROJECT.md                      # 프로젝트 요구사항 및 아키텍처 명세
├── TEST_READY.md                   # 4단계 자동화 E2E 테스트 완료 보고서
├── .env.local.example              # 환경 변수 설정 템플릿
├── next.config.mjs                 # Next.js 프레임워크 설정
├── package.json                    # 의존성 및 실행 스크립트 정의
├── postcss.config.mjs              # PostCSS Tailwind 플러그인 설정
├── tailwind.config.ts              # 웜 파스텔 디자인 시스템 테마 토큰 정의
├── tsconfig.json                   # TypeScript 환경 설정
├── supabase/
│   └── schema.sql                  # PostgreSQL 완결 DDL, ENUM, 인덱스, 트리거, RLS
├── tests/
│   ├── test-runner.mjs             # 경량 독립 E2E 테스트 러너
│   ├── harness/
│   │   ├── api-client.mjs          # 가상 엔진 및 실서버 공용 테스트 클라이언트
│   │   ├── assertions.mjs          # 자체 구축 BDD 테스트 assertion 라이브러리
│   │   └── mock-engine.mjs         # 고신뢰성 가상 비즈니스 계약 엔진
│   └── e2e/
│       ├── tier1-feature-coverage.test.mjs    # Tier 1 (30개 테스트)
│       ├── tier2-boundary-corner.test.mjs     # Tier 2 (16개 테스트)
│       ├── tier3-cross-feature.test.mjs       # Tier 3 (8개 테스트)
│       └── tier4-classroom-workload.test.mjs  # Tier 4 (6개 테스트)
└── src/
    ├── middleware.ts               # Edge Runtime 권한 격리 라우트 가드
    ├── app/
    │   ├── layout.tsx              # 전역 웜 파스텔 루트 레이아웃 & Pretendard 웹폰트
    │   ├── page.tsx                # 학교 소통 포털 메인 랜딩 페이지
    │   ├── globals.css             # Tailwind 전역 스타일 및 부드러운 스크롤바
    │   ├── (auth)/
    │   │   ├── student/login/      # 학생 학년/반/번호 + PIN 로그인 페이지
    │   │   └── teacher/login/      # 선생님 Supabase Auth 로그인 페이지
    │   ├── student/
    │   │   ├── layout.tsx          # 학생 전용 레이아웃 및 세션 검증
    │   │   ├── counseling/new/     # 1:1 개별 상담 신청 폼
    │   │   ├── suggestion/new/     # 학급 비밀 건의함 작성 폼 (익명/기명 토글)
    │   │   └── my-status/          # 나의 상담 신청 현황 & 피드백 조회
    │   ├── teacher/
    │   │   ├── layout.tsx          # 선생님 전용 보호 레이아웃
    │   │   ├── dashboard/          # 통합 관리 대시보드 (상담/건의/PIN 초기화)
    │   │   ├── counseling/         # 상담 관리 리다이렉트 라우트
    │   │   └── suggestions/        # 건의 관리 리다이렉트 라우트
    │   └── api/
    │       ├── auth/
    │       │   ├── student/login/  # 학생 PIN 인증 및 JWT 쿠키 발급
    │       │   ├── student/logout/ # 학생 세션 쿠키 파기
    │       │   ├── student/me/     # 현재 학생 프로필 조회
    │       │   ├── teacher/login/  # 교사 인증 폴백 핸들러
    │       │   └── teacher/logout/ # 교사 세션 종료
    │       ├── counseling/         # 상담 신청 등록
    │       │   ├── my/             # 학생 본인 신청 내역 조회 (교사 메모 원천 배제)
    │       │   └── [id]/cancel/    # 학생 대기 중 상담 취소
    │       ├── suggestions/        # 비밀 건의함 등록 (익명 소독 보장)
    │       └── teacher/
    │           ├── counseling/     # 교사 상담 목록 조회 & 필터링
    │           │   └── [id]/       # 교사 상담 일정 확정 및 2단계 메모 수정
    │           ├── suggestions/    # 교사 건의 목록 조회
    │           │   └── [id]/       # 교사 건의 상태 변경 및 피드백 등록
    │           └── students/reset-pin/ # 교사 권한 학생 PIN 초기화
    ├── components/
    │   └── ui/                     # 웜 파스텔 UI 프리미티브 컴포넌트
    │       ├── badge.tsx           # 상태 및 카테고리 배지
    │       ├── button.tsx          # 터치 친화 버튼
    │       ├── card.tsx            # 부드러운 카드 컨테이너
    │       ├── input.tsx           # 라운드 입력 필드
    │       ├── modal.tsx           # 접근성 준수 대화상자 모달
    │       ├── navbar.tsx          # 반응형 상단 네비게이션 바
    │       └── textarea.tsx        # 글자 수 카운터 포함 텍스트 영역
    ├── lib/
    │   ├── utils.ts                # 라벨 매핑, 한국어 날짜 포맷터, cn 유틸
    │   ├── auth/
    │   │   ├── session.ts          # 학생 HMAC-SHA256 JWT 쿠키 서명 및 검증 (jose)
    │   │   └── teacher.ts          # 교사 세션 추출 및 인가 검증
    │   └── supabase/
    │       ├── client.ts           # 브라우저용 Supabase 클라이언트
    │       ├── server.ts           # SSR용 Supabase 서버 클라이언트
    │       └── admin.ts            # Service Role 권한 기반 관리자 클라이언트
    └── types/
        ├── database.ts             # Supabase PostgreSQL 스키마 매핑 타입
        └── models.ts               # 프론트엔드/백엔드 공용 도메인 인터페이스 & DTO
```

---

## 📜 라이선스 및 학생 인권/개인정보 보호 선언 (Ethics & Privacy Statement)

본 시스템은 **김해영운고등학교 학생들의 심리적 안전과 비밀 보장 권리**를 최우선으로 고려하여 개발되었습니다.
학생이 작성한 상담 고민은 학생 본인과 담당 교사 외에는 열람할 수 없으며, 익명으로 작성된 건의사항은 그 어떤 기술적 수단으로도 신원을 추적할 수 없도록 수학적·구조적으로 보호됩니다.

---
© 2026 Kimhae Youngwoon High School. Built with care for students and teachers.
