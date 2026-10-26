// src/lib/auth/session.ts
import { SignJWT, jwtVerify } from 'jose';
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import type { StudentSessionPayload } from '@/types/models';

export interface ExtendedStudentSessionPayload extends StudentSessionPayload {
  classNumber?: number;
  studentNumber?: number;
}

const COOKIE_NAME = 'student_session';
const SESSION_MAX_AGE = 86400; // 24 hours in seconds
const DEFAULT_SECRET = 'dev-student-session-secret-min-32-chars-long-for-hmac-sha256';

function getSecretKey(): Uint8Array {
  const secret = process.env.STUDENT_SESSION_SECRET || DEFAULT_SECRET;
  return new TextEncoder().encode(secret);
}

/**
 * Creates and signs a stateless HMAC-SHA256 JWT for student authentication.
 */
export async function createStudentSession(
  payload: Omit<StudentSessionPayload, 'iat' | 'exp'>
): Promise<string> {
  const secretKey = getSecretKey();

  const classNumber = payload.class_number ?? (payload as any).classNumber;
  const studentNumber = payload.student_number ?? (payload as any).studentNumber;

  const fullPayload = {
    student_id: payload.student_id,
    grade: payload.grade,
    class_number: classNumber,
    student_number: studentNumber,
    classNumber,
    studentNumber,
    name: payload.name,
    role: 'student' as const,
  };

  return await new SignJWT(fullPayload as Record<string, unknown>)
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(secretKey);
}

/**
 * Cryptographically verifies a student session JWT.
 * Returns decoded payload if valid, or null if expired, tampered, or malformed.
 */
export async function verifyStudentSession(
  token: string | null | undefined
): Promise<ExtendedStudentSessionPayload | null> {
  if (!token || typeof token !== 'string') return null;

  try {
    const secretKey = getSecretKey();
    const { payload } = await jwtVerify(token, secretKey, {
      algorithms: ['HS256'],
    });

    const studentId = payload.student_id as string;
    const grade = Number(payload.grade);
    const classNumber = Number(payload.class_number ?? payload.classNumber);
    const studentNumber = Number(payload.student_number ?? payload.studentNumber);
    const name = payload.name as string;

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
    // Catches JWTExpired, JWSSignatureVerificationFailed, JWSInvalid, etc.
    return null;
  }
}

/**
 * Extracts and verifies student session from:
 * 1. NextRequest or standard Request (via Cookie header or request.cookies)
 * 2. Next.js cookies() store from 'next/headers' if request is omitted.
 */
export async function getStudentSession(
  request?: Request | NextRequest
): Promise<ExtendedStudentSessionPayload | null> {
  let token: string | undefined | null = null;

  if (request) {
    if ('cookies' in request && typeof (request as NextRequest).cookies?.get === 'function') {
      token = (request as NextRequest).cookies.get(COOKIE_NAME)?.value;
    } else {
      const cookieHeader = request.headers.get('cookie') || '';
      const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${COOKIE_NAME}=([^;]*)`));
      token = match ? decodeURIComponent(match[1]) : null;
    }
  } else {
    try {
      const cookieStore = cookies();
      token = cookieStore.get(COOKIE_NAME)?.value;
    } catch {
      token = null;
    }
  }

  return await verifyStudentSession(token);
}

/**
 * Attaches the student_session cookie to a NextResponse.
 */
export function setStudentSessionCookie(response: NextResponse, token: string): void {
  response.cookies.set({
    name: COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_MAX_AGE,
    path: '/',
  });
}

/**
 * Expire and clear the student_session cookie on logout.
 */
export function clearStudentSessionCookie(response: NextResponse): void {
  response.cookies.set({
    name: COOKIE_NAME,
    value: '',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  });
}
