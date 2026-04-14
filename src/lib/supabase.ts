// Lightweight Supabase REST client (subset).
// This exists because `TeacherPage.tsx` imports `@/lib/supabase`.
//
// Supported by this client:
// - `supabase.from(table).select(selectClause).eq(column, value)`
// - `supabase.from(table).insert(payload)`
// - `supabase.storage.from(bucket).upload(path, file)`
// - `supabase.storage.from(bucket).getPublicUrl(path)` (sync)

type SupabaseError = { message: string };

function getEnv(): { url?: string; anonKey?: string } {
  // Vite exposes env via `import.meta.env`. Keep this resilient for type-checking.
  const env = (import.meta as any).env as Record<string, string | undefined> | undefined;
  return {
    url: env?.VITE_SUPABASE_URL,
    anonKey: env?.VITE_SUPABASE_ANON_KEY,
  };
}

function encodeStoragePath(key: string) {
  // Preserve path separators while encoding each segment.
  return key
    .split("/")
    .map((seg) => encodeURIComponent(seg))
    .join("/");
}

function makeAuthHeaders(anonKey: string) {
  return {
    apikey: anonKey,
    Accept: "application/json",
  };
}

function restBaseUrl(url: string) {
  return `${url.replace(/\/+$/, "")}/rest/v1`;
}

function storageBaseUrl(url: string) {
  return `${url.replace(/\/+$/, "")}/storage/v1`;
}

class SelectQueryBuilder<T = any> implements PromiseLike<{ data: T[] | null; error: SupabaseError | null }> {
  private table: string;
  private selectClause: string;
  private filters: Array<{ column: string; op: "eq"; value: unknown }> = [];

  constructor(table: string, selectClause: string) {
    this.table = table;
    this.selectClause = selectClause;
  }

  eq(column: string, value: unknown) {
    this.filters.push({ column, op: "eq", value });
    return this;
  }

  private async execute(): Promise<{ data: T[] | null; error: SupabaseError | null }> {
    const { url, anonKey } = getEnv();
    if (!url || !anonKey) {
      return {
        data: null,
        error: {
          message: "Missing Supabase env vars. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.",
        },
      };
    }

    const u = new URL(`${restBaseUrl(url)}/${this.table}`);
    u.searchParams.set("select", this.selectClause);
    for (const f of this.filters) {
      // PostgREST expects `column=eq.<value>`
      u.searchParams.set(f.column, `${f.op}.${String(f.value)}`);
    }

    try {
      const res = await fetch(u.toString(), {
        method: "GET",
        headers: {
          ...makeAuthHeaders(anonKey),
        },
      });

      const text = await res.text();
      const json = text ? safeJsonParse(text) : null;

      if (!res.ok) {
        return {
          data: null,
          error: { message: json?.message ?? res.statusText ?? "Supabase request failed" },
        };
      }

      return { data: json as T[] | null, error: null };
    } catch (e: any) {
      return { data: null, error: { message: e?.message ? String(e.message) : String(e) } };
    }
  }

  then<TResult1 = { data: T[] | null; error: SupabaseError | null }, TResult2 = never>(
    onfulfilled?:
      | ((value: { data: T[] | null; error: SupabaseError | null }) => TResult1 | PromiseLike<TResult1>)
      | undefined
    , onrejected?:
      | ((reason: any) => TResult2 | PromiseLike<TResult2>)
      | undefined
  ): Promise<TResult1 | TResult2> {
    return this.execute().then(onfulfilled as any, onrejected as any);
  }
}

function safeJsonParse(text: string) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

class TableClient {
  private table: string;
  constructor(table: string) {
    this.table = table;
  }

  select(selectClause: string) {
    return new SelectQueryBuilder(this.table, selectClause);
  }

  async insert(payload: Record<string, unknown>): Promise<{ data: any[] | null; error: SupabaseError | null }> {
    const { url, anonKey } = getEnv();
    if (!url || !anonKey) {
      return {
        data: null,
        error: {
          message: "Missing Supabase env vars. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.",
        },
      };
    }

    try {
      const res = await fetch(`${restBaseUrl(url)}/${this.table}`, {
        method: "POST",
        headers: {
          ...makeAuthHeaders(anonKey),
          "Content-Type": "application/json",
          Prefer: "return=representation",
        },
        body: JSON.stringify(payload),
      });

      const text = await res.text();
      const json = text ? safeJsonParse(text) : null;

      if (!res.ok) {
        return { data: null, error: { message: json?.message ?? res.statusText ?? "Supabase insert failed" } };
      }

      // PostgREST returns an array for inserts when Prefer:return=representation.
      return { data: json as any[] | null, error: null };
    } catch (e: any) {
      return { data: null, error: { message: e?.message ? String(e.message) : String(e) } };
    }
  }
}

function createStorageClient(bucket: string) {
  return {
    async upload(path: string, file: File): Promise<{ data: any; error: SupabaseError | null }> {
      const { url, anonKey } = getEnv();
      if (!url || !anonKey) {
        return {
          data: null,
          error: {
            message: "Missing Supabase env vars. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.",
          },
        };
      }

      try {
        const endpoint = `${storageBaseUrl(url)}/object/${bucket}/${encodeStoragePath(path)}`;

        const res = await fetch(endpoint, {
          method: "POST",
          headers: {
            ...makeAuthHeaders(anonKey),
            "Content-Type": file.type || "application/octet-stream",
          },
          body: file,
        });

        if (!res.ok) {
          const text = await res.text();
          const json = text ? safeJsonParse(text) : null;
          return { data: null, error: { message: json?.message ?? res.statusText ?? "Upload failed" } };
        }

        // Supabase storage returns metadata; TeacherPage only checks `error`.
        const text = await res.text();
        const json = text ? safeJsonParse(text) : null;
        return { data: json, error: null };
      } catch (e: any) {
        return { data: null, error: { message: e?.message ? String(e.message) : String(e) } };
      }
    },

    getPublicUrl(path: string): { data: { publicUrl: string }; error: SupabaseError | null } {
      const { url } = getEnv();
      if (!url) {
        return {
          data: { publicUrl: "" },
          error: { message: "Missing `VITE_SUPABASE_URL`." },
        };
      }
      const publicUrl = `${storageBaseUrl(url)}/object/public/${bucket}/${encodeStoragePath(path)}`;
      return { data: { publicUrl }, error: null };
    },
  };
}

export const supabase = {
  from: (table: string) => new TableClient(table),
  storage: {
    from: (bucket: string) => createStorageClient(bucket),
  },
};

