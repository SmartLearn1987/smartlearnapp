import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { getSession, logout as authLogout, initAuth, clearSession, type User } from "@/lib/auth";
import { recordTodayActivity } from "@/lib/streak";

interface AuthContextValue {
  user: User | null;
  isAdmin: boolean;
  isTeacher: boolean;
  isLoading: boolean;
  logout: () => void;
  refresh: () => void;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  isAdmin: false,
  isTeacher: false,
  isLoading: true,
  logout: () => {},
  refresh: () => {},
});

const INACTIVITY_LIMIT = 60 * 60 * 1000; // 60 minutes
const ACTIVITY_KEY = "hvui-last-activity";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = () => {
    setUser(getSession());
  };

  // Cross-tab session synchronization using BroadcastChannel
  useEffect(() => {
    const channel = new BroadcastChannel("hvui-auth-sync");
    let initTimeout: any = null;

    channel.onmessage = (event) => {
      const { type, payload } = event.data;
      
      if (type === "REQUEST_SESSION") {
        const session = getSession();
        if (session) {
          channel.postMessage({ type: "PROVIDE_SESSION", payload: session });
        }
      } 
      else if (type === "PROVIDE_SESSION") {
        if (initTimeout) clearTimeout(initTimeout);
        sessionStorage.setItem("hvui-session-v1", JSON.stringify(payload));
        setUser(payload);
        setIsLoading(false);
      }
      else if (type === "LOGOUT") {
        setUser(null);
        clearSession();
        // Redirect to login if not already there
        if (window.location.pathname !== "/login" && window.location.pathname !== "/register") {
          window.location.href = "/login";
        }
      }
    };

    // Robust fallback using localStorage storage event
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "hvui-logout-signal" && e.newValue) {
        setUser(null);
        clearSession();
        if (window.location.pathname !== "/login" && window.location.pathname !== "/register") {
          window.location.href = "/login";
        }
      }
    };
    window.addEventListener("storage", handleStorageChange);

    initAuth().then(() => {
      const session = getSession();
      if (session) {
        setUser(session);
        setIsLoading(false);
      } else {
        // No session in this tab, ask others
        channel.postMessage({ type: "REQUEST_SESSION" });
        // Fallback: if no tab responds within 500ms, finalize loading state
        initTimeout = setTimeout(() => {
          setIsLoading(false);
        }, 500);
      }
    });

    return () => {
      if (initTimeout) clearTimeout(initTimeout);
      channel.close();
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

  // Auto logout on inactivity
  useEffect(() => {
    if (!user) return; // Only track when logged in

    let throttleTimeout: any = null;

    const updateActivity = () => {
      if (throttleTimeout) return;
      sessionStorage.setItem(ACTIVITY_KEY, Date.now().toString());
      recordTodayActivity(); // Track streak/daily activity (still uses localStorage for persistence)
      throttleTimeout = setTimeout(() => {
        throttleTimeout = null;
      }, 5000); // Throttle writes to sessionStorage
    };

    const checkInactivity = setInterval(() => {
      const lastActivity = sessionStorage.getItem(ACTIVITY_KEY);
      if (lastActivity) {
        if (Date.now() - parseInt(lastActivity, 10) > INACTIVITY_LIMIT) {
          logout();
        }
      }
    }, 60000); // Check every minute

    updateActivity(); // Init

    const events = ["mousemove", "keydown", "click", "scroll", "touchstart"];
    events.forEach(e => window.addEventListener(e, updateActivity, { passive: true }));

    return () => {
      clearInterval(checkInactivity);
      if (throttleTimeout) clearTimeout(throttleTimeout);
      events.forEach(e => window.removeEventListener(e, updateActivity));
    };
  }, [user]);

  const logout = () => {
    // 1. Notify other tabs FIRST (BroadcastChannel)
    const channel = new BroadcastChannel("hvui-auth-sync");
    channel.postMessage({ type: "LOGOUT" });
    channel.close();

    // 2. Provide a signal for localStorage (robust cross-tab sync)
    // We use a timestamp to ensure the value changes every time
    localStorage.setItem("hvui-logout-signal", Date.now().toString());
    
    // 3. Perform local logout
    authLogout(); // This clears sessionStorage and redirects to /login
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, isAdmin: user?.role === "admin", isTeacher: user?.role === "teacher", isLoading, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
