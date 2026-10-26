// src/app/api/counseling/[id]/cancel/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getStudentSession } from '@/lib/auth/session';
import { supabaseAdmin } from '@/lib/supabase/admin';

async function handleCancel(req: NextRequest, requestId: string) {
  try {
    // 1. Authenticate student
    const session = await getStudentSession(req);
    if (!session) {
      return NextResponse.json(
        { success: false, error: '로그인이 필요한 서비스입니다.' },
        { status: 401 }
      );
    }

    // 2. Query target request
    const { data: request, error } = await supabaseAdmin
      .from('counseling_requests')
      .select('id, student_id, status')
      .eq('id', requestId)
      .single();

    if (error || !request || request.student_id !== session.student_id) {
      return NextResponse.json(
        { success: false, error: '상담 신청 내역을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 3. Check status is pending
    if (request.status !== 'pending') {
      return NextResponse.json(
        { success: false, error: '대기 중인 상담 신청만 취소할 수 있습니다.' },
        { status: 400 }
      );
    }

    // 4. Update status to cancelled
    const { error: updateError } = await supabaseAdmin
      .from('counseling_requests')
      .update({
        status: 'cancelled',
        updated_at: new Date().toISOString(),
      })
      .eq('id', requestId);

    if (updateError) {
      return NextResponse.json(
        { success: false, error: '상담 취소 처리에 실패했습니다.' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { success: true, message: '상담 신청이 취소되었습니다.' },
      { status: 200 }
    );
  } catch {
    return NextResponse.json(
      { success: false, error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// Export both PATCH and POST for complete client & test compatibility
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  return handleCancel(req, params.id);
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  return handleCancel(req, params.id);
}
