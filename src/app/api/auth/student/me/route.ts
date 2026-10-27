// src/app/api/auth/student/me/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getStudentSession } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const session = await getStudentSession(request);

  if (!session) {
    return NextResponse.json(
      {
        success: false,
        error: '인증 세션이 유효하지 않습니다.',
      },
      { status: 401 }
    );
  }

  return NextResponse.json(
    {
      success: true,
      student: {
        id: session.student_id,
        grade: session.grade,
        classNumber: session.class_number,
        studentNumber: session.student_number,
        name: session.name,
      },
    },
    { status: 200 }
  );
}
