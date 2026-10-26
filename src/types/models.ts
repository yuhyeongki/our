// src/types/models.ts
// Core domain interfaces, DTOs, and enum types matching Supabase PostgreSQL schema.

// ============================================================================
// 1. ENUMS & UNION TYPES
// ============================================================================

export type CounselingStatus = 'pending' | 'accepted' | 'completed' | 'cancelled';

export type CounselingCategory =
  | 'academic'
  | 'friendship'
  | 'career'
  | 'emotional'
  | 'mental_health'
  | 'family'
  | 'other';

export type CounselingTimeSlot =
  | 'morning'
  | 'lunch'
  | 'break_time'
  | 'after_school'
  | 'other';

export type SuggestionStatus =
  | 'pending'
  | 'received'
  | 'in_progress'
  | 'reviewed'
  | 'resolved'
  | 'dismissed';

export type SuggestionCategory =
  | 'classroom_environment'
  | 'classroom_rule'
  | 'school_life'
  | 'facility'
  | 'study'
  | 'activity'
  | 'learning'
  | 'other';

export type TeacherRole = 'homeroom' | 'counselor' | 'admin';

// ============================================================================
// 2. DOMAIN ENTITY MODELS
// ============================================================================

export interface Student {
  id: string;
  grade: number;
  class_number: number;
  student_number: number;
  name: string;
  pin_hash?: string;
  created_at: string;
  updated_at: string;
  last_login_at?: string | null;
}

export interface Teacher {
  id: string;
  email: string;
  name: string;
  role: TeacherRole;
  grade?: number | null;
  class_number?: number | null;
  created_at: string;
  updated_at: string;
}

export interface CounselingRequest {
  id: string;
  student_id: string;
  category: CounselingCategory;
  preferred_date: string; // YYYY-MM-DD
  preferred_time_slot: CounselingTimeSlot;
  content: string;
  is_urgent: boolean;
  status: CounselingStatus;
  response_message?: string | null;
  teacher_note?: string | null; // Confidential to teachers only
  assigned_teacher_id?: string | null;
  scheduled_at?: string | null;
  scheduled_date?: string | null;
  scheduled_time_slot?: CounselingTimeSlot | null;
  scheduled_note?: string | null;
  completed_at?: string | null;
  created_at: string;
  updated_at: string;
  // Joined student info (for teacher queries)
  student?: Pick<Student, 'id' | 'grade' | 'class_number' | 'student_number' | 'name'> | null;
}

export interface Suggestion {
  id: string;
  is_anonymous: boolean;
  student_id?: string | null;
  category: SuggestionCategory;
  title: string;
  content: string;
  status: SuggestionStatus;
  teacher_reply?: string | null;
  replied_by?: string | null;
  replied_at?: string | null;
  created_at: string;
  updated_at: string;
  // Joined student info (only populated if is_anonymous === false)
  student?: Pick<Student, 'id' | 'grade' | 'class_number' | 'student_number' | 'name'> | null;
}

// ============================================================================
// 3. AUTH & SESSION MODELS
// ============================================================================

export interface StudentSessionPayload {
  student_id: string;
  grade: number;
  class_number: number;
  student_number: number;
  name: string;
  role: 'student';
  iat?: number;
  exp?: number;
}

export interface TeacherSession {
  id: string;
  email: string;
  name: string;
  role: TeacherRole;
  grade?: number | null;
  class_number?: number | null;
}

// ============================================================================
// 4. API DTOs (REQUESTS & RESPONSES)
// ============================================================================

export interface StudentLoginRequest {
  grade: number;
  classNumber: number;
  studentNumber: number;
  name: string;
  pin: string;
}

export interface StudentLoginResponse {
  success: boolean;
  student: {
    id: string;
    grade: number;
    classNumber: number;
    studentNumber: number;
    name: string;
  };
  message?: string;
}

export interface CreateCounselingDTO {
  category: CounselingCategory;
  preferredDate: string;
  preferredTimeSlot: CounselingTimeSlot;
  content: string;
  isUrgent?: boolean;
}

export interface CreateSuggestionDTO {
  isAnonymous: boolean;
  category: SuggestionCategory;
  title: string;
  content: string;
}

export interface UpdateCounselingStatusDTO {
  status: CounselingStatus;
  scheduledDate?: string;
  scheduledTimeSlot?: CounselingTimeSlot;
  scheduledNote?: string;
  teacherNote?: string;
}

export interface ReplySuggestionDTO {
  status: SuggestionStatus;
  teacherReply: string;
}
