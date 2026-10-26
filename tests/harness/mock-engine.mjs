// tests/harness/mock-engine.mjs
// High-fidelity virtual contract engine mirroring Supabase + Next.js App Router behavior
// Implements exact database constraints, triggers, auth hashing, HMAC-SHA256 JWT sessions,
// RLS query isolation, and business logic from PROJECT.md & supabase/schema.sql.

import crypto from 'node:crypto';

export class MockAppEngine {
  constructor(secretKey = 'test-secret-key-for-student-hmac-sha256-session') {
    this.secretKey = secretKey;
    this.reset();
  }

  reset() {
    this.students = new Map(); // id -> student record
    this.teachers = new Map(); // id -> teacher record
    this.counselingRequests = new Map(); // id -> counseling record
    this.suggestions = new Map(); // id -> suggestion record

    // Seed default verified teacher
    const defaultTeacherId = 'd0000000-0000-0000-0000-000000000001';
    this.teachers.set(defaultTeacherId, {
      id: defaultTeacherId,
      email: 'teacher@school.edu',
      name: '김담임 선생님',
      role: 'homeroom',
      grade: 1,
      class_number: 2,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  }

  // -------------------------------------------------------------
  // Cryptographic Helpers
  // -------------------------------------------------------------

  hashPin(pin, salt = 'salt_kyhs_2026') {
    return crypto.createHash('sha256').update(`${salt}:${pin}`).digest('hex');
  }

  signStudentSession(payload, expiresInSeconds = 86400) {
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    const exp = Math.floor(Date.now() / 1000) + expiresInSeconds;
    const data = Buffer.from(JSON.stringify({ ...payload, exp })).toString('base64url');
    const signature = crypto
      .createHmac('sha256', this.secretKey)
      .update(`${header}.${data}`)
      .digest('base64url');
    return `${header}.${data}.${signature}`;
  }

  verifyStudentSession(token) {
    if (!token || typeof token !== 'string') return null;
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [header, data, signature] = parts;

    const expectedSig = crypto
      .createHmac('sha256', this.secretKey)
      .update(`${header}.${data}`)
      .digest('base64url');

    if (signature !== expectedSig) return null;

    try {
      const payload = JSON.parse(Buffer.from(data, 'base64url').toString('utf8'));
      if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
        return null; // Expired
      }
      return payload;
    } catch {
      return null;
    }
  }

  generateTeacherToken(teacherId = 'd0000000-0000-0000-0000-000000000001') {
    return `sb_teacher_${teacherId}`;
  }

  verifyTeacherToken(token) {
    if (!token || !token.startsWith('sb_teacher_')) return null;
    const teacherId = token.replace('sb_teacher_', '');
    const teacher = this.teachers.get(teacherId);
    return teacher || null;
  }

  // -------------------------------------------------------------
  // Module 1: Student Auth & Session APIs
  // -------------------------------------------------------------

  studentLoginOrRegister({ grade, classNumber, studentNumber, name, pin }) {
    // 1. Boundary & Format Validations
    if (!Number.isInteger(grade) || grade < 1 || grade > 6) {
      return { status: 400, data: { success: false, error: '학년은 1에서 6 사이의 정수여야 합니다.' } };
    }
    if (!Number.isInteger(classNumber) || classNumber < 1 || classNumber > 30) {
      return { status: 400, data: { success: false, error: '반은 1에서 30 사이의 정수여야 합니다.' } };
    }
    if (!Number.isInteger(studentNumber) || studentNumber < 1 || studentNumber > 60) {
      return { status: 400, data: { success: false, error: '번호는 1에서 60 사이의 정수여야 합니다.' } };
    }
    if (typeof name !== 'string' || !name.trim()) {
      return { status: 400, data: { success: false, error: '학생 이름을 올바르게 입력해주세요.' } };
    }
    const cleanName = name.trim();
    if (cleanName.length < 1 || cleanName.length > 50) {
      return { status: 400, data: { success: false, error: '이름 길이는 1~50자 사이여야 합니다.' } };
    }
    if (typeof pin !== 'string' || !/^\d{4}$/.test(pin)) {
      return { status: 400, data: { success: false, error: '비밀번호는 숫자 4자리여야 합니다.' } };
    }

    // 2. Lookup existing student by composite key (grade, class_number, student_number)
    let existingStudent = null;
    for (const student of this.students.values()) {
      if (
        student.grade === grade &&
        student.class_number === classNumber &&
        student.student_number === studentNumber
      ) {
        existingStudent = student;
        break;
      }
    }

    const pinHash = this.hashPin(pin);

    // 3. New Registration Branch
    if (!existingStudent) {
      const studentId = crypto.randomUUID();
      const newStudent = {
        id: studentId,
        grade,
        class_number: classNumber,
        student_number: studentNumber,
        name: cleanName,
        pin_hash: pinHash,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        last_login_at: new Date().toISOString(),
      };
      this.students.set(studentId, newStudent);

      const token = this.signStudentSession({
        student_id: studentId,
        grade,
        classNumber,
        studentNumber,
        name: cleanName,
      });

      return {
        status: 200,
        headers: { 'Set-Cookie': `student_session=${token}; Path=/; HttpOnly; SameSite=Lax` },
        data: {
          success: true,
          isNew: true,
          student: {
            id: studentId,
            grade,
            classNumber,
            studentNumber,
            name: cleanName,
          },
        },
      };
    }

    // 4. Existing Student Verification Branch
    if (existingStudent.name !== cleanName) {
      return {
        status: 400,
        data: {
          success: false,
          error: '해당 학년/반/번호에 이미 등록된 다른 학생이 있습니다. 정보를 확인해주세요.',
        },
      };
    }

    if (existingStudent.pin_hash !== pinHash) {
      return {
        status: 401,
        data: {
          success: false,
          error: '비밀번호(PIN)가 일치하지 않습니다. 비밀번호를 잊으셨다면 선생님께 초기화를 요청하세요.',
        },
      };
    }

    // Login Success
    existingStudent.last_login_at = new Date().toISOString();
    existingStudent.updated_at = new Date().toISOString();

    const token = this.signStudentSession({
      student_id: existingStudent.id,
      grade: existingStudent.grade,
      classNumber: existingStudent.class_number,
      studentNumber: existingStudent.student_number,
      name: existingStudent.name,
    });

    return {
      status: 200,
      headers: { 'Set-Cookie': `student_session=${token}; Path=/; HttpOnly; SameSite=Lax` },
      data: {
        success: true,
        isNew: false,
        student: {
          id: existingStudent.id,
          grade: existingStudent.grade,
          classNumber: existingStudent.class_number,
          studentNumber: existingStudent.student_number,
          name: existingStudent.name,
        },
      },
    };
  }

  studentLogout() {
    return {
      status: 200,
      headers: { 'Set-Cookie': 'student_session=; Path=/; HttpOnly; Max-Age=0' },
      data: { success: true, message: '성공적으로 로그아웃되었습니다.' },
    };
  }

  getStudentProfile(sessionToken) {
    const session = this.verifyStudentSession(sessionToken);
    if (!session) {
      return { status: 401, data: { success: false, error: '인증 세션이 유효하지 않습니다.' } };
    }
    const student = this.students.get(session.student_id);
    if (!student) {
      return { status: 404, data: { success: false, error: '학생 정보를 찾을 수 없습니다.' } };
    }
    return {
      status: 200,
      data: {
        success: true,
        student: {
          id: student.id,
          grade: student.grade,
          classNumber: student.class_number,
          studentNumber: student.student_number,
          name: student.name,
          createdAt: student.created_at,
        },
      },
    };
  }

  // -------------------------------------------------------------
  // Module 2: 1:1 Confidential Counseling APIs
  // -------------------------------------------------------------

  submitCounselingRequest(sessionToken, payload) {
    const session = this.verifyStudentSession(sessionToken);
    if (!session) {
      return { status: 401, data: { success: false, error: '로그인이 필요한 서비스입니다.' } };
    }

    const { category, preferredDate, preferredTimeSlot, content, isUrgent } = payload || {};

    const validCategories = ['academic', 'friendship', 'career', 'emotional', 'mental_health', 'family', 'other'];
    if (!category || !validCategories.includes(category)) {
      return { status: 400, data: { success: false, error: '올바른 상담 카테고리를 선택해주세요.' } };
    }

    if (!preferredDate || typeof preferredDate !== 'string') {
      return { status: 400, data: { success: false, error: '희망 상담 일자를 입력해주세요.' } };
    }

    const validTimeSlots = ['morning', 'lunch', 'break_time', 'after_school', 'other'];
    const timeSlot = preferredTimeSlot || 'lunch';
    if (!validTimeSlots.includes(timeSlot)) {
      return { status: 400, data: { success: false, error: '올바른 상담 시간대를 선택해주세요.' } };
    }

    if (typeof content !== 'string' || !content.trim()) {
      return { status: 400, data: { success: false, error: '상담 내용을 입력해주세요.' } };
    }

    const cleanContent = content.trim();
    if (cleanContent.length > 2000) {
      return { status: 400, data: { success: false, error: '상담 내용은 최대 2000자까지 작성할 수 있습니다.' } };
    }

    const requestId = crypto.randomUUID();
    const newRequest = {
      id: requestId,
      student_id: session.student_id,
      category,
      preferred_date: preferredDate,
      preferred_time_slot: timeSlot,
      content: cleanContent,
      is_urgent: Boolean(isUrgent),
      status: 'pending',
      response_message: null,
      teacher_note: null, // Strictly internal
      assigned_teacher_id: null,
      scheduled_at: null,
      scheduled_date: null,
      scheduled_time_slot: null,
      scheduled_note: null,
      completed_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    this.counselingRequests.set(requestId, newRequest);

    return {
      status: 201,
      data: {
        success: true,
        request: {
          id: requestId,
          studentId: session.student_id,
          category,
          preferredDate,
          preferredTimeSlot: timeSlot,
          content: cleanContent,
          isUrgent: Boolean(isUrgent),
          status: 'pending',
          createdAt: newRequest.created_at,
        },
      },
    };
  }

  getMyCounselingRequests(sessionToken) {
    const session = this.verifyStudentSession(sessionToken);
    if (!session) {
      return { status: 401, data: { success: false, error: '로그인이 필요한 서비스입니다.' } };
    }

    // Strictly isolate records matching student_id and omit teacher_note
    const myRequests = [];
    for (const req of this.counselingRequests.values()) {
      if (req.student_id === session.student_id) {
        myRequests.push({
          id: req.id,
          category: req.category,
          preferredDate: req.preferred_date,
          preferredTimeSlot: req.preferred_time_slot,
          content: req.content,
          isUrgent: req.is_urgent,
          status: req.status,
          responseMessage: req.response_message,
          scheduledDate: req.scheduled_date,
          scheduledTimeSlot: req.scheduled_time_slot,
          scheduledNote: req.scheduled_note,
          completedAt: req.completed_at,
          createdAt: req.created_at,
          updatedAt: req.updated_at,
          // Note: teacher_note is strictly omitted!
        });
      }
    }

    // Sort descending by created_at
    myRequests.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    return { status: 200, data: { success: true, requests: myRequests } };
  }

  cancelCounselingRequest(sessionToken, requestId) {
    const session = this.verifyStudentSession(sessionToken);
    if (!session) {
      return { status: 401, data: { success: false, error: '로그인이 필요한 서비스입니다.' } };
    }

    const req = this.counselingRequests.get(requestId);
    if (!req || req.student_id !== session.student_id) {
      return { status: 404, data: { success: false, error: '상담 신청 내역을 찾을 수 없습니다.' } };
    }

    if (req.status !== 'pending') {
      return {
        status: 400,
        data: { success: false, error: '대기 중인 상담 신청만 취소할 수 있습니다.' },
      };
    }

    req.status = 'cancelled';
    req.updated_at = new Date().toISOString();

    return { status: 200, data: { success: true, message: '상담 신청이 취소되었습니다.' } };
  }

  // -------------------------------------------------------------
  // Module 3: Secret Suggestion Box APIs
  // -------------------------------------------------------------

  submitSuggestion(sessionToken, payload) {
    const { isAnonymous, category, title, content, studentId: spoofedStudentId } = payload || {};

    const validCategories = [
      'classroom_environment',
      'classroom_rule',
      'school_life',
      'facility',
      'study',
      'activity',
      'learning',
      'other',
    ];

    if (!category || !validCategories.includes(category)) {
      return { status: 400, data: { success: false, error: '올바른 건의 카테고리를 선택해주세요.' } };
    }

    if (typeof title !== 'string' || !title.trim()) {
      return { status: 400, data: { success: false, error: '건의 제목을 입력해주세요.' } };
    }
    const cleanTitle = title.trim();
    if (cleanTitle.length > 200) {
      return { status: 400, data: { success: false, error: '건의 제목은 최대 200자까지 가능합니다.' } };
    }

    if (typeof content !== 'string' || !content.trim()) {
      return { status: 400, data: { success: false, error: '건의 상세 내용을 입력해주세요.' } };
    }
    const cleanContent = content.trim();
    if (cleanContent.length > 2000) {
      return { status: 400, data: { success: false, error: '건의 내용은 최대 2000자까지 가능합니다.' } };
    }

    const anon = Boolean(isAnonymous);
    let boundStudentId = null;

    if (anon) {
      // TRIGGER SIMULATION: trg_enforce_suggestion_anonymity
      // Forcibly sets student_id to null regardless of what was passed
      boundStudentId = null;
    } else {
      // Identified suggestion requires valid student session
      const session = this.verifyStudentSession(sessionToken);
      if (!session) {
        return {
          status: 401,
          data: { success: false, error: '기명 건의사항 작성 시 로그인이 필요합니다.' },
        };
      }
      boundStudentId = session.student_id;
    }

    // CHECK CONSTRAINT SIMULATION: chk_suggestion_anonymity
    // ((is_anonymous = true AND student_id IS NULL) OR (is_anonymous = false AND student_id IS NOT NULL))
    if (anon && boundStudentId !== null) {
      return { status: 500, data: { success: false, error: 'CHECK CONSTRAINT VIOLATION: Anonymous suggestion must have null student_id' } };
    }
    if (!anon && boundStudentId === null) {
      return { status: 500, data: { success: false, error: 'CHECK CONSTRAINT VIOLATION: Identified suggestion must have non-null student_id' } };
    }

    const suggestionId = crypto.randomUUID();
    const newSuggestion = {
      id: suggestionId,
      is_anonymous: anon,
      student_id: boundStudentId,
      category,
      title: cleanTitle,
      content: cleanContent,
      status: 'pending',
      teacher_reply: null,
      replied_by: null,
      replied_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    this.suggestions.set(suggestionId, newSuggestion);

    return {
      status: 201,
      data: {
        success: true,
        suggestion: {
          id: suggestionId,
          isAnonymous: anon,
          category,
          title: cleanTitle,
          content: cleanContent,
          status: 'pending',
          createdAt: newSuggestion.created_at,
          // Never return student_id in anonymous response
          studentId: anon ? null : boundStudentId,
        },
      },
    };
  }

  // -------------------------------------------------------------
  // Module 5: Teacher Management Dashboard APIs
  // -------------------------------------------------------------

  teacherGetCounselingList(teacherToken, filters = {}) {
    const teacher = this.verifyTeacherToken(teacherToken);
    if (!teacher) {
      return { status: 403, data: { success: false, error: '교사 인증이 필요합니다.' } };
    }

    const results = [];
    for (const req of this.counselingRequests.values()) {
      if (filters.status && req.status !== filters.status) continue;
      if (filters.category && req.category !== filters.category) continue;
      if (filters.isUrgent !== undefined && req.is_urgent !== filters.isUrgent) continue;

      const student = this.students.get(req.student_id);
      results.push({
        id: req.id,
        category: req.category,
        preferredDate: req.preferred_date,
        preferredTimeSlot: req.preferred_time_slot,
        content: req.content,
        isUrgent: req.is_urgent,
        status: req.status,
        responseMessage: req.response_message,
        teacherNote: req.teacher_note, // Visible to teacher
        scheduledDate: req.scheduled_date,
        scheduledTimeSlot: req.scheduled_time_slot,
        scheduledNote: req.scheduled_note,
        completedAt: req.completed_at,
        createdAt: req.created_at,
        updatedAt: req.updated_at,
        student: student
          ? {
              id: student.id,
              grade: student.grade,
              classNumber: student.class_number,
              studentNumber: student.student_number,
              name: student.name,
            }
          : null,
      });
    }

    results.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return { status: 200, data: { success: true, counselingRequests: results } };
  }

  teacherUpdateCounseling(teacherToken, requestId, updatePayload) {
    const teacher = this.verifyTeacherToken(teacherToken);
    if (!teacher) {
      return { status: 403, data: { success: false, error: '교사 인증이 필요합니다.' } };
    }

    const req = this.counselingRequests.get(requestId);
    if (!req) {
      return { status: 404, data: { success: false, error: '상담 요청을 찾을 수 없습니다.' } };
    }

    const { status, scheduledDate, scheduledTimeSlot, scheduledNote, teacherNote } = updatePayload || {};

    if (status) {
      const validStatuses = ['pending', 'accepted', 'completed', 'cancelled'];
      if (!validStatuses.includes(status)) {
        return { status: 400, data: { success: false, error: '올바른 상담 상태를 지정해주세요.' } };
      }
      req.status = status;
      if (status === 'completed' && !req.completed_at) {
        req.completed_at = new Date().toISOString();
      }
    }

    if (scheduledDate !== undefined) req.scheduled_date = scheduledDate;
    if (scheduledTimeSlot !== undefined) req.scheduled_time_slot = scheduledTimeSlot;
    if (scheduledNote !== undefined) req.scheduled_note = scheduledNote;
    if (teacherNote !== undefined) req.teacher_note = teacherNote;

    req.assigned_teacher_id = teacher.id;
    req.updated_at = new Date().toISOString();

    return {
      status: 200,
      data: {
        success: true,
        request: {
          id: req.id,
          status: req.status,
          scheduledDate: req.scheduled_date,
          scheduledTimeSlot: req.scheduled_time_slot,
          scheduledNote: req.scheduled_note,
          teacherNote: req.teacher_note,
          completedAt: req.completed_at,
          updatedAt: req.updated_at,
        },
      },
    };
  }

  teacherGetSuggestions(teacherToken, filters = {}) {
    const teacher = this.verifyTeacherToken(teacherToken);
    if (!teacher) {
      return { status: 403, data: { success: false, error: '교사 인증이 필요합니다.' } };
    }

    const results = [];
    for (const sugg of this.suggestions.values()) {
      if (filters.isAnonymous !== undefined && sugg.is_anonymous !== filters.isAnonymous) continue;
      if (filters.status && sugg.status !== filters.status) continue;
      if (filters.category && sugg.category !== filters.category) continue;

      let studentObj = null;
      if (!sugg.is_anonymous && sugg.student_id) {
        const student = this.students.get(sugg.student_id);
        if (student) {
          studentObj = {
            id: student.id,
            grade: student.grade,
            classNumber: student.class_number,
            studentNumber: student.student_number,
            name: student.name,
          };
        }
      }

      results.push({
        id: sugg.id,
        isAnonymous: sugg.is_anonymous,
        category: sugg.category,
        title: sugg.title,
        content: sugg.content,
        status: sugg.status,
        teacherReply: sugg.teacher_reply,
        repliedAt: sugg.replied_at,
        createdAt: sugg.created_at,
        updatedAt: sugg.updated_at,
        // Zero-leak guarantee: if isAnonymous is true, student MUST be strictly null
        student: sugg.is_anonymous ? null : studentObj,
      });
    }

    results.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return { status: 200, data: { success: true, suggestions: results } };
  }

  teacherUpdateSuggestion(teacherToken, suggestionId, { status, teacherReply }) {
    const teacher = this.verifyTeacherToken(teacherToken);
    if (!teacher) {
      return { status: 403, data: { success: false, error: '교사 인증이 필요합니다.' } };
    }

    const sugg = this.suggestions.get(suggestionId);
    if (!sugg) {
      return { status: 404, data: { success: false, error: '건의사항을 찾을 수 없습니다.' } };
    }

    if (status) {
      const validStatuses = ['pending', 'received', 'in_progress', 'reviewed', 'resolved', 'dismissed'];
      if (!validStatuses.includes(status)) {
        return { status: 400, data: { success: false, error: '올바른 건의 상태를 지정해주세요.' } };
      }
      sugg.status = status;
    }

    if (teacherReply !== undefined) {
      sugg.teacher_reply = teacherReply;
      sugg.replied_by = teacher.id;
      sugg.replied_at = new Date().toISOString();
    }

    sugg.updated_at = new Date().toISOString();

    return {
      status: 200,
      data: {
        success: true,
        suggestion: {
          id: sugg.id,
          status: sugg.status,
          teacherReply: sugg.teacher_reply,
          repliedAt: sugg.replied_at,
          updatedAt: sugg.updated_at,
        },
      },
    };
  }

  teacherResetStudentPin(teacherToken, { studentId, newPin = '0000' }) {
    const teacher = this.verifyTeacherToken(teacherToken);
    if (!teacher) {
      return { status: 403, data: { success: false, error: '교사 인증이 필요합니다.' } };
    }

    if (!/^\d{4}$/.test(newPin)) {
      return { status: 400, data: { success: false, error: '초기화할 PIN은 숫자 4자리여야 합니다.' } };
    }

    const student = this.students.get(studentId);
    if (!student) {
      return { status: 404, data: { success: false, error: '해당 학생을 찾을 수 없습니다.' } };
    }

    student.pin_hash = this.hashPin(newPin);
    student.updated_at = new Date().toISOString();

    return {
      status: 200,
      data: {
        success: true,
        message: `${student.grade}학년 ${student.class_number}반 ${student.student_number}번 ${student.name} 학생의 PIN이 성공적으로 초기화되었습니다.`,
        newPin,
      },
    };
  }
}
