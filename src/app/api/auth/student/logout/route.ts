// src/app/api/auth/student/logout/route.ts
import { NextResponse } from 'next/server';
import { clearStudentSessionCookie } from '@/lib/auth/session';

export async function POST() {
  const response = NextResponse.json(
    {
      success: true,
      message: '성공적으로 로그아웃되었습니다.',
    },
    { status: 200 }
  );

  clearStudentSessionCookie(response);
  return response;
}
