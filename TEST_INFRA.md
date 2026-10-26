# Comprehensive Test Infrastructure & 4-Tier Test Architecture (TEST_INFRA.md)

**Project**: School 1:1 Counseling & Secret Suggestion Box (학급 전용 개별 상담 신청 및 비밀 건의함)  
**Document**: Test Infrastructure Specification, Methodology, and Test Case Catalog  
**Track**: Milestone M5 (E2E Testing Track)  
**Standard**: 4-Tier Requirement-Driven Methodology (Feature Coverage, Boundary & Corner, Cross-Feature, Classroom Workload)  
**Date**: 2026-10-26  

---

## 1. Executive Summary & Quality Philosophy

The Classroom 1:1 Counseling & Secret Suggestion Box application bridges students and teachers in sensitive psychological and educational contexts. Because this system handles student vulnerabilities, confidential guidance records, and anonymous disclosures, software defects carry severe emotional and privacy consequences:
- An anonymity leak in the suggestion box can permanently destroy student trust.
- A counseling record privacy violation (cross-student data leak) violates student privacy rights.
- A broken PIN login prevents students in distress from requesting help.
- A state synchronization error in the teacher dashboard could result in missed urgent crisis appointments.

To ensure unwavering software integrity, this test infrastructure is built upon a **4-tier requirement-driven verification methodology**. Every test case is derived directly from authoritative requirements (`ORIGINAL_REQUEST.md`, `PROJECT.md`, and `supabase/schema.sql`). Facade tests, dummy passes, and hardcoded results are strictly prohibited.

```
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                                   4-TIER TEST ARCHITECTURE                                  │
├─────────────────────────────────────────────────────────────────────────────────────────────┤
│  TIER 1: FEATURE COVERAGE (Core Functionality Verification)                                 │
│  • >=5 tests per core feature across all 5 user journeys                                    │
│  • Student Auth, 1:1 Counseling, Suggestion Box, My Status, Teacher Dashboard               │
├─────────────────────────────────────────────────────────────────────────────────────────────┤
│  TIER 2: BOUNDARY & CORNER CASES (Adversarial Robustness & Edge Inputs)                     │
│  • Non-4-digit PINs, boundary grades (1, 6, 0, 7), class/student limits                     │
│  • Empty/whitespace strings, max text limits (2000 chars), SQLi/XSS escaping, cookie tamper  │
├─────────────────────────────────────────────────────────────────────────────────────────────┤
│  TIER 3: CROSS-FEATURE INTERACTIONS (E2E State & Privacy Invariants)                        │
│  • Student Submit -> Teacher Triage -> Scheduled Note Reflection                            │
│  • Mathematical Zero-Leak Anonymity (DB trigger & CHECK constraint verification)            │
│  • Cross-student tenant isolation & state machine immutability                              │
├─────────────────────────────────────────────────────────────────────────────────────────────┤
│  TIER 4: CLASSROOM WORKLOAD SCENARIOS (Real-World High-Fidelity Simulation)                 │
│  • Morning rush roster enrollment (batch parallel student logins)                           │
│  • High-volume counseling triage with mixed urgency flags                                    │
│  • Classroom weekly suggestion roundup & full academic term lifecycle                        │
└─────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Test Framework & Zero-Dependency Runner Architecture

The test harness is implemented in modern ECMAScript Modules (`.mjs`) using native Node.js standard libraries (`node:assert`, `node:crypto`, `node:http`). It operates in two complementary modes:

1. **Virtual Engine Mode (In-Process Contract Simulation)**:
   - Evaluates system logic against a zero-dependency contract engine (`tests/harness/mock-engine.mjs`).
   - Enforces exact PostgreSQL schema checks, check constraints (`chk_suggestion_anonymity`), salted Bcrypt/SHA-256 PIN hashing, HMAC-SHA256 JWT cookie parsing (`jose` compliant), and RLS policy filtering.
   - Guarantees instant, deterministic test execution with zero external network or database dependencies.

2. **Live Integration Mode (HTTP E2E Mode)**:
   - When configured with `TEST_BASE_URL` (e.g., `http://localhost:3000`), the unified test client (`tests/harness/api-client.mjs`) issues real HTTP requests over the network against the running Next.js App Router server.
   - Automatically handles cookie jars, Set-Cookie headers for `student_session`, and Bearer tokens for teacher authentication.

---

## 3. Authoritative Expected Output Derivation Matrix

Every test case derives its inputs and expected outputs from authoritative sources:

