'use client';

// src/app/teacher/dashboard/page.tsx
import * as React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Modal } from '@/components/ui/modal';
import {
  COUNSELING_CATEGORY_LABELS,
  COUNSELING_STATUS_LABELS,
  COUNSELING_TIME_SLOT_LABELS,
  SUGGESTION_CATEGORY_LABELS,
  SUGGESTION_STATUS_LABELS,
  formatKoreanDate,
  formatKoreanDateTime,
  formatStudentIdentity,
} from '@/lib/utils';
import type {
  CounselingRequest,
  CounselingStatus,
  CounselingTimeSlot,
  Suggestion,
  SuggestionStatus,
  Student,
} from '@/types/models';
import {
  HeartHandshake,
  MessageSquareQuote,
  Clock,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  KeyRound,
  Search,
  RefreshCw,
  MessageSquareHeart,
  Lock,
  Eye,
  ShieldCheck,
  Send,
  Loader2,
  Check,
  Inbox,
  User,
  AlertCircle,
} from 'lucide-react';

type DashboardTab = 'counseling' | 'suggestions' | 'pin-reset';

export default function TeacherDashboardPage() {
  // --------------------------------------------------------------------------
  // 1. Core State
  // --------------------------------------------------------------------------
  const [activeTab, setActiveTab] = React.useState<DashboardTab>('counseling');
  const [isLoading, setIsLoading] = React.useState(true);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [successBanner, setSuccessBanner] = React.useState<string | null>(null);

  // Data Collections
  const [counselings, setCounselings] = React.useState<CounselingRequest[]>([]);
  const [suggestions, setSuggestions] = React.useState<Suggestion[]>([]);
  const [students, setStudents] = React.useState<Student[]>([]);

  // Filter States
  const [counselingStatusFilter, setCounselingStatusFilter] = React.useState<string>('all');
  const [counselingCategoryFilter, setCounselingCategoryFilter] = React.useState<string>('all');
  const [urgentOnly, setUrgentOnly] = React.useState<boolean>(false);
  const [counselingSearch, setCounselingSearch] = React.useState<string>('');

  const [suggestionStatusFilter, setSuggestionStatusFilter] = React.useState<string>('all');
  const [suggestionAnonFilter, setSuggestionAnonFilter] = React.useState<string>('all');
  const [suggestionCategoryFilter, setSuggestionCategoryFilter] = React.useState<string>('all');
  const [suggestionSearch, setSuggestionSearch] = React.useState<string>('');

  const [studentGradeFilter, setStudentGradeFilter] = React.useState<string>('all');
  const [studentClassFilter, setStudentClassFilter] = React.useState<string>('all');
  const [studentSearch, setStudentSearch] = React.useState<string>('');

  // Dialog / Modal Selection
  const [selectedCounseling, setSelectedCounseling] = React.useState<CounselingRequest | null>(null);
  const [counselingModalForm, setCounselingModalForm] = React.useState<{
    scheduledDate: string;
    scheduledTimeSlot: CounselingTimeSlot;
    scheduledNote: string;
    teacherNote: string;
  }>({
    scheduledDate: '',
    scheduledTimeSlot: 'lunch',
    scheduledNote: '',
    teacherNote: '',
  });
  const [isSavingCounseling, setIsSavingCounseling] = React.useState(false);

  const [selectedSuggestion, setSelectedSuggestion] = React.useState<Suggestion | null>(null);
  const [suggestionModalForm, setSuggestionModalForm] = React.useState<{
    status: SuggestionStatus;
    teacherReply: string;
  }>({
    status: 'received',
    teacherReply: '',
  });
  const [isSavingSuggestion, setIsSavingSuggestion] = React.useState(false);

  const [pinResetTarget, setPinResetTarget] = React.useState<Student | null>(null);
  const [isResettingPin, setIsResettingPin] = React.useState(false);

  // --------------------------------------------------------------------------
  // 2. Fetch Data
  // --------------------------------------------------------------------------
  const fetchDashboardData = React.useCallback(async (showRefreshing = false) => {
    if (showRefreshing) setIsRefreshing(true);
    setErrorMessage(null);

    try {
      const [counRes, suggRes, studRes] = await Promise.allSettled([
        fetch('/api/teacher/counseling'),
        fetch('/api/teacher/suggestions'),
        fetch('/api/teacher/students/reset-pin'),
      ]);

      // 1. Counseling Requests
      if (counRes.status === 'fulfilled' && counRes.value.ok) {
        const counData = await counRes.value.json();
        if (counData.success) {
          setCounselings(counData.counselingRequests || counData.requests || []);
        }
      }

      // 2. Suggestions
      if (suggRes.status === 'fulfilled' && suggRes.value.ok) {
        const suggData = await suggRes.value.json();
        if (suggData.success) {
          setSuggestions(suggData.suggestions || []);
        }
      }

      // 3. Students Roster (for PIN reset)
      if (studRes.status === 'fulfilled' && studRes.value.ok) {
        const studData = await studRes.value.json();
        if (studData.success) {
          setStudents(studData.students || []);
        }
      } else {
        // Fallback: derive roster from known students in counseling
        setCounselings((prev) => {
          const derived = new Map<string, Student>();
          prev.forEach((c) => {
            if (c.student) {
              derived.set(c.student.id, {
                id: c.student.id,
                grade: c.student.grade,
                class_number: (c.student as any).classNumber ?? c.student.class_number,
                student_number: (c.student as any).studentNumber ?? c.student.student_number,
                name: c.student.name,
                created_at: c.created_at,
                updated_at: c.updated_at,
              });
            }
          });
          if (derived.size > 0 && students.length === 0) {
            setStudents(Array.from(derived.values()));
          }
          return prev;
        });
      }
    } catch {
      setErrorMessage('서버에서 대시보드 데이터를 불러오지 못했습니다.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [students.length]);

  React.useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Auto-dismiss success banner
  React.useEffect(() => {
    if (successBanner) {
      const t = setTimeout(() => setSuccessBanner(null), 5000);
      return () => clearTimeout(t);
    }
  }, [successBanner]);

  // --------------------------------------------------------------------------
  // 3. KPI Statistics Computation
  // --------------------------------------------------------------------------
  const kpis = React.useMemo(() => {
    const pendingCounseling = counselings.filter((c) => c.status === 'pending').length;
    const urgentCounseling = counselings.filter(
      (c) => Boolean(c.is_urgent ?? (c as any).isUrgent) && c.status !== 'completed'
    ).length;
    const unreviewedSuggestions = suggestions.filter(
      (s) => s.status === 'pending' || s.status === 'received'
    ).length;
    const totalResolved =
      counselings.filter((c) => c.status === 'completed').length +
      suggestions.filter((s) => s.status === 'resolved').length;

    return {
      pendingCounseling,
      urgentCounseling,
      unreviewedSuggestions,
      totalResolved,
    };
  }, [counselings, suggestions]);

  // --------------------------------------------------------------------------
  // 4. Filtered Data Lists
  // --------------------------------------------------------------------------
  const filteredCounselings = React.useMemo(() => {
    return counselings.filter((item) => {
      const isUrgent = Boolean(item.is_urgent ?? (item as any).isUrgent);
      if (urgentOnly && !isUrgent) return false;
      if (counselingStatusFilter !== 'all' && item.status !== counselingStatusFilter) return false;
      if (counselingCategoryFilter !== 'all' && item.category !== counselingCategoryFilter) return false;

      if (counselingSearch.trim()) {
        const query = counselingSearch.trim().toLowerCase();
        const student = item.student;
        const studentIdentity = student
          ? `${student.grade}학년 ${student.class_number ?? (student as any).classNumber}반 ${
              student.student_number ?? (student as any).studentNumber
            }번 ${student.name}`.toLowerCase()
          : '';
        const contentMatch = (item.content || '').toLowerCase().includes(query);
        const nameMatch = studentIdentity.includes(query);
        if (!contentMatch && !nameMatch) return false;
      }

      return true;
    });
  }, [counselings, urgentOnly, counselingStatusFilter, counselingCategoryFilter, counselingSearch]);

  const filteredSuggestions = React.useMemo(() => {
    return suggestions.filter((item) => {
      const isAnon = Boolean(item.is_anonymous ?? (item as any).isAnonymous);
      if (suggestionAnonFilter === 'anonymous' && !isAnon) return false;
      if (suggestionAnonFilter === 'identified' && isAnon) return false;
      if (suggestionStatusFilter !== 'all' && item.status !== suggestionStatusFilter) return false;
      if (suggestionCategoryFilter !== 'all' && item.category !== suggestionCategoryFilter) return false;

      if (suggestionSearch.trim()) {
        const query = suggestionSearch.trim().toLowerCase();
        const titleMatch = (item.title || '').toLowerCase().includes(query);
        const contentMatch = (item.content || '').toLowerCase().includes(query);
        const studentName = !isAnon && item.student ? item.student.name.toLowerCase() : '';
        const nameMatch = studentName.includes(query);
        if (!titleMatch && !contentMatch && !nameMatch) return false;
      }

      return true;
    });
  }, [suggestions, suggestionAnonFilter, suggestionStatusFilter, suggestionCategoryFilter, suggestionSearch]);

  const filteredStudents = React.useMemo(() => {
    return students.filter((item) => {
      const grade = item.grade;
      const classNum = item.class_number ?? (item as any).classNumber;
      if (studentGradeFilter !== 'all' && String(grade) !== studentGradeFilter) return false;
      if (studentClassFilter !== 'all' && String(classNum) !== studentClassFilter) return false;

      if (studentSearch.trim()) {
        const query = studentSearch.trim().toLowerCase();
        const identity = `${grade}학년 ${classNum}반 ${
          item.student_number ?? (item as any).studentNumber
        }번 ${item.name}`.toLowerCase();
        if (!identity.includes(query)) return false;
      }

      return true;
    });
  }, [students, studentGradeFilter, studentClassFilter, studentSearch]);

  // --------------------------------------------------------------------------
  // 5. Counseling Actions (Two-Tier Notes & Status Updates)
  // --------------------------------------------------------------------------
  const openCounselingModal = (req: CounselingRequest) => {
    setSelectedCounseling(req);
    setCounselingModalForm({
      scheduledDate: req.scheduled_date || (req as any).scheduledDate || '',
      scheduledTimeSlot: req.scheduled_time_slot || (req as any).scheduledTimeSlot || req.preferred_time_slot || 'lunch',
      scheduledNote: req.scheduled_note || (req as any).scheduledNote || '',
      teacherNote: req.teacher_note || (req as any).teacherNote || '',
    });
  };

  const handleUpdateCounseling = async (newStatus: CounselingStatus) => {
    if (!selectedCounseling) return;
    setIsSavingCounseling(true);

    try {
      const payload = {
        status: newStatus,
        scheduledDate: counselingModalForm.scheduledDate || undefined,
        scheduledTimeSlot: counselingModalForm.scheduledTimeSlot,
        scheduledNote: counselingModalForm.scheduledNote,
        teacherNote: counselingModalForm.teacherNote,
      };

      const res = await fetch(`/api/teacher/counseling/${selectedCounseling.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || '상담 요청 업데이트에 실패했습니다.');
      }

      // Optimistic Local State Update
      setCounselings((prev) =>
        prev.map((c) =>
          c.id === selectedCounseling.id
            ? {
                ...c,
                status: newStatus,
                scheduled_date: counselingModalForm.scheduledDate,
                scheduled_time_slot: counselingModalForm.scheduledTimeSlot,
                scheduled_note: counselingModalForm.scheduledNote,
                teacher_note: counselingModalForm.teacherNote,
                completed_at: newStatus === 'completed' ? new Date().toISOString() : c.completed_at,
              }
            : c
        )
      );

      setSuccessBanner(
        newStatus === 'accepted'
          ? '상담 일정이 확정되었으며 학생 안내 메모가 등록되었습니다.'
          : newStatus === 'completed'
          ? '상담이 성공적으로 완료 처리되었습니다.'
          : '상담 메모 및 상태가 저장되었습니다.'
      );
      setSelectedCounseling(null);
    } catch (err: any) {
      alert(err.message || '오류가 발생했습니다.');
    } finally {
      setIsSavingCounseling(false);
    }
  };

  // --------------------------------------------------------------------------
  // 6. Suggestion Actions (Reply & Status Updates)
  // --------------------------------------------------------------------------
  const openSuggestionModal = (sugg: Suggestion) => {
    setSelectedSuggestion(sugg);
    setSuggestionModalForm({
      status: sugg.status,
      teacherReply: sugg.teacher_reply || (sugg as any).teacherReply || '',
    });
  };

  const handleUpdateSuggestion = async () => {
    if (!selectedSuggestion) return;
    setIsSavingSuggestion(true);

    try {
      const payload = {
        status: suggestionModalForm.status,
        teacherReply: suggestionModalForm.teacherReply,
      };

      const res = await fetch(`/api/teacher/suggestions/${selectedSuggestion.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || '건의사항 업데이트에 실패했습니다.');
      }

      // Optimistic Local State Update
      setSuggestions((prev) =>
        prev.map((s) =>
          s.id === selectedSuggestion.id
            ? {
                ...s,
                status: suggestionModalForm.status,
                teacher_reply: suggestionModalForm.teacherReply,
                replied_at: new Date().toISOString(),
              }
            : s
        )
      );

      setSuccessBanner('건의사항 답변 및 처리 상태가 등록되었습니다.');
      setSelectedSuggestion(null);
    } catch (err: any) {
      alert(err.message || '오류가 발생했습니다.');
    } finally {
      setIsSavingSuggestion(false);
    }
  };

  // --------------------------------------------------------------------------
  // 7. Student PIN Reset Action
  // --------------------------------------------------------------------------
  const handleConfirmPinReset = async () => {
    if (!pinResetTarget) return;
    setIsResettingPin(true);

    try {
      const res = await fetch('/api/teacher/students/reset-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: pinResetTarget.id,
          newPin: '0000',
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || '학생 PIN 초기화에 실패했습니다.');
      }

      setSuccessBanner(
        `${pinResetTarget.grade}학년 ${
          pinResetTarget.class_number ?? (pinResetTarget as any).classNumber
        }반 ${pinResetTarget.student_number ?? (pinResetTarget as any).studentNumber}번 ${
          pinResetTarget.name
        } 학생의 PIN이 '0000'으로 초기화되었습니다.`
      );
      setPinResetTarget(null);
    } catch (err: any) {
      alert(err.message || 'PIN 초기화 중 오류가 발생했습니다.');
    } finally {
      setIsResettingPin(false);
    }
  };

  // Loading State
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-16 space-y-4">
        <Loader2 className="h-9 w-9 text-honey-600 animate-spin" />
        <p className="text-sm font-semibold text-warm-800">
          학급 상담 및 건의함 통합 대시보드를 불러오는 중입니다...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Top Title Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-warm-900 tracking-tight">
            선생님 통합 관리 대시보드
          </h1>
          <p className="text-sm text-warm-700 mt-1">
            1:1 개별 상담 신청 조율, 학급 비밀 건의함 피드백 및 학생 계정 PIN을 관리합니다.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => fetchDashboardData(true)}
            isLoading={isRefreshing}
            leftIcon={<RefreshCw className="h-3.5 w-3.5" />}
          >
            새로고침
          </Button>
        </div>
      </div>

      {/* Success Notification Banner */}
      {successBanner && (
        <div
          role="status"
          className="rounded-2xl bg-sage-50 border border-sage-200 p-4 flex items-center justify-between gap-3 text-sm text-sage-900 shadow-warm-sm animate-in fade-in"
        >
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="h-5 w-5 text-sage-600 shrink-0" />
            <span className="font-medium">{successBanner}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessBanner(null)}
            className="text-sage-700 hover:text-sage-900 text-xs font-semibold"
          >
            닫기
          </button>
        </div>
      )}

      {/* Error Banner */}
      {errorMessage && (
        <div
          role="alert"
          className="rounded-2xl bg-blush-50 border border-blush-200 p-4 flex items-center gap-3 text-sm text-blush-900"
        >
          <AlertCircle className="h-5 w-5 text-blush-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* ---------------------------------------------------------------------- */}
      {/* 1. Overview KPI Summary Cards                                          */}
      {/* ---------------------------------------------------------------------- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Pending Counseling */}
        <Card
          variant="interactive"
          onClick={() => {
            setActiveTab('counseling');
            setCounselingStatusFilter('pending');
            setUrgentOnly(false);
          }}
          className="p-5 border-2 border-honey-200/80 bg-gradient-to-br from-white to-honey-50/50 rounded-2xl flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-honey-800 tracking-wide uppercase">
              대기 중인 상담
            </span>
            <div className="h-8 w-8 rounded-xl bg-honey-100 flex items-center justify-center text-honey-700">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-extrabold text-warm-900">{kpis.pendingCounseling}건</div>
            <p className="text-xs text-honey-800 font-medium mt-1">접수 및 일정 조율 필요</p>
          </div>
        </Card>

        {/* KPI 2: Urgent Counseling */}
        <Card
          variant="interactive"
          onClick={() => {
            setActiveTab('counseling');
            setUrgentOnly(true);
            setCounselingStatusFilter('all');
          }}
          className="p-5 border-2 border-blush-200/90 bg-gradient-to-br from-white to-blush-50/50 rounded-2xl flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-blush-800 tracking-wide uppercase">
              🚨 긴급 상담 신청
            </span>
            <div className="h-8 w-8 rounded-xl bg-blush-100 flex items-center justify-center text-blush-700">
              <AlertTriangle className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-extrabold text-blush-900">{kpis.urgentCounseling}건</div>
            <p className="text-xs text-blush-700 font-semibold mt-1">최우선 확인 및 조율 요망</p>
          </div>
        </Card>

        {/* KPI 3: Unreviewed Suggestions */}
        <Card
          variant="interactive"
          onClick={() => {
            setActiveTab('suggestions');
            setSuggestionStatusFilter('pending');
          }}
          className="p-5 border-2 border-warm-200/90 bg-gradient-to-br from-white to-warm-100/40 rounded-2xl flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-warm-800 tracking-wide uppercase">
              미확인 / 대기 건의
            </span>
            <div className="h-8 w-8 rounded-xl bg-warm-200 flex items-center justify-center text-warm-700">
              <Inbox className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-extrabold text-warm-900">
              {kpis.unreviewedSuggestions}건
            </div>
            <p className="text-xs text-warm-700 font-medium mt-1">선생님 확인 및 답변 대기</p>
          </div>
        </Card>

        {/* KPI 4: Total Completed */}
        <Card
          variant="default"
          className="p-5 border-2 border-sage-200/80 bg-gradient-to-br from-white to-sage-50/40 rounded-2xl flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-sage-800 tracking-wide uppercase">
              완료 및 해결 완료
            </span>
            <div className="h-8 w-8 rounded-xl bg-sage-100 flex items-center justify-center text-sage-700">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-extrabold text-warm-900">{kpis.totalResolved}건</div>
            <p className="text-xs text-sage-800 font-medium mt-1">상담 완료 및 건의 반영 누적</p>
          </div>
        </Card>
      </div>

      {/* ---------------------------------------------------------------------- */}
      {/* 2. Main Tab Navigation Bar                                             */}
      {/* ---------------------------------------------------------------------- */}
      <div className="flex flex-wrap items-center gap-2 border-b border-warm-200/90 pb-4">
        {/* Tab 1: 1:1 Counseling */}
        <button
          onClick={() => setActiveTab('counseling')}
          className={`px-5 py-2.5 rounded-2xl font-bold text-sm sm:text-base transition-all flex items-center gap-2 ${
            activeTab === 'counseling'
              ? 'bg-sage-500 text-white shadow-warm-md'
              : 'bg-warm-100 text-warm-800 hover:bg-warm-200'
          }`}
        >
          <HeartHandshake className="h-4 w-4" />
          <span>1:1 상담 신청 관리</span>
          <span
            className={`text-xs px-2 py-0.5 rounded-full font-mono ${
              activeTab === 'counseling' ? 'bg-white/20 text-white' : 'bg-warm-200 text-warm-900'
            }`}
          >
            {counselings.length}
          </span>
          {kpis.urgentCounseling > 0 && (
            <span className="h-2 w-2 rounded-full bg-blush-500 animate-pulse" />
          )}
        </button>

        {/* Tab 2: Suggestions */}
        <button
          onClick={() => setActiveTab('suggestions')}
          className={`px-5 py-2.5 rounded-2xl font-bold text-sm sm:text-base transition-all flex items-center gap-2 ${
            activeTab === 'suggestions'
              ? 'bg-sage-500 text-white shadow-warm-md'
              : 'bg-warm-100 text-warm-800 hover:bg-warm-200'
          }`}
        >
          <MessageSquareQuote className="h-4 w-4" />
          <span>비밀 건의함 관리</span>
          <span
            className={`text-xs px-2 py-0.5 rounded-full font-mono ${
              activeTab === 'suggestions' ? 'bg-white/20 text-white' : 'bg-warm-200 text-warm-900'
            }`}
          >
            {suggestions.length}
          </span>
        </button>

        {/* Tab 3: Student PIN Reset */}
        <button
          onClick={() => setActiveTab('pin-reset')}
          className={`px-5 py-2.5 rounded-2xl font-bold text-sm sm:text-base transition-all flex items-center gap-2 ${
            activeTab === 'pin-reset'
              ? 'bg-sage-500 text-white shadow-warm-md'
              : 'bg-warm-100 text-warm-800 hover:bg-warm-200'
          }`}
        >
          <KeyRound className="h-4 w-4" />
          <span>학생 PIN 초기화</span>
          <span
            className={`text-xs px-2 py-0.5 rounded-full font-mono ${
              activeTab === 'pin-reset' ? 'bg-white/20 text-white' : 'bg-warm-200 text-warm-900'
            }`}
          >
            {students.length}명
          </span>
        </button>
      </div>

      {/* ---------------------------------------------------------------------- */}
      {/* 3. TAB 1: 1:1 상담 신청 관리                                            */}
      {/* ---------------------------------------------------------------------- */}
      {activeTab === 'counseling' && (
        <div className="space-y-5">
          {/* Filter Toolbar */}
          <div className="rounded-2xl bg-white border border-warm-200/80 p-4 shadow-warm-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2.5 flex-1">
              {/* Status Selector */}
              <select
                aria-label="상태 필터"
                value={counselingStatusFilter}
                onChange={(e) => setCounselingStatusFilter(e.target.value)}
                className="bg-warm-50 border border-warm-200 rounded-xl px-3 py-2 text-xs sm:text-sm font-medium text-warm-900 focus:outline-none focus:ring-2 focus:ring-sage-400"
              >
                <option value="all">전체 상태</option>
                <option value="pending">대기 중 (pending)</option>
                <option value="accepted">일정 확정 (accepted)</option>
                <option value="completed">상담 완료 (completed)</option>
                <option value="cancelled">취소됨 (cancelled)</option>
              </select>

              {/* Category Selector */}
              <select
                aria-label="고민 카테고리 필터"
                value={counselingCategoryFilter}
                onChange={(e) => setCounselingCategoryFilter(e.target.value)}
                className="bg-warm-50 border border-warm-200 rounded-xl px-3 py-2 text-xs sm:text-sm font-medium text-warm-900 focus:outline-none focus:ring-2 focus:ring-sage-400"
              >
                <option value="all">전체 카테고리</option>
                {Object.entries(COUNSELING_CATEGORY_LABELS).map(([k, label]) => (
                  <option key={k} value={k}>
                    {label}
                  </option>
                ))}
              </select>

              {/* Urgency Toggle Button */}
              <button
                type="button"
                onClick={() => setUrgentOnly(!urgentOnly)}
                className={`px-3 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-1.5 border ${
                  urgentOnly
                    ? 'bg-blush-500 text-white border-blush-600 shadow-warm-sm'
                    : 'bg-warm-50 text-warm-800 border-warm-200 hover:bg-blush-50/70 hover:text-blush-800'
                }`}
              >
                <span>🚨 긴급 상담만 보기</span>
              </button>

              {/* Clear Filter Button */}
              {(counselingStatusFilter !== 'all' ||
                counselingCategoryFilter !== 'all' ||
                urgentOnly ||
                counselingSearch) && (
                <button
                  type="button"
                  onClick={() => {
                    setCounselingStatusFilter('all');
                    setCounselingCategoryFilter('all');
                    setUrgentOnly(false);
                    setCounselingSearch('');
                  }}
                  className="text-xs text-warm-600 hover:text-warm-900 font-semibold underline underline-offset-2 ml-1"
                >
                  필터 초기화
                </button>
              )}
            </div>

            {/* Search Input */}
            <div className="w-full md:w-64">
              <Input
                placeholder="학생 이름, 번호, 내용 검색..."
                value={counselingSearch}
                onChange={(e) => setCounselingSearch(e.target.value)}
                leftIcon={<Search className="h-4 w-4" />}
                className="py-2 text-sm"
              />
            </div>
          </div>

          {/* Counseling List */}
          {filteredCounselings.length === 0 ? (
            <Card variant="cream" className="text-center p-12 rounded-3xl border border-warm-200">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-sage-100 text-sage-600 mb-3">
                <HeartHandshake className="h-7 w-7" />
              </div>
              <h3 className="text-lg font-bold text-warm-900">신청된 상담 내역이 없습니다.</h3>
              <p className="text-xs sm:text-sm text-warm-700 mt-1">
                현재 필터 조건에 부합하는 학생 상담 신청 건이 없습니다.
              </p>
            </Card>
          ) : (
            <div className="space-y-3.5">
              {filteredCounselings.map((req) => {
                const isUrgent = Boolean(req.is_urgent ?? (req as any).isUrgent);
                const student = req.student;
                const studentStr = student
                  ? formatStudentIdentity(
                      student.grade,
                      (student as any).classNumber ?? student.class_number,
                      (student as any).studentNumber ?? student.student_number,
                      student.name
                    )
                  : '학생 정보 없음';

                return (
                  <Card
                    key={req.id}
                    variant="default"
                    className={`p-5 rounded-2xl border transition-all hover:shadow-warm-md bg-white ${
                      isUrgent
                        ? 'border-blush-300 ring-1 ring-blush-200/80 bg-blush-50/10'
                        : 'border-warm-200/90'
                    }`}
                  >
                    {/* Top Row: Roster, Badges, Date */}
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-warm-200/60 pb-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-extrabold text-base text-warm-900 flex items-center gap-1.5">
                          <User className="h-4 w-4 text-warm-600" />
                          {studentStr}
                        </span>
                        <Badge variant="category">
                          {COUNSELING_CATEGORY_LABELS[req.category] || req.category}
                        </Badge>
                        {isUrgent && <Badge variant="urgent">🚨 긴급 상담</Badge>}
                        <Badge variant={req.status as any}>
                          {COUNSELING_STATUS_LABELS[req.status] || req.status}
                        </Badge>
                      </div>

                      <span className="text-xs font-mono text-warm-500">
                        접수: {formatKoreanDateTime(req.created_at)}
                      </span>
                    </div>

                    {/* Middle Row: Schedule Info & Content Snippet */}
                    <div className="py-3 space-y-2">
                      <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs sm:text-sm text-warm-700">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5 text-warm-500" />
                          <span>희망 일자:</span>
                          <strong className="text-warm-900">
                            {formatKoreanDate(req.preferred_date || (req as any).preferredDate)}
                          </strong>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5 text-warm-500" />
                          <span>희망 시간:</span>
                          <strong className="text-warm-900">
                            {COUNSELING_TIME_SLOT_LABELS[
                              req.preferred_time_slot || (req as any).preferredTimeSlot
                            ]}
                          </strong>
                        </div>

                        {/* Confirmed Schedule Tag (if accepted) */}
                        {(req.scheduled_date || (req as any).scheduledDate) && (
                          <div className="flex items-center gap-1 text-sage-800 font-semibold bg-sage-50 px-2.5 py-0.5 rounded-lg border border-sage-200">
                            <Check className="h-3 w-3 text-sage-600" />
                            <span>
                              확정:{' '}
                              {formatKoreanDate(
                                req.scheduled_date || (req as any).scheduledDate
                              )}
                              {req.scheduled_time_slot &&
                                ` (${COUNSELING_TIME_SLOT_LABELS[req.scheduled_time_slot]})`}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Content Preview */}
                      <p className="text-xs sm:text-sm text-warm-800 leading-relaxed bg-warm-50/70 p-3 rounded-xl border border-warm-200/50 line-clamp-2">
                        {req.content}
                      </p>
                    </div>

                    {/* Bottom Row: Note indicators & Modal trigger */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                      <div className="flex items-center gap-2 text-xs">
                        {(req.scheduled_note || (req as any).scheduledNote) && (
                          <span className="inline-flex items-center gap-1 text-honey-800 bg-honey-100/70 px-2 py-0.5 rounded-lg font-medium">
                            <MessageSquareHeart className="h-3 w-3" /> 안내 메모 등록됨
                          </span>
                        )}
                        {(req.teacher_note || (req as any).teacherNote) && (
                          <span className="inline-flex items-center gap-1 text-warm-700 bg-warm-200/60 px-2 py-0.5 rounded-lg font-medium">
                            <Lock className="h-3 w-3" /> 비밀 메모 작성됨
                          </span>
                        )}
                      </div>

                      <Button
                        variant={req.status === 'pending' ? 'primary' : 'secondary'}
                        size="sm"
                        onClick={() => openCounselingModal(req)}
                        rightIcon={<Eye className="h-3.5 w-3.5" />}
                      >
                        상세 보기 및 일정 조율
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ---------------------------------------------------------------------- */}
      {/* 4. TAB 2: 비밀 건의함 관리                                             */}
      {/* ---------------------------------------------------------------------- */}
      {activeTab === 'suggestions' && (
        <div className="space-y-5">
          {/* Suggestions Filter Toolbar */}
          <div className="rounded-2xl bg-white border border-warm-200/80 p-4 shadow-warm-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2.5 flex-1">
              {/* Status Selector */}
              <select
                aria-label="건의 상태 필터"
                value={suggestionStatusFilter}
                onChange={(e) => setSuggestionStatusFilter(e.target.value)}
                className="bg-warm-50 border border-warm-200 rounded-xl px-3 py-2 text-xs sm:text-sm font-medium text-warm-900 focus:outline-none focus:ring-2 focus:ring-sage-400"
              >
                <option value="all">전체 상태</option>
                {Object.entries(SUGGESTION_STATUS_LABELS).map(([k, label]) => (
                  <option key={k} value={k}>
                    {label} ({k})
                  </option>
                ))}
              </select>

              {/* Anonymity Filter */}
              <select
                aria-label="익명성 구분 필터"
                value={suggestionAnonFilter}
                onChange={(e) => setSuggestionAnonFilter(e.target.value)}
                className="bg-warm-50 border border-warm-200 rounded-xl px-3 py-2 text-xs sm:text-sm font-medium text-warm-900 focus:outline-none focus:ring-2 focus:ring-sage-400"
              >
                <option value="all">익명/기명 전체</option>
                <option value="anonymous">🛡️ 익명 건의만</option>
                <option value="identified">👤 실명 건의만</option>
              </select>

              {/* Category Selector */}
              <select
                aria-label="건의 카테고리 필터"
                value={suggestionCategoryFilter}
                onChange={(e) => setSuggestionCategoryFilter(e.target.value)}
                className="bg-warm-50 border border-warm-200 rounded-xl px-3 py-2 text-xs sm:text-sm font-medium text-warm-900 focus:outline-none focus:ring-2 focus:ring-sage-400"
              >
                <option value="all">전체 카테고리</option>
                {Object.entries(SUGGESTION_CATEGORY_LABELS).map(([k, label]) => (
                  <option key={k} value={k}>
                    {label}
                  </option>
                ))}
              </select>

              {/* Reset filter */}
              {(suggestionStatusFilter !== 'all' ||
                suggestionAnonFilter !== 'all' ||
                suggestionCategoryFilter !== 'all' ||
                suggestionSearch) && (
                <button
                  type="button"
                  onClick={() => {
                    setSuggestionStatusFilter('all');
                    setSuggestionAnonFilter('all');
                    setSuggestionCategoryFilter('all');
                    setSuggestionSearch('');
                  }}
                  className="text-xs text-warm-600 hover:text-warm-900 font-semibold underline underline-offset-2 ml-1"
                >
                  필터 초기화
                </button>
              )}
            </div>

            {/* Search Input */}
            <div className="w-full md:w-64">
              <Input
                placeholder="제목, 내용 검색..."
                value={suggestionSearch}
                onChange={(e) => setSuggestionSearch(e.target.value)}
                leftIcon={<Search className="h-4 w-4" />}
                className="py-2 text-sm"
              />
            </div>
          </div>

          {/* Suggestions List */}
          {filteredSuggestions.length === 0 ? (
            <Card variant="cream" className="text-center p-12 rounded-3xl border border-warm-200">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-warm-200 text-warm-600 mb-3">
                <Inbox className="h-7 w-7" />
              </div>
              <h3 className="text-lg font-bold text-warm-900">접수된 건의사항이 없습니다.</h3>
              <p className="text-xs sm:text-sm text-warm-700 mt-1">
                현재 필터 조건에 부합하는 학급 건의사항이 없습니다.
              </p>
            </Card>
          ) : (
            <div className="space-y-3.5">
              {filteredSuggestions.map((sugg) => {
                const isAnon = Boolean(sugg.is_anonymous ?? (sugg as any).isAnonymous);
                const hasReply = Boolean(sugg.teacher_reply || (sugg as any).teacherReply);

                return (
                  <Card
                    key={sugg.id}
                    variant="default"
                    className="p-5 rounded-2xl border border-warm-200/90 bg-white hover:shadow-warm-md transition-all space-y-3"
                  >
                    {/* Top Row: Anonymity, Category, Status, CreatedAt */}
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-warm-200/60 pb-3">
                      <div className="flex flex-wrap items-center gap-2">
                        {isAnon ? (
                          <Badge variant="anonymous">🛡️ 익명 건의</Badge>
                        ) : (
                          <Badge variant="named">
                            👤 실명:{' '}
                            {sugg.student
                              ? formatStudentIdentity(
                                  sugg.student.grade,
                                  (sugg.student as any).classNumber ?? sugg.student.class_number,
                                  (sugg.student as any).studentNumber ?? sugg.student.student_number,
                                  sugg.student.name
                                )
                              : '학생'}
                          </Badge>
                        )}
                        <Badge variant="category">
                          {SUGGESTION_CATEGORY_LABELS[sugg.category] || sugg.category}
                        </Badge>
                        <Badge variant={sugg.status as any}>
                          {SUGGESTION_STATUS_LABELS[sugg.status] || sugg.status}
                        </Badge>
                      </div>

                      <span className="text-xs font-mono text-warm-500">
                        {formatKoreanDateTime(sugg.created_at)}
                      </span>
                    </div>

                    {/* Middle: Title & Content */}
                    <div>
                      <h4 className="font-extrabold text-base text-warm-900 leading-snug">
                        {sugg.title}
                      </h4>
                      <p className="text-xs sm:text-sm text-warm-700 leading-relaxed mt-1 line-clamp-2">
                        {sugg.content}
                      </p>
                    </div>

                    {/* Reply Preview (if any) */}
                    {hasReply && (
                      <div className="bg-sage-50/80 border border-sage-200/70 rounded-xl p-3 text-xs sm:text-sm text-sage-900 space-y-1">
                        <div className="flex items-center gap-1.5 font-bold text-sage-800">
                          <CheckCircle2 className="h-3.5 w-3.5 text-sage-600" />
                          <span>선생님 답변 완료</span>
                        </div>
                        <p className="line-clamp-2 text-sage-900">
                          &ldquo;{sugg.teacher_reply || (sugg as any).teacherReply}&rdquo;
                        </p>
                      </div>
                    )}

                    {/* Bottom Row */}
                    <div className="flex items-center justify-between pt-1">
                      <div className="text-xs text-warm-500">
                        {hasReply ? (
                          <span className="text-sage-700 font-semibold">✓ 답변 등록됨</span>
                        ) : (
                          <span className="text-honey-700 font-medium">답변 미작성</span>
                        )}
                      </div>

                      <Button
                        variant={hasReply ? 'secondary' : 'primary'}
                        size="sm"
                        onClick={() => openSuggestionModal(sugg)}
                        rightIcon={<Send className="h-3.5 w-3.5" />}
                      >
                        상세 및 답변 작성
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ---------------------------------------------------------------------- */}
      {/* 5. TAB 3: 학생 PIN 초기화 패널                                         */}
      {/* ---------------------------------------------------------------------- */}
      {activeTab === 'pin-reset' && (
        <div className="space-y-5">
          {/* Instructions Box */}
          <Card variant="honey" className="p-4 sm:p-5 rounded-2xl border-honey-200 space-y-1.5">
            <div className="flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-honey-700 shrink-0" />
              <h3 className="font-extrabold text-sm sm:text-base text-honey-900">
                학생 간편 비밀번호(PIN) 관리 안내
              </h3>
            </div>
            <p className="text-xs sm:text-sm text-honey-900 leading-relaxed">
              학생이 본인의 4자리 PIN을 분실하여 로그인이 불가능한 경우, 아래 명단에서 해당 학생을 찾아
              <strong> &apos;PIN 0000으로 초기화&apos;</strong> 버튼을 누르면 즉시 초기화됩니다. 학생에게 임시
              비밀번호 <strong>&apos;0000&apos;</strong>으로 로그인하도록 안내해주세요.
            </p>
          </Card>

          {/* Roster Filter Bar */}
          <div className="rounded-2xl bg-white border border-warm-200/80 p-4 shadow-warm-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2.5 flex-1">
              <select
                aria-label="학년 필터"
                value={studentGradeFilter}
                onChange={(e) => setStudentGradeFilter(e.target.value)}
                className="bg-warm-50 border border-warm-200 rounded-xl px-3 py-2 text-xs sm:text-sm font-medium text-warm-900 focus:outline-none focus:ring-2 focus:ring-sage-400"
              >
                <option value="all">전체 학년</option>
                <option value="1">1학년</option>
                <option value="2">2학년</option>
                <option value="3">3학년</option>
              </select>

              <select
                aria-label="반 필터"
                value={studentClassFilter}
                onChange={(e) => setStudentClassFilter(e.target.value)}
                className="bg-warm-50 border border-warm-200 rounded-xl px-3 py-2 text-xs sm:text-sm font-medium text-warm-900 focus:outline-none focus:ring-2 focus:ring-sage-400"
              >
                <option value="all">전체 반</option>
                {[...Array(10)].map((_, i) => (
                  <option key={i + 1} value={String(i + 1)}>
                    {i + 1}반
                  </option>
                ))}
              </select>

              {(studentGradeFilter !== 'all' || studentClassFilter !== 'all' || studentSearch) && (
                <button
                  type="button"
                  onClick={() => {
                    setStudentGradeFilter('all');
                    setStudentClassFilter('all');
                    setStudentSearch('');
                  }}
                  className="text-xs text-warm-600 hover:text-warm-900 font-semibold underline underline-offset-2 ml-1"
                >
                  필터 초기화
                </button>
              )}
            </div>

            <div className="w-full md:w-64">
              <Input
                placeholder="학생 이름 또는 번호 검색..."
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                leftIcon={<Search className="h-4 w-4" />}
                className="py-2 text-sm"
              />
            </div>
          </div>

          {/* Student Roster Table */}
          {filteredStudents.length === 0 ? (
            <Card variant="cream" className="text-center p-12 rounded-3xl border border-warm-200">
              <h3 className="text-lg font-bold text-warm-900">등록된 학생 정보가 없습니다.</h3>
              <p className="text-xs sm:text-sm text-warm-700 mt-1">
                검색 조건에 맞는 학생이 없거나 아직 등록된 학생이 없습니다.
              </p>
            </Card>
          ) : (
            <div className="rounded-2xl border border-warm-200 bg-white overflow-hidden shadow-warm-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs sm:text-sm">
                  <thead>
                    <tr className="bg-warm-100/70 border-b border-warm-200 text-warm-800 font-bold">
                      <th className="p-3.5 pl-5">인적사항 (학년/반/번호)</th>
                      <th className="p-3.5">이름</th>
                      <th className="p-3.5">가입 일자</th>
                      <th className="p-3.5">최근 로그인</th>
                      <th className="p-3.5 pr-5 text-right">계정 관리</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-warm-200/60 text-warm-900">
                    {filteredStudents.map((stud) => {
                      const classNum = stud.class_number ?? (stud as any).classNumber;
                      const studNum = stud.student_number ?? (stud as any).studentNumber;

                      return (
                        <tr key={stud.id} className="hover:bg-warm-50/70 transition-colors">
                          <td className="p-3.5 pl-5 font-semibold text-warm-900">
                            {stud.grade}학년 {classNum}반 {studNum}번
                          </td>
                          <td className="p-3.5 font-bold text-warm-900">{stud.name}</td>
                          <td className="p-3.5 text-warm-600 font-mono text-xs">
                            {formatKoreanDate(stud.created_at)}
                          </td>
                          <td className="p-3.5 text-warm-600 font-mono text-xs">
                            {stud.last_login_at
                              ? formatKoreanDateTime(stud.last_login_at)
                              : '기록 없음'}
                          </td>
                          <td className="p-3.5 pr-5 text-right">
                            <Button
                              variant="danger"
                              size="sm"
                              onClick={() => setPinResetTarget(stud)}
                              leftIcon={<KeyRound className="h-3.5 w-3.5" />}
                            >
                              PIN &apos;0000&apos;으로 초기화
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ---------------------------------------------------------------------- */}
      {/* 6. MODAL: 1:1 상담 상세 및 일정 조율 (Two-Tier Notes)                    */}
      {/* ---------------------------------------------------------------------- */}
      {selectedCounseling && (
        <Modal
          isOpen={Boolean(selectedCounseling)}
          onClose={() => setSelectedCounseling(null)}
          title="1:1 개별 상담 상세 및 일정 조율"
          description={
            selectedCounseling.student
              ? `${formatStudentIdentity(
                  selectedCounseling.student.grade,
                  (selectedCounseling.student as any).classNumber ?? selectedCounseling.student.class_number,
                  (selectedCounseling.student as any).studentNumber ?? selectedCounseling.student.student_number,
                  selectedCounseling.student.name
                )} 학생의 신청 내역입니다.`
              : '학생 상담 신청 내역입니다.'
          }
          size="lg"
          footer={
            <div className="flex flex-wrap items-center justify-between w-full gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedCounseling(null)}
                disabled={isSavingCounseling}
              >
                닫기
              </Button>

              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleUpdateCounseling(selectedCounseling.status)}
                  isLoading={isSavingCounseling}
                >
                  메모만 저장
                </Button>

                {selectedCounseling.status === 'pending' && (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => handleUpdateCounseling('accepted')}
                    isLoading={isSavingCounseling}
                    leftIcon={<Check className="h-4 w-4" />}
                  >
                    일정 확정 및 접수
                  </Button>
                )}

                {selectedCounseling.status === 'accepted' && (
                  <Button
                    variant="honey"
                    size="sm"
                    onClick={() => handleUpdateCounseling('completed')}
                    isLoading={isSavingCounseling}
                    leftIcon={<CheckCircle2 className="h-4 w-4" />}
                  >
                    상담 완료 처리
                  </Button>
                )}
              </div>
            </div>
          }
        >
          <div className="space-y-5">
            {/* Badges Bar */}
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="category">
                {COUNSELING_CATEGORY_LABELS[selectedCounseling.category]}
              </Badge>
              {Boolean(selectedCounseling.is_urgent ?? (selectedCounseling as any).isUrgent) && (
                <Badge variant="urgent">🚨 긴급 상담</Badge>
              )}
              <Badge variant={selectedCounseling.status as any}>
                {COUNSELING_STATUS_LABELS[selectedCounseling.status]}
              </Badge>
              <span className="text-xs text-warm-500 font-mono ml-auto">
                신청일: {formatKoreanDateTime(selectedCounseling.created_at)}
              </span>
            </div>

            {/* Read-Only Student Request Information */}
            <div className="rounded-2xl bg-warm-50 p-4 border border-warm-200/80 space-y-3">
              <h4 className="text-xs font-bold text-warm-700 uppercase tracking-wider">
                학생 신청 정보
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs sm:text-sm text-warm-900">
                <div>
                  <span className="text-warm-600">희망 일자: </span>
                  <strong>
                    {formatKoreanDate(
                      selectedCounseling.preferred_date ||
                        (selectedCounseling as any).preferredDate
                    )}
                  </strong>
                </div>
                <div>
                  <span className="text-warm-600">희망 시간대: </span>
                  <strong>
                    {
                      COUNSELING_TIME_SLOT_LABELS[
                        selectedCounseling.preferred_time_slot ||
                          (selectedCounseling as any).preferredTimeSlot
                      ]
                    }
                  </strong>
                </div>
              </div>

              <div className="pt-2 border-t border-warm-200/60">
                <p className="text-xs text-warm-600 font-semibold mb-1">비공개 고민 내용:</p>
                <div className="bg-white p-3.5 rounded-xl border border-warm-200/70 text-xs sm:text-sm text-warm-900 leading-relaxed whitespace-pre-wrap">
                  {selectedCounseling.content}
                </div>
              </div>
            </div>

            {/* TWO-TIER NOTE 1: 학생 안내 메모 (Public to Student) */}
            <div className="rounded-2xl bg-honey-50/70 border-2 border-honey-200 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-bold text-sm text-honey-900">
                  <MessageSquareHeart className="h-4 w-4 text-honey-700" />
                  <span>학생 안내 메모 (학생 &apos;내 신청 현황&apos;에 공개)</span>
                </div>
                <Badge variant="honey" size="sm">
                  학생 공개용
                </Badge>
              </div>

              <p className="text-xs text-honey-800 leading-relaxed">
                학생에게 안내할 확정 일시와 만날 장소, 준비물 등의 메시지를 작성해주세요. 학생의 &apos;나의
                신청 내역&apos;에 표시됩니다.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-warm-800 block mb-1">
                    확정 일자:
                  </label>
                  <input
                    type="date"
                    value={counselingModalForm.scheduledDate}
                    onChange={(e) =>
                      setCounselingModalForm((prev) => ({
                        ...prev,
                        scheduledDate: e.target.value,
                      }))
                    }
                    className="w-full bg-white border border-warm-300 rounded-xl px-3 py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-honey-400"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-warm-800 block mb-1">
                    확정 시간대:
                  </label>
                  <select
                    value={counselingModalForm.scheduledTimeSlot}
                    onChange={(e) =>
                      setCounselingModalForm((prev) => ({
                        ...prev,
                        scheduledTimeSlot: e.target.value as CounselingTimeSlot,
                      }))
                    }
                    className="w-full bg-white border border-warm-300 rounded-xl px-3 py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-honey-400"
                  >
                    {Object.entries(COUNSELING_TIME_SLOT_LABELS).map(([k, label]) => (
                      <option key={k} value={k}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <Textarea
                placeholder="예: 5월 12일 점심시간 12시 30분에 상담실(위클래스)로 편안하게 오면 됩니다. 따뜻한 차 한 잔 마시며 이야기 나눠요."
                value={counselingModalForm.scheduledNote}
                onChange={(e) =>
                  setCounselingModalForm((prev) => ({
                    ...prev,
                    scheduledNote: e.target.value,
                  }))
                }
                className="bg-white min-h-[90px] text-xs sm:text-sm"
              />
            </div>

            {/* TWO-TIER NOTE 2: 선생님 비밀 메모 (Confidential internal note) */}
            <div className="rounded-2xl bg-blush-50/50 border-2 border-blush-200 p-4 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-bold text-sm text-blush-900">
                  <Lock className="h-4 w-4 text-blush-700" />
                  <span>선생님 비밀 메모 (선생님 전용 비공개 메모)</span>
                </div>
                <Badge variant="blush" size="sm">
                  대외비 / 학생 비공개
                </Badge>
              </div>

              <p className="text-xs text-blush-800 leading-relaxed">
                🔒 학생에게 절대 공개되지 않는 교사용 메모입니다. 관찰 일지, 학부모 상담 이력, 사후 지도
                계획 등을 기록하세요.
              </p>

              <Textarea
                placeholder="예: 1차 관찰 결과 교우 관계 불안 호소. 학부모 유선 상담 완료 (특이 사항 없음). 지속 관찰 요망."
                value={counselingModalForm.teacherNote}
                onChange={(e) =>
                  setCounselingModalForm((prev) => ({
                    ...prev,
                    teacherNote: e.target.value,
                  }))
                }
                className="bg-white min-h-[90px] text-xs sm:text-sm"
              />
            </div>
          </div>
        </Modal>
      )}

      {/* ---------------------------------------------------------------------- */}
      {/* 7. MODAL: 비밀 건의함 상세 및 답변 작성 (Zero-Leak Guarantee)             */}
      {/* ---------------------------------------------------------------------- */}
      {selectedSuggestion && (
        <Modal
          isOpen={Boolean(selectedSuggestion)}
          onClose={() => setSelectedSuggestion(null)}
          title="학급 비밀 건의함 상세 및 답변 작성"
          description="학생의 건의사항을 검토하고 처리 상태 및 피드백을 등록합니다."
          size="lg"
          footer={
            <div className="flex items-center justify-end gap-2 w-full">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setSelectedSuggestion(null)}
                disabled={isSavingSuggestion}
              >
                닫기
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleUpdateSuggestion}
                isLoading={isSavingSuggestion}
                leftIcon={<Send className="h-4 w-4" />}
              >
                답변 등록 및 상태 저장
              </Button>
            </div>
          }
        >
          <div className="space-y-4">
            {/* Zero-Leak Anonymity Banner */}
            {Boolean(selectedSuggestion.is_anonymous ?? (selectedSuggestion as any).isAnonymous) ? (
              <div className="rounded-2xl bg-mist-50 border border-mist-200 p-3.5 flex items-center gap-2.5 text-xs sm:text-sm text-mist-900">
                <ShieldCheck className="h-5 w-5 text-mist-700 shrink-0" />
                <span>
                  <strong>🛡️ 완전 익명 건의:</strong> 이 건의사항은 학생이 익명으로 제출하였으며,
                  데이터베이스에도 작성자 학생 정보가 전혀 존재하지 않습니다.
                </span>
              </div>
            ) : (
              <div className="rounded-2xl bg-blush-50 border border-blush-200 p-3.5 flex items-center gap-2.5 text-xs sm:text-sm text-blush-900">
                <User className="h-5 w-5 text-blush-700 shrink-0" />
                <span>
                  <strong>👤 실명 건의:</strong> 작성자:{' '}
                  {selectedSuggestion.student
                    ? formatStudentIdentity(
                        selectedSuggestion.student.grade,
                        (selectedSuggestion.student as any).classNumber ?? selectedSuggestion.student.class_number,
                        (selectedSuggestion.student as any).studentNumber ?? selectedSuggestion.student.student_number,
                        selectedSuggestion.student.name
                      )
                    : '학생'}{' '}
                  (선생님에게만 공개)
                </span>
              </div>
            )}

            {/* Badges & Timestamp */}
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="category">
                {SUGGESTION_CATEGORY_LABELS[selectedSuggestion.category]}
              </Badge>
              <Badge variant={selectedSuggestion.status as any}>
                {SUGGESTION_STATUS_LABELS[selectedSuggestion.status]}
              </Badge>
              <span className="text-xs text-warm-500 font-mono ml-auto">
                접수: {formatKoreanDateTime(selectedSuggestion.created_at)}
              </span>
            </div>

            {/* Suggestion Content Box */}
            <div className="rounded-2xl bg-warm-50 p-4 border border-warm-200/80 space-y-2">
              <h3 className="font-extrabold text-base text-warm-900 leading-snug">
                {selectedSuggestion.title}
              </h3>
              <div className="text-xs sm:text-sm text-warm-900 leading-relaxed whitespace-pre-wrap bg-white p-3.5 rounded-xl border border-warm-200/60">
                {selectedSuggestion.content}
              </div>
            </div>

            {/* Status Change & Teacher Reply Section */}
            <div className="space-y-3 pt-2">
              <div>
                <label className="text-xs font-bold text-warm-800 block mb-1">
                  건의 처리 상태 변경:
                </label>
                <select
                  value={suggestionModalForm.status}
                  onChange={(e) =>
                    setSuggestionModalForm((prev) => ({
                      ...prev,
                      status: e.target.value as SuggestionStatus,
                    }))
                  }
                  className="w-full bg-warm-50 border border-warm-300 rounded-xl px-3 py-2 text-xs sm:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-sage-400"
                >
                  {Object.entries(SUGGESTION_STATUS_LABELS).map(([k, label]) => (
                    <option key={k} value={k}>
                      {label} ({k})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Textarea
                  label="선생님 답변 및 피드백 작성"
                  helperText="학생에게 전달할 검토 의견, 학급 회의 반영 계획, 조치 결과 등을 남겨주세요."
                  placeholder="예: 좋은 의견 고마워요. 말씀해주신 교실 환기 및 에어컨 가동 규칙은 이번 주 학급 회의 안건으로 다루겠습니다."
                  maxLength={1000}
                  maxLengthIndicator
                  value={suggestionModalForm.teacherReply}
                  onChange={(e) =>
                    setSuggestionModalForm((prev) => ({
                      ...prev,
                      teacherReply: e.target.value,
                    }))
                  }
                  className="min-h-[120px] text-xs sm:text-sm"
                />
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* ---------------------------------------------------------------------- */}
      {/* 8. MODAL: 학생 PIN 초기화 확인 다이얼로그                                */}
      {/* ---------------------------------------------------------------------- */}
      {pinResetTarget && (
        <Modal
          isOpen={Boolean(pinResetTarget)}
          onClose={() => setPinResetTarget(null)}
          title="학생 PIN을 '0000'으로 초기화하시겠습니까?"
          description="초기화 즉시 해당 학생의 비밀번호가 '0000'으로 재설정됩니다."
          size="sm"
          footer={
            <div className="flex items-center justify-end gap-2 w-full">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setPinResetTarget(null)}
                disabled={isResettingPin}
              >
                취소
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={handleConfirmPinReset}
                isLoading={isResettingPin}
              >
                초기화 실행
              </Button>
            </div>
          }
        >
          <div className="space-y-3 text-xs sm:text-sm text-warm-800 leading-relaxed">
            <div className="p-3 bg-warm-100 rounded-xl font-bold text-warm-900">
              대상 학생:{' '}
              {formatStudentIdentity(
                pinResetTarget.grade,
                pinResetTarget.class_number ?? (pinResetTarget as any).classNumber,
                pinResetTarget.student_number ?? (pinResetTarget as any).studentNumber,
                pinResetTarget.name
              )}
            </div>

            <p>
              초기화 실행 시 데이터베이스의 <code>pin_hash</code>가 새 PIN <code>0000</code>의 암호화
              해시로 즉각 갱신됩니다.
            </p>
            <p className="text-blush-700 font-medium">
              학생에게 임시 비밀번호 &apos;0000&apos;으로 로그인하도록 안내해주세요.
            </p>
          </div>
        </Modal>
      )}
    </div>
  );
}
