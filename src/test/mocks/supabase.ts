/**
 * supabase.ts
 *
 * Comprehensive, reusable Supabase client mock for PLG2 test suites.
 * Supports:
 * - Fluent query builder (select, insert, update, delete, upsert, eq, in, gte, order, limit, single, maybeSingle)
 * - Auth methods (getSession, getUser, signInWithPassword, signUp, signOut, onAuthStateChange)
 * - Storage bucket mock (upload, download, getPublicUrl)
 * - Edge functions invoke mock
 * - Realtime channel subscription mock
 * - RPC mock
 */
import { vi } from "vitest";
import type { Session, User } from "@supabase/supabase-js";

export interface MockQueryState {
  data: unknown;
  error: unknown | null;
  count?: number | null;
}

export interface MockSupabaseOptions {
  authSession?: Session | null;
  authUser?: User | null;
  tableData?: Record<string, unknown[]>;
  rpcResponses?: Record<string, unknown>;
  functionResponses?: Record<string, unknown>;
}

export class MockQueryBuilder {
  private tableName: string;
  private currentData: unknown = null;
  private currentError: unknown | null = null;
  private currentCount: number | null = null;
  private filterChain: Array<{ method: string; args: unknown[] }> = [];

  constructor(tableName: string, defaultData: unknown = null, defaultError: unknown | null = null) {
    this.tableName = tableName;
    this.currentData = defaultData;
    this.currentError = defaultError;
  }

  setData(data: unknown) {
    this.currentData = data;
    return this;
  }

  setError(error: unknown | null) {
    this.currentError = error;
    return this;
  }

  setCount(count: number | null) {
    this.currentCount = count;
    return this;
  }

  select = vi
    .fn()
    .mockImplementation((_columns?: string, options?: { count?: string; head?: boolean }) => {
      if (options?.count === "exact" && this.currentCount === null) {
        if (Array.isArray(this.currentData)) {
          this.currentCount = this.currentData.length;
        }
      }
      return this;
    });

  insert = vi.fn().mockImplementation((_rows: unknown) => this);
  update = vi.fn().mockImplementation((_values: unknown) => this);
  delete = vi.fn().mockImplementation(() => this);
  upsert = vi.fn().mockImplementation((_values: unknown) => this);

  eq = vi.fn().mockImplementation((col: string, val: unknown) => {
    this.filterChain.push({ method: "eq", args: [col, val] });
    return this;
  });

  neq = vi.fn().mockImplementation((col: string, val: unknown) => {
    this.filterChain.push({ method: "neq", args: [col, val] });
    return this;
  });

  in = vi.fn().mockImplementation((col: string, vals: unknown[]) => {
    this.filterChain.push({ method: "in", args: [col, vals] });
    return this;
  });

  not = vi.fn().mockImplementation((col: string, op: string, val: unknown) => {
    this.filterChain.push({ method: "not", args: [col, op, val] });
    return this;
  });

  gte = vi.fn().mockImplementation((col: string, val: unknown) => {
    this.filterChain.push({ method: "gte", args: [col, val] });
    return this;
  });

  lte = vi.fn().mockImplementation((col: string, val: unknown) => {
    this.filterChain.push({ method: "lte", args: [col, val] });
    return this;
  });

  gt = vi.fn().mockImplementation((col: string, val: unknown) => {
    this.filterChain.push({ method: "gt", args: [col, val] });
    return this;
  });

  lt = vi.fn().mockImplementation((col: string, val: unknown) => {
    this.filterChain.push({ method: "lt", args: [col, val] });
    return this;
  });

  order = vi.fn().mockImplementation((_column: string, _options?: { ascending?: boolean }) => this);
  limit = vi.fn().mockImplementation((_count: number) => this);

  single = vi.fn().mockImplementation(async () => {
    let result = this.currentData;
    if (Array.isArray(result)) {
      result = result.length > 0 ? result[0] : null;
    }
    return {
      data: result,
      error: this.currentError,
      count: this.currentCount,
    };
  });

