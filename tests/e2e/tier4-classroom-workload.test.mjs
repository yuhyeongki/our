// tests/e2e/tier4-classroom-workload.test.mjs
// Tier 4: Real-World Classroom Workload Scenarios (End-to-End Multi-Student Workflows)

import { TestSuite, expect } from '../harness/assertions.mjs';
import { TestApiClient } from '../harness/api-client.mjs';
import { MockAppEngine } from '../harness/mock-engine.mjs';

export function createTier4Suite() {
  const suite = new TestSuite('Tier 4: Real-World Classroom Workload Scenarios');
  let engine;
  let client;

  suite.beforeEach(() => {
    engine = new MockAppEngine();
    client = new TestApiClient(null, engine);
  });

  suite.it('TC-T4-WKL-01: Morning Classroom Roster Enrollment Rush (15 students batch enroll)', async () => {
    const studentNames = [
      '김민준', '이서준', '박도윤', '최예준', '정시우',
      '강하준', '조주원', '윤지호', '장준우', '임준서',
      '한서아', '오이서', '서하윤', '신서연', '권지아',
    ];

    const enrolledStudents = [];

    // Simulate homeroom morning session where all students in Class 1-2 register
    for (let i = 0; i < studentNames.length; i++) {
      const studentNum = i + 1;
      const name = studentNames[i];
      const pin = `${1000 + studentNum}`;

      client.clearCookies();
      const res = await client.studentLogin({
        grade: 1,
        classNumber: 2,
        studentNumber: studentNum,
        name,
        pin,
      });

      expect(res.status).toBe(200);
      expect(res.data.isNew).toBe(true);
      expect(res.data.student.name).toBe(name);
      enrolledStudents.push(res.data.student);
    }

    expect(engine.students.size).toBe(15);

    // Verify all 15 students can authenticate without any key collision
    for (let i = 0; i < studentNames.length; i++) {
      const studentNum = i + 1;
      const name = studentNames[i];
      const pin = `${1000 + studentNum}`;

      client.clearCookies();
      const reloginRes = await client.studentLogin({
        grade: 1,
        classNumber: 2,
        studentNumber: studentNum,
        name,
        pin,
      });

      expect(reloginRes.status).toBe(200);
      expect(reloginRes.data.isNew).toBe(false);
      expect(reloginRes.data.student.id).toBe(enrolledStudents[i].id);
    }
  });

  suite.it('TC-T4-WKL-02: High-Volume Mixed Counseling Submissions with Priority Triage', async () => {
    const categories = ['academic', 'friendship', 'career', 'emotional', 'family'];
    const submissions = [];

    // 10 students enroll and each submits a counseling request
    for (let i = 1; i <= 10; i++) {
      client.clearCookies();
      await client.studentLogin({
        grade: 2,
        classNumber: 3,
        studentNumber: i,
        name: `학생_${i}`,
        pin: `200${i % 10}`,
      });

      const isUrgent = i % 3 === 0; // i = 3, 6, 9 are urgent
      const cat = categories[i % categories.length];

      const res = await client.submitCounseling({
        category: cat,
        preferredDate: `2026-11-${10 + i}`,
        preferredTimeSlot: i % 2 === 0 ? 'lunch' : 'after_school',
        content: `상담 신청 상세 사유 - 학생 ${i}번 (${cat})`,
        isUrgent,
      });

      expect(res.status).toBe(201);
      submissions.push({ id: res.data.request.id, studentNumber: i, isUrgent, category: cat });
    }

    expect(engine.counselingRequests.size).toBe(10);

    // Teacher logs in and verifies urgent requests count
    client.setTeacherAuth(engine.generateTeacherToken());
    const urgentQuery = await client.teacherGetCounseling({ isUrgent: true });
    expect(urgentQuery.data.counselingRequests.length).toBe(3); // 3, 6, 9
  });

  suite.it('TC-T4-WKL-03: Teacher Comprehensive Triage Session (Prioritize, Schedule, Complete)', async () => {
    // Seed 5 counseling requests (2 urgent, 3 normal)
    const requestIds = [];
    for (let i = 1; i <= 5; i++) {
      client.clearCookies();
      await client.studentLogin({
        grade: 3,
        classNumber: 1,
        studentNumber: i,
        name: `3학년학생_${i}`,
        pin: '1234',
      });
      const sub = await client.submitCounseling({
        category: 'academic',
        preferredDate: '2026-11-12',
        content: `3학년 수능/내신 상담 ${i}`,
        isUrgent: i <= 2, // 1 and 2 are urgent
      });
      requestIds.push(sub.data.request.id);
    }

    // Teacher signs in for daily triage
    client.setTeacherAuth(engine.generateTeacherToken());

    // 1. First address urgent requests
    const urgentList = await client.teacherGetCounseling({ isUrgent: true });
    expect(urgentList.data.counselingRequests.length).toBe(2);

    for (const req of urgentList.data.counselingRequests) {
      const scheduleRes = await client.teacherUpdateCounseling(req.id, {
        status: 'accepted',
        scheduledDate: '2026-11-12',
        scheduledTimeSlot: 'morning',
        scheduledNote: '긴급 상담 접수 완료. 내일 아침 등교 후 바로 상담실로 오세요.',
        teacherNote: '긴급 심리 지원 필요',
      });
      expect(scheduleRes.status).toBe(200);
      expect(scheduleRes.data.request.status).toBe('accepted');
    }

    // 2. Schedule remaining 3 normal requests
    const pendingList = await client.teacherGetCounseling({ status: 'pending' });
    expect(pendingList.data.counselingRequests.length).toBe(3);

    for (let j = 0; j < pendingList.data.counselingRequests.length; j++) {
      const req = pendingList.data.counselingRequests[j];
      await client.teacherUpdateCounseling(req.id, {
        status: 'accepted',
        scheduledDate: `2026-11-${15 + j}`,
        scheduledTimeSlot: 'lunch',
        scheduledNote: `점심시간 순차 상담 배정`,
      });
    }

    // 3. Mark the first 2 as completed after meetings take place
    for (const id of requestIds.slice(0, 2)) {
      const compRes = await client.teacherUpdateCounseling(id, {
        status: 'completed',
        teacherNote: '상담 완료: 학생 표정 밝아짐, 추후 지속 관찰 요망.',
      });
      expect(compRes.status).toBe(200);
      expect(compRes.data.request.status).toBe('completed');
    }

    // Verify overall status counts
    const completedQuery = await client.teacherGetCounseling({ status: 'completed' });
    expect(completedQuery.data.counselingRequests.length).toBe(2);

    const acceptedQuery = await client.teacherGetCounseling({ status: 'accepted' });
    expect(acceptedQuery.data.counselingRequests.length).toBe(3);
  });

  suite.it('TC-T4-WKL-04: Weekly Classroom Suggestion Roundup (8 mixed suggestions & teacher loop)', async () => {
    // 5 anonymous, 3 identified
    for (let i = 1; i <= 5; i++) {
      await client.submitSuggestion({
        isAnonymous: true,
        category: 'classroom_environment',
        title: `익명 건의 #${i}: 난방 및 환기 건`,
        content: `교실 환기 시간을 일정하게 정해주시면 좋겠습니다 #${i}`,
      });
    }

    for (let i = 1; i <= 3; i++) {
      client.clearCookies();
      await client.studentLogin({
        grade: 1,
        classNumber: 2,
        studentNumber: i,
        name: `기명학생_${i}`,
        pin: '1234',
      });
      await client.submitSuggestion({
        isAnonymous: false,
        category: 'activity',
        title: `기명 건의 #${i}: 학급 축구리그`,
        content: `점심시간 학급 대항 리그전을 개최하고 싶습니다 #${i}`,
      });
    }

    expect(engine.suggestions.size).toBe(8);

    // Teacher reviews and answers suggestions
    client.setTeacherAuth(engine.generateTeacherToken());
    const allSuggestions = await client.teacherGetSuggestions();
    expect(allSuggestions.data.suggestions.length).toBe(8);

    // Reply to all anonymous suggestions and mark as resolved
    for (const sugg of allSuggestions.data.suggestions) {
      if (sugg.isAnonymous) {
        expect(sugg.student).toBeNull();
        await client.teacherUpdateSuggestion(sugg.id, {
          status: 'resolved',
          teacherReply: '학급 자치 회의 안건으로 채택하여 규칙 제정 완료했습니다.',
        });
      } else {
        expect(sugg.student).notToBeNull();
        await client.teacherUpdateSuggestion(sugg.id, {
          status: 'in_progress',
          teacherReply: '체육부장과 상의하여 점심시간 대진표를 짜보도록 해요.',
        });
      }
    }

    const resolvedList = await client.teacherGetSuggestions({ status: 'resolved' });
    expect(resolvedList.data.suggestions.length).toBe(5);

    const inProgressList = await client.teacherGetSuggestions({ status: 'in_progress' });
    expect(inProgressList.data.suggestions.length).toBe(3);
  });

  suite.it('TC-T4-WKL-05: Full Academic Term Multi-Student Interaction Lifecycle', async () => {
    // Phase 1: Student A registers and submits counseling
    const studentA = await client.studentLogin({
      grade: 2,
      classNumber: 1,
      studentNumber: 10,
      name: '김하늘',
      pin: '7788',
    });
    expect(studentA.status).toBe(200);

    const counselA = await client.submitCounseling({
      category: 'friendship',
      preferredDate: '2026-11-20',
      content: '새 학기 친구들과 친해지는 법이 어렵습니다.',
    });
    const counselId = counselA.data.request.id;

    // Phase 2: Teacher accepts and resolves counseling
    client.setTeacherAuth(engine.generateTeacherToken());
    await client.teacherUpdateCounseling(counselId, {
      status: 'accepted',
      scheduledDate: '2026-11-20',
      scheduledNote: '20일 방과 후에 이야기 나눠요.',
    });

    // Phase 3: Student B submits anonymous suggestion
    client.clearTeacherAuth();
    client.clearCookies();
    const suggB = await client.submitSuggestion({
      isAnonymous: true,
      category: 'facility',
      title: '비 오는 날 우산 꽂이 비치 요청',
      content: '교실 앞 복도에 우산 꽂이가 부족하여 바닥이 미끄럽습니다.',
    });

    // Phase 4: Teacher replies to suggestion and completes Student A counseling
    client.setTeacherAuth(engine.generateTeacherToken());
    await client.teacherUpdateSuggestion(suggB.data.suggestion.id, {
      status: 'resolved',
      teacherReply: '행정실에서 대형 우산 꽂이 2개를 추가 배정받았습니다.',
    });
    await client.teacherUpdateCounseling(counselId, {
      status: 'completed',
      teacherNote: '학생 적응력 향상됨.',
    });

    // Phase 5: Student A checks My Status
    client.clearTeacherAuth();
    await client.studentLogin({
      grade: 2,
      classNumber: 1,
      studentNumber: 10,
      name: '김하늘',
      pin: '7788',
    });
    const finalStatus = await client.getMyCounseling();
    const myCounsel = finalStatus.data.requests.find((r) => r.id === counselId);
    expect(myCounsel.status).toBe('completed');
    expect(myCounsel.teacherNote).toBeUndefined();
  });

  suite.it('TC-T4-WKL-06: Stress & Concurrency Resilience Scenario (Sequential rapid burst)', async () => {
    const burstCount = 20;

    for (let i = 1; i <= burstCount; i++) {
      client.clearCookies();
      const login = await client.studentLogin({
        grade: (i % 6) + 1,
        classNumber: (i % 30) + 1,
        studentNumber: (i % 60) + 1,
        name: `버스트학생_${i}`,
        pin: '1234',
      });
      expect(login.status).toBe(200);

      // Submit counseling
      const counsel = await client.submitCounseling({
        category: 'academic',
        preferredDate: '2026-12-01',
        content: `연속 호출 테스트 상담 ${i}`,
      });
      expect(counsel.status).toBe(201);

      // Submit anonymous suggestion
      const sugg = await client.submitSuggestion({
        isAnonymous: true,
        category: 'school_life',
        title: `버스트 건의 ${i}`,
        content: `빠른 처리 확인 건의 ${i}`,
      });
      expect(sugg.status).toBe(201);
    }

    expect(engine.students.size).toBe(burstCount);
    expect(engine.counselingRequests.size).toBe(burstCount);
    expect(engine.suggestions.size).toBe(burstCount);
  });

  return suite;
}
