// src/lib/supabase/admin.ts
import { createClient as createSupabaseClient, SupabaseClient } from '@supabase/supabase-js';
import crypto from 'node:crypto';

// In-memory fallback stores for offline local dev & test environments
const inMemoryStore = {
  students: new Map<string, any>(),
  counseling_requests: new Map<string, any>(),
  suggestions: new Map<string, any>(),
  teachers: new Map<string, any>(),
};

// Seed default teacher in in-memory store
const defaultTeacherId = 'd0000000-0000-0000-0000-000000000001';
inMemoryStore.teachers.set(defaultTeacherId, {
  id: defaultTeacherId,
  email: 'teacher@school.edu',
  name: '김담임 선생님',
  role: 'homeroom',
  grade: 1,
  class_number: 2,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
});

function isLiveSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return false;
  if (url.includes('placeholder') || key.includes('placeholder')) return false;
  if (url === 'http://127.0.0.1:54321' || url === 'http://localhost:54321') {
    // If explicitly running in local dev without live Docker, use in-memory fallback
    return process.env.FORCE_LIVE_SUPABASE === 'true';
  }
  return true;
}

class MockQueryBuilder {
  private table: string;
  private filters: Array<{ field: string; op: 'eq' | 'neq'; value: any }> = [];
  private orderConfig?: { field: string; ascending: boolean };
  private selectFields?: string;
  private action: 'select' | 'insert' | 'update' | 'delete' = 'select';
  private actionPayload: any = null;

  constructor(table: string) {
    this.table = table;
  }

  select(fields?: string) {
    if (this.action !== 'insert') {
      this.action = 'select';
    }
    this.selectFields = fields;
    return this;
  }

  insert(values: any) {
    this.action = 'insert';
    this.actionPayload = values;
    return this;
  }

  update(values: any) {
    this.action = 'update';
    this.actionPayload = values;
    return this;
  }

  delete() {
    this.action = 'delete';
    return this;
  }

  eq(field: string, value: any) {
    this.filters.push({ field, op: 'eq', value });
    return this;
  }

  neq(field: string, value: any) {
    this.filters.push({ field, op: 'neq', value });
    return this;
  }

  order(field: string, options?: { ascending?: boolean }) {
    this.orderConfig = {
      field,
      ascending: options?.ascending !== false,
    };
    return this;
  }

  private filterRecord(record: any): boolean {
    for (const filter of this.filters) {
      if (filter.op === 'eq' && record[filter.field] !== filter.value) {
        return false;
      }
      if (filter.op === 'neq' && record[filter.field] === filter.value) {
        return false;
      }
    }
    return true;
  }

  private projectFields(record: any): any {
    if (!this.selectFields || this.selectFields === '*') {
      return { ...record };
    }
    const fields = this.selectFields.split(',').map((f) => f.trim());
    const projected: Record<string, any> = {};
    for (const f of fields) {
      if (f in record) {
        projected[f] = record[f];
      }
    }
    return projected;
  }

  private execute() {
    const tableMap = (inMemoryStore as any)[this.table];
    if (!tableMap) {
      return { data: null, error: { message: `Table ${this.table} not found in fallback store` } };
    }

    if (this.action === 'insert') {
      const recordsToInsert = Array.isArray(this.actionPayload)
        ? this.actionPayload
        : [this.actionPayload];
      const inserted: any[] = [];

      for (const rawRecord of recordsToInsert) {
        const id = rawRecord.id || crypto.randomUUID();
        const nowIso = new Date().toISOString();
        const record = {
          ...rawRecord,
          id,
          created_at: rawRecord.created_at || nowIso,
          updated_at: rawRecord.updated_at || nowIso,
        };

        // Schema unique constraint check for students (grade, class_number, student_number)
        if (this.table === 'students') {
          for (const existing of tableMap.values()) {
            if (
              existing.grade === record.grade &&
              existing.class_number === record.class_number &&
              existing.student_number === record.student_number &&
              existing.id !== record.id
            ) {
              return {
                data: null,
                error: {
                  code: '23505',
                  message: 'duplicate key value violates unique constraint "uq_student_roster"',
                },
              };
            }
          }
        }

        // Schema zero-leak anonymity trigger enforcement for suggestions
        if (this.table === 'suggestions') {
          if (record.is_anonymous) {
            record.student_id = null;
          }
        }

        tableMap.set(id, record);
        inserted.push(this.projectFields(record));
      }

      const resultData = Array.isArray(this.actionPayload) ? inserted : inserted[0];
      return { data: resultData, error: null };
    }

    if (this.action === 'update') {
      const matching: any[] = [];
      const nowIso = new Date().toISOString();

      for (const [id, record] of tableMap.entries()) {
        if (this.filterRecord(record)) {
          const updatedRecord = {
            ...record,
            ...this.actionPayload,
            updated_at: nowIso,
          };
          tableMap.set(id, updatedRecord);
          matching.push(this.projectFields(updatedRecord));
        }
      }

      return { data: matching, error: null };
    }

    if (this.action === 'delete') {
      const deleted: any[] = [];
      for (const [id, record] of tableMap.entries()) {
        if (this.filterRecord(record)) {
          tableMap.delete(id);
          deleted.push(record);
        }
      }
      return { data: deleted, error: null };
    }

    // Default SELECT
    let matching: any[] = [];
    for (const record of tableMap.values()) {
      if (this.filterRecord(record)) {
        matching.push(this.projectFields(record));
      }
    }

    if (this.orderConfig) {
      const { field, ascending } = this.orderConfig;
      matching.sort((a, b) => {
        if (a[field] < b[field]) return ascending ? -1 : 1;
        if (a[field] > b[field]) return ascending ? 1 : -1;
        return 0;
      });
    }

    return { data: matching, error: null };
  }

  async single() {
    const res = this.execute();
    if (res.error) return res;
    if (Array.isArray(res.data)) {
      if (res.data.length === 0) {
        return { data: null, error: { message: 'Row not found' } };
      }
      return { data: res.data[0], error: null };
    }
    return res;
  }

  async maybeSingle() {
    const res = this.execute();
    if (res.error) return res;
    if (Array.isArray(res.data)) {
      return { data: res.data.length > 0 ? res.data[0] : null, error: null };
    }
    return res;
  }

  then(resolve: (val: any) => void, reject?: (err: any) => void) {
    try {
      resolve(this.execute());
    } catch (err) {
      if (reject) reject(err);
      else throw err;
    }
  }
}

class ResilientAdminClient {
  private liveClient: SupabaseClient | null = null;

  constructor() {
    if (isLiveSupabaseConfigured()) {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
      this.liveClient = createSupabaseClient(supabaseUrl, serviceRoleKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      });
    }
  }

  from(table: string): any {
    if (this.liveClient) {
      return this.liveClient.from(table);
    }
    return new MockQueryBuilder(table);
  }
}

let adminClientInstance: ResilientAdminClient | null = null;

export function getAdminClient(): ResilientAdminClient {
  if (!adminClientInstance) {
    adminClientInstance = new ResilientAdminClient();
  }
  return adminClientInstance;
}

export const supabaseAdmin = getAdminClient();
