# Project: School 1:1 Counseling & Secret Suggestion Box (학급 개별 상담 신청 및 비밀 건의함)

## Architecture

A secure, warm, and responsive Next.js App Router application connecting students and teachers with complete role separation and zero-leak anonymity guarantees.

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
| - Server Actions & API Route Handlers: Input Validation, Anonymity Stripping      |
| - Dual Session: Stateless HMAC-SHA256 JWT (`jose`) for students; Supabase Auth    |
+-----------------------------------------------------------------------------------+
                      |                                        |
                      v                                        v
+-----------------------------------------------------------------------------------+
|                        Supabase PostgreSQL Database                               |
| - Tables: `students`, `teachers`, `counseling_requests`, `suggestions`            |
| - Zero-Leak Anonymity: `trg_enforce_suggestion_anonymity` + check constraint      |
| - Row Level Security (RLS) Policies on all public tables                          |
+-----------------------------------------------------------------------------------+
```

---

## Feature Inventory

Every feature from the survey phase is inventoried below with its assigned milestone.

| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Student Simple PIN Registration | Instant registration with Grade/Class/Number + Name + 4-digit PIN | M3 | survey (spec_miner_1) |
| 2 | Student Simple PIN Login | Fast verification with Grade/Class/Number + Name + 4-digit PIN | M3 | survey (spec_miner_1) |
| 3 | Student Session Management | Stateless secure HTTP-only JWT cookie (`student_session`) via `jose` | M3 | survey (explorer_3) |
| 4 | Teacher PIN Reset Action | Teacher capability to reset a student's forgotten PIN safely | M4 | survey (spec_miner_1) |
| 5 | 1:1 Confidential Counseling Request | Submission with verified student info, category, date/time, content | M3 | survey (spec_miner_1) |
| 6 | Counseling Category Picker | Categories: Friendship, Academic, Career, Emotion/Mental, Family, Other | M3 | survey (spec_miner_1) |
| 7 | Desired Date & Time Slot Picker | Date picker with school hours time slots (Morning, Lunch, After School) | M3 | survey (spec_miner_1) |
| 8 | Counseling Status Lifecycle | Transitions: `pending` -> `accepted` -> `completed` (or `cancelled`) | M3, M4 | survey (spec_miner_1) |
| 9 | Secret Suggestion Box Submission | Title, Category, Content submission with optional anonymity toggle | M3 | survey (spec_miner_1) |
| 10 | Suggestion Anonymity Toggle | Switch between 'Anonymous' and 'Identified (Teacher only)' | M1, M3 | survey (spec_miner_1, 2) |
| 11 | Suggestion Category Tagging | Categories: Classroom Environment, School Life, Facilities, Study, Other | M3 | survey (spec_miner_1) |
| 12 | "My Applications" Tracker | Student view of submitted counseling requests and teacher responses | M3 | survey (spec_miner_1) |
| 13 | Teacher Supabase Auth Login | Standard email/password login for authenticated teachers | M4 | survey (spec_miner_2) |
| 14 | Teacher Route Guard Middleware | Intercepts `/teacher/*`, verifies auth, redirects unauthenticated | M4 | survey (explorer_3) |
| 15 | Teacher Dashboard & Filtering | Tabbed views (Counseling, Suggestions) with status & category filters | M4 | survey (spec_miner_1) |
| 16 | Counseling Detail & Action Modal | Review content, update status (`accepted`/`completed`), schedule meeting | M4 | survey (spec_miner_1) |
| 17 | Teacher Two-Tier Notes | Public scheduled response (visible to student) vs private teacher notes | M4 | survey (spec_miner_1, 2) |
| 18 | Suggestion Reply & Status Update | Teacher reply to suggestions, status update (`received`/`in_progress`/`resolved`) | M4 | survey (spec_miner_1) |
| 19 | Urgency / Crisis Indicator | Highlights urgent counseling submissions for priority teacher response | M3, M4 | survey (spec_miner_1) |
| 20 | Supabase Schema DDL (`schema.sql`)| 4 tables, enums, composite keys, timestamps, indexes, foreign keys | M1 | survey (spec_miner_2) |
| 21 | Database RLS & Zero-Leak Trigger | Mandatory RLS, student query isolation, and trigger sanitizing anonymous rows | M1 | survey (spec_miner_2) |
| 22 | Environment Configuration | Complete `.env.local.example` with Supabase and session secrets | M1 | survey (spec_miner_2) |
| 23 | Warm Pastel Design Tokens | Tailwind palette: warm ivory, cream, sage green, honey, blush coral | M2 | survey (explorer_3) |
| 24 | Responsive UI Primitives | Accessible buttons, cards, badges, inputs, dialogs, navbar | M2 | survey (explorer_3) |
| 25 | Comprehensive E2E Test Suite | 4-tier requirement-driven test cases (Categories, BVA, Pairwise, Workload) | M5 | test-track |
| 26 | Production Build & Type Verification | Zero TypeScript error `npm run build`, security and forensic audit passes | M6 | final-milestone |

---

## Milestones

| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Database & Security Foundation | `supabase/schema.sql`, RLS policies, trigger-based anonymity enforcement, `.env.local.example` | none | DONE (Verified: 2 APPROVE, 2 CHALLENGE APPROVE, 1 AUDIT CLEAN) |
| M2 | Project Scaffold & Pastel UI System | Next.js 14/15 App Router setup, TypeScript, Tailwind config with pastel palette, shared UI components | M1 | PLANNED |
| M3 | Student Authentication & Core Features | PIN login/registration, stateless JWT cookie session, 1:1 counseling form, suggestion box with anonymity toggle, "My Applications" view | M2 | PLANNED |
| M4 | Teacher Portal & Management Dashboard | Supabase Auth login, Edge middleware `/teacher/*` route guard, live filtered view of counseling requests and suggestions, detail modal, notes, PIN reset | M2, M3 | PLANNED |
| M5 | E2E Testing Track | Independent requirement-driven test suite (Tiers 1-4), automated runner, test cases, published `TEST_READY.md` (60/60 tests pass) | M1 | DONE |
| M6 | Final Integration & Verification | Run full E2E test suite, adversarial coverage hardening (Tier 5), `npm run build`, type check, forensic audit, README.md | M3, M4, M5 | PLANNED |


---

## Interface Contracts

### 1. Student Auth Contract (`/api/auth/student/login` & `/api/auth/student/logout`)
- **Request Body (Login)**:
  ```json
  {
    "grade": 1,
    "classNumber": 2,
    "studentNumber": 15,
    "name": "홍길동",
    "pin": "1234"
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "student": {
      "id": "uuid",
      "grade": 1,
      "classNumber": 2,
      "studentNumber": 15,
      "name": "홍길동"
    }
  }
  ```
- **Cookie Set**: `student_session` (HTTP-only, Secure, SameSite=Lax, Max-Age=86400, signed HMAC-SHA256 JWT).
- **Errors**: 400 (Validation), 401 (Incorrect PIN for registered student), 429 (Rate limited).

### 2. 1:1 Counseling API Contract (`/api/counseling`)
- **POST Request**:
  - Headers: Cookie with valid `student_session`
  - Body:
    ```json
    {
      "category": "academic" | "friendship" | "career" | "emotional" | "family" | "other",
      "preferredDate": "YYYY-MM-DD",
      "preferredTimeSlot": "lunch" | "after_school" | "break_time",
      "content": "상담 요청 내용 (최대 1000자)",
      "isUrgent": false
    }
    ```
- **GET Request (`/api/counseling/my`)**:
  - Returns array of counseling requests matching authenticated student ID only.
  - Excludes `teacher_notes` (strictly confidential); includes `status`, `scheduled_date`, `scheduled_time_slot`, and `scheduled_note`.

### 3. Secret Suggestion Box API Contract (`/api/suggestions`)
- **POST Request**:
  - Headers: Optional `student_session` cookie
  - Body:
    ```json
    {
      "isAnonymous": true | false,
      "category": "classroom_environment" | "school_life" | "facility" | "study" | "other",
      "title": "건의 제목",
      "content": "건의 내용 (최대 1000자)"
    }
    ```
  - Server behavior: If `isAnonymous === true`, server forcefully sets `student_id = null` before writing to database.

### 4. Teacher Management API Contract (`/api/teacher/*`)
- **Headers**: Supabase Auth session token (Bearer or SSR cookie)
- **Routes**:
  - `GET /api/teacher/counseling`: List all counseling requests with status, category, date, and urgency filters.
  - `PATCH /api/teacher/counseling/[id]`: Update status (`accepted`, `completed`), set `scheduledDate`, `scheduledTimeSlot`, `scheduledNote`, and private `teacherNotes`.
  - `GET /api/teacher/suggestions`: List suggestions (anonymous ones have `student: null`).
  - `PATCH /api/teacher/suggestions/[id]`: Update status (`received`, `in_progress`, `resolved`) and write `teacherFeedback`.
  - `POST /api/teacher/students/reset-pin`: Teacher resets a student's PIN.

---

## Code Layout

```
.
├── .agents/                        # Agent metadata & reports (never source code)
├── .env.local.example              # Environment variable template
├── README.md                       # Local execution guide and documentation
├── next.config.mjs                 # Next.js configuration
├── package.json                    # Project dependencies and build scripts
├── postcss.config.mjs              # PostCSS Tailwind plugins
├── tailwind.config.ts              # Custom warm pastel theme tokens
├── tsconfig.json                   # TypeScript configuration
├── supabase/
│   └── schema.sql                  # Complete PostgreSQL DDL, enums, triggers, RLS
├── tests/
│   ├── e2e/                        # Automated E2E test suite (Tiers 1-4)
│   └── test-runner.mjs             # Standalone test runner
└── src/
    ├── middleware.ts               # Edge Route Guard for /teacher/* and /student/*
    ├── app/
    │   ├── layout.tsx              # Root HTML & body layout with warm pastel bg
    │   ├── page.tsx                # Landing portal (Student / Teacher entry)
    │   ├── (auth)/
    │   │   ├── student/login/      # Student Grade/Class/Number + PIN login
    │   │   └── teacher/login/      # Teacher Supabase Auth email login
    │   ├── student/
    │   │   ├── layout.tsx          # Student layout with pastel navbar & session check
    │   │   ├── counseling/new/     # 1:1 Counseling application form
    │   │   ├── suggestion/new/     # Secret Suggestion Box form with anonymity switch
    │   │   └── my-status/          # Student submitted requests tracker
    │   ├── teacher/
    │   │   ├── layout.tsx          # Teacher protected layout with dashboard nav
    │   │   ├── dashboard/          # Unified management dashboard with filters
    │   │   ├── counseling/         # Counseling requests management
    │   │   └── suggestions/        # Suggestion box management
    │   └── api/
    │       ├── auth/
    │       │   ├── student/        # Student PIN login / logout handlers
    │       │   └── teacher/        # Teacher Supabase Auth session handlers
    │       ├── counseling/         # Counseling submission and student list
    │       ├── suggestions/        # Suggestion submission
    │       └── teacher/            # Teacher admin APIs (counseling, suggestions, PIN reset)
    ├── components/
    │   ├── ui/                     # Pastel UI primitives (Button, Card, Badge, Input, Modal, Toast)
    │   ├── student/                # Student-specific components
    │   └── teacher/                # Teacher-specific components
    ├── lib/
    │   ├── supabase/
    │   │   ├── client.ts           # Browser Supabase client
    │   │   ├── server.ts           # SSR Supabase client
    │   │   └── admin.ts            # Service role client (for student auth verification)
    │   ├── auth/
    │   │   └── session.ts          # Stateless student JWT cookie signing & verification (jose)
    │   └── utils.ts                # Formatting, cn helper, pastel color mapping
    └── types/
        ├── database.ts             # Supabase generated database types
        └── models.ts               # DTO and domain interfaces
```
