// src/lib/auth/teacher.ts
import { NextRequest } from 'next/server';
import { createClient as createServerSupabaseClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import type { Teacher, TeacherSession, TeacherRole } from '@/types/models';

const DEFAULT_TEACHER_ID = 'd0000000-0000-0000-0000-000000000001';

/**
 * Extracts and verifies teacher session from:
 * 1. Bearer Token in Authorization header (e.g. `sb_teacher_<uuid>` or Supabase JWT)
 * 2. Dev fallback cookie `sb_teacher_token`
 * 3. Supabase Auth session via `@supabase/ssr` server client
 * 
 * NOTE: Student session cookies (`student_session`) are strictly ignored here.
 * If only a student session is present, this returns null so teacher routes can reject with 403.
 */
export async function getTeacherSession(
  request?: Request | NextRequest
): Promise<TeacherSession | null> {
  // 1. Check Authorization Bearer header
  if (request) {
    const authHeader = request.headers.get('authorization') || request.headers.get('Authorization') || '';
    if (authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7).trim();

      // Test harness token format: sb_teacher_<teacherId>
      if (token.startsWith('sb_teacher_')) {
        const teacherId = token.replace('sb_teacher_', '').trim();
        const { data: teacher } = await supabaseAdmin
          .from('teachers')
          .select('*')
          .eq('id', teacherId)
          .maybeSingle();

        if (teacher) {
          return {
            id: teacher.id,
            email: teacher.email,
            name: teacher.name,
            role: teacher.role as TeacherRole,
            grade: teacher.grade,
            class_number: teacher.class_number,
          };
        }

        // Default mock teacher fallback
        if (teacherId === DEFAULT_TEACHER_ID) {
          return {
            id: DEFAULT_TEACHER_ID,
            email: 'teacher@school.edu',
            name: '김담임 선생님',
            role: 'homeroom',
            grade: 1,
            class_number: 2,
          };
        }
      }

      // Live Supabase JWT Bearer token
      try {
        const supabase = createServerSupabaseClient();
        const { data: { user }, error } = await supabase.auth.getUser(token);
        if (user && !error) {
          const { data: teacher } = await supabaseAdmin
            .from('teachers')
            .select('*')
            .eq('id', user.id)
            .maybeSingle();

          if (teacher) {
            return {
              id: teacher.id,
              email: teacher.email,
              name: teacher.name,
              role: teacher.role as TeacherRole,
              grade: teacher.grade,
              class_number: teacher.class_number,
            };
          }

          return {
            id: user.id,
            email: user.email || 'teacher@school.edu',
            name: (user.user_metadata?.name as string) || '김담임 선생님',
            role: (user.user_metadata?.role as TeacherRole) || 'homeroom',
            grade: user.user_metadata?.grade ?? 1,
            class_number: user.user_metadata?.class_number ?? 2,
          };
        }
      } catch {
        // Continue to cookie check
      }
    }

    // 2. Check dev / mock fallback cookie
    let devCookie: string | undefined | null = null;
    if ('cookies' in request && typeof (request as NextRequest).cookies?.get === 'function') {
      devCookie = (request as NextRequest).cookies.get('sb_teacher_token')?.value;
    } else {
      const cookieHeader = request.headers.get('cookie') || '';
      const match = cookieHeader.match(/(?:^|;\s*)sb_teacher_token=([^;]*)/);
      devCookie = match ? decodeURIComponent(match[1]) : null;
    }

    if (devCookie) {
      const { data: teacher } = await supabaseAdmin
        .from('teachers')
        .select('*')
        .eq('id', devCookie)
        .maybeSingle();

      if (teacher) {
        return {
          id: teacher.id,
          email: teacher.email,
          name: teacher.name,
          role: teacher.role as TeacherRole,
          grade: teacher.grade,
          class_number: teacher.class_number,
        };
      }

      if (devCookie === DEFAULT_TEACHER_ID) {
        return {
          id: DEFAULT_TEACHER_ID,
          email: 'teacher@school.edu',
          name: '김담임 선생님',
          role: 'homeroom',
          grade: 1,
          class_number: 2,
        };
      }
    }
  }

  // 3. Check Supabase Auth via SSR server client
  try {
    const supabase = createServerSupabaseClient();
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      return null;
    }

    const { data: teacher } = await supabaseAdmin
      .from('teachers')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    if (teacher) {
      return {
        id: teacher.id,
        email: teacher.email,
        name: teacher.name,
        role: teacher.role as TeacherRole,
        grade: teacher.grade,
        class_number: teacher.class_number,
      };
    }

    // Default fallback for authenticated teacher user
    return {
      id: user.id,
      email: user.email || 'teacher@school.edu',
      name: (user.user_metadata?.name as string) || '김담임 선생님',
      role: (user.user_metadata?.role as TeacherRole) || 'homeroom',
      grade: user.user_metadata?.grade ?? 1,
      class_number: user.user_metadata?.class_number ?? 2,
    };
  } catch {
    return null;
  }
}

/**
 * Asserts authenticated teacher session or throws an Error.
 */
export async function requireTeacherSession(
  request?: Request | NextRequest
): Promise<TeacherSession> {
  const session = await getTeacherSession(request);
  if (!session) {
    throw new Error('UNAUTHORIZED_TEACHER');
  }
  return session;
}
