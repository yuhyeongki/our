// src/app/api/teacher/students/reset-pin/route.ts
import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getTeacherSession } from '@/lib/auth/teacher';

/**
 * GET: List all students for teacher PIN reset roster view
 */
export async function GET(req: NextRequest) {
  try {
    const teacher = await getTeacherSession(req);
    if (!teacher) {
      return NextResponse.json(
        { success: false, error: '교사 인증이 필요합니다.' },
        { status: 403 }
      );
    }

    const { data: students, error } = await supabaseAdmin
      .from('students')
      .select('id, grade, class_number, student_number, name, created_at, updated_at, last_login_at')
      .order('grade', { ascending: true })
      .order('class_number', { ascending: true })
      .order('student_number', { ascending: true });

    if (error) {
      return NextResponse.json(
        { success: false, error: '학생 명부 조회에 실패했습니다.' },
        { status: 500 }
      );
    }

    const formattedStudents = (students || []).map((s: any) => ({
      id: s.id,
      grade: s.grade,
      classNumber: s.class_number,
      class_number: s.class_number,
      studentNumber: s.student_number,
      student_number: s.student_number,
      name: s.name,
      createdAt: s.created_at,
      created_at: s.created_at,
      updatedAt: s.updated_at,
      updated_at: s.updated_at,
      lastLoginAt: s.last_login_at,
      last_login_at: s.last_login_at,
    }));

    return NextResponse.json({
      success: true,
      students: formattedStudents,
    });
  } catch {
    return NextResponse.json(
      { success: false, error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

/**
 * POST: Reset student PIN to newPin (default '0000')
 */
export async function POST(req: NextRequest) {
  try {
    // 1. Enforce teacher authentication (403 Forbidden)
    const teacher = await getTeacherSession(req);
    if (!teacher) {
      return NextResponse.json(
        { success: false, error: '교사 인증이 필요합니다.' },
        { status: 403 }
      );
    }

    // 2. Parse request body
    const body = await req.json().catch(() => ({}));
    const studentId = body.studentId ?? body.student_id;
    const grade = body.grade;
    const classNumber = body.classNumber ?? body.class_number;
    const studentNumber = body.studentNumber ?? body.student_number;
    const rawNewPin = body.newPin ?? body.new_pin ?? '0000';
    const newPin = String(rawNewPin).trim();

    // 3. Validate PIN format
    if (!/^\d{4}$/.test(newPin)) {
      return NextResponse.json(
        { success: false, error: '초기화할 PIN은 숫자 4자리여야 합니다.' },
        { status: 400 }
      );
    }

    // 4. Locate student record
    let student: any = null;

    if (studentId) {
      const { data, error } = await supabaseAdmin
        .from('students')
        .select('*')
        .eq('id', studentId)
        .maybeSingle();

      if (!error && data) {
        student = data;
      }
    } else if (
      Number.isInteger(grade) &&
      Number.isInteger(classNumber) &&
      Number.isInteger(studentNumber)
    ) {
      const { data, error } = await supabaseAdmin
        .from('students')
        .select('*')
        .eq('grade', grade)
        .eq('class_number', classNumber)
        .eq('student_number', studentNumber)
        .maybeSingle();

      if (!error && data) {
        student = data;
      }
    } else {
      return NextResponse.json(
        { success: false, error: '학생 식별 정보(학생 ID 또는 학년/반/번호)가 필요합니다.' },
        { status: 400 }
      );
    }

    if (!student) {
      return NextResponse.json(
        { success: false, error: '해당 학생을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 5. Hash new PIN using bcryptjs
    const pinHash = await bcrypt.hash(newPin, 10);
    const nowIso = new Date().toISOString();

    // 6. Update student record
    const { error: updateError } = await supabaseAdmin
      .from('students')
      .update({
        pin_hash: pinHash,
        updated_at: nowIso,
      })
      .eq('id', student.id);

    if (updateError) {
      return NextResponse.json(
        { success: false, error: 'PIN 초기화 저장에 실패했습니다.' },
        { status: 500 }
      );
    }

    // 7. Success response
    return NextResponse.json({
      success: true,
      message: `${student.grade}학년 ${student.class_number}반 ${student.student_number}번 ${student.name} 학생의 PIN이 성공적으로 초기화되었습니다.`,
      newPin,
      student: {
        id: student.id,
        grade: student.grade,
        classNumber: student.class_number,
        class_number: student.class_number,
        studentNumber: student.student_number,
        student_number: student.student_number,
        name: student.name,
      },
    });
  } catch {
    return NextResponse.json(
      { success: false, error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
