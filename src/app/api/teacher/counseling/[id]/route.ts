// src/app/api/teacher/counseling/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getTeacherSession } from '@/lib/auth/teacher';
import type { CounselingStatus, CounselingTimeSlot } from '@/types/models';

const VALID_STATUSES: CounselingStatus[] = ['pending', 'accepted', 'completed', 'cancelled'];
const VALID_TIME_SLOTS: CounselingTimeSlot[] = ['morning', 'lunch', 'break_time', 'after_school', 'other'];

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 1. Enforce teacher authentication (403 Forbidden)
    const teacher = await getTeacherSession(req);
    if (!teacher) {
      return NextResponse.json(
        { success: false, error: '교사 인증이 필요합니다.' },
        { status: 403 }
      );
    }

    const resolvedParams = await Promise.resolve(params);
    const requestId = resolvedParams.id;
    if (!requestId) {
      return NextResponse.json(
        { success: false, error: '상담 요청 ID가 필요합니다.' },
        { status: 400 }
      );
    }

    // 2. Parse request body
    const body = await req.json().catch(() => ({}));
    const status = body.status;
    const scheduledDate = body.scheduledDate ?? body.scheduled_date;
    const scheduledTimeSlot = body.scheduledTimeSlot ?? body.scheduled_time_slot;
    const scheduledNote = body.scheduledNote ?? body.scheduled_note;
    const teacherNote = body.teacherNote ?? body.teacher_note;

    // 3. Status validation
    if (status !== undefined) {
      if (!VALID_STATUSES.includes(status)) {
        return NextResponse.json(
          { success: false, error: '올바른 상담 상태를 지정해주세요.' },
          { status: 400 }
        );
      }
    }

    // 4. Time slot validation
    if (scheduledTimeSlot !== undefined && scheduledTimeSlot !== null) {
      if (!VALID_TIME_SLOTS.includes(scheduledTimeSlot)) {
        return NextResponse.json(
          { success: false, error: '올바른 상담 시간대를 지정해주세요.' },
          { status: 400 }
        );
      }
    }

    // 5. Build update payload
    const nowIso = new Date().toISOString();
    const updatePayload: Record<string, any> = {
      assigned_teacher_id: teacher.id,
      updated_at: nowIso,
    };

    if (status !== undefined) {
      updatePayload.status = status;
      if (status === 'completed') {
        updatePayload.completed_at = nowIso;
      }
    }

    if (scheduledDate !== undefined) {
      updatePayload.scheduled_date = scheduledDate;
    }
    if (scheduledTimeSlot !== undefined) {
      updatePayload.scheduled_time_slot = scheduledTimeSlot;
    }
    if (scheduledNote !== undefined) {
      updatePayload.scheduled_note = scheduledNote;
    }
    if (teacherNote !== undefined) {
      updatePayload.teacher_note = teacherNote;
    }

    // 6. Update in database
    const { data: updatedRow, error: updateError } = await supabaseAdmin
      .from('counseling_requests')
      .update(updatePayload)
      .eq('id', requestId)
      .select('*')
      .single();

    if (updateError || !updatedRow) {
      return NextResponse.json(
        { success: false, error: '상담 요청을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      request: {
        id: updatedRow.id,
        status: updatedRow.status,
        scheduledDate: updatedRow.scheduled_date,
        scheduled_date: updatedRow.scheduled_date,
        scheduledTimeSlot: updatedRow.scheduled_time_slot,
        scheduled_time_slot: updatedRow.scheduled_time_slot,
        scheduledNote: updatedRow.scheduled_note,
        scheduled_note: updatedRow.scheduled_note,
        teacherNote: updatedRow.teacher_note,
        teacher_note: updatedRow.teacher_note,
        completedAt: updatedRow.completed_at,
        completed_at: updatedRow.completed_at,
        updatedAt: updatedRow.updated_at,
        updated_at: updatedRow.updated_at,
      },
    });
  } catch {
    return NextResponse.json(
      { success: false, error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
