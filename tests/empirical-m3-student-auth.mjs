// tests/empirical-m3-student-auth.mjs
// Empirical Stress Test Harness for Milestone M3: Student Authentication & Session Boundaries
// Verifies PIN boundaries, roster boundaries, anti-spoofing, tampered/expired session cookies,
// and cryptographic createStudentSession / verifyStudentSession implementations.

import { SignJWT, jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { TestSuite, expect } from './harness/assertions.mjs';

const COOKIE_NAME = 'student_session';
const SESSION_MAX_AGE = 86400;
const TEST_SECRET = 'dev-student-session-secret-min-32-chars-long-for-hmac-sha256';
const secretKey = new TextEncoder().encode(TEST_SECRET);

// ---------------------------------------------------------------------------
// Mirrored Exact Production Logic from src/lib/auth/session.ts
// ---------------------------------------------------------------------------

async function createStudentSession(payload) {
  const classNumber = payload.class_number ?? payload.classNumber;
  const studentNumber = payload.student_number ?? payload.studentNumber;

  const fullPayload = {
    student_id: payload.student_id,
    grade: payload.grade,
    class_number: classNumber,
    student_number: studentNumber,
    classNumber,
    studentNumber,
    name: payload.name,
    role: 'student',
  };

  return await new SignJWT(fullPayload)
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(secretKey);
}

async function verifyStudentSession(token) {
  if (!token || typeof token !== 'string') return null;

  try {
    const { payload } = await jwtVerify(token, secretKey, {
      algorithms: ['HS256'],
    });

    const studentId = payload.student_id;
    const grade = Number(payload.grade);
    const classNumber = Number(payload.class_number ?? payload.classNumber);
    const studentNumber = Number(payload.student_number ?? payload.studentNumber);
    const name = payload.name;

    if (!studentId || !name || isNaN(grade) || isNaN(classNumber) || isNaN(studentNumber)) {
      return null;
    }

    return {
      student_id: studentId,
      grade,
      class_number: classNumber,
      student_number: studentNumber,
      classNumber,
      studentNumber,
      name,
      role: 'student',
      iat: payload.iat,
      exp: payload.exp,
    };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Mirrored Exact Production Validation Logic from src/app/api/auth/student/login/route.ts
// ---------------------------------------------------------------------------

function validateStudentLoginInput({ grade, classNumber, studentNumber, name, pin }) {
  if (!Number.isInteger(grade) || grade < 1 || grade > 6) {
    return { valid: false, status: 400, error: '학년은 1에서 6 사이의 정수여야 합니다.' };
  }

  if (!Number.isInteger(classNumber) || classNumber < 1 || classNumber > 30) {
    return { valid: false, status: 400, error: '반은 1에서 30 사이의 정수여야 합니다.' };
  }

  if (!Number.isInteger(studentNumber) || studentNumber < 1 || studentNumber > 60) {
    return { valid: false, status: 400, error: '번호는 1에서 60 사이의 정수여야 합니다.' };
  }

  if (typeof name !== 'string' || !name.trim()) {
    return { valid: false, status: 400, error: '학생 이름을 올바르게 입력해주세요.' };
  }

  const cleanName = name.trim();
  if (cleanName.length < 1 || cleanName.length > 50) {
    return { valid: false, status: 400, error: '이름 길이는 1~50자 사이여야 합니다.' };
  }

  if (typeof pin !== 'string' || !/^\d{4}$/.test(pin)) {
    return { valid: false, status: 400, error: '비밀번호는 숫자 4자리여야 합니다.' };
  }

  return { valid: true, cleanName };
}

// ---------------------------------------------------------------------------
// Mirrored Anti-Spoofing & Login Auth Logic
// ---------------------------------------------------------------------------

async function simulateStudentAuth(database, { grade, classNumber, studentNumber, name, pin }) {
  const val = validateStudentLoginInput({ grade, classNumber, studentNumber, name, pin });
  if (!val.valid) {
    return { status: val.status, body: { success: false, error: val.error } };
  }

  const rosterKey = `${grade}-${classNumber}-${studentNumber}`;
  const existing = database.get(rosterKey);

  // New enrollment
  if (!existing) {
    const pinHash = await bcrypt.hash(pin, 10);
    const newStudent = {
      id: crypto.randomUUID(),
      grade,
      class_number: classNumber,
      student_number: studentNumber,
      name: val.cleanName,
      pin_hash: pinHash,
      created_at: new Date().toISOString(),
    };
    database.set(rosterKey, newStudent);

    const token = await createStudentSession({
      student_id: newStudent.id,
      grade: newStudent.grade,
      class_number: newStudent.class_number,
      student_number: newStudent.student_number,
      name: newStudent.name,
      role: 'student',
    });

    return {
      status: 200,
      body: {
        success: true,
        isNew: true,
        student: {
          id: newStudent.id,
          grade: newStudent.grade,
          classNumber: newStudent.class_number,
          studentNumber: newStudent.student_number,
          name: newStudent.name,
        },
      },
      token,
    };
  }

  // Anti-spoofing check
  if (existing.name !== val.cleanName) {
    return {
      status: 400,
      body: {
        success: false,
        error: '해당 학년/반/번호에 이미 등록된 다른 학생이 있습니다. 정보를 확인해주세요.',
      },
    };
  }

  // PIN check
  const isPinMatch = await bcrypt.compare(pin, existing.pin_hash);
  if (!isPinMatch) {
    return {
      status: 401,
      body: {
        success: false,
        error: '비밀번호(PIN)가 일치하지 않습니다. 비밀번호를 잊으셨다면 선생님께 초기화를 요청하세요.',
      },
    };
  }

  const token = await createStudentSession({
    student_id: existing.id,
    grade: existing.grade,
    class_number: existing.class_number,
    student_number: existing.student_number,
    name: existing.name,
    role: 'student',
  });

  return {
    status: 200,
    body: {
      success: true,
      isNew: false,
      student: {
        id: existing.id,
        grade: existing.grade,
        classNumber: existing.class_number,
        studentNumber: existing.student_number,
        name: existing.name,
      },
    },
    token,
  };
}

// ---------------------------------------------------------------------------
// Test Suites
// ---------------------------------------------------------------------------

export function createM3AuthStressSuite() {
  const suite = new TestSuite('M3 Empirical Stress Suite: Student Auth & Session Boundaries');
  let mockDb;

  suite.beforeEach(() => {
    mockDb = new Map();
  });

  // 1. PIN Boundary Values
  suite.it('STRESS-PIN-01: Length < 4 ("123", "12", "1", "") rejected with 400', () => {
    const badPins = ['123', '12', '1', ''];
    for (const badPin of badPins) {
      const res = validateStudentLoginInput({
        grade: 1,
        classNumber: 1,
        studentNumber: 1,
        name: '홍길동',
        pin: badPin,
      });
      expect(res.valid).toBe(false);
      expect(res.status).toBe(400);
      expect(res.error).toContain('비밀번호는 숫자 4자리');
    }
  });

  suite.it('STRESS-PIN-02: Length > 4 ("12345", "123456", "00000") rejected with 400', () => {
    const badPins = ['12345', '123456', '00000'];
    for (const badPin of badPins) {
      const res = validateStudentLoginInput({
        grade: 1,
        classNumber: 1,
        studentNumber: 1,
        name: '홍길동',
        pin: badPin,
      });
      expect(res.valid).toBe(false);
      expect(res.status).toBe(400);
      expect(res.error).toContain('비밀번호는 숫자 4자리');
    }
  });

  suite.it('STRESS-PIN-03: Non-numeric ("12a4", "abcd", "!@#$", " 123", "12 4") rejected with 400', () => {
    const badPins = ['12a4', 'abcd', '!@#$', ' 123', '12 4', '1234\n', '12.4'];
    for (const badPin of badPins) {
      const res = validateStudentLoginInput({
        grade: 1,
        classNumber: 1,
        studentNumber: 1,
        name: '홍길동',
        pin: badPin,
      });
      expect(res.valid).toBe(false);
      expect(res.status).toBe(400);
      expect(res.error).toContain('비밀번호는 숫자 4자리');
    }
  });

  suite.it('STRESS-PIN-04: Non-string PIN types (number 1234, null, undefined) rejected with 400', () => {
    const badTypes = [1234, null, undefined, {}, []];
    for (const badType of badTypes) {
      const res = validateStudentLoginInput({
        grade: 1,
        classNumber: 1,
        studentNumber: 1,
        name: '홍길동',
        pin: badType,
      });
      expect(res.valid).toBe(false);
      expect(res.status).toBe(400);
    }
  });

  suite.it('STRESS-PIN-05: Valid 4-digit PINs ("0000", "1234", "9999") accepted', () => {
    const validPins = ['0000', '1234', '9999', '0123'];
    for (const pin of validPins) {
      const res = validateStudentLoginInput({
        grade: 1,
        classNumber: 1,
        studentNumber: 1,
        name: '홍길동',
        pin,
      });
      expect(res.valid).toBe(true);
    }
  });

  // 2. Roster Boundary Values
  suite.it('STRESS-ROSTER-01: Grade boundary — reject grade < 1 (0, -1) and grade > 6 (7, 10)', () => {
    const badGrades = [0, -1, 7, 10, 100];
    for (const badGrade of badGrades) {
      const res = validateStudentLoginInput({
        grade: badGrade,
        classNumber: 1,
        studentNumber: 1,
        name: '홍길동',
        pin: '1234',
      });
      expect(res.valid).toBe(false);
      expect(res.status).toBe(400);
      expect(res.error).toContain('학년');
    }
  });

  suite.it('STRESS-ROSTER-02: Grade boundary — accept grade 1 (min) and grade 6 (max)', () => {
    for (const validGrade of [1, 2, 3, 4, 5, 6]) {
      const res = validateStudentLoginInput({
        grade: validGrade,
        classNumber: 1,
        studentNumber: 1,
        name: '홍길동',
        pin: '1234',
      });
      expect(res.valid).toBe(true);
    }
  });

  suite.it('STRESS-ROSTER-03: Class boundary — reject class 0, -1, 31, 50; accept 1 and 30', () => {
    const badClasses = [0, -1, 31, 50];
    for (const badClass of badClasses) {
      const res = validateStudentLoginInput({
        grade: 1,
        classNumber: badClass,
        studentNumber: 1,
        name: '홍길동',
        pin: '1234',
      });
      expect(res.valid).toBe(false);
      expect(res.status).toBe(400);
      expect(res.error).toContain('반');
    }

    for (const validClass of [1, 15, 30]) {
      const res = validateStudentLoginInput({
        grade: 1,
        classNumber: validClass,
        studentNumber: 1,
        name: '홍길동',
        pin: '1234',
      });
      expect(res.valid).toBe(true);
    }
  });

  suite.it('STRESS-ROSTER-04: Student number boundary — reject 0, -1, 61, 100; accept 1 and 60', () => {
    const badNumbers = [0, -1, 61, 100];
    for (const badNum of badNumbers) {
      const res = validateStudentLoginInput({
        grade: 1,
        classNumber: 1,
        studentNumber: badNum,
        name: '홍길동',
        pin: '1234',
      });
      expect(res.valid).toBe(false);
      expect(res.status).toBe(400);
      expect(res.error).toContain('번호');
    }

    for (const validNum of [1, 30, 60]) {
      const res = validateStudentLoginInput({
        grade: 1,
        classNumber: 1,
        studentNumber: validNum,
        name: '홍길동',
        pin: '1234',
      });
      expect(res.valid).toBe(true);
    }
  });

  suite.it('STRESS-ROSTER-05: Non-integer numeric types (float, string numbers) rejected with 400', () => {
    const badFloats = [
      { grade: 1.5, classNumber: 1, studentNumber: 1 },
      { grade: 1, classNumber: 2.2, studentNumber: 1 },
      { grade: 1, classNumber: 1, studentNumber: 15.9 },
      { grade: '1', classNumber: 1, studentNumber: 1 },
    ];
    for (const item of badFloats) {
      const res = validateStudentLoginInput({
        grade: item.grade,
        classNumber: item.classNumber,
        studentNumber: item.studentNumber,
        name: '홍길동',
        pin: '1234',
      });
      expect(res.valid).toBe(false);
      expect(res.status).toBe(400);
    }
  });

  suite.it('STRESS-ROSTER-06: Student name validation — reject empty, whitespace, and > 50 chars', () => {
    const badNames = ['', '   ', '\t\n', 'A'.repeat(51), null, 1234];
    for (const badName of badNames) {
      const res = validateStudentLoginInput({
        grade: 1,
        classNumber: 1,
        studentNumber: 1,
        name: badName,
        pin: '1234',
      });
      expect(res.valid).toBe(false);
      expect(res.status).toBe(400);
    }

    const goodNames = ['홍', '홍길동', '이 름', 'A'.repeat(50)];
    for (const goodName of goodNames) {
      const res = validateStudentLoginInput({
        grade: 1,
        classNumber: 1,
        studentNumber: 1,
        name: goodName,
        pin: '1234',
      });
      expect(res.valid).toBe(true);
    }
  });

  // 3. Anti-Spoofing & Impersonation Protection
  suite.it('STRESS-SPOOF-01: Enrollment succeeds for new roster', async () => {
    const res = await simulateStudentAuth(mockDb, {
      grade: 1,
      classNumber: 2,
      studentNumber: 15,
      name: '홍길동',
      pin: '1234',
    });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.isNew).toBe(true);
    expect(res.body.student.name).toBe('홍길동');
    expect(res.token).notToBeNull();
  });

  suite.it('STRESS-SPOOF-02: Different name for existing registered roster returns 400 Bad Request', async () => {
    // 1. First student registers
    await simulateStudentAuth(mockDb, {
      grade: 1,
      classNumber: 2,
      studentNumber: 15,
      name: '홍길동',
      pin: '1234',
    });

    // 2. Imposter attempts to register or log into same slot with different name
    const imposterRes = await simulateStudentAuth(mockDb, {
      grade: 1,
      classNumber: 2,
      studentNumber: 15,
      name: '박철수', // Different name
      pin: '1234',
    });

    expect(imposterRes.status).toBe(400);
    expect(imposterRes.body.success).toBe(false);
    expect(imposterRes.body.error).toContain('이미 등록된 다른 학생이 있습니다');
  });

  suite.it('STRESS-SPOOF-03: Name mismatch check precedes PIN check (prevents PIN brute force)', async () => {
    await simulateStudentAuth(mockDb, {
      grade: 2,
      classNumber: 3,
      studentNumber: 7,
      name: '이순신',
      pin: '5678',
    });

    // Attacker tries wrong name AND wrong PIN
    const res = await simulateStudentAuth(mockDb, {
      grade: 2,
      classNumber: 3,
      studentNumber: 7,
      name: '해커',
      pin: '0000',
    });

    // Must fail on name check (400) NOT on PIN check (401)
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('이미 등록된 다른 학생이 있습니다');
  });

  suite.it('STRESS-SPOOF-04: Existing student with matching name but incorrect PIN returns 401', async () => {
    await simulateStudentAuth(mockDb, {
      grade: 1,
      classNumber: 1,
      studentNumber: 1,
      name: '강감찬',
      pin: '9999',
    });

    const badPinRes = await simulateStudentAuth(mockDb, {
      grade: 1,
      classNumber: 1,
      studentNumber: 1,
      name: '강감찬',
      pin: '1111', // Incorrect PIN
    });

    expect(badPinRes.status).toBe(401);
    expect(badPinRes.body.success).toBe(false);
    expect(badPinRes.body.error).toContain('비밀번호(PIN)가 일치하지 않습니다');
  });

  // 4. Session Cryptography & Tamper Resistance
  suite.it('STRESS-SESS-01: createStudentSession produces valid HS256 JWT with 24h expiration', async () => {
    const token = await createStudentSession({
      student_id: 'std-uuid-1',
      grade: 1,
      classNumber: 2,
      studentNumber: 15,
      name: '홍길동',
      role: 'student',
    });

    expect(typeof token).toBe('string');
    const parts = token.split('.');
    expect(parts.length).toBe(3);

    const header = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8'));
    expect(header.alg).toBe('HS256');
    expect(header.typ).toBe('JWT');

    const decoded = await verifyStudentSession(token);
    expect(decoded).notToBeNull();
    expect(decoded.student_id).toBe('std-uuid-1');
    expect(decoded.grade).toBe(1);
    expect(decoded.classNumber).toBe(2);
    expect(decoded.studentNumber).toBe(15);
    expect(decoded.name).toBe('홍길동');
    expect(decoded.role).toBe('student');
    expect(decoded.exp - decoded.iat).toBe(86400);
  });

  suite.it('STRESS-SESS-02: Tampered payload with original signature is rejected (null)', async () => {
    const token = await createStudentSession({
      student_id: 'std-uuid-1',
      grade: 1,
      classNumber: 2,
      studentNumber: 15,
      name: '홍길동',
      role: 'student',
    });

    const parts = token.split('.');
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
    payload.student_id = 'tampered-hacker-id';
    payload.name = '악의적해커';

    const tamperedPayloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const tamperedToken = `${parts[0]}.${tamperedPayloadB64}.${parts[2]}`;

    const verified = await verifyStudentSession(tamperedToken);
    expect(verified).toBeNull();
  });

  suite.it('STRESS-SESS-03: Corrupted HMAC signature is rejected (null)', async () => {
    const token = await createStudentSession({
      student_id: 'std-uuid-1',
      grade: 1,
      classNumber: 2,
      studentNumber: 15,
      name: '홍길동',
      role: 'student',
    });

    const parts = token.split('.');
    const corruptedSig = 'A'.repeat(parts[2].length);
    const corruptedToken = `${parts[0]}.${parts[1]}.${corruptedSig}`;

    const verified = await verifyStudentSession(corruptedToken);
    expect(verified).toBeNull();
  });

  suite.it('STRESS-SESS-04: Expired session token is rejected (null)', async () => {
    // Construct token with exp in the past (-10 seconds)
    const expiredToken = await new SignJWT({
      student_id: 'std-uuid-1',
      grade: 1,
      class_number: 2,
      student_number: 15,
      name: '홍길동',
      role: 'student',
    })
      .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
      .setIssuedAt(Math.floor(Date.now() / 1000) - 100)
      .setExpirationTime(Math.floor(Date.now() / 1000) - 10)
      .sign(secretKey);

    const verified = await verifyStudentSession(expiredToken);
    expect(verified).toBeNull();
  });

  suite.it('STRESS-SESS-05: Algorithm substitution attack (alg: "none") is rejected (null)', async () => {
    const unsignedHeader = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
    const unsignedPayload = Buffer.from(
      JSON.stringify({
        student_id: 'std-uuid-1',
        grade: 1,
        class_number: 2,
        student_number: 15,
        name: '홍길동',
        role: 'student',
        exp: Math.floor(Date.now() / 1000) + 3600,
      })
    ).toString('base64url');
    const unsignedToken = `${unsignedHeader}.${unsignedPayload}.`;

    const verified = await verifyStudentSession(unsignedToken);
    expect(verified).toBeNull();
  });

  suite.it('STRESS-SESS-06: Algorithm substitution attack (alg: "HS512") is rejected (null)', async () => {
    const wrongAlgToken = await new SignJWT({
      student_id: 'std-uuid-1',
      grade: 1,
      class_number: 2,
      student_number: 15,
      name: '홍길동',
      role: 'student',
    })
      .setProtectedHeader({ alg: 'HS512', typ: 'JWT' })
      .setIssuedAt()
      .setExpirationTime('3600s')
      .sign(secretKey);

    const verified = await verifyStudentSession(wrongAlgToken);
    expect(verified).toBeNull();
  });

  suite.it('STRESS-SESS-07: Malformed and non-string token inputs return null without throwing', async () => {
    const malformedInputs = [
      '',
      '   ',
      'part1.part2',
      'part1.part2.part3.part4',
      'invalid-base-64!@#$.!@#$.!@#$',
      null,
      undefined,
      12345,
      {},
      [],
    ];

    for (const input of malformedInputs) {
      const verified = await verifyStudentSession(input);
      expect(verified).toBeNull();
    }
  });

  return suite;
}

// Direct execution when invoked via `node tests/empirical-m3-student-auth.mjs`
if (process.argv[1] && process.argv[1].endsWith('empirical-m3-student-auth.mjs')) {
  const suite = createM3AuthStressSuite();
  suite.run().then((res) => {
    console.log(`\nM3 Auth Stress Test Result: ${res.passed}/${res.total} Passed, ${res.failed} Failed.`);
    process.exit(res.failed === 0 ? 0 : 1);
  });
}
