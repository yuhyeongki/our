// src/app/api/counseling/my/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getStudentSession } from '@/lib/auth/session';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    // 1. Authenticate student
    const session = await getStudentSession(req);
    if (!session) {
      return NextResponse.json(
        { success: false, error: '로그인이 필요한 서비스입니다.' },
        { status: 401 }
      );
    }

    // 2. Query requests strictly isolating student_id
    // CRITICAL PRIVACY INVARIANT: teacher_note is strictly excluded from query
    const { data: rows, error } = await supabaseAdmin
      .from('counseling_requests')
      .select(
        'id, category, preferred_date, preferred_time_slot, content, is_urgent, status, response_message, scheduled_date, scheduled_time_slot, scheduled_note, completed_at, created_at, updated_at'
      )
      .eq('student_id', session.student_id)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json(
        { success: false, error: '상담 내역 조회에 실패했습니다.' },
        { status: 500 }
      );
    }

    // 3. Map to DTOs ensuring zero leakage of teacher_note
    const requests = (rows || []).map((row: any) => ({
      id: row.id,
      category: row.category,
      preferredDate: row.preferred_date,
      preferred_date: row.preferred_date,
      preferredTimeSlot: row.preferred_time_slot,
      preferred_time_slot: row.preferred_time_slot,
      content: row.content,
      isUrgent: row.is_urgent,
      is_urgent: row.is_urgent,
      status: row.status,
      responseMessage: row.response_message,
      response_message: row.response_message,
      scheduledDate: row.scheduled_date,
      scheduled_date: row.scheduled_date,
      scheduledTimeSlot: row.scheduled_time_slot,
      scheduled_time_slot: row.scheduled_time_slot,
      scheduledNote: row.scheduled_note,
      scheduled_note: row.scheduled_note,
      completedAt: row.completed_at,
      completed_at: row.completed_at,
      createdAt: row.created_at,
      created_at: row.created_at,
      updatedAt: row.updated_at,
      updated_at: row.updated_at,
      // teacherNote / teacher_note is intentionally omitted completely
    }));

    return NextResponse.json({ success: true, requests }, { status: 200 });
  } catch {
    return NextResponse.json(
      { success: false, error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
