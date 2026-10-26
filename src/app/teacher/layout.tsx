'use client';

// src/app/teacher/layout.tsx
import * as React from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Navbar, type NavLinkItem } from '@/components/ui/navbar';
import { createClient } from '@/lib/supabase/client';
import type { TeacherSession, TeacherRole } from '@/types/models';
import { Loader2 } from 'lucide-react';
import { TeacherContext } from '@/context/teacher-context';

const ROLE_LABELS: Record<TeacherRole, string> = {
  homeroom: '담임 교사',
  counselor: '전문 상담 교사',
  admin: '시스템 관리자',
};

export default function TeacherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = React.useMemo(() => createClient(), []);

  const [teacher, setTeacher] = React.useState<TeacherSession | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  const fetchTeacherProfile = React.useCallback(async () => {
    try {
      // 1. Try Supabase Auth client first
      let resolvedTeacher: TeacherSession | null = null;
      try {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (!authError && user) {
          const { data: profile } = await supabase
            .from('teachers')
            .select('id, email, name, role, grade, class_number')
            .eq('id', user.id)
            .maybeSingle();

          if (profile) {
            resolvedTeacher = {
              id: profile.id,
              email: profile.email,
              name: profile.name,
              role: profile.role as TeacherRole,
              grade: profile.grade,
              class_number: profile.class_number,
            };
          } else {
            resolvedTeacher = {
              id: user.id,
              email: user.email || 'teacher@school.edu',
              name: user.user_metadata?.name || '김담임 선생님',
              role: (user.user_metadata?.role as TeacherRole) || 'homeroom',
              grade: user.user_metadata?.grade ?? 1,
              class_number: user.user_metadata?.class_number ?? 2,
            };
          }
        }
      } catch {
        // Fallback to API check
      }

      // 2. If not found via Supabase client, verify with backend API endpoint
      if (!resolvedTeacher) {
        const checkRes = await fetch('/api/teacher/counseling');
        if (checkRes.ok) {
          // Authenticated via cookie or dev token
          resolvedTeacher = {
            id: 'd0000000-0000-0000-0000-000000000001',
            email: 'teacher@school.edu',
            name: '김담임 선생님',
            role: 'homeroom',
            grade: 1,
            class_number: 2,
          };
        } else if (checkRes.status === 403 || checkRes.status === 401) {
          router.push('/teacher/login');
          return;
        }
      }

      if (resolvedTeacher) {
        setTeacher(resolvedTeacher);
      } else {
        router.push('/teacher/login');
      }
    } catch {
      router.push('/teacher/login');
    } finally {
      setIsLoading(false);
    }
  }, [router, supabase]);

  React.useEffect(() => {
    fetchTeacherProfile();
  }, [fetchTeacherProfile]);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/teacher/logout', { method: 'POST' });
      await supabase.auth.signOut().catch(() => {});
    } catch {
      // Continue to logout
    } finally {
      setTeacher(null);
      router.push('/teacher/login');
      router.refresh();
    }
  };

  const navLinks: NavLinkItem[] = [
    {
      href: '/teacher/dashboard',
      label: '통합 관리 대시보드',
      active: pathname.startsWith('/teacher/dashboard'),
    },
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-warm-50 flex flex-col items-center justify-center p-6 space-y-4">
        <Loader2 className="h-8 w-8 text-honey-600 animate-spin" />
        <p className="text-sm font-medium text-warm-700">
          선생님 계정 및 관리 권한을 확인하고 있습니다...
        </p>
      </div>
    );
  }

  // Teacher Info String (e.g., "1학년 2반 담임 교사" or "전문 상담 교사")
  let teacherDutyString = teacher ? ROLE_LABELS[teacher.role] || '선생님' : '';
  if (teacher && teacher.role === 'homeroom' && teacher.grade && teacher.class_number) {
    teacherDutyString = `${teacher.grade}학년 ${teacher.class_number}반 담임 교사`;
  }

  return (
    <TeacherContext.Provider
      value={{
        teacher,
        isLoading,
        refreshTeacher: fetchTeacherProfile,
        logout: handleLogout,
      }}
    >
      <div className="min-h-screen flex flex-col bg-warm-50/60 text-warm-900 selection:bg-honey-200">
        <Navbar
          role="teacher"
          userName={teacher?.name || '선생님'}
          userInfo={teacherDutyString}
          navLinks={navLinks}
          onLogout={handleLogout}
        />

        <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          {children}
        </main>

        <footer className="border-t border-warm-200/80 bg-warm-50 py-6 px-4 text-center text-xs text-warm-600">
          <p>
            김해영운고등학교 교사 전용 포털 · 학생들의 소중한 상담 신청과 비밀 건의를 따뜻하고 안전하게 관리합니다.
          </p>
        </footer>
      </div>
    </TeacherContext.Provider>
  );
}
