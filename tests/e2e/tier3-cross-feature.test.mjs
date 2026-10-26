// tests/e2e/tier3-cross-feature.test.mjs
// Tier 3: Cross-Feature Interactions & Privacy Invariants

import { TestSuite, expect } from '../harness/assertions.mjs';
import { TestApiClient } from '../harness/api-client.mjs';
import { MockAppEngine } from '../harness/mock-engine.mjs';

export function createTier3Suite() {
  const suite = new TestSuite('Tier 3: Cross-Feature Interactions & Privacy Invariants');
  let engine;
  let client;

  suite.beforeEach(() => {
    engine = new MockAppEngine();
    client = new TestApiClient(null, engine);
  });

  suite.it('TC-T3-XFT-01: Full lifecycle: Student Submit -> Teacher Triage -> Student Status Reflection', async () => {
    // 1. Student authenticates and submits counseling request
    await client.studentLogin({
      grade: 2,
      classNumber: 1,
      studentNumber: 15,
      name: '이민호',
      pin: '1234',
    });

    const subRes = await client.submitCounseling({
      category: 'academic',
      preferredDate: '2026-11-05',
      preferredTimeSlot: 'lunch',
      content: '수학 모의고사 성적 고민 상담 신청합니다.',
      isUrgent: false,
    });
    expect(subRes.status).toBe(201);
    const requestId = subRes.data.request.id;

    // 2. Teacher checks dashboard and sees pending request
    client.setTeacherAuth(engine.generateTeacherToken());
    const pendingList = await client.teacherGetCounseling({ status: 'pending' });
    const targetInTeacherView = pendingList.data.counselingRequests.find((r) => r.id === requestId);
    expect(targetInTeacherView).toBeDefined();
    expect(targetInTeacherView.student.name).toBe('이민호');

    // 3. Teacher accepts the request, sets schedule, public guidance note, and internal note
    const updateRes = await client.teacherUpdateCounseling(requestId, {
      status: 'accepted',
      scheduledDate: '2026-11-05',
      scheduledTimeSlot: 'lunch',
      scheduledNote: '11월 5일 점심시간 12:40 상담실에서 봅시다.',
      teacherNote: '최근 수학 모의고사 4등급으로 하락하여 불안감 호소. 격려 위주 상담.',
    });
    expect(updateRes.status).toBe(200);

    // 4. Student checks "My Applications"
    client.clearTeacherAuth();
    const myStatus = await client.getMyCounseling();
    const studentViewItem = myStatus.data.requests.find((r) => r.id === requestId);
    expect(studentViewItem).toBeDefined();
    expect(studentViewItem.status).toBe('accepted');
    expect(studentViewItem.scheduledDate).toBe('2026-11-05');
    expect(studentViewItem.scheduledNote).toBe('11월 5일 점심시간 12:40 상담실에서 봅시다.');
    expect(studentViewItem.teacherNote).toBeUndefined(); // Zero leak
  });

  suite.it('TC-T3-XFT-02: Zero-Leak Anonymity across DB row, trigger, teacher API, and student API', async () => {
    // 1. Student logs in
    const login = await client.studentLogin({
      grade: 1,
      classNumber: 4,
      studentNumber: 22,
      name: '비밀학생',
      pin: '4321',
    });
    const loggedStudentId = login.data.student.id;

    // 2. Student submits anonymous suggestion
    const sub = await client.submitSuggestion({
      isAnonymous: true,
      category: 'school_life',
      title: '학교 축제 프로그램 익명 제안',
      content: '학생들이 직접 기획하는 e-스포츠 대회를 추가해주세요.',
    });
    const suggestionId = sub.data.suggestion.id;

    // 3. Assert response payload contains no student ID
    expect(sub.data.suggestion.studentId).toBeNull();

    // 4. Inspect DB record directly in engine
    const dbRecord = engine.suggestions.get(suggestionId);
    expect(dbRecord.is_anonymous).toBe(true);
    expect(dbRecord.student_id).toBeNull();
    expect(dbRecord.student_id).notToBe(loggedStudentId);

    // 5. Query from Teacher Dashboard
    client.setTeacherAuth(engine.generateTeacherToken());
    const teacherView = await client.teacherGetSuggestions({ isAnonymous: true });
    const target = teacherView.data.suggestions.find((s) => s.id === suggestionId);
    expect(target).toBeDefined();
    expect(target.student).toBeNull();
    expect(JSON.stringify(target)).not.toContain('비밀학생');
    expect(JSON.stringify(target)).not.toContain(loggedStudentId);
  });

  suite.it('TC-T3-XFT-03: Cross-Student Data Isolation (Strict Tenant Boundary)', async () => {
    // Student 1 submits counseling request
    await client.studentLogin({
      grade: 1,
      classNumber: 1,
      studentNumber: 1,
      name: '학생1',
      pin: '1111',
    });
    const req1 = await client.submitCounseling({
      category: 'academic',
      preferredDate: '2026-11-01',
      content: '학생1의 비공개 상담 내용',
    });
    const req1Id = req1.data.request.id;

    // Student 2 logs in
    client.clearCookies();
    await client.studentLogin({
      grade: 1,
      classNumber: 1,
      studentNumber: 2,
      name: '학생2',
      pin: '2222',
    });
    const req2 = await client.submitCounseling({
      category: 'friendship',
      preferredDate: '2026-11-02',
      content: '학생2의 비공개 상담 내용',
    });
    const req2Id = req2.data.request.id;

    // Student 2 queries My Status
    const myRequests = await client.getMyCounseling();
    const ids = myRequests.data.requests.map((r) => r.id);

    expect(ids).toContain(req2Id);
    expect(ids.includes(req1Id)).toBe(false); // Student 1 request must NOT be returned!

    // Student 2 tries to cancel Student 1 request
    const cancelAttack = await client.cancelCounseling(req1Id);
    expect(cancelAttack.status).toBe(404);
  });

  suite.it('TC-T3-XFT-04: Two-Tier Notes Separation (Private note vs Public scheduled note)', async () => {
    await client.studentLogin({
      grade: 3,
      classNumber: 2,
      studentNumber: 5,
      name: '박지원',
      pin: '5555',
    });
    const sub = await client.submitCounseling({
      category: 'emotional',
      preferredDate: '2026-11-15',
      content: '학업 스트레스가 심합니다.',
    });
    const reqId = sub.data.request.id;

    // Teacher records both notes
    client.setTeacherAuth(engine.generateTeacherToken());
    await client.teacherUpdateCounseling(reqId, {
      status: 'accepted',
      scheduledNote: '따뜻한 차 한잔 마시며 이야기해요.',
      teacherNote: '학부모 상담 연계 필요성 검토 중 (대외비)',
    });

    // Verify teacher sees teacherNote
    const teacherQuery = await client.teacherGetCounseling();
    const teacherItem = teacherQuery.data.counselingRequests.find((r) => r.id === reqId);
    expect(teacherItem.teacherNote).toContain('학부모 상담 연계');
    expect(teacherItem.scheduledNote).toContain('따뜻한 차');

    // Verify student ONLY sees scheduledNote
    client.clearTeacherAuth();
    const studentQuery = await client.getMyCounseling();
    const studentItem = studentQuery.data.requests.find((r) => r.id === reqId);
    expect(studentItem.scheduledNote).toContain('따뜻한 차');
    expect(studentItem.teacherNote).toBeUndefined();
  });

  suite.it('TC-T3-XFT-05: Lifecycle State Immutability by student on completed requests', async () => {
    await client.studentLogin({
      grade: 1,
      classNumber: 2,
      studentNumber: 3,
      name: '김정호',
      pin: '9876',
    });
    const sub = await client.submitCounseling({
      category: 'career',
      preferredDate: '2026-11-03',
      content: '지리학과 진로 상담',
    });
    const reqId = sub.data.request.id;

    // Teacher completes counseling
    client.setTeacherAuth(engine.generateTeacherToken());
    await client.teacherUpdateCounseling(reqId, { status: 'completed' });

    // Student tries to cancel completed request
    client.clearTeacherAuth();
    const cancelRes = await client.cancelCounseling(reqId);
    expect(cancelRes.status).toBe(400);
    expect(cancelRes.data.error).toContain('대기 중인');

    // Check status remains completed
    const myStatus = await client.getMyCounseling();
    const item = myStatus.data.requests.find((r) => r.id === reqId);
    expect(item.status).toBe('completed');
  });

  suite.it('TC-T3-XFT-06: Teacher PIN Reset & Student Re-authentication Flow', async () => {
    // 1. Student registers with PIN '1111'
    const enroll = await client.studentLogin({
      grade: 2,
      classNumber: 4,
      studentNumber: 19,
      name: '최치원',
      pin: '1111',
    });
    const studentId = enroll.data.student.id;
    client.clearCookies();

    // 2. Student forgets PIN and cannot login
    const failLogin = await client.studentLogin({
      grade: 2,
      classNumber: 4,
      studentNumber: 19,
      name: '최치원',
      pin: '9999',
    });
    expect(failLogin.status).toBe(401);

    // 3. Teacher resets PIN to '0000'
    client.setTeacherAuth(engine.generateTeacherToken());
    const resetRes = await client.teacherResetStudentPin({ studentId, newPin: '0000' });
    expect(resetRes.status).toBe(200);

    // 4. Student logs in with '0000' successfully
    client.clearTeacherAuth();
    const successLogin = await client.studentLogin({
      grade: 2,
      classNumber: 4,
      studentNumber: 19,
      name: '최치원',
      pin: '0000',
    });
    expect(successLogin.status).toBe(200);
    expect(successLogin.data.success).toBe(true);
  });

  suite.it('TC-T3-XFT-07: Dual Realm Session Isolation (Student vs Teacher credentials)', async () => {
    // Student attempts to call teacher endpoint using student session
    await client.studentLogin({
      grade: 1,
      classNumber: 1,
      studentNumber: 1,
      name: '일반학생',
      pin: '1234',
    });
    client.clearTeacherAuth();

    const breachAttempt = await client.teacherGetCounseling();
    expect(breachAttempt.status).toBe(403);

    // Teacher token cannot be used to read student profile
    client.clearCookies();
    client.setTeacherAuth(engine.generateTeacherToken());
    const profileAttempt = await client.getStudentProfile();
    expect(profileAttempt.status).toBe(401);
  });

  suite.it('TC-T3-XFT-08: Anonymous Suggestion Follow-Up & Public Feedback Loop', async () => {
    // Submit anonymous suggestion
    const sub = await client.submitSuggestion({
      isAnonymous: true,
      category: 'facility',
      title: '체육관 농구공 공기압 점검',
      content: '체육관에 있는 농구공에 바람이 다 빠져있습니다.',
    });
    const suggId = sub.data.suggestion.id;

    // Teacher replies and updates status to resolved
    client.setTeacherAuth(engine.generateTeacherToken());
    const replyRes = await client.teacherUpdateSuggestion(suggId, {
      status: 'resolved',
      teacherReply: '공기주입기 비치 및 농구공 전체 공기 주입 완료했습니다.',
    });
    expect(replyRes.status).toBe(200);

    // Verify suggestion stays anonymous in query
    const list = await client.teacherGetSuggestions({ status: 'resolved' });
    const target = list.data.suggestions.find((s) => s.id === suggId);
    expect(target).toBeDefined();
    expect(target.isAnonymous).toBe(true);
    expect(target.student).toBeNull();
    expect(target.teacherReply).toContain('공기 주입 완료');
  });

  return suite;
}
