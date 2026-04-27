const getApiBaseUrl = () => {
  if (typeof window !== "undefined") {
    // Luôn sử dụng đường dẫn tương đối /api để tận dụng cơ chế Proxy 
    // của Vite (Development) hoặc Nginx/Railway (Production).
    return "/api";
  }

  // Fallback cho môi trường Node.js (ví dụ: SSR nếu có) hoặc các trường hợp đặc biệt
  const envUrl = (import.meta as any).env?.VITE_API_BASE_URL;
  if (envUrl) {
    return envUrl;
  }

  return "http://localhost:4000/api";
};

export const API_BASE_URL = getApiBaseUrl();

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const getSession = () => {
    const raw = sessionStorage.getItem("hvui-session-v1");
    return raw ? JSON.parse(raw) : null;
  };
  
  const setSession = (user: any) => {
    sessionStorage.setItem("hvui-session-v1", JSON.stringify(user));
  };

  const session = getSession();
  
  const headers = new Headers(init?.headers);
  if (session?.id) {
    headers.set("X-User-Id", session.id);
  }
  if (session?.sessionToken) {
    headers.set("X-Session-Token", session.sessionToken);
  }

  const apiKey = (import.meta as any).env?.VITE_API_KEY;
  if (apiKey) {
    headers.set("x-api-key", apiKey);
  } else if (import.meta.env.MODE === "production") {
    console.warn("[API] Warning: VITE_API_KEY is missing from production bundle. This will likely cause 403 errors if the server enforces it.");
  }

  // Tự động thêm Content-Type: application/json nếu có body và body không phải là FormData
  if (init?.body && !headers.has("Content-Type") && !(init.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  let res = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers,
  });

  if (!res.ok) {
    if (res.status === 401 && path !== "/login" && path !== "/register" && path !== "/refresh-token") {
      const clone = res.clone();
      const body = await clone.json().catch(() => ({}));
      
      if (body.error === "TOKEN_EXPIRED") {
        const currentSession = getSession();
        if (currentSession?.refreshToken) {
          try {
            const refreshRes = await fetch(`${API_BASE_URL}/refresh-token`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ userId: currentSession.id, refreshToken: currentSession.refreshToken })
            });

            if (refreshRes.ok) {
              const tokens = await refreshRes.json();
              const updatedSession = { 
                ...currentSession, 
                sessionToken: tokens.sessionToken, 
                refreshToken: tokens.refreshToken, 
                accessTokenExpiresAt: tokens.accessTokenExpiresAt 
              };
              setSession(updatedSession);

              // Retry original request
              const retryHeaders = new Headers(init?.headers);
              retryHeaders.set("X-User-Id", updatedSession.id);
              retryHeaders.set("X-Session-Token", updatedSession.sessionToken);
              if (apiKey) {
                retryHeaders.set("x-api-key", apiKey);
              }
              if (init?.body && !retryHeaders.has("Content-Type") && !(init.body instanceof FormData)) {
                retryHeaders.set("Content-Type", "application/json");
              }

              const retryRes = await fetch(`${API_BASE_URL}${path}`, { ...init, headers: retryHeaders });
              if (retryRes.ok) {
                if (retryRes.status === 204) return undefined as T;
                return await retryRes.json();
              }
            }
          } catch (err) {
            console.error("Token refresh error:", err);
          }
        }
      }

      sessionStorage.removeItem("hvui-session-v1");
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
    }

    let msg = `Request failed: ${res.status}`;
    try {
      const data = await res.json();
      if (data?.error) {
        msg = data.error;
        if (data.details) msg += ` (${data.details})`;
      }
    } catch {
      // ignore json parsing error
    }
    throw new Error(msg);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}