| Feature / Domain | Authoritative Source | Input Parameters | Authoritative Expected Output |
|---|---|---|---|
| **Student Enrollment** | `ORIGINAL_REQUEST.md` § R1, `PROJECT.md` § 1 | Grade: 1..6, Class: 1..30, Number: 1..60, Name: String, PIN: `^\d{4}$` | `200 OK` (or `201 Created`), `student_session` cookie issued, salted hash stored, student profile returned. |
| **Student Auth (Wrong PIN)** | `spec_miner_survey_1` § 2.1.3 | Existing roster matching Grade/Class/Num + incorrect 4-digit PIN | `401 Unauthorized`, error: `"비밀번호(PIN)가 일치하지 않습니다"`, no cookie issued. |
| **Student Auth (Name Spoof)**| `spec_miner_survey_1` § 2.1.3 | Existing roster matching Grade/Class/Num + differing student name | `400 Bad Request`, error: `"이미 등록된 다른 학생이 있습니다"`, registration blocked. |
| **Counseling Submission** | `PROJECT.md` § 2, `supabase/schema.sql` § 3.3 | Valid session, `category`, `preferredDate`, `preferredTimeSlot`, `content`, `isUrgent` | `201 Created`, row inserted with `status: 'pending'`, `student_id` linked, `teacher_note: null`. |
| **Urgent Counseling Flag** | `ORIGINAL_REQUEST.md` § R1, `PROJECT.md` § Feature 19 | Valid counseling with `isUrgent: true` | `201 Created`, database `is_urgent = true`, teacher priority query matches row. |
| **Secret Suggestion (Anon)** | `ORIGINAL_REQUEST.md` § R1, `PROJECT.md` § 3, `schema.sql` § 3.4 | `isAnonymous: true`, `category`, `title`, `content`, malicious `student_id` injected | `201 Created`, `student_id` forced to `NULL` by trigger, `chk_suggestion_anonymity` satisfied, zero identity trace. |
| **Secret Suggestion (Named)**| `ORIGINAL_REQUEST.md` § R1, `PROJECT.md` § 3, `schema.sql` § 3.4 | `isAnonymous: false`, valid student session, `title`, `content` | `201 Created`, `student_id` correctly bound to author, visible only in teacher portal. |
| **My Applications Privacy** | `ORIGINAL_REQUEST.md` § R1, `PROJECT.md` § 2, `schema.sql` § 7 | Student session querying `/api/counseling/my` | `200 OK`, list containing ONLY current student's requests; `teacher_note` strictly absent from payload. |
| **Teacher Triage Action** | `ORIGINAL_REQUEST.md` § R2, `PROJECT.md` § 4 | Teacher auth, target counseling ID, `status: 'accepted'`, `scheduledDate`, `scheduledNote`, `teacherNote` | `200 OK`, status updated, student can view `scheduledNote`, `teacherNote` stored securely. |
| **Teacher PIN Reset** | `PROJECT.md` § Feature 4, `spec_miner_survey_1` § 2.5.4 | Teacher auth, target student ID, new PIN or reset flag | `200 OK`, student PIN updated; student can authenticate with reset credentials immediately. |

---

## 4. Test Case Catalog: Tiers 1 through 4

### 4.1 Tier 1: Feature Coverage (30 Test Cases)

#### Module 1: Student Simple PIN Authentication & Session (6 Tests)
- `TC-T1-AUTH-01`: Fresh student enrollment with valid Grade, Class, Number, Korean Name, and 4-digit PIN.
- `TC-T1-AUTH-02`: Existing registered student successful login with correct PIN and identical Name.
- `TC-T1-AUTH-03`: Rejection of login attempt with valid roster but incorrect PIN (401 Unauthorized).
- `TC-T1-AUTH-04`: Rejection of enrollment attempt with existing roster but mismatched student Name (400 Bad Request).
- `TC-T1-AUTH-05`: Student logout clears session cookie with `Max-Age=0` and invalidates authenticated state.
- `TC-T1-AUTH-06`: Verification of `/api/auth/student/me` returns student identity matching signed session cookie.

#### Module 2: 1:1 Confidential Counseling Request (6 Tests)
- `TC-T1-COUN-01`: Authenticated student submits standard counseling request (status initialized to `pending`).
- `TC-T1-COUN-02`: Urgent counseling submission (`isUrgent: true`) sets priority flag in database.
- `TC-T1-COUN-03`: Unauthenticated student submission rejected with 401 Unauthorized.
- `TC-T1-COUN-04`: Verification of all standard counseling categories (`academic`, `friendship`, `career`, `emotional`, `family`, `other`).
- `TC-T1-COUN-05`: Verification of all valid time slots (`morning`, `lunch`, `break_time`, `after_school`, `other`).
- `TC-T1-COUN-06`: Counseling request persistence verifies correct student association and timestamp tracking.

