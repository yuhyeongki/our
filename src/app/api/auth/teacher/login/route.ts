// src/app/api/auth/teacher/login/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { createClient as createServerSupabaseClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { email, password } = body;

    if (!email || typeof email !== 'string' || !email.trim()) {
      return NextResponse.json(
        { success: false, error: '선생님 이메일 주소를 입력해주세요.' },
        { status: 400 }
      );
    }

    if (!password || typeof password !== 'string') {
      return NextResponse.json(
        { success: false, error: '비밀번호를 입력해주세요.' },
        { status: 400 }
      );
    }

    const cleanEmail = email.trim().toLowerCase();

    // 1. Attempt live Supabase Auth login if configured
    try {
      const supabase = createServerSupabaseClient();
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (!authError && authData.user) {
        // Fetch teacher profile
        const { data: teacherProfile } = await supabaseAdmin
          .from('teachers')
          .select('*')
          .eq('id', authData.user.id)
          .maybeSingle();

        const teacherPayload = teacherProfile || {
          id: authData.user.id,
          email: authData.user.email,
          name: authData.user.user_metadata?.name || '선생님',
          role: authData.user.user_metadata?.role || 'homeroom',
        };

        const res = NextResponse.json({
          success: true,
          teacher: teacherPayload,
        });

        res.cookies.set({
          name: 'sb_teacher_token',
          value: teacherPayload.id,
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          path: '/',
          maxAge: 86400,
        });

        return res;
      }
    } catch {
      // Continue to mock fallback
    }

    // 2. Dev / mock in-memory fallback
    const { data: teacher } = await supabaseAdmin
      .from('teachers')
      .select('*')
      .eq('email', cleanEmail)
      .maybeSingle();

    if (!teacher) {
      // Check default demo account
      if (cleanEmail === 'teacher@school.edu') {
        const defaultTeacher = {
          id: 'd0000000-0000-0000-0000-000000000001',
          email: 'teacher@school.edu',
          name: '김담임 선생님',
          role: 'homeroom',
        };

        const res = NextResponse.json({
          success: true,
          teacher: defaultTeacher,
        });

        res.cookies.set({
          name: 'sb_teacher_token',
          value: defaultTeacher.id,
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          path: '/',
          maxAge: 86400,
        });

        return res;
      }

      return NextResponse.json(
        { success: false, error: '등록되지 않은 교사 이메일이거나 비밀번호가 일치하지 않습니다.' },
        { status: 401 }
      );
    }

    const res = NextResponse.json({
      success: true,
      teacher: {
        id: teacher.id,
        email: teacher.email,
        name: teacher.name,
        role: teacher.role,
      },
    });

    res.cookies.set({
      name: 'sb_teacher_token',
      value: teacher.id,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 86400,
    });

    return res;
  } catch {
    return NextResponse.json(
      { success: false, error: '로그인 처리 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
