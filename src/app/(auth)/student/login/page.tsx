'use client';

// src/app/(auth)/student/login/page.tsx
import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import {
  HeartHandshake,
  GraduationCap,
  Sparkles,
  Lock,
  ArrowRight,
  HelpCircle,
  AlertCircle,
  Eye,
  EyeOff,
} from 'lucide-react';

interface StudentLoginForm {
  grade: string;
  classNumber: string;
  studentNumber: string;
  name: string;
  pin: string;
}

export default function StudentLoginPage() {
  const router = useRouter();

  const [form, setForm] = React.useState<StudentLoginForm>({
    grade: '1',
    classNumber: '',
    studentNumber: '',
    name: '',
    pin: '',
  });

  const [showPin, setShowPin] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [isResetModalOpen, setIsResetModalOpen] = React.useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errorMessage) setErrorMessage(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const gradeNum = parseInt(form.grade, 10);
    const classNum = parseInt(form.classNumber, 10);
    const studentNum = parseInt(form.studentNumber, 10);
    const trimmedName = form.name.trim();

    // Client-side Boundary Validations
    if (isNaN(gradeNum) || gradeNum < 1 || gradeNum > 6) {
      setErrorMessage('학년을 올바르게 선택해주세요 (1~6학년).');
      return;
    }
    if (isNaN(classNum) || classNum < 1 || classNum > 30) {
      setErrorMessage('반 번호를 올바르게 입력해주세요 (1~30반).');
      return;
    }
    if (isNaN(studentNum) || studentNum < 1 || studentNum > 60) {
      setErrorMessage('출석 번호를 올바르게 입력해주세요 (1~60번).');
      return;
    }
    if (!trimmedName) {
      setErrorMessage('이름을 입력해주세요.');
      return;
    }
    if (!/^\d{4}$/.test(form.pin)) {
      setErrorMessage('간편 비밀번호(PIN)는 숫자 4자리여야 합니다.');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/student/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          grade: gradeNum,
          classNumber: classNum,
          studentNumber: studentNum,
          name: trimmedName,
          pin: form.pin,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setErrorMessage(data.error || '로그인에 실패했습니다. 입력 정보를 확인해주세요.');
        return;
      }

      // Successful login or registration
      router.push('/student/my-status');
      router.refresh();
    } catch {
      setErrorMessage('서버와 통신 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
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
          <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-sage-500 text-white shadow-warm-sm">
            <HeartHandshake className="h-4 w-4" />
          </div>
          <div className="flex flex-col">
            <span className="text-[11px] font-semibold text-sage-700">김해영운고등학교</span>
            <span className="text-sm font-bold text-warm-900 leading-tight">학생 소통 포털</span>
          </div>
        </Link>
        <Link href="/teacher/login" className="text-xs text-warm-600 hover:text-warm-900 underline">
          선생님이신가요?
        </Link>
      </header>

      {/* Main Login Card */}
      <main className="mx-auto w-full max-w-md">
        <Card variant="default" className="p-6 sm:p-8 rounded-3xl shadow-warm-md border border-warm-200/90 bg-white">
          <CardHeader className="p-0 pb-6 text-center space-y-2">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-sage-100 text-sage-700 shadow-warm-sm mb-1">
              <GraduationCap className="h-7 w-7" />
            </div>
            <CardTitle className="text-2xl font-extrabold text-warm-900">
              학생 간편 로그인
            </CardTitle>
            <CardDescription className="text-sm text-warm-700">
              학년/반/번호와 4자리 PIN으로 안전하게 시작하세요.
            </CardDescription>
          </CardHeader>

          {/* Onboarding Callout Card */}
          <div className="mb-6 rounded-2xl bg-warm-100/90 border border-warm-200 p-3.5 flex items-start gap-3 text-xs text-warm-800 leading-relaxed">
            <Sparkles className="h-4 w-4 text-honey-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-warm-900">처음 오셨나요? 별도 가입 절차가 없어요!</p>
              <p className="text-warm-700 mt-0.5">
                본인의 학년, 반, 번호와 이름을 적고 <strong>사용하실 4자리 PIN</strong>을 입력하시면 즉시 안전하게 가입 및 로그인됩니다.
              </p>
            </div>
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div
              role="alert"
              className="mb-6 rounded-2xl bg-blush-50 border border-blush-200 p-3.5 flex items-start gap-2.5 text-xs sm:text-sm text-blush-800 leading-relaxed animate-in fade-in"
            >
              <AlertCircle className="h-4 w-4 text-blush-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p>{errorMessage}</p>
                {errorMessage.includes('일치하지 않습니다') && (
                  <button
                    type="button"
                    onClick={() => setIsResetModalOpen(true)}
                    className="mt-1 font-semibold text-blush-900 underline hover:text-blush-700 block"
                  >
                    비밀번호를 잊으셨나요? 안내 보기
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Grade / Class / Number Row */}
            <div className="grid grid-cols-3 gap-2.5">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="grade" className="text-xs font-semibold text-warm-800">
                  학년
                </label>
                <select
                  id="grade"
                  name="grade"
                  value={form.grade}
                  onChange={handleChange}
                  className="w-full bg-warm-50/80 border border-warm-200 rounded-2xl px-3 py-2.5 text-sm text-warm-900 focus:outline-none focus:ring-2 focus:ring-sage-400 focus:bg-white transition-all font-medium"
                >
                  <option value="1">1학년</option>
                  <option value="2">2학년</option>
                  <option value="3">3학년</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="classNumber" className="text-xs font-semibold text-warm-800">
                  반
                </label>
                <input
                  id="classNumber"
                  name="classNumber"
                  type="number"
                  min={1}
                  max={30}
                  placeholder="예: 2"
                  value={form.classNumber}
                  onChange={handleChange}
                  required
                  className="w-full bg-warm-50/80 border border-warm-200 rounded-2xl px-3 py-2.5 text-sm text-warm-900 focus:outline-none focus:ring-2 focus:ring-sage-400 focus:bg-white transition-all text-center font-medium placeholder:text-warm-400"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="studentNumber" className="text-xs font-semibold text-warm-800">
                  번호
                </label>
                <input
                  id="studentNumber"
                  name="studentNumber"
                  type="number"
                  min={1}
                  max={60}
                  placeholder="예: 15"
                  value={form.studentNumber}
                  onChange={handleChange}
                  required
                  className="w-full bg-warm-50/80 border border-warm-200 rounded-2xl px-3 py-2.5 text-sm text-warm-900 focus:outline-none focus:ring-2 focus:ring-sage-400 focus:bg-white transition-all text-center font-medium placeholder:text-warm-400"
                />
              </div>
            </div>

            {/* Name Input */}
            <div>
              <Input
                label="이름"
                id="name"
                name="name"
                type="text"
                placeholder="홍길동"
                value={form.name}
                onChange={handleChange}
                required
                maxLength={50}
              />
            </div>

            {/* PIN Input */}
            <div className="space-y-1">
              <Input
                label="4자리 간편 PIN"
                id="pin"
                name="pin"
                type={showPin ? 'text' : 'password'}
                inputMode="numeric"
                maxLength={4}
                placeholder="숫자 4자리 (예: 1234)"
                value={form.pin}
                onChange={handleChange}
                required
                leftIcon={<Lock className="h-4 w-4" />}
                rightIcon={
                  <button
                    type="button"
                    onClick={() => setShowPin(!showPin)}
                    className="p-1 text-warm-400 hover:text-warm-700 transition-colors focus:outline-none"
                    aria-label={showPin ? '비밀번호 숨기기' : '비밀번호 보기'}
                  >
                    {showPin ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                }
                helperText="본인 확인용 4자리 숫자 비밀번호입니다."
              />
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="w-full text-base font-semibold shadow-warm-sm"
                isLoading={isLoading}
                rightIcon={<ArrowRight className="h-4 w-4" />}
              >
                로그인 / 시작하기
              </Button>
            </div>
          </form>

          {/* Card Footer Assistance */}
          <div className="mt-6 pt-4 border-t border-warm-200/60 flex items-center justify-center">
            <button
              type="button"
              onClick={() => setIsResetModalOpen(true)}
              className="inline-flex items-center gap-1.5 text-xs text-warm-600 hover:text-warm-900 transition-colors"
            >
              <HelpCircle className="h-3.5 w-3.5 text-warm-500" />
              <span>PIN(비밀번호)을 잊으셨나요?</span>
            </button>
          </div>
        </Card>
      </main>

      {/* Footer */}
      <footer className="mx-auto w-full max-w-md text-center pt-8 text-xs text-warm-500">
        © 2026 김해영운고등학교 · 1:1 상담 및 비밀 건의함 시스템
      </footer>

      {/* PIN Reset Guidance Modal */}
      <Modal
        isOpen={isResetModalOpen}
        onClose={() => setIsResetModalOpen(false)}
        title="비밀번호(PIN) 분실 안내"
        description="안전한 본인 확인 및 사칭 방지를 위한 비밀번호 초기화 절차입니다."
        size="sm"
        footer={
          <Button variant="secondary" size="sm" onClick={() => setIsResetModalOpen(false)}>
            확인했습니다
          </Button>
        }
      >
        <div className="space-y-4 text-warm-800 text-sm">
          <div className="rounded-2xl bg-honey-50 border border-honey-200 p-4 space-y-2">
            <p className="font-bold text-warm-900 flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-honey-600" />
              담임 선생님께 초기화를 요청해주세요
            </p>
            <p className="text-xs sm:text-sm text-warm-700 leading-relaxed">
              학생 여러분의 비밀번호는 암호화되어 있어 선생님도 열람하실 수 없습니다.
              선생님 전용 관리 대시보드에서 <strong>비밀번호를 임시값(&apos;0000&apos;)으로 재설정</strong>받으실 수 있습니다.
            </p>
          </div>

          <div className="space-y-2 text-xs text-warm-600 leading-relaxed">
            <p className="font-semibold text-warm-800">초기화 후 재로그인 방법:</p>
            <ol className="list-decimal pl-4 space-y-1">
              <li>담임 선생님께 &quot;상담 포털 PIN 초기화&quot;를 요청합니다.</li>
              <li>초기화가 완료되면 PIN 번호에 <strong>0000</strong>을 입력하여 로그인합니다.</li>
              <li>로그인 후 안전하게 상담을 신청하거나 건의를 남기실 수 있습니다.</li>
            </ol>
          </div>
        </div>
      </Modal>
    </div>
  );
}
