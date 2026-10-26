'use client';

// src/app/(auth)/teacher/login/page.tsx
import * as React from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { createClient } from '@/lib/supabase/client';
import {
  HeartHandshake,
  UserCheck,
  Sparkles,
  Lock,
  Mail,
  ArrowRight,
  AlertCircle,
  Eye,
  EyeOff,
  CheckCircle2,
} from 'lucide-react';

export default function TeacherLoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectPath = searchParams?.get('redirect') || '/teacher/dashboard';

  const [email, setEmail] = React.useState('teacher@school.edu');
  const [password, setPassword] = React.useState('');
  const [showPassword, setShowPassword] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setErrorMessage('선생님 이메일 주소를 입력해주세요.');
      return;
    }
    if (!password) {
      setErrorMessage('비밀번호를 입력해주세요.');
      return;
    }

    setIsLoading(true);

    try {
      const supabase = createClient();

      // Primary: Attempt Supabase client-side Auth
      let authSuccessful = false;
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password: password,
        });

        if (!error && data?.session) {
          authSuccessful = true;
        }
      } catch {
        // Fallback below
      }

      if (!authSuccessful) {
        // Fallback for offline local dev / mock mode
        const fallbackRes = await fetch('/api/auth/teacher/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: cleanEmail, password }),
        });

        if (fallbackRes.ok) {
          const fbData = await fallbackRes.json();
          if (fbData.success) {
            router.push(redirectPath);
            router.refresh();
            return;
          }
        }

        const fbData = await fallbackRes.json().catch(() => ({}));
        setErrorMessage(fbData.error || '이메일 또는 비밀번호가 올바르지 않습니다.');
        return;
      }

      router.push(redirectPath);
      router.refresh();
    } catch {
      setErrorMessage('인증 서버와 연결할 수 없습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-warm-50 flex flex-col justify-between py-8 px-4 sm:px-6 lg:px-8">
      {/* Brand Header */}
      <header className="mx-auto w-full max-w-md flex items-center justify-between pb-6">
        <Link
          href="/"
          className="flex items-center gap-2 text-warm-700 hover:text-warm-900 transition-colors"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-honey-500 text-warm-900 shadow-warm-sm">
            <HeartHandshake className="h-4 w-4" />
          </div>
          <div className="flex flex-col">
            <span className="text-[11px] font-semibold text-honey-800">김해영운고등학교</span>
            <span className="text-sm font-bold text-warm-900 leading-tight">교사 관리 포털</span>
          </div>
        </Link>
        <Link href="/student/login" className="text-xs text-warm-600 hover:text-warm-900 underline">
          학생이신가요?
        </Link>
      </header>

      {/* Main Login Card */}
      <main className="mx-auto w-full max-w-md">
        <Card variant="default" className="p-6 sm:p-8 rounded-3xl shadow-warm-md border border-warm-200/90 bg-white">
          <CardHeader className="p-0 pb-6 text-center space-y-2">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-honey-100 text-honey-800 shadow-warm-sm mb-1">
              <UserCheck className="h-7 w-7" />
            </div>
            <CardTitle className="text-2xl font-extrabold text-warm-900">
              선생님 로그인
            </CardTitle>
            <CardDescription className="text-sm text-warm-700">
              학급 상담 신청 및 비밀 건의함 관리 전용 시스템입니다.
            </CardDescription>
          </CardHeader>

          {/* Demo Account Callout */}
          <div className="mb-6 rounded-2xl bg-honey-50 border border-honey-200 p-3.5 flex items-start gap-3 text-xs text-warm-800 leading-relaxed">
            <Sparkles className="h-4 w-4 text-honey-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-warm-900">시연 및 평가용 교사 계정 안내</p>
              <p className="text-warm-700 mt-0.5">
                기본 계정: <strong>teacher@school.edu</strong> / 비밀번호: <strong>password1234</strong>
              </p>
            </div>
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div
              role="alert"
              className="mb-6 rounded-2xl bg-blush-50 border border-blush-200 p-3.5 flex items-start gap-2.5 text-xs sm:text-sm text-blush-800 leading-relaxed"
            >
              <AlertCircle className="h-4 w-4 text-blush-600 shrink-0 mt-0.5" />
              <p className="flex-1">{errorMessage}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="선생님 이메일"
              id="email"
              type="email"
              placeholder="teacher@school.edu"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              leftIcon={<Mail className="h-4 w-4" />}
            />

            <div className="relative">
              <Input
                label="비밀번호"
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="비밀번호를 입력하세요"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                leftIcon={<Lock className="h-4 w-4" />}
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-3 top-[34px] text-warm-500 hover:text-warm-700 p-1"
                aria-label={showPassword ? '비밀번호 숨기기' : '비밀번호 보기'}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            <div className="pt-2">
              <Button
                type="submit"
                variant="honey"
                size="lg"
                className="w-full text-base font-semibold shadow-warm-sm"
                isLoading={isLoading}
                rightIcon={<ArrowRight className="h-4 w-4" />}
              >
                대시보드 접속
              </Button>
            </div>
          </form>

          {/* Security Notice */}
          <div className="mt-6 pt-4 border-t border-warm-200/60 flex items-center justify-center gap-1.5 text-xs text-warm-500">
            <CheckCircle2 className="h-3.5 w-3.5 text-sage-600" />
            <span>Supabase Auth 표준 암호화 및 세션 보안 적용</span>
          </div>
        </Card>
      </main>

      {/* Footer */}
      <footer className="mx-auto w-full max-w-md text-center pt-8 text-xs text-warm-500">
        © 2026 김해영운고등학교 · 교사용 관리 대시보드
      </footer>
    </div>
  );
}
