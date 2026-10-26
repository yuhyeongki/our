// src/app/api/auth/teacher/logout/route.ts
import { NextResponse } from 'next/server';
import { createClient as createServerSupabaseClient } from '@/lib/supabase/server';

export async function POST() {
  try {
    try {
      const supabase = createServerSupabaseClient();
      await supabase.auth.signOut();
    } catch {
      // Continue clearing local cookies
    }

    const res = NextResponse.json({
      success: true,
      message: '성공적으로 로그아웃되었습니다.',
    });

    // Clear dev / mock cookie
    res.cookies.set({
      name: 'sb_teacher_token',
      value: '',
      httpOnly: true,
      path: '/',
      maxAge: 0,
    });

    return res;
  } catch {
    return NextResponse.json(
      { success: false, error: '로그아웃 처리 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
