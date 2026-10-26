'use client';

// src/app/student/suggestion/new/page.tsx
import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useStudent } from '@/context/student-context';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { SUGGESTION_CATEGORY_LABELS, formatStudentIdentity } from '@/lib/utils';
import type { SuggestionCategory } from '@/types/models';
import {
  ShieldAlert,
  UserCheck,
  Lock,
  ArrowRight,
  CheckCircle2,
  Building,
  ClipboardList,
  PartyPopper,
  Armchair,
  BookMarked,
  Activity,
  GraduationCap,
  MessageCircle,
} from 'lucide-react';

const SUGGESTION_ICONS: Record<SuggestionCategory, React.ReactNode> = {
  classroom_environment: <Building className="h-4 w-4" />,
  classroom_rule: <ClipboardList className="h-4 w-4" />,
  school_life: <PartyPopper className="h-4 w-4" />,
  facility: <Armchair className="h-4 w-4" />,
  study: <BookMarked className="h-4 w-4" />,
  activity: <Activity className="h-4 w-4" />,
  learning: <GraduationCap className="h-4 w-4" />,
  other: <MessageCircle className="h-4 w-4" />,
};

export default function NewSuggestionPage() {
  const router = useRouter();
  const { student } = useStudent();

  // Form State
  const [isAnonymous, setIsAnonymous] = React.useState<boolean>(true);
  const [category, setCategory] = React.useState<SuggestionCategory>('classroom_environment');
  const [title, setTitle] = React.useState('');
  const [content, setContent] = React.useState('');

  // UI Flow State
  const [isConfirmModalOpen, setIsConfirmModalOpen] = React.useState(false);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  const handleValidateAndOpenConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!title.trim()) {
      setErrorMessage('건의 제목을 입력해주세요.');
      return;
    }
    if (title.trim().length > 200) {
      setErrorMessage('건의 제목은 최대 200자까지 작성할 수 있습니다.');
      return;
    }
    if (!content.trim()) {
      setErrorMessage('건의 상세 내용을 입력해주세요.');
      return;
    }
    if (content.trim().length > 2000) {
      setErrorMessage('건의 내용은 최대 2000자까지 작성할 수 있습니다.');
      return;
    }

    setIsConfirmModalOpen(true);
  };

  const handleConfirmSubmit = async () => {
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isAnonymous,
          category,
          title: title.trim(),
          content: content.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setErrorMessage(data.error || '건의사항 등록에 실패했습니다. 다시 시도해주세요.');
        setIsConfirmModalOpen(false);
        return;
      }

      setIsConfirmModalOpen(false);
      setIsSuccessModalOpen(true);
    } catch {
      setErrorMessage('서버와 통신 중 문제가 발생했습니다.');
      setIsConfirmModalOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAfterSuccessClose = () => {
    setIsSuccessModalOpen(false);
    if (!isAnonymous) {
      router.push('/student/my-status');
    } else {
      router.push('/student/counseling/new');
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header Banner */}
      <div className="text-center max-w-2xl mx-auto space-y-2">
        <div className="inline-flex items-center gap-1.5 rounded-full bg-mist-100/90 border border-mist-200 px-3.5 py-1 text-xs font-semibold text-mist-800 shadow-warm-sm">
          <Lock className="h-3.5 w-3.5 text-mist-600" />
          <span>안심 학급 비밀 건의함</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-warm-900 tracking-tight">
          더 좋은 우리 학급을 위한 아이디어
        </h1>
        <p className="text-sm sm:text-base text-warm-700 leading-relaxed">
          교실 환경, 학교 행사, 자습 분위기 등 개선하고 싶은 점을 편안하게 건의해주세요.
          익명과 기명을 직접 선택할 수 있습니다.
        </p>
      </div>

      {/* Main Suggestion Form Card */}
      <Card variant="default" className="max-w-2xl mx-auto p-6 sm:p-8 rounded-3xl border border-warm-200/90 shadow-warm-md bg-white">
        <form onSubmit={handleValidateAndOpenConfirm} className="space-y-6">
          {/* Error Message */}
          {errorMessage && (
            <div
              role="alert"
              className="rounded-2xl bg-blush-50 border border-blush-200 p-3.5 text-xs sm:text-sm text-blush-800"
            >
              {errorMessage}
            </div>
          )}

          {/* 1. Anonymity Mode Selector (Dual Interactive Cards) */}
          <div className="space-y-2.5">
            <label className="text-sm font-bold text-warm-900 block">
              1. 작성 방식을 선택해주세요 <span className="text-blush-500">*</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Option 1: Complete Anonymity */}
              <div
                onClick={() => setIsAnonymous(true)}
                className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between space-y-2 ${
                  isAnonymous
                    ? 'border-mist-400 bg-mist-50/80 shadow-warm-sm ring-1 ring-mist-300'
                    : 'border-warm-200 bg-warm-50/50 hover:bg-warm-100/60'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="h-5 w-5 text-mist-600" />
                    <span className="font-bold text-warm-900 text-sm">완전 익명</span>
                  </div>
                  <Badge variant="anonymous" size="sm">
                    추천
                  </Badge>
                </div>
                <p className="text-xs text-warm-700 leading-relaxed">
                  작성자 정보가 데이터베이스에 일절 기록되지 않으며, 선생님도 작성자를 알 수 없습니다.
                </p>
              </div>

              {/* Option 2: Identified (Teacher-only) */}
              <div
                onClick={() => setIsAnonymous(false)}
                className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between space-y-2 ${
                  !isAnonymous
                    ? 'border-sage-400 bg-sage-50/80 shadow-warm-sm ring-1 ring-sage-300'
                    : 'border-warm-200 bg-warm-50/50 hover:bg-warm-100/60'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <UserCheck className="h-5 w-5 text-sage-600" />
                    <span className="font-bold text-warm-900 text-sm">선생님에게만 공개</span>
                  </div>
                  <Badge variant="named" size="sm">
                    기명 건의
                  </Badge>
                </div>
                <p className="text-xs text-warm-700 leading-relaxed">
                  담임 선생님께만 이름이 공개되어 개별 답변이나 진행 상황을 직접 들으실 수 있습니다.
                </p>
              </div>
            </div>
          </div>

          {/* Dynamic Privacy Guarantee Callout */}
          {isAnonymous ? (
            <div className="rounded-2xl bg-mist-50 border border-mist-200 p-4 flex items-start gap-3 text-xs text-mist-900 leading-relaxed">
              <Lock className="h-4 w-4 text-mist-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-mist-900">제로-트래킹(Zero-Tracking) 안심 안내</p>
                <p className="mt-0.5 text-mist-800">
                  완전 익명을 선택하시면 서버 데이터베이스에 학생 식별 정보(`student_id`)가 강제로 완전히 삭제(null)되어 저장됩니다. 어떤 방식으로도 작성자를 역추적할 수 없으니 마음 편히 건의해주세요.
                </p>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl bg-sage-50 border border-sage-200 p-4 flex items-start gap-3 text-xs text-sage-900 leading-relaxed">
              <UserCheck className="h-4 w-4 text-sage-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-sage-900">기명 건의 확인 안내</p>
                <p className="mt-0.5 text-sage-800">
                  선생님께 전달될 학생 정보:{' '}
                  <strong>
                    {student
                      ? formatStudentIdentity(student.grade, student.classNumber, student.studentNumber, student.name)
                      : '로그인 학생 정보'}
                  </strong>
                  . 다른 친구들에게는 공개되지 않습니다.
                </p>
              </div>
            </div>
          )}

          {/* 2. Category Selector */}
          <div className="space-y-2.5 pt-2">
            <label className="text-sm font-bold text-warm-900 block">
              2. 건의 카테고리를 선택해주세요 <span className="text-blush-500">*</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(Object.keys(SUGGESTION_CATEGORY_LABELS) as SuggestionCategory[]).map((catKey) => {
                const isSelected = category === catKey;
                return (
                  <button
                    key={catKey}
                    type="button"
                    onClick={() => setCategory(catKey)}
                    className={`flex items-center gap-1.5 p-2.5 rounded-2xl border text-xs font-medium transition-all text-left ${
                      isSelected
                        ? 'border-sage-500 bg-sage-100 text-sage-900 shadow-warm-sm ring-1 ring-sage-400 font-bold'
                        : 'border-warm-200 bg-warm-50/60 text-warm-700 hover:bg-warm-100/80'
                    }`}
                  >
                    <span className={`shrink-0 ${isSelected ? 'text-sage-700' : 'text-warm-500'}`}>
                      {SUGGESTION_ICONS[catKey]}
                    </span>
                    <span className="truncate">{SUGGESTION_CATEGORY_LABELS[catKey]}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. Title Input */}
          <div className="pt-2">
            <Input
              label="3. 건의 제목"
              placeholder="예: 교실 뒤쪽 사물함 손잡이 보수 요청"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              maxLength={200}
            />
          </div>

          {/* 4. Content Textarea */}
          <div className="space-y-1.5 pt-1">
            <Textarea
              label="4. 구체적인 건의 내용"
              placeholder="불편했던 점이나 개선되었으면 하는 사항, 또는 학급을 위한 좋은 아이디어를 자세히 적어주세요."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              required
              maxLength={2000}
              maxLengthIndicator={true}
              rows={6}
            />
          </div>

          {/* Submit Action Button */}
          <div className="pt-4">
            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full text-base font-bold shadow-warm-sm"
              rightIcon={<ArrowRight className="h-4 w-4" />}
            >
              건의사항 보내기
            </Button>
          </div>
        </form>
      </Card>

      {/* Confirmation Modal */}
      <Modal
        isOpen={isConfirmModalOpen}
        onClose={() => setIsConfirmModalOpen(false)}
        title="건의사항을 전송할까요?"
        description="전송된 건의사항은 담임 선생님께서 확인 후 학급 운영에 적극 반영해주십니다."
        size="md"
        footer={
          <>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsConfirmModalOpen(false)}
              disabled={isSubmitting}
            >
              다시 확인
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleConfirmSubmit}
              isLoading={isSubmitting}
            >
              전송 확정
            </Button>
          </>
        }
      >
        <div className="space-y-3 text-sm text-warm-800">
          <div className="rounded-2xl bg-warm-100 p-4 space-y-2 text-xs sm:text-sm">
            <div className="flex justify-between items-center">
              <span className="text-warm-600">익명성 구분:</span>
              <span>
                {isAnonymous ? (
                  <Badge variant="anonymous">완전 익명 (추적 불가)</Badge>
                ) : (
                  <Badge variant="named">선생님 확인 (기명)</Badge>
                )}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-warm-600">카테고리:</span>
              <span className="font-bold text-warm-900">{SUGGESTION_CATEGORY_LABELS[category]}</span>
            </div>
            <div className="flex flex-col gap-1 pt-1 border-t border-warm-200">
              <span className="text-warm-600">건의 제목:</span>
              <span className="font-medium text-warm-900">{title}</span>
            </div>
          </div>

          {isAnonymous && (
            <p className="text-xs text-mist-800 bg-mist-50 p-3 rounded-xl border border-mist-200">
              ※ 완전 익명으로 등록하시면 작성자 정보가 전혀 남지 않으므로 &apos;나의 신청 내역&apos;에서 다시 조회할 수 없습니다. 선생님께서 조회 시간이나 전체 공지로 피드백을 전달해 드립니다.
            </p>
          )}
        </div>
      </Modal>

      {/* Success Modal */}
      <Modal
        isOpen={isSuccessModalOpen}
        onClose={handleAfterSuccessClose}
        title="소중한 건의가 접수되었습니다! 🎉"
        size="sm"
        footer={
          <Button variant="primary" size="sm" onClick={handleAfterSuccessClose}>
            확인
          </Button>
        }
      >
        <div className="space-y-3 text-center py-2">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-sage-100 text-sage-600">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <p className="text-sm text-warm-800 leading-relaxed">
            여러분의 솔직한 목소리가 우리 반과 학교를 더욱 따뜻하고 행복하게 만듭니다. 선생님께서 확인 후 정성껏 검토해 주실 거예요.
          </p>
        </div>
      </Modal>
    </div>
  );
}