#### Module 3: Secret Suggestion Box (6 Tests)
- `TC-T1-SUGG-01`: Anonymous suggestion submission (`isAnonymous: true`) persists with `student_id = null`.
- `TC-T1-SUGG-02`: Identified suggestion submission (`isAnonymous: false`) correctly attaches authenticated `student_id`.
- `TC-T1-SUGG-03`: Malicious payload sending `isAnonymous: true` with spoofed `student_id` is sanitized to `student_id = null`.
- `TC-T1-SUGG-04`: Suggestion category tagging covers all defined categories (`classroom_environment`, `classroom_rule`, `school_life`, `facility`, `study`, `other`).
- `TC-T1-SUGG-05`: Teacher replies to suggestion, recording `teacherReply` and updating status to `in_progress` or `resolved`.
- `TC-T1-SUGG-06`: Anonymous suggestion read by teacher returns `student: null` ensuring zero author identity disclosure.

#### Module 4: Student "My Applications" Status Tracker (6 Tests)
- `TC-T1-STAT-01`: Student queries `/api/counseling/my` and receives strictly their own submitted requests.
- `TC-T1-STAT-02`: Strict isolation verifies `teacherNote` is completely omitted from student response payload.
- `TC-T1-STAT-03`: When teacher updates status to `accepted` with `scheduledNote`, student view immediately reflects update.
- `TC-T1-STAT-04`: When teacher completes counseling, student view shows `completed` status with completed timestamp.
- `TC-T1-STAT-05`: Student can cancel a `pending` counseling request, transitioning status to `cancelled`.
- `TC-T1-STAT-06`: Student cancellation is rejected if request is already `accepted` or `completed`.

#### Module 5: Teacher Management Dashboard & Administration (6 Tests)
- `TC-T1-TEAC-01`: Unauthenticated / non-teacher access to `/api/teacher/*` is blocked (401/403).
- `TC-T1-TEAC-02`: Teacher retrieves all counseling requests with multi-status filtering (`pending`, `accepted`, `completed`).
- `TC-T1-TEAC-03`: Teacher filters counseling requests by urgency flag (`isUrgent = true`) for priority triage.
- `TC-T1-TEAC-04`: Teacher triage action updates status, sets meeting schedule, guidance note, and internal private note.
- `TC-T1-TEAC-05`: Teacher lists suggestions with anonymity filter (`all`, `anonymous_only`, `identified_only`).
- `TC-T1-TEAC-06`: Teacher resets student PIN, enabling student to regain account access immediately.

---

### 4.2 Tier 2: Boundary & Corner Cases (16 Test Cases)

- `TC-T2-BND-01`: PIN length boundary — reject 3-digit PIN (`"123"`).
- `TC-T2-BND-02`: PIN length boundary — reject 5-digit PIN (`"12345"`).
- `TC-T2-BND-03`: PIN format boundary — reject non-numeric PIN (`"12a4"`, `"abcd"`, `"!@#$"`).
- `TC-T2-BND-04`: Grade boundary — reject Grade 0 (below min 1).
- `TC-T2-BND-05`: Grade boundary — accept Grade 1 (min) and Grade 6 (max).
- `TC-T2-BND-06`: Grade boundary — reject Grade 7 (above max 6).
- `TC-T2-BND-07`: Class number boundary — reject Class 0 and Class 31.
- `TC-T2-BND-08`: Student number boundary — reject Number 0 and Number 61.
- `TC-T2-BND-09`: Empty input validation — reject empty student name, whitespace-only name (`"   "`).
- `TC-T2-BND-10`: Empty content validation — reject whitespace-only counseling content and suggestion content.
- `TC-T2-BND-11`: Content length limit — accept content at boundary length (2000 characters).
- `TC-T2-BND-12`: Content length overflow — reject or truncate content exceeding maximum length (2001+ characters).
- `TC-T2-BND-13`: Special character escaping — preserve Korean text with quotes, brackets, and emojis (`"상담 요청: '안녕' & <테스트> 😊"`).
- `TC-T2-BND-14`: Tampered JWT cookie — session with altered payload or invalid signature is rejected (401 Unauthorized).
- `TC-T2-BND-15`: Expired session handling — session with past timestamp is rejected cleanly.
- `TC-T2-BND-16`: Database check constraint violation — verify suggestion table constraint `chk_suggestion_anonymity`.

---

