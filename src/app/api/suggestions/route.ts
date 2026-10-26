// src/app/api/suggestions/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getStudentSession } from '@/lib/auth/session';
import { supabaseAdmin } from '@/lib/supabase/admin';
import type { SuggestionCategory } from '@/types/models';

const VALID_CATEGORIES: SuggestionCategory[] = [
  'classroom_environment',
  'classroom_rule',
  'school_life',
  'facility',
  'study',
  'activity',
  'learning',
  'other',
];

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { isAnonymous, category, title, content } = body;

    // 1. Category validation
    if (!category || !VALID_CATEGORIES.includes(category)) {
      return NextResponse.json(
        { success: false, error: '올바른 건의 카테고리를 선택해주세요.' },
        { status: 400 }
      );
    }

    // 2. Title validation
    if (typeof title !== 'string' || !title.trim()) {
      return NextResponse.json(
        { success: false, error: '건의 제목을 입력해주세요.' },
        { status: 400 }
      );
    }
    const cleanTitle = title.trim();
    if (cleanTitle.length > 200) {
      return NextResponse.json(
        { success: false, error: '건의 제목은 최대 200자까지 가능합니다.' },
        { status: 400 }
      );
    }

    // 3. Content validation
    if (typeof content !== 'string' || !content.trim()) {
      return NextResponse.json(
        { success: false, error: '건의 상세 내용을 입력해주세요.' },
        { status: 400 }
      );
    }
    const cleanContent = content.trim();
    if (cleanContent.length > 2000) {
      return NextResponse.json(
        { success: false, error: '건의 내용은 최대 2000자까지 가능합니다.' },
        { status: 400 }
      );
    }

    const anon = Boolean(isAnonymous);
    let boundStudentId: string | null = null;

    if (anon) {
      // ZERO-LEAK ANONYMITY INVARIANT:
      // Forcefully sanitize student_id to null regardless of session or body injections
      boundStudentId = null;
    } else {
      // Identified suggestion: Must verify student session
      const session = await getStudentSession(req);
      if (!session) {
        return NextResponse.json(
          { success: false, error: '기명 건의사항 작성 시 로그인이 필요합니다.' },
          { status: 401 }
        );
      }
      boundStudentId = session.student_id;
    }

    // 4. Insert into public.suggestions
    const { data: newRow, error } = await supabaseAdmin
      .from('suggestions')
      .insert({
        is_anonymous: anon,
        student_id: boundStudentId,
        category,
        title: cleanTitle,
        content: cleanContent,
        status: 'pending',
      })
      .select('id, is_anonymous, category, title, content, status, created_at')
      .single();

    if (error || !newRow) {
      return NextResponse.json(
        { success: false, error: '건의사항 등록에 실패했습니다.' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        suggestion: {
          id: newRow.id,
          isAnonymous: newRow.is_anonymous,
          category: newRow.category,
          title: newRow.title,
          content: newRow.content,
          status: newRow.status,
          createdAt: newRow.created_at,
          studentId: anon ? null : boundStudentId,
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
