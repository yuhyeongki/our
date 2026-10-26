// src/app/page.tsx
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  HeartHandshake,
  MessageSquareLock,
  GraduationCap,
  Sparkles,
  ShieldCheck,
  CalendarCheck,
  Lock,
  ArrowRight,
  Inbox,
  UserCheck,
} from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col justify-between bg-warm-50">
      {/* Top Navigation */}
      <header className="border-b border-warm-200/80 bg-warm-50/80 backdrop-blur-md sticky top-0 z-30">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sage-500 text-white shadow-warm-sm">
              <HeartHandshake className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-sage-700 tracking-wider">
                김해영운고등학교
              </p>
              <h1 className="text-sm sm:text-base font-bold text-warm-900 leading-tight">
                개별 상담 신청 &amp; 비밀 건의함
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/student/login">
              <Button variant="outline" size="sm">
                학생 로그인
              </Button>
            </Link>
            <Link href="/teacher/login">
              <Button variant="secondary" size="sm">
                선생님 로그인
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-12 sm:py-20 px-4 sm:px-6">
        <div className="mx-auto max-w-4xl text-center space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full bg-honey-100/90 border border-honey-200 px-4 py-1.5 text-xs sm:text-sm font-medium text-honey-800 shadow-warm-sm">
            <Sparkles className="h-4 w-4 text-honey-600" />
            <span>선생님과 학생이 안전하고 따뜻하게 소통하는 공간</span>
          </div>

          <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-warm-900 leading-tight">
            혼자 고민하지 마세요,
            <br />
            <span className="text-sage-700">우리가 늘 곁에 있어요.</span>
          </h2>

          <p className="mx-auto max-w-2xl text-base sm:text-lg text-warm-800/80 leading-relaxed">
            학업, 교우관계, 진로 고민부터 학급에 바라는 작은 건의까지.
            <br className="hidden sm:inline" />
            학생은 간편 PIN으로 비밀을 지키며 편안하게 이야기하고,
            선생님은 따뜻한 마음으로 함께합니다.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
            <Badge variant="sage" size="md">
              <ShieldCheck className="h-3.5 w-3.5 mr-1 text-sage-600" /> 1:1 비밀 보장 상담
            </Badge>
            <Badge variant="mist" size="md">
              <Lock className="h-3.5 w-3.5 mr-1 text-mist-600" /> 완전 익명 안심 건의함
            </Badge>
            <Badge variant="honey" size="md">
              <CalendarCheck className="h-3.5 w-3.5 mr-1 text-honey-700" /> 실시간 일정 조율 &amp; 피드백
            </Badge>
          </div>
        </div>

        {/* Dual Gateway Cards */}
        <div className="mx-auto mt-12 max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
          {/* Student Portal Gateway */}
          <Card
            variant="interactive"
            className="flex flex-col justify-between border-2 border-sage-200/90 bg-gradient-to-b from-white to-sage-50/40 p-2 sm:p-4 rounded-3xl"
          >
            <CardHeader className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sage-500 text-white shadow-warm-sm">
                  <GraduationCap className="h-6 w-6" />
                </div>
                <Badge variant="sage">학생 전용</Badge>
              </div>
              <CardTitle className="text-2xl text-warm-900">
                학생 참여 포털
              </CardTitle>
              <CardDescription className="text-base text-warm-800/80">
                복잡한 회원가입 없이 <strong>학년/반/번호와 간편 PIN</strong>으로 즉시 로그인하여 안전하게 신청하세요.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-3 pt-2">
              <ul className="space-y-2.5 text-sm text-warm-800">
                <li className="flex items-center gap-2.5">
                  <div className="h-2 w-2 rounded-full bg-sage-500" />
                  <span><strong>1:1 비밀 상담 신청</strong> (희망 시간 &amp; 고민 내용)</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <div className="h-2 w-2 rounded-full bg-sage-500" />
                  <span><strong>비밀 건의함</strong> (익명/기명 직접 선택 가능)</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <div className="h-2 w-2 rounded-full bg-sage-500" />
                  <span><strong>내 신청 현황</strong> (상태 확인 &amp; 선생님 답변 열람)</span>
                </li>
              </ul>
            </CardContent>

            <CardFooter className="pt-4">
              <Link href="/student/login" className="w-full">
                <Button
                  variant="primary"
                  size="lg"
                  className="w-full text-base shadow-warm-md"
                  rightIcon={<ArrowRight className="h-4 w-4" />}
                >
                  학생으로 시작하기
                </Button>
              </Link>
            </CardFooter>
          </Card>

          {/* Teacher Portal Gateway */}
          <Card
            variant="interactive"
            className="flex flex-col justify-between border-2 border-honey-200/90 bg-gradient-to-b from-white to-honey-50/30 p-2 sm:p-4 rounded-3xl"
          >
            <CardHeader className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-honey-500 text-warm-900 shadow-warm-sm">
                  <UserCheck className="h-6 w-6" />
                </div>
                <Badge variant="honey">선생님 전용</Badge>
              </div>
              <CardTitle className="text-2xl text-warm-900">
                선생님 관리 포털
              </CardTitle>
              <CardDescription className="text-base text-warm-800/80">
                교사 계정으로 로그인하여 학급 학생들의 상담 신청을 관리하고 건의사항에 따뜻한 답변을 남깁니다.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-3 pt-2">
              <ul className="space-y-2.5 text-sm text-warm-800">
                <li className="flex items-center gap-2.5">
                  <div className="h-2 w-2 rounded-full bg-honey-500" />
                  <span><strong>상담 신청 통합 대시보드</strong> (긴급 알림 &amp; 일정 조율)</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <div className="h-2 w-2 rounded-full bg-honey-500" />
                  <span><strong>학급 비밀 건의함</strong> (카테고리 필터링 &amp; 피드백 작성)</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <div className="h-2 w-2 rounded-full bg-honey-500" />
                  <span><strong>비공개 교사 메모 &amp; 학생 PIN 관리</strong></span>
                </li>
              </ul>
            </CardContent>

            <CardFooter className="pt-4">
              <Link href="/teacher/login" className="w-full">
                <Button
                  variant="honey"
                  size="lg"
                  className="w-full text-base font-semibold shadow-warm-md"
                  rightIcon={<ArrowRight className="h-4 w-4" />}
                >
                  선생님 대시보드 접속
                </Button>
              </Link>
            </CardFooter>
          </Card>
        </div>
      </section>

      {/* Safety & Comfort Guarantees Section */}
      <section className="border-t border-warm-200/80 bg-warm-100/60 py-14 px-4 sm:px-6">
        <div className="mx-auto max-w-5xl">
          <div className="text-center mb-10 space-y-2">
            <h3 className="text-2xl sm:text-3xl font-bold text-warm-900">
              우리 시스템이 약속하는 3가지 안심 원칙
            </h3>
            <p className="text-sm sm:text-base text-warm-700">
              안전한 기술로 선생님과 학생 사이의 신뢰를 굳건히 지킵니다.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card variant="default" className="p-6 space-y-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sage-100 text-sage-700">
                <Lock className="h-5 w-5" />
              </div>
              <h4 className="text-lg font-bold text-warm-900">
                철저한 1:1 비밀 보장
              </h4>
              <p className="text-sm text-warm-700 leading-relaxed">
                상담 신청 내용은 다른 학생이나 외부인에게 절대 노출되지 않으며, 담당 선생님만 안전하게 열람할 수 있습니다.
              </p>
            </Card>

            <Card variant="default" className="p-6 space-y-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-mist-100 text-mist-700">
                <MessageSquareLock className="h-5 w-5" />
              </div>
              <h4 className="text-lg font-bold text-warm-900">
                완전 익명 건의함
              </h4>
              <p className="text-sm text-warm-700 leading-relaxed">
                &apos;익명&apos;을 선택한 건의사항은 데이터베이스에 작성자 정보를 일절 남기지 않아 어떤 추적도 불가능합니다.
              </p>
            </Card>

            <Card variant="default" className="p-6 space-y-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-honey-100 text-honey-800">
                <Inbox className="h-5 w-5" />
              </div>
              <h4 className="text-lg font-bold text-warm-900">
                간편하고 빠른 이용
              </h4>
              <p className="text-sm text-warm-700 leading-relaxed">
                이메일 가입 절차 없이 학년, 반, 번호와 4자리 간편 PIN으로 모바일과 PC 어디서나 손쉽게 소통합니다.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-warm-200/80 bg-warm-50 py-8 px-4 sm:px-6">
        <div className="mx-auto max-w-6xl flex flex-col sm:flex-row items-center justify-between gap-4 text-xs sm:text-sm text-warm-600">
          <div className="flex items-center gap-2">
            <HeartHandshake className="h-4 w-4 text-sage-600" />
            <span className="font-semibold text-warm-800">김해영운고등학교</span>
            <span>|</span>
            <span>학급 전용 개별 상담 및 비밀 건의함 시스템</span>
          </div>
          <p>© 2026 Kimhae Youngwoon High School. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
