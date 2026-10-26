'use client';

// src/app/student/layout.tsx
import * as React from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Navbar, type NavLinkItem } from '@/components/ui/navbar';
import { formatStudentIdentity } from '@/lib/utils';
import { Loader2 } from 'lucide-react';
import { StudentContext, type StudentProfile } from '@/context/student-context';

export default function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();

  const [student, setStudent] = React.useState<StudentProfile | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  const fetchStudentProfile = React.useCallback(async () => {
    try {
      const res = await fetch('/api/auth/student/me');
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.student) {
          setStudent(data.student);
          return;
        }
      }
      // If unauthenticated, redirect to login
      router.push('/student/login');
    } catch {
      router.push('/student/login');
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  React.useEffect(() => {
    fetchStudentProfile();
  }, [fetchStudentProfile]);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/student/logout', { method: 'POST' });
    } finally {
      setStudent(null);
      router.push('/student/login');
      router.refresh();
    }
  };

  const navLinks: NavLinkItem[] = [
    {
      href: '/student/counseling/new',
      label: '1:1 상담 신청',
      active: pathname.startsWith('/student/counseling'),
    },
    {
      href: '/student/suggestion/new',
      label: '비밀 건의함',
      active: pathname.startsWith('/student/suggestion'),
    },
    {
      href: '/student/my-status',
      label: '나의 신청 내역',
      active: pathname === '/student/my-status',
    },
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-warm-50 flex flex-col items-center justify-center p-6 space-y-4">
        <Loader2 className="h-8 w-8 text-sage-500 animate-spin" />
        <p className="text-sm font-medium text-warm-700">
          학생 세션을 안전하게 확인하고 있습니다...
        </p>
      </div>
    );
  }

  const userInfoString = student
    ? formatStudentIdentity(student.grade, student.classNumber, student.studentNumber)
    : '';

  return (
    <StudentContext.Provider
      value={{
        student,
        isLoading,
        refreshStudent: fetchStudentProfile,
        logout: handleLogout,
      }}
    >
      <div className="min-h-screen flex flex-col justify-between bg-warm-50">
        <Navbar
          role="student"
          userName={student ? `${student.name} 학생` : undefined}
          userInfo={userInfoString}
          navLinks={navLinks}
          onLogout={handleLogout}
        />

        <main className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
          {children}
        </main>

        <footer className="border-t border-warm-200/80 bg-warm-50 py-6 px-4 text-center text-xs text-warm-600">
          <p>
            김해영운고등학교 학생 소통 포털 · 모든 상담 신청과 비밀 건의는 엄격하게 보호됩니다.
          </p>
        </footer>
      </div>
    </StudentContext.Provider>
  );
}
