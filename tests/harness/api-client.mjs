// tests/harness/api-client.mjs
// Unified test client supporting both Live HTTP E2E mode and in-process Virtual Contract Engine mode.

import { MockAppEngine } from './mock-engine.mjs';

export class TestApiClient {
  constructor(baseUrl = process.env.TEST_BASE_URL || null, engine = null) {
    this.baseUrl = baseUrl ? baseUrl.replace(/\/$/, '') : null;
    this.engine = engine || new MockAppEngine();
    this.cookies = new Map(); // Cookie jar: name -> value
    this.teacherAuthToken = null;
  }

  setCookie(name, value) {
    if (value == null || value === '') {
      this.cookies.delete(name);
    } else {
      this.cookies.set(name, value);
    }
  }

  getCookie(name) {
    return this.cookies.get(name) || null;
  }

  clearCookies() {
    this.cookies.clear();
  }

  setTeacherAuth(token) {
    this.teacherAuthToken = token;
  }

  clearTeacherAuth() {
    this.teacherAuthToken = null;
  }

  // -------------------------------------------------------------
  // Student Auth API Calls
  // -------------------------------------------------------------

  async studentLogin(payload) {
    if (this.baseUrl) {
      return this._httpPost('/api/auth/student/login', payload);
    }
    const res = this.engine.studentLoginOrRegister(payload);
    if (res.headers && res.headers['Set-Cookie']) {
      this._parseSetCookie(res.headers['Set-Cookie']);
    }
    return res;
  }

  async studentLogout() {
    if (this.baseUrl) {
      return this._httpPost('/api/auth/student/logout', {});
    }
    const res = this.engine.studentLogout();
    if (res.headers && res.headers['Set-Cookie']) {
      this._parseSetCookie(res.headers['Set-Cookie']);
    }
    return res;
  }

  async getStudentProfile() {
    const sessionToken = this.cookies.get('student_session');
    if (this.baseUrl) {
      return this._httpGet('/api/auth/student/me');
    }
    return this.engine.getStudentProfile(sessionToken);
  }

  // -------------------------------------------------------------
  // Counseling API Calls
  // -------------------------------------------------------------

  async submitCounseling(payload) {
    const sessionToken = this.cookies.get('student_session');
    if (this.baseUrl) {
      return this._httpPost('/api/counseling', payload);
    }
    return this.engine.submitCounselingRequest(sessionToken, payload);
  }

  async getMyCounseling() {
    const sessionToken = this.cookies.get('student_session');
    if (this.baseUrl) {
      return this._httpGet('/api/counseling/my');
    }
    return this.engine.getMyCounselingRequests(sessionToken);
  }

  async cancelCounseling(requestId) {
    const sessionToken = this.cookies.get('student_session');
    if (this.baseUrl) {
      return this._httpPost(`/api/counseling/${requestId}/cancel`, {});
    }
    return this.engine.cancelCounselingRequest(sessionToken, requestId);
  }

  // -------------------------------------------------------------
  // Suggestions API Calls
  // -------------------------------------------------------------

  async submitSuggestion(payload) {
    const sessionToken = this.cookies.get('student_session');
    if (this.baseUrl) {
      return this._httpPost('/api/suggestions', payload);
    }
    return this.engine.submitSuggestion(sessionToken, payload);
  }

  // -------------------------------------------------------------
  // Teacher Admin API Calls
  // -------------------------------------------------------------

  async teacherGetCounseling(filters = {}) {
    if (this.baseUrl) {
      const q = new URLSearchParams(filters).toString();
      return this._httpGet(`/api/teacher/counseling${q ? '?' + q : ''}`);
    }
    return this.engine.teacherGetCounselingList(this.teacherAuthToken, filters);
  }

  async teacherUpdateCounseling(requestId, payload) {
    if (this.baseUrl) {
      return this._httpPatch(`/api/teacher/counseling/${requestId}`, payload);
    }
    return this.engine.teacherUpdateCounseling(this.teacherAuthToken, requestId, payload);
  }

  async teacherGetSuggestions(filters = {}) {
    if (this.baseUrl) {
      const q = new URLSearchParams(filters).toString();
      return this._httpGet(`/api/teacher/suggestions${q ? '?' + q : ''}`);
    }
    return this.engine.teacherGetSuggestions(this.teacherAuthToken, filters);
  }

  async teacherUpdateSuggestion(suggestionId, payload) {
    if (this.baseUrl) {
      return this._httpPatch(`/api/teacher/suggestions/${suggestionId}`, payload);
    }
    return this.engine.teacherUpdateSuggestion(this.teacherAuthToken, suggestionId, payload);
  }

  async teacherResetStudentPin(payload) {
    if (this.baseUrl) {
      return this._httpPost('/api/teacher/students/reset-pin', payload);
    }
    return this.engine.teacherResetStudentPin(this.teacherAuthToken, payload);
  }

  // -------------------------------------------------------------
  // Internal Helpers
  // -------------------------------------------------------------

  _parseSetCookie(setCookieStr) {
    if (!setCookieStr) return;
    const parts = setCookieStr.split(';');
    const [nameVal] = parts;
    const eqIdx = nameVal.indexOf('=');
    if (eqIdx !== -1) {
      const name = nameVal.substring(0, eqIdx).trim();
      const val = nameVal.substring(eqIdx + 1).trim();
      if (setCookieStr.includes('Max-Age=0') || val === '') {
        this.cookies.delete(name);
      } else {
        this.cookies.set(name, val);
      }
    }
  }

  _buildCookieHeader() {
    const list = [];
    for (const [k, v] of this.cookies.entries()) {
      list.push(`${k}=${v}`);
    }
    return list.join('; ');
  }

  async _httpGet(path) {
    const headers = {};
    const cookieHeader = this._buildCookieHeader();
    if (cookieHeader) headers['Cookie'] = cookieHeader;
    if (this.teacherAuthToken) headers['Authorization'] = `Bearer ${this.teacherAuthToken}`;

    const res = await fetch(`${this.baseUrl}${path}`, { method: 'GET', headers });
    this._captureCookiesFromResponse(res);
    const data = await res.json().catch(() => ({}));
    return { status: res.status, data };
  }

  async _httpPost(path, body) {
    const headers = { 'Content-Type': 'application/json' };
    const cookieHeader = this._buildCookieHeader();
    if (cookieHeader) headers['Cookie'] = cookieHeader;
    if (this.teacherAuthToken) headers['Authorization'] = `Bearer ${this.teacherAuthToken}`;

    const res = await fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
    this._captureCookiesFromResponse(res);
    const data = await res.json().catch(() => ({}));
    return { status: res.status, data };
  }

  async _httpPatch(path, body) {
    const headers = { 'Content-Type': 'application/json' };
    const cookieHeader = this._buildCookieHeader();
    if (cookieHeader) headers['Cookie'] = cookieHeader;
    if (this.teacherAuthToken) headers['Authorization'] = `Bearer ${this.teacherAuthToken}`;

    const res = await fetch(`${this.baseUrl}${path}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(body),
    });
    this._captureCookiesFromResponse(res);
    const data = await res.json().catch(() => ({}));
    return { status: res.status, data };
  }

  _captureCookiesFromResponse(res) {
    const setCookie = res.headers.get('set-cookie');
    if (setCookie) {
      this._parseSetCookie(setCookie);
    }
  }
}
