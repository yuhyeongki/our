// src/types/database.ts
// Supabase Database Definitions matching supabase/schema.sql

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type CounselingStatusEnum = 'pending' | 'accepted' | 'completed' | 'cancelled';

export type CounselingCategoryEnum =
  | 'academic'
  | 'friendship'
  | 'career'
  | 'emotional'
  | 'mental_health'
  | 'family'
  | 'other';

export type CounselingTimeSlotEnum =
  | 'morning'
  | 'lunch'
  | 'break_time'
  | 'after_school'
  | 'other';

export type SuggestionStatusEnum =
  | 'pending'
  | 'received'
  | 'in_progress'
  | 'reviewed'
  | 'resolved'
  | 'dismissed';

export type SuggestionCategoryEnum =
  | 'classroom_environment'
  | 'classroom_rule'
  | 'school_life'
  | 'facility'
  | 'study'
  | 'activity'
  | 'learning'
  | 'other';

export type TeacherRoleEnum = 'homeroom' | 'counselor' | 'admin';

export interface Database {
  public: {
    Tables: {
      students: {
        Row: {
          id: string;
          grade: number;
          class_number: number;
          student_number: number;
          name: string;
          pin_hash: string;
          created_at: string;
          updated_at: string;
          last_login_at: string | null;
        };
        Insert: {
          id?: string;
          grade: number;
          class_number: number;
          student_number: number;
          name: string;
          pin_hash: string;
          created_at?: string;
          updated_at?: string;
          last_login_at?: string | null;
        };
        Update: {
          id?: string;
          grade?: number;
          class_number?: number;
          student_number?: number;
          name?: string;
          pin_hash?: string;
          created_at?: string;
          updated_at?: string;
          last_login_at?: string | null;
        };
        Relationships: [];
      };
      teachers: {
        Row: {
          id: string;
          email: string;
          name: string;
          role: TeacherRoleEnum;
          grade: number | null;
          class_number: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          name: string;
          role?: TeacherRoleEnum;
          grade?: number | null;
          class_number?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          name?: string;
          role?: TeacherRoleEnum;
          grade?: number | null;
          class_number?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'teachers_id_fkey';
            columns: ['id'];
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      counseling_requests: {
        Row: {
          id: string;
          student_id: string;
          category: CounselingCategoryEnum;
          preferred_date: string;
          preferred_time_slot: CounselingTimeSlotEnum;
          content: string;
          is_urgent: boolean;
          status: CounselingStatusEnum;
          response_message: string | null;
          teacher_note: string | null;
          assigned_teacher_id: string | null;
          scheduled_at: string | null;
          scheduled_date: string | null;
          scheduled_time_slot: CounselingTimeSlotEnum | null;
          scheduled_note: string | null;
          completed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          student_id: string;
          category: CounselingCategoryEnum;
          preferred_date: string;
          preferred_time_slot?: CounselingTimeSlotEnum;
          content: string;
          is_urgent?: boolean;
          status?: CounselingStatusEnum;
          response_message?: string | null;
          teacher_note?: string | null;
          assigned_teacher_id?: string | null;
          scheduled_at?: string | null;
          scheduled_date?: string | null;
          scheduled_time_slot?: CounselingTimeSlotEnum | null;
          scheduled_note?: string | null;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          student_id?: string;
          category?: CounselingCategoryEnum;
          preferred_date?: string;
          preferred_time_slot?: CounselingTimeSlotEnum;
          content?: string;
          is_urgent?: boolean;
          status?: CounselingStatusEnum;
          response_message?: string | null;
          teacher_note?: string | null;
          assigned_teacher_id?: string | null;
          scheduled_at?: string | null;
          scheduled_date?: string | null;
          scheduled_time_slot?: CounselingTimeSlotEnum | null;
          scheduled_note?: string | null;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'counseling_requests_student_id_fkey';
            columns: ['student_id'];
            referencedRelation: 'students';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'counseling_requests_assigned_teacher_id_fkey';
            columns: ['assigned_teacher_id'];
            referencedRelation: 'teachers';
            referencedColumns: ['id'];
          },
        ];
      };
      suggestions: {
        Row: {
          id: string;
          is_anonymous: boolean;
          student_id: string | null;
          category: SuggestionCategoryEnum;
          title: string;
          content: string;
          status: SuggestionStatusEnum;
          teacher_reply: string | null;
          replied_by: string | null;
          replied_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          is_anonymous?: boolean;
          student_id?: string | null;
          category: SuggestionCategoryEnum;
          title: string;
          content: string;
          status?: SuggestionStatusEnum;
          teacher_reply?: string | null;
          replied_by?: string | null;
          replied_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          is_anonymous?: boolean;
          student_id?: string | null;
          category?: SuggestionCategoryEnum;
          title?: string;
          content?: string;
          status?: SuggestionStatusEnum;
          teacher_reply?: string | null;
          replied_by?: string | null;
          replied_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'suggestions_student_id_fkey';
            columns: ['student_id'];
            referencedRelation: 'students';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'suggestions_replied_by_fkey';
            columns: ['replied_by'];
            referencedRelation: 'teachers';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: {
      student_counseling_view: {
        Row: {
          id: string;
          student_id: string;
          category: CounselingCategoryEnum;
          preferred_date: string;
          preferred_time_slot: CounselingTimeSlotEnum;
          content: string;
          is_urgent: boolean;
          status: CounselingStatusEnum;
          response_message: string | null;
          scheduled_at: string | null;
          scheduled_date: string | null;
          scheduled_time_slot: CounselingTimeSlotEnum | null;
          scheduled_note: string | null;
          completed_at: string | null;
          created_at: string;
          updated_at: string;
        };
      };
    };
    Functions: {
      handle_updated_at: {
        Args: Record<PropertyKey, never>;
        Returns: unknown;
      };
      enforce_suggestion_anonymity: {
        Args: Record<PropertyKey, never>;
        Returns: unknown;
      };
      prevent_teacher_role_escalation: {
        Args: Record<PropertyKey, never>;
        Returns: unknown;
      };
      is_teacher: {
        Args: Record<PropertyKey, never>;
        Returns: boolean;
      };
    };
    Enums: {
      counseling_status_enum: CounselingStatusEnum;
      counseling_category_enum: CounselingCategoryEnum;
      counseling_time_slot_enum: CounselingTimeSlotEnum;
      suggestion_status_enum: SuggestionStatusEnum;
      suggestion_category_enum: SuggestionCategoryEnum;
      teacher_role_enum: TeacherRoleEnum;
    };
  };
}
