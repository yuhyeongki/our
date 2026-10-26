-- =============================================================================
-- KIMHAE YOUNGWOON HIGH SCHOOL COUNSELING & SECRET SUGGESTION BOX PLATFORM
-- (김해영운고등학교 1:1 개별 상담 신청 및 비밀 건의함 시스템)
-- SUPABASE POSTGRESQL SCHEMA DEFINITION, ROW LEVEL SECURITY & TRIGGERS
-- =============================================================================

-- =============================================================================
-- 1. EXTENSIONS
-- =============================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================================
-- 2. CUSTOM ENUM TYPES
-- =============================================================================

-- 2.1 Counseling Status Lifecycle
DO $$ BEGIN
    CREATE TYPE counseling_status_enum AS ENUM (
        'pending',      -- 접수 대기 (신청 직후 기본값)
        'accepted',     -- 상담 수락 및 일정 조율 중
        'completed',    -- 상담 완료
        'cancelled'     -- 신청 취소
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Alias for flexible type binding
DO $$ BEGIN
    CREATE TYPE counseling_status AS ENUM (
        'pending', 'accepted', 'completed', 'cancelled'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2.2 Counseling Category
DO $$ BEGIN
    CREATE TYPE counseling_category_enum AS ENUM (
        'academic',       -- 학업/성적 고민
        'friendship',     -- 교우관계/친구 고민
        'career',         -- 진로/진학 고민
        'emotional',      -- 심리/정서적 어려움
        'mental_health',  -- 정신 건강 / 스트레스
        'family',         -- 가정/개인 문제
        'other'           -- 기타 고민
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE counseling_category AS ENUM (
        'academic', 'friendship', 'career', 'emotional', 'mental_health', 'family', 'other'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2.3 Counseling Time Slot
DO $$ BEGIN
    CREATE TYPE counseling_time_slot_enum AS ENUM (
        'morning',       -- 등교 전/아침 자습 시간
        'lunch',         -- 점심시간
        'break_time',    -- 쉬는 시간
        'after_school',  -- 방과 후
        'other'          -- 기타 협의 시간
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE counseling_time_slot AS ENUM (
        'morning', 'lunch', 'break_time', 'after_school', 'other'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2.4 Suggestion Status Lifecycle
DO $$ BEGIN
    CREATE TYPE suggestion_status_enum AS ENUM (
        'pending',      -- 접수 대기
        'received',     -- 교사 확인 접수
        'in_progress',  -- 검토/처리 진행 중
        'reviewed',     -- 검토 완료
        'resolved',     -- 건의 사항 반영/해결 완료
        'dismissed'     -- 종결 또는 보류
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE suggestion_status AS ENUM (
        'pending', 'received', 'in_progress', 'reviewed', 'resolved', 'dismissed'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2.5 Suggestion Category
DO $$ BEGIN
    CREATE TYPE suggestion_category_enum AS ENUM (
        'classroom_environment', -- 학급 환경/온도/청결
        'classroom_rule',        -- 학급 규칙/자치
        'school_life',           -- 학교 생활/행사
        'facility',              -- 교내 시설/비품
        'study',                 -- 학습 분위기/자습
        'activity',              -- 동아리/체육 활동
        'learning',              -- 수업 관련
        'other'                  -- 기타 건의
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE suggestion_category AS ENUM (
        'classroom_environment', 'classroom_rule', 'school_life', 'facility', 'study', 'activity', 'learning', 'other'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2.6 Teacher Role
DO $$ BEGIN
    CREATE TYPE teacher_role_enum AS ENUM (
        'homeroom',   -- 담임 교사
        'counselor',  -- 전문 상담 교사
        'admin'       -- 시스템 관리자/교무
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE teacher_role AS ENUM (
        'homeroom', 'counselor', 'admin'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- =============================================================================
-- 3. TABLES DEFINITION & CONSTRAINTS
-- =============================================================================

-- 3.1 STUDENTS TABLE
-- Stores student identities and salted PIN hashes.
CREATE TABLE IF NOT EXISTS public.students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    grade SMALLINT NOT NULL CHECK (grade BETWEEN 1 AND 6),
    class_number SMALLINT NOT NULL CHECK (class_number BETWEEN 1 AND 30),
    student_number SMALLINT NOT NULL CHECK (student_number BETWEEN 1 AND 60),
    name VARCHAR(50) NOT NULL CHECK (length(trim(name)) > 0),
    pin_hash VARCHAR(255) NOT NULL CHECK (length(pin_hash) >= 4),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    last_login_at TIMESTAMPTZ,
    CONSTRAINT uq_student_roster UNIQUE (grade, class_number, student_number)
);

COMMENT ON TABLE public.students IS 'Student roster with simple PIN authentication credentials';
COMMENT ON COLUMN public.students.grade IS 'Student grade level (1-6)';
COMMENT ON COLUMN public.students.class_number IS 'Student classroom number (1-30)';
COMMENT ON COLUMN public.students.student_number IS 'Student attendance/roster number (1-60)';
COMMENT ON COLUMN public.students.pin_hash IS 'Salted Bcrypt or Argon2 hash of 4-digit PIN (minimum length enforced)';

-- 3.2 TEACHERS TABLE
-- Maps Supabase Auth users to teacher administrative profiles.
CREATE TABLE IF NOT EXISTS public.teachers (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL UNIQUE,
    name VARCHAR(50) NOT NULL CHECK (length(trim(name)) > 0),
    role teacher_role_enum NOT NULL DEFAULT 'homeroom',
    grade SMALLINT CHECK (grade BETWEEN 1 AND 6),
    class_number SMALLINT CHECK (class_number BETWEEN 1 AND 30),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

COMMENT ON TABLE public.teachers IS 'Teacher profiles bound to Supabase Auth users';
COMMENT ON COLUMN public.teachers.id IS 'Foreign key matching auth.users(id)';
COMMENT ON COLUMN public.teachers.role IS 'Teacher duty role: homeroom, counselor, or admin';

-- 3.3 COUNSELING REQUESTS TABLE
-- Stores confidential 1:1 counseling appointments, status, and teacher-exclusive notes.
CREATE TABLE IF NOT EXISTS public.counseling_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    category counseling_category_enum NOT NULL,
    preferred_date DATE NOT NULL,
    preferred_time_slot counseling_time_slot_enum NOT NULL DEFAULT 'lunch',
    content TEXT NOT NULL CHECK (length(trim(content)) > 0),
    is_urgent BOOLEAN NOT NULL DEFAULT false,
    status counseling_status_enum NOT NULL DEFAULT 'pending',
    response_message TEXT,
    teacher_note TEXT,
    assigned_teacher_id UUID REFERENCES public.teachers(id) ON DELETE SET NULL,
    scheduled_at TIMESTAMPTZ,
    scheduled_date DATE,
    scheduled_time_slot counseling_time_slot_enum,
    scheduled_note TEXT,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

COMMENT ON TABLE public.counseling_requests IS 'Confidential 1:1 student counseling requests';
COMMENT ON COLUMN public.counseling_requests.is_urgent IS 'Crisis or high priority flag indicating expedited teacher attention';
COMMENT ON COLUMN public.counseling_requests.teacher_note IS 'Private notes visible exclusively to teachers (never sent to student)';
COMMENT ON COLUMN public.counseling_requests.response_message IS 'Scheduled guidance or feedback visible to requesting student';

-- 3.4 SUGGESTIONS TABLE (SECRET SUGGESTION BOX)
-- Supports verified anonymous submissions and identified submissions with zero-leak guarantees.
CREATE TABLE IF NOT EXISTS public.suggestions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    is_anonymous BOOLEAN NOT NULL DEFAULT true,
    student_id UUID REFERENCES public.students(id) ON DELETE SET NULL,
    category suggestion_category_enum NOT NULL,
    title VARCHAR(200) NOT NULL CHECK (length(trim(title)) > 0),
    content TEXT NOT NULL CHECK (length(trim(content)) > 0),
    status suggestion_status_enum NOT NULL DEFAULT 'pending',
    teacher_reply TEXT,
    replied_by UUID REFERENCES public.teachers(id) ON DELETE SET NULL,
    replied_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    -- Anonymity mathematical integrity check:
    CONSTRAINT chk_suggestion_anonymity CHECK (
        (is_anonymous = true AND student_id IS NULL) OR
        (is_anonymous = false AND student_id IS NOT NULL)
    )
);

COMMENT ON TABLE public.suggestions IS 'Secret suggestion box with mathematical anonymity guarantees';
COMMENT ON CONSTRAINT chk_suggestion_anonymity ON public.suggestions IS 'Enforces that anonymous records have student_id NULL, while non-anonymous have student_id NOT NULL';

-- =============================================================================
-- 4. PERFORMANCE INDEXES
-- =============================================================================

-- Note: uq_student_roster constraint automatically creates a unique B-tree index on (grade, class_number, student_number).
-- Drop redundant duplicate index if previously created.
DROP INDEX IF EXISTS public.idx_students_lookup;

-- Counseling queries by student (for "My Applications" tab)
CREATE INDEX IF NOT EXISTS idx_counseling_student 
    ON public.counseling_requests (student_id);

-- Counseling dashboard filtering by status and date
CREATE INDEX IF NOT EXISTS idx_counseling_status_date 
    ON public.counseling_requests (status, preferred_date DESC);

-- Counseling filtering by category
CREATE INDEX IF NOT EXISTS idx_counseling_category 
    ON public.counseling_requests (category);

-- Expedited urgent counseling triage
CREATE INDEX IF NOT EXISTS idx_counseling_urgent 
    ON public.counseling_requests (is_urgent) WHERE is_urgent = true;

-- Suggestions dashboard filtering by status and creation time
CREATE INDEX IF NOT EXISTS idx_suggestions_status_created 
    ON public.suggestions (status, created_at DESC);

-- Suggestions composite filter for teacher dashboard (status + category + created_at)
CREATE INDEX IF NOT EXISTS idx_suggestions_status_category_created 
    ON public.suggestions (status, category, created_at DESC);

-- Suggestions filtering by category
CREATE INDEX IF NOT EXISTS idx_suggestions_category 
    ON public.suggestions (category);

-- Suggestions filtering by anonymity status
CREATE INDEX IF NOT EXISTS idx_suggestions_anonymous 
    ON public.suggestions (is_anonymous);

-- Suggestions lookup for identified student records
CREATE INDEX IF NOT EXISTS idx_suggestions_student 
    ON public.suggestions (student_id) WHERE student_id IS NOT NULL;

-- =============================================================================
-- 5. AUTOMATION TRIGGERS & SANITIZATION FUNCTIONS
-- =============================================================================

-- 5.1 Updated_at Auto-Updater Function
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;

-- Attach updated_at triggers to all core tables
DROP TRIGGER IF EXISTS trg_students_updated_at ON public.students;
CREATE TRIGGER trg_students_updated_at
    BEFORE UPDATE ON public.students
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trg_teachers_updated_at ON public.teachers;
CREATE TRIGGER trg_teachers_updated_at
    BEFORE UPDATE ON public.teachers
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trg_counseling_updated_at ON public.counseling_requests;
CREATE TRIGGER trg_counseling_updated_at
    BEFORE UPDATE ON public.counseling_requests
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trg_suggestions_updated_at ON public.suggestions;
CREATE TRIGGER trg_suggestions_updated_at
    BEFORE UPDATE ON public.suggestions
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 5.2 Suggestion Anonymity Enforcer Trigger
-- Strictly enforces mathematical anonymity, immutability, and search_path hygiene
CREATE OR REPLACE FUNCTION public.enforce_suggestion_anonymity()
RETURNS TRIGGER AS $$
BEGIN
    -- 1. Immutability Guards on UPDATE operations
    IF TG_OP = 'UPDATE' THEN
        -- Strictly forbid de-anonymizing an anonymous suggestion:
        -- Once anonymous, always anonymous.
        IF OLD.is_anonymous = true AND (NEW.is_anonymous = false OR NEW.student_id IS NOT NULL) THEN
            RAISE EXCEPTION 'Anonymous suggestions cannot be de-anonymized: anonymity is strictly immutable'
                USING ERRCODE = 'integrity_constraint_violation';
        END IF;

        -- Forbid changing the author of an identified suggestion:
        IF OLD.is_anonymous = false AND NEW.student_id IS NOT NULL AND NEW.student_id <> OLD.student_id THEN
            RAISE EXCEPTION 'Author student_id cannot be altered on an existing suggestion'
                USING ERRCODE = 'integrity_constraint_violation';
        END IF;
    END IF;

    -- 2. Foreign Key Cascade & Null Safety:
    -- If student_id is NULL (e.g. via ON DELETE SET NULL when student is deleted, or omitted on insert),
    -- automatically ensure is_anonymous is true to satisfy chk_suggestion_anonymity constraint.
    IF NEW.student_id IS NULL THEN
        NEW.is_anonymous := true;
    END IF;

    -- 3. Zero-Leak Anonymity Guarantee:
    -- If is_anonymous is true, student_id MUST unconditionally be set to NULL.
    IF NEW.is_anonymous = true THEN
        NEW.student_id := NULL;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;

DROP TRIGGER IF EXISTS trg_enforce_suggestion_anonymity ON public.suggestions;
CREATE TRIGGER trg_enforce_suggestion_anonymity
    BEFORE INSERT OR UPDATE ON public.suggestions
    FOR EACH ROW EXECUTE FUNCTION public.enforce_suggestion_anonymity();

-- 5.3 Teacher Role Escalation Prevention Trigger
-- Prevents teachers from elevating their role to 'admin' or modifying their email
CREATE OR REPLACE FUNCTION public.prevent_teacher_role_escalation()
RETURNS TRIGGER AS $$
BEGIN
    IF (NEW.role IS DISTINCT FROM OLD.role OR NEW.email IS DISTINCT FROM OLD.email) THEN
        IF auth.role() = 'authenticated' THEN
            IF NOT EXISTS (
                SELECT 1 FROM public.teachers
                WHERE id = auth.uid() AND role = 'admin'
            ) THEN
                RAISE EXCEPTION 'Unauthorized: Teachers cannot modify their own role or email'
                    USING ERRCODE = 'insufficient_privilege';
            END IF;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;

DROP TRIGGER IF EXISTS trg_prevent_teacher_role_escalation ON public.teachers;
CREATE TRIGGER trg_prevent_teacher_role_escalation
    BEFORE UPDATE ON public.teachers
    FOR EACH ROW EXECUTE FUNCTION public.prevent_teacher_role_escalation();

-- =============================================================================
-- 6. SECURITY HELPER FUNCTIONS
-- =============================================================================

-- Checks whether the current auth session belongs to an authorized teacher profile
CREATE OR REPLACE FUNCTION public.is_teacher()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN (
        auth.role() = 'authenticated' AND
        EXISTS (
            SELECT 1 FROM public.teachers
            WHERE id = auth.uid()
        )
    );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, auth;

-- =============================================================================
-- 7. SECURE VIEWS (DATA ISOLATION)
-- =============================================================================

-- Drop existing view to cleanly recreate with security_invoker
DROP VIEW IF EXISTS public.student_counseling_view;

-- Student-safe view of counseling requests that strictly excludes confidential teacher_note
-- Hardened with security_invoker = true, explicit WHERE isolation, and role restrictions
CREATE VIEW public.student_counseling_view
WITH (security_invoker = true) AS
SELECT 
    id,
    student_id,
    category,
    preferred_date,
    preferred_time_slot,
    content,
    is_urgent,
    status,
    response_message,
    scheduled_at,
    scheduled_date,
    scheduled_time_slot,
    scheduled_note,
    completed_at,
    created_at,
    updated_at
FROM public.counseling_requests
WHERE 
    public.is_teacher() 
    OR (auth.role() = 'authenticated' AND student_id::text = auth.jwt()->>'student_id');

COMMENT ON VIEW public.student_counseling_view IS 'Student-safe projection of counseling requests excluding confidential teacher notes with invoker security enforcement';

-- PostgREST Permission Lockdown: Disallow anon from querying the view directly
REVOKE ALL ON public.student_counseling_view FROM anon;
GRANT SELECT ON public.student_counseling_view TO authenticated, service_role;

-- =============================================================================
-- 8. ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================================================

-- Enable Row Level Security on all 4 public tables
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.counseling_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suggestions ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------------
-- 8.1 STUDENTS TABLE POLICIES
-- -----------------------------------------------------------------------------

-- Teachers can view all students in the roster
DROP POLICY IF EXISTS "Teachers can view all students" ON public.students;
CREATE POLICY "Teachers can view all students"
    ON public.students
    FOR SELECT
    TO authenticated
    USING (public.is_teacher());

-- Service role has full access (used by Next.js Server Actions for PIN auth & reset)
DROP POLICY IF EXISTS "Service role full access on students" ON public.students;
CREATE POLICY "Service role full access on students"
    ON public.students
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- -----------------------------------------------------------------------------
-- 8.2 TEACHERS TABLE POLICIES
-- -----------------------------------------------------------------------------

-- Teachers can view teacher directory
DROP POLICY IF EXISTS "Teachers can view teacher directory" ON public.teachers;
CREATE POLICY "Teachers can view teacher directory"
    ON public.teachers
    FOR SELECT
    TO authenticated
    USING (public.is_teacher());

-- Teachers can update their own profile (with anti-escalation guard)
DROP POLICY IF EXISTS "Teachers can update own profile" ON public.teachers;
CREATE POLICY "Teachers can update own profile"
    ON public.teachers
    FOR UPDATE
    TO authenticated
    USING (id = auth.uid())
    WITH CHECK (
        id = auth.uid()
        AND (
            (role = (SELECT t.role FROM public.teachers t WHERE t.id = auth.uid())
             AND email = (SELECT t.email FROM public.teachers t WHERE t.id = auth.uid()))
            OR EXISTS (
                SELECT 1 FROM public.teachers t
                WHERE t.id = auth.uid() AND t.role = 'admin'
            )
        )
    );

-- Service role full access
DROP POLICY IF EXISTS "Service role full access on teachers" ON public.teachers;
CREATE POLICY "Service role full access on teachers"
    ON public.teachers
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- -----------------------------------------------------------------------------
-- 8.3 COUNSELING REQUESTS TABLE POLICIES
-- -----------------------------------------------------------------------------

-- Drop student direct SELECT policy on base table to eliminate teacher_note leakage
DROP POLICY IF EXISTS "Students can view own counseling requests" ON public.counseling_requests;

-- Teachers have complete read access to all counseling requests
DROP POLICY IF EXISTS "Teachers can view all counseling requests" ON public.counseling_requests;
CREATE POLICY "Teachers can view all counseling requests"
    ON public.counseling_requests
    FOR SELECT
    TO authenticated
    USING (public.is_teacher());

-- Teachers can update counseling status, scheduled appointments, and internal notes
DROP POLICY IF EXISTS "Teachers can update counseling requests" ON public.counseling_requests;
CREATE POLICY "Teachers can update counseling requests"
    ON public.counseling_requests
    FOR UPDATE
    TO authenticated
    USING (public.is_teacher())
    WITH CHECK (public.is_teacher());

-- Service role full access (Next.js server-side operations on behalf of students)
DROP POLICY IF EXISTS "Service role full access on counseling requests" ON public.counseling_requests;
CREATE POLICY "Service role full access on counseling requests"
    ON public.counseling_requests
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Disallow anon from querying base counseling table directly
REVOKE ALL ON public.counseling_requests FROM anon;

-- -----------------------------------------------------------------------------
-- 8.4 SUGGESTIONS TABLE POLICIES
-- -----------------------------------------------------------------------------

-- Teachers can view all suggestions (student_id is already NULL for anonymous records)
DROP POLICY IF EXISTS "Teachers can view all suggestions" ON public.suggestions;
CREATE POLICY "Teachers can view all suggestions"
    ON public.suggestions
    FOR SELECT
    TO authenticated
    USING (public.is_teacher());

-- Teachers can reply to suggestions and update status
DROP POLICY IF EXISTS "Teachers can update suggestions" ON public.suggestions;
CREATE POLICY "Teachers can update suggestions"
    ON public.suggestions
    FOR UPDATE
    TO authenticated
    USING (public.is_teacher())
    WITH CHECK (public.is_teacher());

-- Hardened insertion policy enforcing anti-tampering and anti-spoofing
DROP POLICY IF EXISTS "Public insertion for suggestions" ON public.suggestions;
CREATE POLICY "Public insertion for suggestions"
    ON public.suggestions
    FOR INSERT
    TO anon, authenticated
    WITH CHECK (
        -- 1. Initial status must always be pending
        status = 'pending'::suggestion_status_enum
        -- 2. No teacher reply or reply metadata may be injected on creation
        AND teacher_reply IS NULL
        AND replied_by IS NULL
        AND replied_at IS NULL
        -- 3. Strict identity verification:
        AND (
            -- Case A: Anonymous submission (permitted for anon and authenticated; student_id must be NULL)
            (is_anonymous = true AND student_id IS NULL)
            OR
            -- Case B: Identified submission (only permitted if caller is authenticated and student_id matches JWT claim)
            (is_anonymous = false AND auth.role() = 'authenticated' AND student_id::text = (auth.jwt()->>'student_id'))
        )
    );

-- Service role full access (Next.js server-side operations)
DROP POLICY IF EXISTS "Service role full access on suggestions" ON public.suggestions;
CREATE POLICY "Service role full access on suggestions"
    ON public.suggestions
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);
