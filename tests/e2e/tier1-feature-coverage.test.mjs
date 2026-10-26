// tests/e2e/tier1-feature-coverage.test.mjs
// Tier 1: Feature Coverage Test Suite (>= 5 tests per feature across 5 core features)

import { TestSuite, expect } from '../harness/assertions.mjs';
import { TestApiClient } from '../harness/api-client.mjs';
import { MockAppEngine } from '../harness/mock-engine.mjs';

export function createTier1Suite() {
  const suite = new TestSuite('Tier 1: Feature Coverage (Core Requirements Verification)');
  let engine;
  let client;

  suite.beforeEach(() => {
    engine = new MockAppEngine();
    client = new TestApiClient(null, engine);
  });

  // =========================================================================
  // 1. Student Auth & Session Feature
  // =========================================================================

  suite.it('TC-T1-AUTH-01: First-time student enrollment with valid credentials', async () => {
    const res = await client.studentLogin({
      grade: 1,
      classNumber: 2,
      studentNumber: 15,
      name: '홍길동',
      pin: '1234',
    });

    expect(res.status).toBe(200);
    expect(res.data.success).toBe(true);
    expect(res.data.isNew).toBe(true);
    expect(res.data.student.name).toBe('홍길동');
    expect(res.data.student.grade).toBe(1);
    expect(res.data.student.classNumber).toBe(2);
    expect(res.data.student.studentNumber).toBe(15);
    expect(client.getCookie('student_session')).notToBeNull();
  });

  suite.it('TC-T1-AUTH-02: Existing student successful login with correct PIN', async () => {
    // 1. Initial enrollment
    await client.studentLogin({
      grade: 2,
      classNumber: 3,
      studentNumber: 7,
      name: '이순신',
      pin: '5678',
    });

    // 2. Clear cookie to simulate subsequent login
    client.clearCookies();
    expect(client.getCookie('student_session')).toBeNull();

    // 3. Second login
    const loginRes = await client.studentLogin({
      grade: 2,
      classNumber: 3,
      studentNumber: 7,
      name: '이순신',
      pin: '5678',
    });

    expect(loginRes.status).toBe(200);
    expect(loginRes.data.success).toBe(true);
    expect(loginRes.data.isNew).toBe(false);
    expect(loginRes.data.student.name).toBe('이순신');
    expect(client.getCookie('student_session')).notToBeNull();
  });

  suite.it('TC-T1-AUTH-03: Existing student login rejection with incorrect PIN', async () => {
    await client.studentLogin({
      grade: 1,
      classNumber: 1,
      studentNumber: 1,
      name: '강감찬',
      pin: '9999',
    });

    client.clearCookies();

    const badLoginRes = await client.studentLogin({
      grade: 1,
      classNumber: 1,
      studentNumber: 1,
      name: '강감찬',
      pin: '0000', // Wrong PIN
    });

    expect(badLoginRes.status).toBe(401);
    expect(badLoginRes.data.success).toBe(false);
    expect(badLoginRes.data.error).toContain('비밀번호(PIN)가 일치하지 않습니다');
    expect(client.getCookie('student_session')).toBeNull();
  });

  suite.it('TC-T1-AUTH-04: Rejection of enrollment with mismatched name on existing roster number', async () => {
    await client.studentLogin({
      grade: 3,
      classNumber: 5,
      studentNumber: 20,
      name: '김영희',
      pin: '1111',
    });

    client.clearCookies();

    // Impersonation attempt with different name
    const imposterRes = await client.studentLogin({
      grade: 3,
      classNumber: 5,
      studentNumber: 20,
      name: '박철수', // Different name
      pin: '1111',
    });

    expect(imposterRes.status).toBe(400);
    expect(imposterRes.data.success).toBe(false);
    expect(imposterRes.data.error).toContain('이미 등록된 다른 학생이 있습니다');
  });

  suite.it('TC-T1-AUTH-05: Student logout clears session cookie', async () => {
    await client.studentLogin({
      grade: 1,
      classNumber: 3,
      studentNumber: 10,
      name: '유관순',
      pin: '4321',
    });

    expect(client.getCookie('student_session')).notToBeNull();

    const logoutRes = await client.studentLogout();
    expect(logoutRes.status).toBe(200);
    expect(client.getCookie('student_session')).toBeNull();
  });

  suite.it('TC-T1-AUTH-06: Verification of student profile via authenticated session', async () => {
    await client.studentLogin({
      grade: 2,
      classNumber: 1,
      studentNumber: 5,
      name: '정약용',
      pin: '7777',
    });

    const profileRes = await client.getStudentProfile();
    expect(profileRes.status).toBe(200);
    expect(profileRes.data.success).toBe(true);
    expect(profileRes.data.student.name).toBe('정약용');
    expect(profileRes.data.student.grade).toBe(2);
    expect(profileRes.data.student.classNumber).toBe(1);
    expect(profileRes.data.student.studentNumber).toBe(5);
  });

  // =========================================================================
  // 2. 1:1 Confidential Counseling Feature
  // =========================================================================

  suite.it('TC-T1-COUN-01: Authenticated student submits standard counseling request', async () => {
    await client.studentLogin({
      grade: 1,
      classNumber: 2,
      studentNumber: 15,
      name: '홍길동',
      pin: '1234',
    });

    const res = await client.submitCounseling({
      category: 'academic',
      preferredDate: '2026-11-05',
      preferredTimeSlot: 'lunch',
      content: '수학 성적 향상과 공부 방법에 대해 조언을 구하고 싶습니다.',
      isUrgent: false,
    });

    expect(res.status).toBe(201);
    expect(res.data.success).toBe(true);
    expect(res.data.request.status).toBe('pending');
    expect(res.data.request.category).toBe('academic');
    expect(res.data.request.preferredDate).toBe('2026-11-05');
    expect(res.data.request.isUrgent).toBe(false);
  });

  suite.it('TC-T1-COUN-02: Urgent counseling submission flags priority in database', async () => {
    await client.studentLogin({
      grade: 1,
      classNumber: 2,
      studentNumber: 15,
      name: '홍길동',
      pin: '1234',
    });

    const res = await client.submitCounseling({
      category: 'emotional',
      preferredDate: '2026-10-27',
      preferredTimeSlot: 'morning',
      content: '친구와의 심한 갈등으로 너무 힘들어서 빠른 상담을 희망합니다.',
      isUrgent: true,
    });

    expect(res.status).toBe(201);
    expect(res.data.request.isUrgent).toBe(true);

    // Verify stored record in engine
    const stored = engine.counselingRequests.get(res.data.request.id);
    expect(stored.is_urgent).toBe(true);
  });

  suite.it('TC-T1-COUN-03: Unauthenticated counseling submission is rejected (401)', async () => {
    client.clearCookies();

    const res = await client.submitCounseling({
      category: 'career',
      preferredDate: '2026-11-01',
      preferredTimeSlot: 'after_school',
      content: '진로 관련 상담을 원합니다.',
    });

    expect(res.status).toBe(401);
    expect(res.data.success).toBe(false);
  });

  suite.it('TC-T1-COUN-04: Counseling category validation covers standard enum values', async () => {
    await client.studentLogin({
      grade: 2,
      classNumber: 4,
      studentNumber: 12,
      name: '신사임당',
      pin: '2222',
    });

    const validCategories = ['academic', 'friendship', 'career', 'emotional', 'family', 'other'];
    for (const cat of validCategories) {
      const res = await client.submitCounseling({
        category: cat,
        preferredDate: '2026-11-10',
        preferredTimeSlot: 'lunch',
        content: `상담 카테고리 테스트: ${cat}`,
      });
      expect(res.status).toBe(201);
      expect(res.data.request.category).toBe(cat);
    }
  });

  suite.it('TC-T1-COUN-05: Counseling time slot validation covers all school hour slots', async () => {
    await client.studentLogin({
      grade: 3,
      classNumber: 1,
      studentNumber: 3,
      name: '장보고',
      pin: '3333',
    });

    const validSlots = ['morning', 'lunch', 'break_time', 'after_school', 'other'];
    for (const slot of validSlots) {
      const res = await client.submitCounseling({
        category: 'academic',
        preferredDate: '2026-11-15',
        preferredTimeSlot: slot,
        content: `시간대 테스트: ${slot}`,
      });
      expect(res.status).toBe(201);
      expect(res.data.request.preferredTimeSlot).toBe(slot);
    }
  });

  suite.it('TC-T1-COUN-06: Counseling persistence verifies student linkage and timestamping', async () => {
    const enroll = await client.studentLogin({
      grade: 1,
      classNumber: 5,
      studentNumber: 9,
      name: '세종대왕',
      pin: '1004',
    });

    const studentId = enroll.data.student.id;
    const subRes = await client.submitCounseling({
      category: 'career',
      preferredDate: '2026-11-20',
      preferredTimeSlot: 'after_school',
      content: '국어국문학 관련 진로에 대해 상담받고 싶습니다.',
    });

    const reqId = subRes.data.request.id;
    const record = engine.counselingRequests.get(reqId);
    expect(record.student_id).toBe(studentId);
    expect(record.status).toBe('pending');
    expect(record.teacher_note).toBeNull();
    expect(record.created_at).toBeDefined();
  });

  // =========================================================================
  // 3. Secret Suggestion Box Feature
  // =========================================================================

  suite.it('TC-T1-SUGG-01: Anonymous suggestion persists with student_id = null', async () => {
    await client.studentLogin({
      grade: 1,
      classNumber: 2,
      studentNumber: 15,
      name: '홍길동',
      pin: '1234',
    });

    const res = await client.submitSuggestion({
      isAnonymous: true,
      category: 'facility',
      title: '교실 사물함 잠금장치 수리 요청',
      content: '뒤쪽 사물함 손잡이가 헐거워져 있어서 수리가 필요합니다.',
    });

    expect(res.status).toBe(201);
    expect(res.data.success).toBe(true);
    expect(res.data.suggestion.isAnonymous).toBe(true);
    expect(res.data.suggestion.studentId).toBeNull();

    // Verify database row directly
    const stored = engine.suggestions.get(res.data.suggestion.id);
    expect(stored.is_anonymous).toBe(true);
    expect(stored.student_id).toBeNull();
  });

  suite.it('TC-T1-SUGG-02: Identified suggestion correctly attaches authenticated student_id', async () => {
    const login = await client.studentLogin({
      grade: 2,
      classNumber: 1,
      studentNumber: 8,
      name: '을지문덕',
      pin: '8888',
    });

    const studentId = login.data.student.id;
    const res = await client.submitSuggestion({
      isAnonymous: false,
      category: 'classroom_rule',
      title: '아침 청소 당번 제도 개선 건의',
      content: '요일별 당번제를 모둠별 순환제로 변경하면 더 공평할 것 같습니다.',
    });

    expect(res.status).toBe(201);
    expect(res.data.suggestion.isAnonymous).toBe(false);
    expect(res.data.suggestion.studentId).toBe(studentId);

    const stored = engine.suggestions.get(res.data.suggestion.id);
    expect(stored.student_id).toBe(studentId);
  });

  suite.it('TC-T1-SUGG-03: Malicious anonymous payload with studentId is sanitized to null', async () => {
    await client.studentLogin({
      grade: 1,
      classNumber: 2,
      studentNumber: 15,
      name: '홍길동',
      pin: '1234',
    });

    // Adversarial payload injects studentId while claiming anonymous
    const res = await client.submitSuggestion({
      isAnonymous: true,
      studentId: 'malicious-victim-uuid-to-spoof',
      category: 'study',
      title: '자습 시간 조도 조절 요청',
      content: '앞쪽 형광등이 너무 깜빡입니다.',
    });

    expect(res.status).toBe(201);
    expect(res.data.suggestion.studentId).toBeNull();

    const stored = engine.suggestions.get(res.data.suggestion.id);
    expect(stored.student_id).toBeNull();
  });

  suite.it('TC-T1-SUGG-04: Suggestion categories cover all defined school categories', async () => {
    const validCats = [
      'classroom_environment',
      'classroom_rule',
      'school_life',
      'facility',
      'study',
      'other',
    ];

    for (const cat of validCats) {
      const res = await client.submitSuggestion({
        isAnonymous: true,
        category: cat,
        title: `건의 카테고리: ${cat}`,
        content: `상세 내용 테스트: ${cat}`,
      });
      expect(res.status).toBe(201);
      expect(res.data.suggestion.category).toBe(cat);
    }
  });

  suite.it('TC-T1-SUGG-05: Teacher replies to suggestion and updates status', async () => {
    const sub = await client.submitSuggestion({
      isAnonymous: true,
      category: 'classroom_environment',
      title: '교실 환기 및 공기청정기 필터 교체',
      content: '미세먼지가 심한 날 공기청정기 필터 점검을 부탁드립니다.',
    });

    const suggestionId = sub.data.suggestion.id;

    // Teacher reviews and replies
    client.setTeacherAuth(engine.generateTeacherToken());
    const replyRes = await client.teacherUpdateSuggestion(suggestionId, {
      status: 'resolved',
      teacherReply: '행정실에 의뢰하여 이번 주 수요일 필터 전체 교체 완료하였습니다.',
    });

    expect(replyRes.status).toBe(200);
    expect(replyRes.data.suggestion.status).toBe('resolved');
    expect(replyRes.data.suggestion.teacherReply).toContain('필터 전체 교체 완료');

    const stored = engine.suggestions.get(suggestionId);
    expect(stored.status).toBe('resolved');
    expect(stored.replied_by).notToBeNull();
  });

  suite.it('TC-T1-SUGG-06: Anonymous suggestion view in teacher dashboard returns student: null', async () => {
    await client.submitSuggestion({
      isAnonymous: true,
      category: 'school_life',
      title: '점심시간 방송 음악 신청곡 다양화',
      content: '다양한 장르의 음악을 틀어주시면 좋겠습니다.',
    });

    client.setTeacherAuth(engine.generateTeacherToken());
    const res = await client.teacherGetSuggestions({ isAnonymous: true });

    expect(res.status).toBe(200);
    expect(res.data.suggestions.length).toBeGreaterThanOrEqual(1);
    const target = res.data.suggestions.find((s) => s.title.includes('방송 음악'));
    expect(target).toBeDefined();
    expect(target.student).toBeNull();
  });

  // =========================================================================
  // 4. Student "My Applications" Status Tracker
  // =========================================================================

  suite.it('TC-T1-STAT-01: Student queries /api/counseling/my and receives own requests', async () => {
    await client.studentLogin({
      grade: 1,
      classNumber: 2,
      studentNumber: 15,
      name: '홍길동',
      pin: '1234',
    });

    await client.submitCounseling({
      category: 'academic',
      preferredDate: '2026-11-01',
      preferredTimeSlot: 'lunch',
      content: '첫 번째 상담 요청입니다.',
    });

    await client.submitCounseling({
      category: 'friendship',
      preferredDate: '2026-11-03',
      preferredTimeSlot: 'after_school',
      content: '두 번째 상담 요청입니다.',
    });

    const res = await client.getMyCounseling();
    expect(res.status).toBe(200);
    expect(res.data.success).toBe(true);
    expect(res.data.requests.length).toBe(2);
  });

  suite.it('TC-T1-STAT-02: Strict privacy: teacher private note is omitted from student response', async () => {
    await client.studentLogin({
      grade: 1,
      classNumber: 2,
      studentNumber: 15,
      name: '홍길동',
      pin: '1234',
    });

    const sub = await client.submitCounseling({
      category: 'family',
      preferredDate: '2026-11-04',
      preferredTimeSlot: 'lunch',
      content: '가정 문제로 고민이 있습니다.',
    });

    const reqId = sub.data.request.id;

    // Teacher leaves private guidance note
    client.setTeacherAuth(engine.generateTeacherToken());
    await client.teacherUpdateCounseling(reqId, {
      status: 'accepted',
      scheduledDate: '2026-11-04',
      scheduledNote: '상담실에서 만나요.',
      teacherNote: 'CONFIDENTIAL: 학생 심리상태 주의 깊게 관찰 요망 (교사 전용)',
    });

    // Student checks My Status
    client.clearTeacherAuth();
    const myRes = await client.getMyCounseling();
    expect(myRes.status).toBe(200);
    const target = myRes.data.requests.find((r) => r.id === reqId);
    expect(target).toBeDefined();
    expect(target.scheduledNote).toBe('상담실에서 만나요.');
    expect(target.teacherNote).toBeUndefined(); // MUST BE OMITTED!
  });

  suite.it('TC-T1-STAT-03: Teacher acceptance and scheduled note reflect in student view', async () => {
    await client.studentLogin({
      grade: 2,
      classNumber: 3,
      studentNumber: 11,
      name: '안중근',
      pin: '1909',
    });

    const sub = await client.submitCounseling({
      category: 'career',
      preferredDate: '2026-11-12',
      preferredTimeSlot: 'lunch',
      content: '역사 연구 관련 진로 상담',
    });

    const reqId = sub.data.request.id;

    client.setTeacherAuth(engine.generateTeacherToken());
    await client.teacherUpdateCounseling(reqId, {
      status: 'accepted',
      scheduledDate: '2026-11-12',
      scheduledTimeSlot: 'lunch',
      scheduledNote: '11월 12일 12시 40분 위클래스 상담실로 오세요.',
    });

    client.clearTeacherAuth();
    const myRes = await client.getMyCounseling();
    const target = myRes.data.requests.find((r) => r.id === reqId);
    expect(target.status).toBe('accepted');
    expect(target.scheduledDate).toBe('2026-11-12');
    expect(target.scheduledNote).toContain('위클래스 상담실');
  });

  suite.it('TC-T1-STAT-04: Completed counseling status reflects resolution and timestamp', async () => {
    await client.studentLogin({
      grade: 3,
      classNumber: 2,
      studentNumber: 4,
      name: '윤동주',
      pin: '1917',
    });

    const sub = await client.submitCounseling({
      category: 'emotional',
      preferredDate: '2026-11-08',
      preferredTimeSlot: 'break_time',
      content: '마음의 안정과 시 창작 고민',
    });

    const reqId = sub.data.request.id;

    client.setTeacherAuth(engine.generateTeacherToken());
    await client.teacherUpdateCounseling(reqId, {
      status: 'completed',
    });

    client.clearTeacherAuth();
    const myRes = await client.getMyCounseling();
    const target = myRes.data.requests.find((r) => r.id === reqId);
    expect(target.status).toBe('completed');
    expect(target.completedAt).notToBeNull();
  });

  suite.it('TC-T1-STAT-05: Student can cancel pending counseling request', async () => {
    await client.studentLogin({
      grade: 1,
      classNumber: 4,
      studentNumber: 18,
      name: '김유신',
      pin: '5555',
    });

    const sub = await client.submitCounseling({
      category: 'other',
      preferredDate: '2026-11-25',
      preferredTimeSlot: 'after_school',
      content: '취소 테스트용 상담 신청 건입니다.',
    });

    const reqId = sub.data.request.id;
    const cancelRes = await client.cancelCounseling(reqId);
    expect(cancelRes.status).toBe(200);
    expect(cancelRes.data.success).toBe(true);

    const checkRes = await client.getMyCounseling();
    const target = checkRes.data.requests.find((r) => r.id === reqId);
    expect(target.status).toBe('cancelled');
  });

  suite.it('TC-T1-STAT-06: Student cannot cancel request once accepted or completed', async () => {
    await client.studentLogin({
      grade: 1,
      classNumber: 4,
      studentNumber: 18,
      name: '김유신',
      pin: '5555',
    });

    const sub = await client.submitCounseling({
      category: 'academic',
      preferredDate: '2026-11-26',
      preferredTimeSlot: 'lunch',
      content: '이미 수락된 상담 건 취소 시도',
    });

    const reqId = sub.data.request.id;

    // Teacher accepts the request
    client.setTeacherAuth(engine.generateTeacherToken());
    await client.teacherUpdateCounseling(reqId, { status: 'accepted' });

    // Student attempts to cancel accepted request
    client.clearTeacherAuth();
    const cancelRes = await client.cancelCounseling(reqId);
    expect(cancelRes.status).toBe(400);
    expect(cancelRes.data.success).toBe(false);
  });

  // =========================================================================
  // 5. Teacher Management Dashboard & Administration
  // =========================================================================

  suite.it('TC-T1-TEAC-01: Unauthenticated request to teacher API is blocked (403)', async () => {
    client.clearTeacherAuth();

    const res = await client.teacherGetCounseling();
    expect(res.status).toBe(403);
    expect(res.data.success).toBe(false);
  });

  suite.it('TC-T1-TEAC-02: Teacher retrieves counseling requests with status filter', async () => {
    // Seed 1 pending and 1 accepted
    await client.studentLogin({
      grade: 1,
      classNumber: 1,
      studentNumber: 1,
      name: '학생A',
      pin: '1111',
    });
    const sub1 = await client.submitCounseling({
      category: 'academic',
      preferredDate: '2026-11-10',
      content: '신청 1',
    });

    await client.studentLogin({
      grade: 1,
      classNumber: 1,
      studentNumber: 2,
      name: '학생B',
      pin: '2222',
    });
    const sub2 = await client.submitCounseling({
      category: 'career',
      preferredDate: '2026-11-11',
      content: '신청 2',
    });

    client.setTeacherAuth(engine.generateTeacherToken());
    await client.teacherUpdateCounseling(sub2.data.request.id, { status: 'accepted' });

    // Filter by pending
    const pendingList = await client.teacherGetCounseling({ status: 'pending' });
    expect(pendingList.status).toBe(200);
    expect(pendingList.data.counselingRequests.length).toBe(1);
    expect(pendingList.data.counselingRequests[0].id).toBe(sub1.data.request.id);

    // Filter by accepted
    const acceptedList = await client.teacherGetCounseling({ status: 'accepted' });
    expect(acceptedList.data.counselingRequests.length).toBe(1);
    expect(acceptedList.data.counselingRequests[0].id).toBe(sub2.data.request.id);
  });

  suite.it('TC-T1-TEAC-03: Teacher filters counseling requests by urgency flag', async () => {
    await client.studentLogin({
      grade: 2,
      classNumber: 2,
      studentNumber: 10,
      name: '학생C',
      pin: '3333',
    });
    await client.submitCounseling({
      category: 'emotional',
      preferredDate: '2026-11-01',
      content: '긴급 상담 요청',
      isUrgent: true,
    });

    await client.submitCounseling({
      category: 'academic',
      preferredDate: '2026-11-05',
      content: '일반 상담 요청',
      isUrgent: false,
    });

    client.setTeacherAuth(engine.generateTeacherToken());
    const urgentOnly = await client.teacherGetCounseling({ isUrgent: true });
    expect(urgentOnly.status).toBe(200);
    expect(urgentOnly.data.counselingRequests.length).toBe(1);
    expect(urgentOnly.data.counselingRequests[0].isUrgent).toBe(true);
  });

  suite.it('TC-T1-TEAC-04: Teacher triage action updates status, schedules meeting, and stores notes', async () => {
    await client.studentLogin({
      grade: 1,
      classNumber: 3,
      studentNumber: 7,
      name: '학생D',
      pin: '4444',
    });
    const sub = await client.submitCounseling({
      category: 'friendship',
      preferredDate: '2026-11-07',
      content: '교우관계 상담',
    });

    client.setTeacherAuth(engine.generateTeacherToken());
    const res = await client.teacherUpdateCounseling(sub.data.request.id, {
      status: 'accepted',
      scheduledDate: '2026-11-07',
      scheduledTimeSlot: 'after_school',
      scheduledNote: '방과 후 교무실 앞 상담실에서 이야기해요.',
      teacherNote: '내담자 교우관계 기초 라포 형성 필요',
    });

    expect(res.status).toBe(200);
    expect(res.data.request.status).toBe('accepted');
    expect(res.data.request.scheduledDate).toBe('2026-11-07');
    expect(res.data.request.teacherNote).toContain('라포 형성 필요');
  });

  suite.it('TC-T1-TEAC-05: Teacher lists suggestions with anonymity filter', async () => {
    // 1 anon, 1 identified
    await client.submitSuggestion({
      isAnonymous: true,
      category: 'facility',
      title: '익명 건의 건',
      content: '정수기 온수가 잘 안 나와요.',
    });

    await client.studentLogin({
      grade: 2,
      classNumber: 5,
      studentNumber: 14,
      name: '학생E',
      pin: '5555',
    });
    await client.submitSuggestion({
      isAnonymous: false,
      category: 'study',
      title: '기명 건의 건',
      content: '도서관 신간 도서 신청합니다.',
    });

    client.setTeacherAuth(engine.generateTeacherToken());
    const anonOnly = await client.teacherGetSuggestions({ isAnonymous: true });
    expect(anonOnly.status).toBe(200);
    expect(anonOnly.data.suggestions.every((s) => s.isAnonymous === true)).toBe(true);

    const namedOnly = await client.teacherGetSuggestions({ isAnonymous: false });
    expect(namedOnly.status).toBe(200);
    expect(namedOnly.data.suggestions.every((s) => s.isAnonymous === false)).toBe(true);
    expect(namedOnly.data.suggestions[0].student.name).toBe('학생E');
  });

  suite.it('TC-T1-TEAC-06: Teacher resets student PIN, enabling student re-authentication', async () => {
    const enroll = await client.studentLogin({
      grade: 3,
      classNumber: 1,
      studentNumber: 22,
      name: '학생F',
      pin: '1234',
    });

    const studentId = enroll.data.student.id;
    client.clearCookies();

    // Teacher resets PIN to '0000'
    client.setTeacherAuth(engine.generateTeacherToken());
    const resetRes = await client.teacherResetStudentPin({ studentId, newPin: '0000' });
    expect(resetRes.status).toBe(200);
    expect(resetRes.data.success).toBe(true);

    // Old PIN fails
    client.clearTeacherAuth();
    const oldPinRes = await client.studentLogin({
      grade: 3,
      classNumber: 1,
      studentNumber: 22,
      name: '학생F',
      pin: '1234',
    });
    expect(oldPinRes.status).toBe(401);

    // New PIN succeeds
    const newPinRes = await client.studentLogin({
      grade: 3,
      classNumber: 1,
      studentNumber: 22,
      name: '학생F',
      pin: '0000',
    });
    expect(newPinRes.status).toBe(200);
    expect(newPinRes.data.success).toBe(true);
  });

  return suite;
}
