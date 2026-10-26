// src/app/api/counseling/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getStudentSession } from '@/lib/auth/session';
import { supabaseAdmin } from '@/lib/supabase/admin';
import type { CounselingCategory, CounselingTimeSlot } from '@/types/models';

const VALID_CATEGORIES: CounselingCategory[] = [
  'academic',
  'friendship',
  'career',
  'emotional',
  'mental_health',
  'family',
  'other',
];

const VALID_TIME_SLOTS: CounselingTimeSlot[] = [
  'morning',
  'lunch',
  'break_time',
  'after_school',
  'other',
];

export async function POST(req: NextRequest) {
  try {
    // 1. Authenticate student via session cookie
    const session = await getStudentSession(req);
    if (!session) {
      return NextResponse.json(
        { success: false, error: '로그인이 필요한 서비스입니다.' },
        { status: 401 }
      );
    }

    // 2. Parse request body
    const body = await req.json().catch(() => ({}));
    const { category, preferredDate, preferredTimeSlot, content, isUrgent } = body;

    // 3. Category validation
    if (!category || !VALID_CATEGORIES.includes(category)) {
      return NextResponse.json(
        { success: false, error: '올바른 상담 카테고리를 선택해주세요.' },
        { status: 400 }
      );
    }

    // 4. Preferred date validation
    if (!preferredDate || typeof preferredDate !== 'string' || !preferredDate.trim()) {
      return NextResponse.json(
        { success: false, error: '희망 상담 일자를 입력해주세요.' },
        { status: 400 }
      );
    }

    // 5. Preferred time slot validation
    const timeSlot = preferredTimeSlot || 'lunch';
    if (!VALID_TIME_SLOTS.includes(timeSlot)) {
      return NextResponse.json(
        { success: false, error: '올바른 상담 시간대를 선택해주세요.' },
        { status: 400 }
      );
    }

    // 6. Content validation
    if (typeof content !== 'string' || !content.trim()) {
      return NextResponse.json(
        { success: false, error: '상담 내용을 입력해주세요.' },
        { status: 400 }
      );
    }
    const cleanContent = content.trim();
    if (cleanContent.length > 2000) {
      return NextResponse.json(
        { success: false, error: '상담 내용은 최대 2000자까지 작성할 수 있습니다.' },
        { status: 400 }
      );
    }

    const urgentFlag = Boolean(isUrgent);

    // 7. Insert into Supabase
    const { data: newRow, error } = await supabaseAdmin
      .from('counseling_requests')
      .insert({
        student_id: session.student_id,
        category,
        preferred_date: preferredDate.trim(),
        preferred_time_slot: timeSlot,
        content: cleanContent,
        is_urgent: urgentFlag,
        status: 'pending',
        teacher_note: null,
      })
      .select('id, category, preferred_date, preferred_time_slot, content, is_urgent, status, created_at')
      .single();

    if (error || !newRow) {
      return NextResponse.json(
        { success: false, error: '상담 신청 저장에 실패했습니다.' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        request: {
          id: newRow.id,
          studentId: session.student_id,
          category: newRow.category,
          preferredDate: newRow.preferred_date,
          preferredTimeSlot: newRow.preferred_time_slot,
          content: newRow.content,
          isUrgent: newRow.is_urgent,
          status: newRow.status,
          createdAt: newRow.created_at,
        },
      },
      { status: 201 }
    );
  } catch {
    return NextResponse.json(
      { success: false, error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
