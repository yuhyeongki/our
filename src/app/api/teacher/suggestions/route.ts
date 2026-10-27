// src/app/api/teacher/suggestions/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getTeacherSession } from '@/lib/auth/teacher';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    // 1. Enforce teacher authentication (403 Forbidden)
    const teacher = await getTeacherSession(req);
    if (!teacher) {
      return NextResponse.json(
        { success: false, error: '교사 인증이 필요합니다.' },
        { status: 403 }
      );
    }

    // 2. Parse query parameters
    const { searchParams } = req.nextUrl;
    const isAnonymousParam = searchParams.get('isAnonymous') ?? searchParams.get('anonymous');
    const status = searchParams.get('status');
    const category = searchParams.get('category');

    // 3. Query all suggestions
    const { data: rows, error } = await supabaseAdmin
      .from('suggestions')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json(
        { success: false, error: '건의사항 목록 조회에 실패했습니다.' },
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

    // 5. Map results with CRITICAL ZERO-LEAK ANONYMITY GUARANTEE
    const results: any[] = [];
    for (const sugg of rows || []) {
      if (isAnonymousParam !== null && isAnonymousParam !== undefined) {
        const targetAnon = isAnonymousParam === 'true' || isAnonymousParam === '1';
        if (Boolean(sugg.is_anonymous) !== targetAnon) continue;
      }
      if (status && status !== 'all' && sugg.status !== status) continue;
      if (category && category !== 'all' && sugg.category !== category) continue;

      let studentObj = null;
      if (!sugg.is_anonymous && sugg.student_id) {
        const student = studentMap.get(sugg.student_id);
        if (student) {
          studentObj = {
            id: student.id,
            grade: student.grade,
            classNumber: student.class_number,
            class_number: student.class_number,
            studentNumber: student.student_number,
            student_number: student.student_number,
            name: student.name,
          };
        }
      }

      const isAnon = Boolean(sugg.is_anonymous);

      const item: Record<string, any> = {
        id: sugg.id,
        isAnonymous: isAnon,
        is_anonymous: isAnon,
        category: sugg.category,
        title: sugg.title,
        content: sugg.content,
        status: sugg.status,
        teacherReply: sugg.teacher_reply,
        teacher_reply: sugg.teacher_reply,
        repliedAt: sugg.replied_at,
        replied_at: sugg.replied_at,
        createdAt: sugg.created_at,
        created_at: sugg.created_at,
        updatedAt: sugg.updated_at,
        updated_at: sugg.updated_at,
        // ZERO-LEAK GUARANTEE: strictly null if anonymous
        student: isAnon ? null : studentObj,
      };

      // Expose student_id / studentId only if identified
      if (!isAnon && sugg.student_id) {
        item.studentId = sugg.student_id;
        item.student_id = sugg.student_id;
      }

      results.push(item);
    }

    results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return NextResponse.json({
      success: true,
      suggestions: results,
    });
  } catch {
    return NextResponse.json(
      { success: false, error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
