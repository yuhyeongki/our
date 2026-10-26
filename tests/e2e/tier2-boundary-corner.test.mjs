// tests/e2e/tier2-boundary-corner.test.mjs
// Tier 2: Boundary & Corner Cases (Adversarial Robustness & Edge Inputs)

import { TestSuite, expect } from '../harness/assertions.mjs';
import { TestApiClient } from '../harness/api-client.mjs';
import { MockAppEngine } from '../harness/mock-engine.mjs';

export function createTier2Suite() {
  const suite = new TestSuite('Tier 2: Boundary & Corner Cases (Input Stress & Integrity)');
  let engine;
  let client;

  suite.beforeEach(() => {
    engine = new MockAppEngine();
    client = new TestApiClient(null, engine);
  });

  suite.it('TC-T2-BND-01: PIN length boundary — reject 3-digit PIN ("123")', async () => {
    const res = await client.studentLogin({
      grade: 1,
      classNumber: 1,
      studentNumber: 1,
      name: '홍길동',
      pin: '123',
    });
    expect(res.status).toBe(400);
    expect(res.data.error).toContain('비밀번호는 숫자 4자리');
  });

  suite.it('TC-T2-BND-02: PIN length boundary — reject 5-digit PIN ("12345")', async () => {
    const res = await client.studentLogin({
      grade: 1,
      classNumber: 1,
      studentNumber: 1,
      name: '홍길동',
      pin: '12345',
    });
    expect(res.status).toBe(400);
    expect(res.data.error).toContain('비밀번호는 숫자 4자리');
  });

  suite.it('TC-T2-BND-03: PIN format boundary — reject non-numeric PINs ("12a4", "abcd", "!@#$")', async () => {
    const badPins = ['12a4', 'abcd', '!@#$', ' 123', '12 4'];
    for (const badPin of badPins) {
      const res = await client.studentLogin({
        grade: 1,
        classNumber: 1,
        studentNumber: 1,
        name: '홍길동',
        pin: badPin,
      });
      expect(res.status).toBe(400);
    }
  });

  suite.it('TC-T2-BND-04: Grade boundary — reject Grade 0 (below min 1)', async () => {
    const res = await client.studentLogin({
      grade: 0,
      classNumber: 1,
      studentNumber: 1,
      name: '홍길동',
      pin: '1234',
    });
    expect(res.status).toBe(400);
    expect(res.data.error).toContain('학년');
  });

  suite.it('TC-T2-BND-05: Grade boundary — accept Grade 1 (min) and Grade 6 (max)', async () => {
    const minGradeRes = await client.studentLogin({
      grade: 1,
      classNumber: 1,
      studentNumber: 1,
      name: '홍길동',
      pin: '1234',
    });
    expect(minGradeRes.status).toBe(200);

    const maxGradeRes = await client.studentLogin({
      grade: 6,
      classNumber: 1,
      studentNumber: 1,
      name: '이순신',
      pin: '1234',
    });
    expect(maxGradeRes.status).toBe(200);
  });

  suite.it('TC-T2-BND-06: Grade boundary — reject Grade 7 (above max 6)', async () => {
    const res = await client.studentLogin({
      grade: 7,
      classNumber: 1,
      studentNumber: 1,
      name: '홍길동',
      pin: '1234',
    });
    expect(res.status).toBe(400);
    expect(res.data.error).toContain('학년');
  });

  suite.it('TC-T2-BND-07: Class number boundary — reject Class 0 and Class 31', async () => {
    const resZero = await client.studentLogin({
      grade: 2,
      classNumber: 0,
      studentNumber: 1,
      name: '홍길동',
      pin: '1234',
    });
    expect(resZero.status).toBe(400);

    const resOverflow = await client.studentLogin({
      grade: 2,
      classNumber: 31,
      studentNumber: 1,
      name: '홍길동',
      pin: '1234',
    });
    expect(resOverflow.status).toBe(400);
  });

  suite.it('TC-T2-BND-08: Student number boundary — reject Number 0 and Number 61', async () => {
    const resZero = await client.studentLogin({
      grade: 2,
      classNumber: 1,
      studentNumber: 0,
      name: '홍길동',
      pin: '1234',
    });
    expect(resZero.status).toBe(400);

    const resOverflow = await client.studentLogin({
      grade: 2,
      classNumber: 1,
      studentNumber: 61,
      name: '홍길동',
      pin: '1234',
    });
    expect(resOverflow.status).toBe(400);
  });

  suite.it('TC-T2-BND-09: Empty input validation — reject empty or whitespace-only name', async () => {
    const badNames = ['', '   ', '\t\n'];
    for (const badName of badNames) {
      const res = await client.studentLogin({
        grade: 1,
        classNumber: 1,
        studentNumber: 1,
        name: badName,
        pin: '1234',
      });
      expect(res.status).toBe(400);
      expect(res.data.error).toContain('이름');
    }
  });

  suite.it('TC-T2-BND-10: Empty content validation — reject whitespace-only counseling content', async () => {
    await client.studentLogin({
      grade: 1,
      classNumber: 1,
      studentNumber: 1,
      name: '홍길동',
      pin: '1234',
    });

    const res = await client.submitCounseling({
      category: 'academic',
      preferredDate: '2026-11-01',
      content: '   \n  \t  ',
    });
    expect(res.status).toBe(400);
    expect(res.data.error).toContain('내용');
  });

  suite.it('TC-T2-BND-11: Content length limit — accept content at boundary length (2000 chars)', async () => {
    await client.studentLogin({
      grade: 1,
      classNumber: 1,
      studentNumber: 1,
      name: '홍길동',
      pin: '1234',
    });

    const maxContent = '가'.repeat(2000);
    const res = await client.submitCounseling({
      category: 'friendship',
      preferredDate: '2026-11-01',
      content: maxContent,
    });
    expect(res.status).toBe(201);
    expect(res.data.request.content.length).toBe(2000);
  });

  suite.it('TC-T2-BND-12: Content length overflow — reject content exceeding maximum length (2001 chars)', async () => {
    await client.studentLogin({
      grade: 1,
      classNumber: 1,
      studentNumber: 1,
      name: '홍길동',
      pin: '1234',
    });

    const overflowContent = 'A'.repeat(2001);
    const res = await client.submitCounseling({
      category: 'academic',
      preferredDate: '2026-11-01',
      content: overflowContent,
    });
    expect(res.status).toBe(400);
    expect(res.data.error).toContain('2000자');
  });

  suite.it('TC-T2-BND-13: Special character & escaping integrity — preserve Korean quotes and symbols', async () => {
    await client.studentLogin({
      grade: 1,
      classNumber: 1,
      studentNumber: 1,
      name: '홍길동',
      pin: '1234',
    });

    const specialTitle = '건의: "온수" & <난방기> 작동 점검! (100% 필수) 💡';
    const specialContent = '선생님 안녕하세요! \'작은\' 건의사항입니다. <script>alert(1)</script> 안전하게 처리되는지 확인합니다.';

    const res = await client.submitSuggestion({
      isAnonymous: true,
      category: 'facility',
      title: specialTitle,
      content: specialContent,
    });

    expect(res.status).toBe(201);
    expect(res.data.suggestion.title).toBe(specialTitle);
    expect(res.data.suggestion.content).toBe(specialContent);
  });

  suite.it('TC-T2-BND-14: Tampered JWT cookie — session with altered payload is rejected (401)', async () => {
    await client.studentLogin({
      grade: 1,
      classNumber: 1,
      studentNumber: 1,
      name: '홍길동',
      pin: '1234',
    });

    const validCookie = client.getCookie('student_session');
    expect(validCookie).notToBeNull();

    // Tamper with payload
    const parts = validCookie.split('.');
    const tamperedPayload = Buffer.from(
      JSON.stringify({ student_id: 'tampered-uuid', name: '해커' })
    ).toString('base64url');
    const tamperedCookie = `${parts[0]}.${tamperedPayload}.${parts[2]}`;

    client.setCookie('student_session', tamperedCookie);

    const res = await client.getStudentProfile();
    expect(res.status).toBe(401);
  });

  suite.it('TC-T2-BND-15: Expired session handling — session with past exp is rejected', async () => {
    // Manually sign a token that expired 10 seconds ago
    const expiredToken = engine.signStudentSession(
      { student_id: 'some-id', grade: 1, classNumber: 1, studentNumber: 1, name: '홍길동' },
      -10 // Expired
    );

    client.setCookie('student_session', expiredToken);
    const res = await client.getStudentProfile();
    expect(res.status).toBe(401);
  });

  suite.it('TC-T2-BND-16: Database check constraint verification — reject identified suggestion without session', async () => {
    client.clearCookies();

    // Identified suggestion without session -> cannot bind student_id -> rejected
    const res = await client.submitSuggestion({
      isAnonymous: false,
      category: 'school_life',
      title: '비로그인 기명 건의 시도',
      content: '로그인 없이 기명 건의를 남기려 함',
    });

    expect(res.status).toBe(401);
  });

  return suite;
}
