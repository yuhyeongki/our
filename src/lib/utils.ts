// src/lib/utils.ts
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type {
  CounselingCategory,
  CounselingStatus,
  CounselingTimeSlot,
  SuggestionCategory,
  SuggestionStatus,
} from '@/types/models';

/**
 * Merges Tailwind classes cleanly with clsx and twMerge.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ============================================================================
// KOREAN LABELS & DESCRIPTIONS
// ============================================================================

export const COUNSELING_CATEGORY_LABELS: Record<CounselingCategory, string> = {
  academic: '학업/성적 고민',
  friendship: '교우관계/친구 고민',
  career: '진로/진학 고민',
  emotional: '심리/정서적 어려움',
  mental_health: '정신 건강/스트레스',
  family: '가정/개인 문제',
  other: '기타 고민',
};

export const COUNSELING_STATUS_LABELS: Record<CounselingStatus, string> = {
  pending: '접수 대기',
  accepted: '상담 수락됨',
  completed: '상담 완료',
  cancelled: '취소됨',
};

export const COUNSELING_TIME_SLOT_LABELS: Record<CounselingTimeSlot, string> = {
  morning: '등교 전/아침 자습',
  lunch: '점심시간',
  break_time: '쉬는 시간',
  after_school: '방과 후',
  other: '기타 협의',
};

export const SUGGESTION_CATEGORY_LABELS: Record<SuggestionCategory, string> = {
  classroom_environment: '학급 환경/온도/청결',
  classroom_rule: '학급 규칙/자치',
  school_life: '학교 생활/행사',
  facility: '교내 시설/비품',
  study: '학습 분위기/자습',
  activity: '동아리/체육 활동',
  learning: '수업 관련',
  other: '기타 건의',
};

export const SUGGESTION_STATUS_LABELS: Record<SuggestionStatus, string> = {
  pending: '접수 대기',
  received: '선생님 확인',
  in_progress: '처리 진행 중',
  reviewed: '검토 완료',
  resolved: '반영 완료',
  dismissed: '종결/보류',
};

// ============================================================================
// DATE & TIME FORMATTERS
// ============================================================================

/**
 * Formats date into Korean string representation: YYYY년 M월 D일 (요일)
 */
export function formatKoreanDate(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return '-';
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(d.getTime())) return String(dateInput);

  const days = ['일', '월', '화', '수', '목', '금', '토'];
  const year = d.getFullYear();
  const month = d.getMonth() + 1;
  const date = d.getDate();
  const dayName = days[d.getDay()];

  return `${year}년 ${month}월 ${date}일 (${dayName})`;
}

/**
 * Formats date and time into: YYYY.MM.DD HH:mm
 */
export function formatKoreanDateTime(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return '-';
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(d.getTime())) return String(dateInput);

  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const date = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');

  return `${year}.${month}.${date} ${hours}:${minutes}`;
}

/**
 * Format student identifier: e.g. "1학년 2반 15번 홍길동"
 */
export function formatStudentIdentity(
  grade: number,
  classNumber: number,
  studentNumber: number,
  name?: string
): string {
  const base = `${grade}학년 ${classNumber}반 ${studentNumber}번`;
  return name ? `${base} ${name}` : base;
}
