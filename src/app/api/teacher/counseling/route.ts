// src/app/api/teacher/counseling/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getTeacherSession } from '@/lib/auth/teacher';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    // 1. Enforce teacher authentication (403 Forbidden on failure)
    const teacher = await getTeacherSession(req);
    if (!teacher) {
      return NextResponse.json(
        { success: false, error: '교사 인증이 필요합니다.' },
        { status: 403 }
      );
    }

    // 2. Parse query parameters
    const { searchParams } = req.nextUrl;
    const status = searchParams.get('status');
    const category = searchParams.get('category');
    const isUrgentParam = searchParams.get('isUrgent') ?? searchParams.get('urgent');
    const dateParam = searchParams.get('date') || searchParams.get('preferredDate');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // 3. Query all counseling requests
    const { data: rows, error } = await supabaseAdmin
      .from('counseling_requests')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json(
        { success: false, error: '상담 내역 조회에 실패했습니다.' },
        { status: 500 }
      );
    }

    // 4. Query student roster for relational joining
    const { data: students } = await supabaseAdmin
      .from('students')
      .select('id, grade, class_number, student_number, name');

    interface StudentItem {
      id: string;
      grade: number;
      class_number: number;
      student_number: number;
      name: string;
    }

    const studentMap = new Map<string, StudentItem>(
      ((students as any[]) || []).map((s: any) => [s.id, s as StudentItem])
    );

    // 5. Apply filters and map results
    const results: any[] = [];
    for (const reqRow of rows || []) {
      if (status && status !== 'all' && reqRow.status !== status) continue;
      if (category && category !== 'all' && reqRow.category !== category) continue;
      if (isUrgentParam !== null && isUrgentParam !== undefined) {
        const targetUrgent = isUrgentParam === 'true' || isUrgentParam === '1';
        if (Boolean(reqRow.is_urgent) !== targetUrgent) continue;
      }
      if (dateParam && reqRow.preferred_date !== dateParam) continue;
      if (startDate && reqRow.preferred_date < startDate) continue;
      if (endDate && reqRow.preferred_date > endDate) continue;

      const student = reqRow.student_id ? studentMap.get(reqRow.student_id) : null;

      results.push({
        id: reqRow.id,
        category: reqRow.category,
        preferredDate: reqRow.preferred_date,
        preferred_date: reqRow.preferred_date,
        preferredTimeSlot: reqRow.preferred_time_slot,
        preferred_time_slot: reqRow.preferred_time_slot,
        content: reqRow.content,
        isUrgent: Boolean(reqRow.is_urgent),
        is_urgent: Boolean(reqRow.is_urgent),
        status: reqRow.status,
        responseMessage: reqRow.response_message,
        response_message: reqRow.response_message,
        teacherNote: reqRow.teacher_note, // Strictly visible to teachers
        teacher_note: reqRow.teacher_note,
        scheduledDate: reqRow.scheduled_date,
        scheduled_date: reqRow.scheduled_date,
        scheduledTimeSlot: reqRow.scheduled_time_slot,
        scheduled_time_slot: reqRow.scheduled_time_slot,
        scheduledNote: reqRow.scheduled_note,
        scheduled_note: reqRow.scheduled_note,
        completedAt: reqRow.completed_at,
        completed_at: reqRow.completed_at,
        createdAt: reqRow.created_at,
        created_at: reqRow.created_at,
        updatedAt: reqRow.updated_at,
        updated_at: reqRow.updated_at,
        student: student
          ? {
              id: student.id,
              grade: student.grade,
              classNumber: student.class_number,
              class_number: student.class_number,
              studentNumber: student.student_number,
              student_number: student.student_number,
              name: student.name,
            }
          : null,
      });
    }

    // Sort descending by createdAt
    results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return NextResponse.json({
      success: true,
      counselingRequests: results,
      requests: results,
    });
  } catch {
    return NextResponse.json(
      { success: false, error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