### 4.3 Tier 3: Cross-Feature Interactions & Privacy Invariants (8 Test Cases)

- `TC-T3-XFT-01`: **Student Submit -> Teacher Triage -> Student Status Reflection Loop**:
  Full lifecycle from student submission through teacher acceptance and meeting scheduling to student status verification.
- `TC-T3-XFT-02`: **Zero-Leak Anonymity Verification Across Whole Stack**:
  Submitting anonymous suggestion guarantees zero author identity in DB storage, teacher API response, and audit trails.
- `TC-T3-XFT-03`: **Cross-Student Data Isolation (Tenant Boundary)**:
  Student A and Student B both submit requests; Student A cannot access Student B's counseling request via any endpoint.
- `TC-T3-XFT-04`: **Two-Tier Notes Separation**:
  Verifies that `teacherNote` (private guidance record) is visible to teacher while `scheduledNote` (public response) is visible to student.
- `TC-T3-XFT-05`: **Lifecycle State Immutability**:
  Once a counseling request is marked `completed` by teacher, student cannot alter, cancel, or re-open the request.
- `TC-T3-XFT-06`: **Teacher PIN Reset & Student Re-authentication Flow**:
  Student forgets PIN -> Teacher resets PIN in dashboard -> Student authenticates with new PIN and continues using the system.
- `TC-T3-XFT-07`: **Dual Realm Session Isolation**:
  Student session cookie cannot access `/api/teacher/*`; Teacher auth token cannot act as student session.
- `TC-T3-XFT-08`: **Anonymous Suggestion Follow-Up & Public Feedback Loop**:
  Teacher replies to anonymous suggestion; status updates to `resolved`; system maintains anonymity throughout feedback cycle.

---

### 4.4 Tier 4: Real-World Classroom Workload Scenarios (6 Test Cases)

- `TC-T4-WKL-01`: **Morning Classroom Roster Enrollment Rush**:
  Simulate 15 students from Grade 2 Class 3 enrolling simultaneously during morning homeroom session; verify roster uniqueness and zero session collision.
- `TC-T4-WKL-02`: **High-Volume Mixed Counseling Submissions**:
  10 students submit counseling requests across various categories (academic, friendship, emotional) with 3 flagged as urgent; verify all persist accurately.
- `TC-T4-WKL-03`: **Teacher Comprehensive Triage Session**:
  Teacher logs in, identifies 3 urgent cases first, schedules meetings for 5 students with personalized guidance notes, and closes 2 finished cases.
- `TC-T4-WKL-04`: **Weekly Classroom Suggestion Roundup**:
  8 students submit mixed suggestions (5 anonymous, 3 identified); teacher reviews all, writes replies for facilities and rules, updates statuses to `in_progress` and `resolved`.
- `TC-T4-WKL-05`: **End-to-End Multi-Student Academic Term Lifecycle**:
  Full simulation of an entire academic month: enrollment, counseling submissions, teacher triage, PIN reset for forgotten student, suggestion feedback loop, and final review.
- `TC-T4-WKL-06`: **Stress & Concurrency Resilience Scenario**:
  Sequential burst of 50 student requests with alternating auth, counseling, and suggestion payloads to verify zero state leakage and memory stability.

---

## 5. Execution Protocol & Verification Commands

### 5.1 Standalone Test Runner Execution

To execute the entire test suite across all 4 tiers:
```bash
node tests/test-runner.mjs
```

To execute a specific tier independently:
```bash
node tests/test-runner.mjs --tier=1    # Run Tier 1 Feature Coverage
node tests/test-runner.mjs --tier=2    # Run Tier 2 Boundary & Corner Cases
node tests/test-runner.mjs --tier=3    # Run Tier 3 Cross-Feature Interactions
node tests/test-runner.mjs --tier=4    # Run Tier 4 Classroom Workload Scenarios
```

To execute against a running Next.js live server:
```bash
TEST_BASE_URL=http://localhost:3000 node tests/test-runner.mjs
```

### 5.2 Verification Gates & Success Criteria

1. **Pass Rate**: 100% of tests must pass (0 failed tests).
2. **Execution Cleanliness**: Process exit code must be `0`.
3. **No Facade Checks**: All assertions must evaluate real cryptographic, database constraint, and state machine values.
4. **Anonymity Guarantee**: `TC-T1-SUGG-01`, `TC-T1-SUGG-03`, `TC-T3-XFT-02` must strictly confirm `student_id === null`.
5. **Privacy Guarantee**: `TC-T1-STAT-02` and `TC-T3-XFT-04` must strictly confirm `teacher_note` is never returned to student callers.
