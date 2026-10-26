// src/middleware.ts
import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { jwtVerify } from 'jose';

const DEFAULT_STUDENT_SECRET = 'dev-student-session-secret-min-32-chars-long-for-hmac-sha256';

/**
 * Pure Web-Crypto verification safe for Next.js Edge Runtime without next/headers dependency.
 */
async function verifyStudentEdgeSession(token: string | undefined | null): Promise<boolean> {
  if (!token) return false;
  try {
    const secret = process.env.STUDENT_SESSION_SECRET || DEFAULT_STUDENT_SECRET;
    const key = new TextEncoder().encode(secret);
    const { payload } = await jwtVerify(token, key, { algorithms: ['HS256'] });
    return Boolean(payload && payload.student_id);
  } catch {
    return false;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. BYPASS API routes so that Route Handlers return semantic JSON status codes (401 / 403)
  if (pathname.startsWith('/api')) {
    return NextResponse.next();
  }

  // 2. Setup response object for cookie pass-through
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  // 3. Initialize Supabase SSR client for session verification and cookie refresh
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key';

  const supabase = createServerClient(supabaseUrl, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({
          request: {
            headers: request.headers,
          },
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  // 4. Resolve Teacher Authentication State
  let isTeacherAuthenticated = false;
  try {
    // Check dev / mock token cookie or authorization header
    const devTeacherCookie = request.cookies.get('sb_teacher_token')?.value;
    const authHeader = request.headers.get('authorization');
    if (devTeacherCookie || (authHeader && authHeader.includes('sb_teacher_'))) {
      isTeacherAuthenticated = true;
    } else {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (!error && user) {
        isTeacherAuthenticated = true;
      }
    }
  } catch {
    isTeacherAuthenticated = false;
  }

  // 5. Resolve Student Authentication State
  const studentToken = request.cookies.get('student_session')?.value;
  const isStudentAuthenticated = await verifyStudentEdgeSession(studentToken);

  // 6. Route Guard: Teacher Portal (`/teacher/*`)
  if (pathname.startsWith('/teacher')) {
    const isTeacherLoginPage = pathname === '/teacher/login';

    if (isTeacherLoginPage) {
      // If already authenticated as teacher, redirect to dashboard
      if (isTeacherAuthenticated) {
        return NextResponse.redirect(new URL('/teacher/dashboard', request.url));
      }
      return response;
    }

    // Protect all other teacher routes
    if (!isTeacherAuthenticated) {
      const loginUrl = new URL('/teacher/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }

    return response;
  }

  // 7. Route Guard: Student Portal (`/student/*`)
  if (pathname.startsWith('/student')) {
    const isStudentLoginPage = pathname === '/student/login';

    if (isStudentLoginPage) {
      // If already authenticated as student, redirect to my status tracker
      if (isStudentAuthenticated) {
        return NextResponse.redirect(new URL('/student/my-status', request.url));
      }
      return response;
    }

    // Protect all other student routes
    if (!isStudentAuthenticated) {
      const loginUrl = new URL('/student/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }

    return response;
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
