'use client';

// src/app/student/counseling/new/page.tsx
import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useStudent } from '@/context/student-context';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Modal } from '@/components/ui/modal';
import {
  COUNSELING_CATEGORY_LABELS,
  COUNSELING_TIME_SLOT_LABELS,
  formatStudentIdentity,
} from '@/lib/utils';
import type { CounselingCategory, CounselingTimeSlot } from '@/types/models';
import {
  ShieldCheck,
  Calendar,
  Clock,
  BookOpen,
  Users,
  Compass,
  Smile,
  Heart,
  Home,
  MessageSquare,
  ArrowRight,
} from 'lucide-react';

const CATEGORY_ICONS: Record<CounselingCategory, React.ReactNode> = {
  academic: <BookOpen className="h-4 w-4" />,
  friendship: <Users className="h-4 w-4" />,
  career: <Compass className="h-4 w-4" />,
  emotional: <Smile className="h-4 w-4" />,
  mental_health: <Heart className="h-4 w-4" />,
  family: <Home className="h-4 w-4" />,
  other: <MessageSquare className="h-4 w-4" />,
};

export default function NewCounselingPage() {
  const router = useRouter();
  const { student } = useStudent();

  // Form State
  const [category, setCategory] = React.useState<CounselingCategory>('academic');
  const [preferredDate, setPreferredDate] = React.useState<string>(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  });
  const [preferredTimeSlot, setPreferredTimeSlot] = React.useState<CounselingTimeSlot>('lunch');
  const [content, setContent] = React.useState('');
  const [isUrgent, setIsUrgent] = React.useState(false);

  // UI Flow State
  const [isConfirmModalOpen, setIsConfirmModalOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  const todayStr = React.useMemo(() => new Date().toISOString().split('T')[0], []);

  const handleValidateAndOpenConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!preferredDate) {
      setErrorMessage('희망 상담 일자를 선택해주세요.');
      return;
    }
    if (!content.trim()) {
      setErrorMessage('상담 내용을 작성해주세요.');
      return;
    }
    if (content.trim().length > 2000) {
      setErrorMessage('상담 내용은 최대 2000자까지 작성할 수 있습니다.');
      return;
    }

    setIsConfirmModalOpen(true);
  };

  const handleConfirmSubmit = async () => {
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/counseling', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category,
          preferredDate,
          preferredTimeSlot,
          content: content.trim(),
          isUrgent,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setErrorMessage(data.error || '상담 신청 접수에 실패했습니다. 잠시 후 다시 시도해주세요.');
        setIsConfirmModalOpen(false);
        return;
      }

      setIsConfirmModalOpen(false);
      router.push('/student/my-status');
      router.refresh();
    } catch {
      setErrorMessage('서버 연결 중 오류가 발생했습니다.');
      setIsConfirmModalOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header Banner */}
      <div className="text-center max-w-2xl mx-auto space-y-2">
        <div className="inline-flex items-center gap-1.5 rounded-full bg-sage-100/90 border border-sage-200 px-3.5 py-1 text-xs font-semibold text-sage-800 shadow-warm-sm">
          <ShieldCheck className="h-3.5 w-3.5 text-sage-600" />
          <span>선생님과의 1:1 비밀 보장 상담</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-warm-900 tracking-tight">
          선생님께 마음을 전해보세요
        </h1>
        <p className="text-sm sm:text-base text-warm-700 leading-relaxed">
          성적, 진로, 친구 관계, 마음의 어려움까지 어떤 이야기라도 괜찮아요.
          오직 담당 선생님만 확인하시며 따뜻하게 함께합니다.
        </p>
      </div>

      {/* Main Counseling Form Card */}
      <Card variant="default" className="max-w-2xl mx-auto p-6 sm:p-8 rounded-3xl border border-warm-200/90 shadow-warm-md bg-white">
        <form onSubmit={handleValidateAndOpenConfirm} className="space-y-6">
          {/* Active Student Info Header */}
          {student && (
            <div className="flex items-center justify-between rounded-2xl bg-warm-100/80 border border-warm-200/80 p-4">
              <div className="flex flex-col">
                <span className="text-xs text-warm-600 font-medium">신청 학생</span>
                <span className="text-sm sm:text-base font-bold text-warm-900">
                  {formatStudentIdentity(student.grade, student.classNumber, student.studentNumber, student.name)}
                </span>
              </div>
              <Badge variant="sage" size="sm">
                본인 확인 완료
              </Badge>
            </div>
          )}

          {/* Error Message */}
          {errorMessage && (
            <div
              role="alert"
              className="rounded-2xl bg-blush-50 border border-blush-200 p-3.5 text-xs sm:text-sm text-blush-800"
            >
              {errorMessage}
            </div>
          )}

          {/* 1. Category Selector */}
          <div className="space-y-2.5">
            <label className="text-sm font-bold text-warm-900 block">
              1. 어떤 고민에 대해 이야기 나누고 싶나요? <span className="text-blush-500">*</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {(Object.keys(COUNSELING_CATEGORY_LABELS) as CounselingCategory[]).map((catKey) => {
                const isSelected = category === catKey;
                return (
                  <button
                    key={catKey}
                    type="button"
                    onClick={() => setCategory(catKey)}
                    className={`flex items-center gap-2 p-3 rounded-2xl border text-xs sm:text-sm font-medium transition-all text-left ${
                      isSelected
                        ? 'border-sage-500 bg-sage-100 text-sage-900 shadow-warm-sm ring-1 ring-sage-400 font-bold'
                        : 'border-warm-200 bg-warm-50/60 text-warm-700 hover:bg-warm-100/80'
                    }`}
                  >
                    <span className={`shrink-0 ${isSelected ? 'text-sage-700' : 'text-warm-500'}`}>
                      {CATEGORY_ICONS[catKey]}
                    </span>
                    <span className="truncate">{COUNSELING_CATEGORY_LABELS[catKey]}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Preferred Date & Time Slot */}
          <div className="space-y-3 pt-2">
            <label className="text-sm font-bold text-warm-900 block">
              2. 상담을 희망하는 날짜와 시간대를 알려주세요 <span className="text-blush-500">*</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Date Input */}
              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold text-warm-800 flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5 text-warm-500" />
                  희망 날짜
                </span>
                <input
                  type="date"
                  min={todayStr}
                  value={preferredDate}
                  onChange={(e) => setPreferredDate(e.target.value)}
                  required
                  className="w-full bg-warm-50/80 border border-warm-200 rounded-2xl px-4 py-2.5 text-sm text-warm-900 focus:outline-none focus:ring-2 focus:ring-sage-400 focus:bg-white transition-all font-medium"
                />
              </div>

              {/* Time Slot Picker */}
              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold text-warm-800 flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5 text-warm-500" />
                  희망 시간대
                </span>
                <select
                  value={preferredTimeSlot}
                  onChange={(e) => setPreferredTimeSlot(e.target.value as CounselingTimeSlot)}
                  className="w-full bg-warm-50/80 border border-warm-200 rounded-2xl px-3 py-2.5 text-sm text-warm-900 focus:outline-none focus:ring-2 focus:ring-sage-400 focus:bg-white transition-all font-medium"
                >
                  {(Object.keys(COUNSELING_TIME_SLOT_LABELS) as CounselingTimeSlot[]).map((slotKey) => (
                    <option key={slotKey} value={slotKey}>
                      {COUNSELING_TIME_SLOT_LABELS[slotKey]}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <p className="text-xs text-warm-500 pl-1">
              ※ 선생님의 수업 및 학급 일정에 따라 세부 일정은 상호 조율될 수 있습니다.
            </p>
          </div>

          {/* 3. Urgency Toggle */}
          <div className="pt-2">
            <div
              onClick={() => setIsUrgent(!isUrgent)}
              className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 select-none ${
                isUrgent
                  ? 'border-blush-300 bg-blush-50/90 shadow-warm-sm'
                  : 'border-warm-200 bg-warm-50/50 hover:bg-warm-100/60'
              }`}
            >
              <input
                type="checkbox"
                id="isUrgent"
                checked={isUrgent}
                onChange={(e) => setIsUrgent(e.target.checked)}
                className="h-4 w-4 mt-0.5 rounded text-blush-500 focus:ring-blush-400 border-warm-300"
              />
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-warm-900">
                    빠른 상담(긴급 요청)이 필요합니다
                  </span>
                  {isUrgent && <Badge variant="urgent">긴급 요청</Badge>}
                </div>
                <p className="text-xs text-warm-700 leading-relaxed">
                  오늘 중이거나 가능한 한 가장 빠른 시간 내에 선생님의 도움이 절실한 경우 체크해주세요. 선생님 화면에 우선 확인 대상으로 강조 표시됩니다.
                </p>
              </div>
            </div>
          </div>

          {/* 4. Content Textarea */}
          <div className="space-y-1.5 pt-2">
            <Textarea
              label="3. 상담 신청 내용"
              placeholder="선생님께 털어놓고 싶은 이야기나 고민되는 상황을 자유롭게 적어주세요. 사소한 이야기라도 괜찮아요."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              required
              maxLength={2000}
              maxLengthIndicator={true}
              rows={6}
              helperText="작성하신 모든 내용은 암호화되어 안전하게 보관됩니다."
            />
          </div>

          {/* Confidentiality Notice Banner */}
          <div className="rounded-2xl bg-sage-50/90 border border-sage-200 p-4 flex items-start gap-3 text-xs text-sage-800 leading-relaxed">
            <ShieldCheck className="h-5 w-5 text-sage-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-sage-900">1:1 비밀 보장 약속</p>
              <p className="mt-0.5 text-sage-800">
                작성하신 상담 신청 내용은 담당 선생님 외에 다른 학생이나 외부인에게 절대로 공개되지 않습니다. 안심하고 마음을 나눠주세요.
              </p>
            </div>
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
              상담 신청서 제출하기
            </Button>
          </div>
        </form>
      </Card>

      {/* Confirmation Modal */}
      <Modal
        isOpen={isConfirmModalOpen}
        onClose={() => setIsConfirmModalOpen(false)}
        title="상담 신청을 접수할까요?"
        description="입력하신 내용을 바탕으로 담당 선생님께 1:1 상담이 요청됩니다."
        size="md"
        footer={
          <>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsConfirmModalOpen(false)}
              disabled={isSubmitting}
            >
              다시 확인하기
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleConfirmSubmit}
              isLoading={isSubmitting}
            >
              상담 신청 확정
            </Button>
          </>
        }
      >
        <div className="space-y-3 text-sm text-warm-800">
          <div className="rounded-2xl bg-warm-100 p-4 space-y-2 text-xs sm:text-sm">
            <div className="flex justify-between">
              <span className="text-warm-600">신청 카테고리:</span>
              <span className="font-bold text-warm-900">{COUNSELING_CATEGORY_LABELS[category]}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-warm-600">희망 일시:</span>
              <span className="font-bold text-warm-900">
                {preferredDate} ({COUNSELING_TIME_SLOT_LABELS[preferredTimeSlot]})
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-warm-600">긴급 여부:</span>
              <span>
                {isUrgent ? (
                  <Badge variant="urgent">긴급 상담</Badge>
                ) : (
                  <Badge variant="sage">일반 상담</Badge>
                )}
              </span>
            </div>
          </div>

          <p className="text-xs text-warm-600 leading-relaxed">
            ※ 신청 후 &apos;나의 신청 내역&apos;에서 선생님의 확인 및 일정 확정 안내를 확인하실 수 있습니다.
          </p>
        </div>
      </Modal>
    </div>
  );
}
