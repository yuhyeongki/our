// src/app/api/teacher/suggestions/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getTeacherSession } from '@/lib/auth/teacher';
import type { SuggestionStatus } from '@/types/models';

const VALID_STATUSES: SuggestionStatus[] = [
  'pending',
  'received',
  'in_progress',
  'reviewed',
  'resolved',
  'dismissed',
];

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
    const suggestionId = resolvedParams.id;
    if (!suggestionId) {
      return NextResponse.json(
        { success: false, error: '건의사항 ID가 필요합니다.' },
        { status: 400 }
      );
    }

    // 2. Parse request body
    const body = await req.json().catch(() => ({}));
    const { status, teacherReply, teacher_reply } = body;
    const replyText = teacherReply !== undefined ? teacherReply : teacher_reply;

    // 3. Status validation
    if (status !== undefined) {
      if (!VALID_STATUSES.includes(status)) {
        return NextResponse.json(
          { success: false, error: '올바른 건의 상태를 지정해주세요.' },
          { status: 400 }
        );
      }
    }

    // 4. Build update payload
    const nowIso = new Date().toISOString();
    const updatePayload: Record<string, any> = {
      updated_at: nowIso,
    };

    if (status !== undefined) {
      updatePayload.status = status;
    }

    if (replyText !== undefined) {
      updatePayload.teacher_reply = typeof replyText === 'string' ? replyText.trim() : replyText;
      updatePayload.replied_by = teacher.id;
      updatePayload.replied_at = nowIso;
    }

    // 5. Update database row
    const { data: updatedRow, error: updateError } = await supabaseAdmin
      .from('suggestions')
      .update(updatePayload)
      .eq('id', suggestionId)
      .select('*')
      .single();

    if (updateError || !updatedRow) {
      return NextResponse.json(
        { success: false, error: '건의사항을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      suggestion: {
        id: updatedRow.id,
        status: updatedRow.status,
        teacherReply: updatedRow.teacher_reply,
        teacher_reply: updatedRow.teacher_reply,
        repliedAt: updatedRow.replied_at,
        replied_at: updatedRow.replied_at,
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
