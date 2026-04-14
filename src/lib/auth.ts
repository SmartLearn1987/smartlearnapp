import { apiFetch } from "./api";

// ── Types ─────────────────────────────────────────────────────
export type Role = "admin" | "user" | "teacher";

export interface User {
  id: string;
  username: string;
  displayName: string;
  email: string;
  role: Role;
  educationLevel?: string;
  avatarUrl?: string;
  isActive?: boolean;
  plan?: string;
  planStartDate?: string;
  planEndDate?: string;
  createdAt: string;
  sessionToken?: string;
  refreshToken?: string;
  accessTokenExpiresAt?: string;
}

// ── Session ───────────────────────────────────────────────────
const SESSION_KEY = "hvui-session-v1";

export function getSession(): User | null {
  const raw = sessionStorage.getItem(SESSION_KEY);
  return raw ? JSON.parse(raw) : null;
}

export function setSession(user: User) {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(user));
}

export function transformUser(data: any): User {
  if (!data) return data;
  return {
    ...data,
    displayName: data.displayName || data.display_name,
    educationLevel: data.educationLevel || data.education_level,
    avatarUrl: data.avatarUrl || data.avatar_url,
    isActive: data.isActive !== undefined ? data.isActive : data.is_active,
    planStartDate: data.planStartDate || data.plan_start_date,
    planEndDate: data.planEndDate || data.plan_end_date,
    createdAt: data.createdAt || data.created_at,
    sessionToken: data.sessionToken || data.session_token || data.sessionToken,
    refreshToken: data.refreshToken || data.refresh_token || data.refreshToken,
    accessTokenExpiresAt: data.accessTokenExpiresAt || data.access_token_expires_at || data.accessTokenExpiresAt,
  };
}

export function clearSession() {
  sessionStorage.removeItem(SESSION_KEY);
}

function translateError(message: string): string {
  if (!message) return "";
  if (message.includes("Username or email already exists")) {
    return "Tên đăng nhập hoặc địa chỉ email đã tồn tại";
  }
  if (message.includes("Invalid username or password")) {
    return "Tên đăng nhập hoặc Mật khẩu không đúng";
  }
  return message;
}

// ── Public API ────────────────────────────────────────────────
export async function initAuth() {
  // No seeding needed on frontend anymore
}

export async function login(
  username: string,
  password: string
): Promise<{ ok: true; user: User } | { ok: false; message: string }> {
  try {
    const userRaw = await apiFetch<any>("/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    const user = transformUser(userRaw);
    setSession(user);
    return { ok: true, user };
  } catch (err: any) {
    return { ok: false, message: translateError(err.message) || "Đăng nhập thất bại" };
  }
}

export async function register(
  username: string,
  email: string,
  password: string,
  displayName?: string,
  educationLevel?: string
): Promise<{ ok: true; user: User } | { ok: false; message: string }> {
  try {
    const userRaw = await apiFetch<any>("/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        username, 
        email, 
        password, 
        display_name: displayName,
        education_level: educationLevel 
      }),
    });
    const user = transformUser(userRaw);
    return { ok: true, user };
  } catch (err: any) {
    return { ok: false, message: translateError(err.message) || "Đăng ký thất bại" };
  }
}

export function logout() {
  clearSession();
  window.location.href = "/login";
}

export async function forgotPassword(email: string): Promise<{ ok: boolean; message: string }> {
  try {
    const res = await apiFetch<any>("/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    return { ok: true, message: res.message };
  } catch (err: any) {
    return { ok: false, message: err.message || "Gửi yêu cầu thất bại" };
  }
}


// Admin: list all users
export async function listUsers(): Promise<User[]> {
  try {
    const users = await apiFetch<any[]>("/users");
    return users.map(transformUser);
  } catch (err) {
    console.error("ListUsers Error:", err);
    return [];
  }
}

// Admin: create user (can set role)
export async function createUser(
  username: string,
  displayName: string,
  password: string,
  role: Role,
  email?: string,
  educationLevel?: string,
  plan?: string,
  planStartDate?: string,
  planEndDate?: string
): Promise<{ ok: true; user: User } | { ok: false; message: string }> {
  try {
    const userRaw = await apiFetch<any>("/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, display_name: displayName, password, role, email, education_level: educationLevel, plan, plan_start_date: planStartDate, plan_end_date: planEndDate }),
    });
    const user = transformUser(userRaw);
    return { ok: true, user };
  } catch (err: any) {
    return { ok: false, message: translateError(err.message) || "Không thể tạo tài khoản" };
  }
}

// Admin: delete user
export async function deleteUser(userId: string): Promise<{ ok: boolean; message?: string }> {
  try {
    await apiFetch(`/users/${userId}`, { method: "DELETE" });
    return { ok: true };
  } catch (err: any) {
    return { ok: false, message: err.message || "Không thể xóa tài khoản" };
  }
}

// Admin: change password
export async function changePassword(
  userId: string,
  newPassword: string
): Promise<{ ok: boolean; message?: string }> {
  try {
    await apiFetch(`/users/${userId}/password`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: newPassword }),
    });
    return { ok: true };
  } catch (err: any) {
    return { ok: false, message: err.message || "Không thể đổi mật khẩu" };
  }
}

// Admin: update user info
export async function updateUser(
  userId: string,
  displayName: string,
  role: Role,
  email?: string,
  educationLevel?: string,
  avatarUrl?: string,
  isActive?: boolean,
  plan?: string,
  planStartDate?: string,
  planEndDate?: string
): Promise<{ ok: true; user: User } | { ok: false; message: string }> {
  try {
    const userRaw = await apiFetch<any>(`/users/${userId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ display_name: displayName, role, email, education_level: educationLevel, avatar_url: avatarUrl, is_active: isActive, plan, plan_start_date: planStartDate, plan_end_date: planEndDate }),
    });
    const user = transformUser(userRaw);
    return { ok: true, user };
  } catch (err: any) {
    return { ok: false, message: translateError(err.message) || "Không thể cập nhật tài khoản" };
  }
}

