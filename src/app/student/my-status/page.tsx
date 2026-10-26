'use client';

// src/app/student/my-status/page.tsx
import * as React from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import {
  COUNSELING_CATEGORY_LABELS,
  COUNSELING_TIME_SLOT_LABELS,
  formatKoreanDate,
  formatKoreanDateTime,
} from '@/lib/utils';
import type { CounselingRequest, CounselingStatus } from '@/types/models';
import {
  HeartHandshake,
  Calendar,
  Clock,
  AlertCircle,
  Plus,
  RefreshCw,
  MessageSquareHeart,
  XCircle,
  Loader2,
} from 'lucide-react';

export default function MyStatusPage() {
  const [requests, setRequests] = React.useState<CounselingRequest[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  // Filter Tab State
  const [filterStatus, setFilterStatus] = React.useState<string>('all');

  // Cancel Modal State
  const [cancelTargetId, setCancelTargetId] = React.useState<string | null>(null);
  const [isCancelling, setIsCancelling] = React.useState(false);
  const [cancelError, setCancelError] = React.useState<string | null>(null);

  const fetchMyRequests = React.useCallback(async (showRefreshing = false) => {
    if (showRefreshing) setIsRefreshing(true);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/counseling/my');
      const data = await res.json();

      if (!res.ok || !data.success) {
        setErrorMessage(data.error || '신청 내역을 불러오지 못했습니다.');
        return;
      }

      setRequests(data.requests || []);
    } catch {
      setErrorMessage('서버와 통신하는 중 문제가 발생했습니다.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  React.useEffect(() => {
    fetchMyRequests();
  }, [fetchMyRequests]);

  const handleConfirmCancel = async () => {
    if (!cancelTargetId) return;

    setIsCancelling(true);
    setCancelError(null);

    try {
      const res = await fetch(`/api/counseling/${cancelTargetId}/cancel`, {
        method: 'POST',
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setCancelError(data.error || '상담 신청 취소에 실패했습니다.');
        return;
      }

      // Optimistic update
      setRequests((prev) =>
        prev.map((r) => (r.id === cancelTargetId ? { ...r, status: 'cancelled' } : r))
      );

      setCancelTargetId(null);
    } catch {
      setCancelError('서버 연결 중 오류가 발생했습니다.');
    } finally {
      setIsCancelling(false);
    }
  };

  // Filter requests
  const filteredRequests = React.useMemo(() => {
    if (filterStatus === 'all') return requests;
    return requests.filter((r) => r.status === filterStatus);
  }, [requests, filterStatus]);

  // Statistics
  const counts = React.useMemo(() => {
    return {
      all: requests.length,
      pending: requests.filter((r) => r.status === 'pending').length,
      accepted: requests.filter((r) => r.status === 'accepted').length,
      completed: requests.filter((r) => r.status === 'completed').length,
      cancelled: requests.filter((r) => r.status === 'cancelled').length,
    };
  }, [requests]);

  const renderStatusBadge = (status: CounselingStatus) => {
    switch (status) {
      case 'pending':
        return <Badge variant="pending">접수 대기 중</Badge>;
      case 'accepted':
        return <Badge variant="accepted">일정 확정</Badge>;
      case 'completed':
        return <Badge variant="completed">상담 완료</Badge>;
      case 'cancelled':
        return <Badge variant="cancelled">신청 취소됨</Badge>;
      default:
        return <Badge variant="default">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 space-y-3">
        <Loader2 className="h-8 w-8 text-sage-500 animate-spin" />
        <p className="text-sm font-medium text-warm-700">상담 신청 내역을 조회하고 있습니다...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-warm-900 tracking-tight">
            나의 상담 신청 내역
          </h1>
          <p className="text-sm text-warm-700 mt-1">
            신청하신 1:1 비밀 상담의 진행 상태와 선생님의 일정 안내를 확인하세요.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => fetchMyRequests(true)}
            isLoading={isRefreshing}
            leftIcon={<RefreshCw className="h-3.5 w-3.5" />}
          >
            새로고침
          </Button>

          <Link href="/student/counseling/new">
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Plus className="h-4 w-4" />}
            >
              새 상담 신청
            </Button>
          </Link>
        </div>
      </div>

      {/* Filter Tabs & Count Pills */}
      <div className="flex flex-wrap gap-2 pt-1 border-b border-warm-200/80 pb-3">
        {[
          { key: 'all', label: '전체', count: counts.all },
          { key: 'pending', label: '대기 중', count: counts.pending },
          { key: 'accepted', label: '일정 확정', count: counts.accepted },
          { key: 'completed', label: '완료됨', count: counts.completed },
          { key: 'cancelled', label: '취소됨', count: counts.cancelled },
        ].map((tab) => {
          const isActive = filterStatus === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setFilterStatus(tab.key)}
              className={`px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center gap-1.5 ${
                isActive
                  ? 'bg-sage-500 text-white shadow-warm-sm'
                  : 'bg-warm-100 text-warm-700 hover:bg-warm-200/80'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`text-[11px] px-1.5 py-0.2 rounded-full ${
                  isActive ? 'bg-white/20 text-white' : 'bg-warm-200 text-warm-800'
                }`}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Error Banner */}
      {errorMessage && (
        <div
          role="alert"
          className="rounded-2xl bg-blush-50 border border-blush-200 p-4 flex items-center gap-3 text-sm text-blush-800"
        >
          <AlertCircle className="h-5 w-5 text-blush-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Empty State */}
      {filteredRequests.length === 0 ? (
        <Card variant="cream" className="text-center p-10 sm:p-14 space-y-4 rounded-3xl border border-warm-200">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-sage-100 text-sage-600 shadow-warm-sm">
            <HeartHandshake className="h-7 w-7" />
          </div>
          <div className="space-y-1.5 max-w-sm mx-auto">
            <h3 className="text-lg font-bold text-warm-900">
              {filterStatus === 'all'
                ? '아직 신청하신 상담 내역이 없습니다.'
                : '해당 상태의 상담 신청 건이 없습니다.'}
            </h3>
            <p className="text-xs sm:text-sm text-warm-700 leading-relaxed">
              고민이 있거나 선생님과 이야기 나누고 싶다면 언제든 편안하게 상담을 신청해보세요.
            </p>
          </div>
          <div className="pt-2">
            <Link href="/student/counseling/new">
              <Button variant="primary" size="md" leftIcon={<Plus className="h-4 w-4" />}>
                1:1 상담 신청하러 가기
              </Button>
            </Link>
          </div>
        </Card>
      ) : (
        /* Requests Card List */
        <div className="space-y-4">
          {filteredRequests.map((req) => (
            <Card
              key={req.id}
              variant="default"
              className="p-5 sm:p-6 rounded-2xl border border-warm-200/90 shadow-warm-sm space-y-4 bg-white hover:border-sage-200 transition-colors"
            >
              {/* Card Top Header */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-warm-200/60 pb-3">
                <div className="flex items-center gap-2">
                  <Badge variant="category">
                    {COUNSELING_CATEGORY_LABELS[req.category] || req.category}
                  </Badge>
                  {req.is_urgent && (
                    <Badge variant="urgent">
                      🚨 긴급 상담
                    </Badge>
                  )}
                  {renderStatusBadge(req.status)}
                </div>
                <span className="text-xs text-warm-500 font-mono">
                  신청일: {formatKoreanDateTime(req.created_at)}
                </span>
              </div>

              {/* Schedule Info */}
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs sm:text-sm text-warm-800">
                <div className="flex items-center gap-1.5">
                  <Calendar className="h-4 w-4 text-warm-500" />
                  <span className="text-warm-600">희망 일자:</span>
                  <span className="font-semibold text-warm-900">{formatKoreanDate(req.preferred_date)}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="h-4 w-4 text-warm-500" />
                  <span className="text-warm-600">희망 시간:</span>
                  <span className="font-semibold text-warm-900">
                    {COUNSELING_TIME_SLOT_LABELS[req.preferred_time_slot]}
                  </span>
                </div>
              </div>

              {/* Content Body */}
              <div className="rounded-xl bg-warm-50/70 p-4 border border-warm-200/60 text-xs sm:text-sm text-warm-800 leading-relaxed whitespace-pre-wrap">
                {req.content}
              </div>

              {/* Teacher's Scheduled Guidance Note Card */}
              {req.scheduled_note && (
                <div className="rounded-2xl bg-honey-50 border border-honey-200/90 p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <MessageSquareHeart className="h-4 w-4 text-honey-700" />
                    <span className="text-xs sm:text-sm font-bold text-honey-900">
                      선생님의 상담 일정 및 안내 사항
                    </span>
                  </div>

                  {req.scheduled_date && (
                    <div className="text-xs font-semibold text-honey-800">
                      확정 일정:{' '}
                      {formatKoreanDate(req.scheduled_date)}
                      {req.scheduled_time_slot &&
                        ` · ${COUNSELING_TIME_SLOT_LABELS[req.scheduled_time_slot]}`}
                    </div>
                  )}

                  <p className="text-xs sm:text-sm text-warm-900 leading-relaxed font-medium">
                    &ldquo;{req.scheduled_note}&rdquo;
                  </p>
                </div>
              )}

              {/* Card Footer Actions */}
              <div className="flex items-center justify-between pt-2">
                <div className="text-xs text-warm-500">
                  {req.status === 'accepted' && (
                    <span className="text-sage-700 font-medium">
                      ✓ 일정이 확정되었습니다. 약속된 시간에 맞춰 상담 장소로 방문해주세요.
                    </span>
                  )}
                  {req.status === 'completed' && (
                    <span className="text-warm-600">
                      ✓ 상담이 완료되었습니다 ({req.completed_at ? formatKoreanDate(req.completed_at) : '완료'}).
                    </span>
                  )}
                  {req.status === 'cancelled' && (
                    <span className="text-warm-500 line-through">
                      취소 처리된 상담 신청입니다.
                    </span>
                  )}
                </div>

                {/* Cancel Button (Only available for 'pending') */}
                {req.status === 'pending' && (
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => {
                      setCancelTargetId(req.id);
                      setCancelError(null);
                    }}
                    leftIcon={<XCircle className="h-3.5 w-3.5" />}
                  >
                    신청 취소
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Cancellation Confirmation Modal */}
      <Modal
        isOpen={Boolean(cancelTargetId)}
        onClose={() => setCancelTargetId(null)}
        title="상담 신청을 취소하시겠습니까?"
        description="취소된 상담 신청은 다시 복원할 수 없으며, 선생님께 접수된 요청이 취소 처리됩니다."
        size="sm"
        footer={
          <>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setCancelTargetId(null)}
              disabled={isCancelling}
            >
              닫기
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={handleConfirmCancel}
              isLoading={isCancelling}
            >
              신청 취소 확정
            </Button>
          </>
        }
      >
        <div className="space-y-3 text-xs sm:text-sm text-warm-800">
          {cancelError && (
            <div className="p-3 bg-blush-50 border border-blush-200 text-blush-800 rounded-xl">
              {cancelError}
            </div>
          )}
          <p>
            정말로 이 상담 신청을 취소하시겠습니까? 일정 변경을 원하시는 경우 취소 후 새로운 시간으로 다시 신청하실 수 있습니다.
          </p>
        </div>
      </Modal>
    </div>
  );
}