  maybeSingle = vi.fn().mockImplementation(async () => {
    let result = this.currentData;
    if (Array.isArray(result)) {
      result = result.length > 0 ? result[0] : null;
    }
    return {
      data: result,
      error: this.currentError,
      count: this.currentCount,
    };
  });

  then = (onfulfilled?: (value: unknown) => unknown, onrejected?: (reason: unknown) => unknown) => {
    const promise = Promise.resolve({
      data: this.currentData,
      error: this.currentError,
      count: this.currentCount,
    });
    return promise.then(onfulfilled, onrejected);
  };
}

export function createMockSupabaseClient(options: MockSupabaseOptions = {}) {
  const tableData = options.tableData || {};
  const queryBuilders = new Map<string, MockQueryBuilder>();

  const getQueryBuilder = (table: string) => {
    if (!queryBuilders.has(table)) {
      const initial = tableData[table] ?? [];
      const builder = new MockQueryBuilder(table, initial, null);
      queryBuilders.set(table, builder);
    }
    return queryBuilders.get(table)!;
  };

  const channelMock = {
    on: vi.fn().mockReturnThis(),
    subscribe: vi.fn().mockReturnThis(),
    unsubscribe: vi.fn().mockResolvedValue(undefined),
  };

  const authStateCallbacks: Array<(event: string, session: Session | null) => void> = [];

  const auth = {
    getSession: vi.fn().mockResolvedValue({
      data: { session: options.authSession ?? null },
      error: null,
    }),
    getUser: vi.fn().mockResolvedValue({
      data: { user: options.authUser ?? options.authSession?.user ?? null },
      error: null,
    }),
    signInWithPassword: vi.fn().mockResolvedValue({
      data: { user: options.authUser ?? null, session: options.authSession ?? null },
      error: null,
    }),
    signUp: vi.fn().mockResolvedValue({
      data: { user: options.authUser ?? null, session: options.authSession ?? null },
      error: null,
    }),
    signOut: vi.fn().mockResolvedValue({ error: null }),
    onAuthStateChange: vi.fn().mockImplementation((cb) => {
      authStateCallbacks.push(cb);
      return {
        data: {
          subscription: {
            unsubscribe: vi.fn().mockImplementation(() => {
              const idx = authStateCallbacks.indexOf(cb);
              if (idx !== -1) authStateCallbacks.splice(idx, 1);
            }),
          },
        },
      };
    }),
    getClaims: vi.fn().mockResolvedValue({
      data: { claims: options.authUser ? { sub: options.authUser.id } : null },
      error: null,
    }),
  };

  const storage = {
    from: vi.fn().mockReturnValue({
      upload: vi.fn().mockResolvedValue({ data: { path: "test.jpg" }, error: null }),
      download: vi.fn().mockResolvedValue({ data: new Blob(["mock"]), error: null }),
      getPublicUrl: vi
        .fn()
        .mockReturnValue({ data: { publicUrl: "https://mock.storage/test.jpg" } }),
      list: vi.fn().mockResolvedValue({ data: [], error: null }),
      remove: vi.fn().mockResolvedValue({ data: [], error: null }),
    }),
  };

  const functions = {
    invoke: vi.fn().mockImplementation(async (name: string, args?: unknown) => {
      const response = options.functionResponses?.[name] ?? { success: true };
      return { data: response, error: null };
    }),
  };

  const rpc = vi.fn().mockImplementation(async (fnName: string, args?: unknown) => {
    const response = options.rpcResponses?.[fnName] ?? { allowed: true };
    return { data: response, error: null };
  });

  const client = {
    from: vi.fn().mockImplementation((table: string) => getQueryBuilder(table)),
    auth,
    storage,
    functions,
    rpc,
    channel: vi.fn().mockReturnValue(channelMock),
    removeChannel: vi.fn().mockResolvedValue(undefined),
    _getQueryBuilder: getQueryBuilder,
    _triggerAuthStateChange: (event: string, session: Session | null) => {
      for (const cb of authStateCallbacks) {
        cb(event, session);
      }
    },
  };

  return client;
}

export const mockSupabase = createMockSupabaseClient();
