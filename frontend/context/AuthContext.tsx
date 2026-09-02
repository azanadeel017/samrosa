"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from "react";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";
import type { User, Session } from "@supabase/supabase-js";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  storeId: string | null;
  businessName: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signup: (params: {
    email: string;
    password: string;
    businessName: string;
    fullName?: string;
    role?: string;
  }) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  setDemoSession: (storeId?: string, storeName?: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const DEMO_STORE_ID = "28f86d0d-9f36-4b5c-b97c-353a493cd3e9";
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [storeId, setStoreId] = useState<string | null>(null);
  const [businessName, setBusinessName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const router = useRouter();
  const pathname = usePathname();

  // Resolve store metadata from backend for a user/email
  const resolveStore = useCallback(async (userId: string, email: string, fallbackName?: string) => {
    try {
      // 1. Try finding store by user ID or email from backend
      const res = await fetch(`${API_BASE}/api/v1/auth/store/${userId}`).catch(() => null);
      if (res && res.ok) {
        const json = await res.json();
        if (json.success && json.data?.storeId) {
          setStoreId(json.data.storeId);
          setBusinessName(json.data.businessName || fallbackName || "Store");
          localStorage.setItem("samrosa_store_id", json.data.storeId);
          return json.data.storeId;
        }
      }

      // 2. Try email lookup
      const emailRes = await fetch(`${API_BASE}/api/v1/auth/store/${encodeURIComponent(email)}`).catch(() => null);
      if (emailRes && emailRes.ok) {
        const json = await emailRes.json();
        if (json.success && json.data?.storeId) {
          setStoreId(json.data.storeId);
          setBusinessName(json.data.businessName || fallbackName || "Store");
          localStorage.setItem("samrosa_store_id", json.data.storeId);
          return json.data.storeId;
        }
      }

      // 3. Fallback to registering store with user ID in donors table
      const regRes = await fetch(`${API_BASE}/api/v1/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: userId,
          email,
          businessName: fallbackName || email.split("@")[0],
        }),
      }).catch(() => null);

      if (regRes && regRes.ok) {
        const json = await regRes.json();
        if (json.success && json.data?.storeId) {
          setStoreId(json.data.storeId);
          setBusinessName(json.data.businessName);
          localStorage.setItem("samrosa_store_id", json.data.storeId);
          return json.data.storeId;
        }
      }
    } catch (err) {
      console.error("[AuthContext] Error resolving store:", err);
    }

    // Default to user ID as storeId
    setStoreId(userId);
    localStorage.setItem("samrosa_store_id", userId);
    return userId;
  }, []);

  useEffect(() => {
    let mounted = true;

    // Load initial session
    async function initSession() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!mounted) return;

        if (session?.user) {
          setSession(session);
          setUser(session.user);
          const metaName =
            session.user.user_metadata?.businessName ||
            session.user.user_metadata?.business_name ||
            session.user.user_metadata?.full_name;

          await resolveStore(session.user.id, session.user.email || "", metaName);
        } else {
          // Check local cached tenant session
          const cachedStore = localStorage.getItem("samrosa_store_id");
          const cachedName = localStorage.getItem("samrosa_business_name");
          const cachedUser = localStorage.getItem("samrosa_auth_user");
          if (cachedStore && cachedUser) {
            try {
              const parsedUser = JSON.parse(cachedUser);
              setUser(parsedUser);
              setStoreId(cachedStore);
              setBusinessName(cachedName || "My Store");
            } catch {
              // ignore parse errors
            }
          }
        }
      } catch (err) {
        console.error("[AuthContext] Session init error:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    initSession();

    // Listen to Supabase auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (!mounted) return;
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          const metaName =
            session.user.user_metadata?.businessName ||
            session.user.user_metadata?.business_name ||
            session.user.user_metadata?.full_name;

          await resolveStore(session.user.id, session.user.email || "", metaName);
        } else if (!localStorage.getItem("samrosa_auth_user")) {
          setStoreId(null);
          setBusinessName(null);
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [resolveStore]);

  // Login handler
  const login = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        console.warn("[Auth] Supabase auth error, checking backend store:", error.message);
        const storeRes = await fetch(`${API_BASE}/api/v1/auth/store/${encodeURIComponent(email.trim())}`).catch(() => null);
        if (storeRes && storeRes.ok) {
          const json = await storeRes.json();
          if (json.success && json.data?.storeId) {
            const mockUser: any = {
              id: json.data.storeId,
              email: json.data.email,
              user_metadata: { businessName: json.data.businessName },
            };
            setUser(mockUser);
            setStoreId(json.data.storeId);
            setBusinessName(json.data.businessName);
            localStorage.setItem("samrosa_store_id", json.data.storeId);
            localStorage.setItem("samrosa_business_name", json.data.businessName);
            localStorage.setItem("samrosa_auth_user", JSON.stringify(mockUser));
            return { success: true };
          }
        }
        return { success: false, error: error.message };
      }

      if (data.user) {
        setUser(data.user);
        setSession(data.session);
        const metaName =
          data.user.user_metadata?.businessName ||
          data.user.user_metadata?.business_name ||
          data.user.user_metadata?.full_name;
        await resolveStore(data.user.id, data.user.email || "", metaName);
        return { success: true };
      }

      return { success: false, error: "Login failed" };
    } catch (err: any) {
      console.error("[Auth] Login exception:", err);
      return { success: false, error: err?.message || "An unexpected error occurred." };
    }
  };

  // Signup handler
  const signup = async ({
    email,
    password,
    businessName,
    fullName,
    role = "donor",
  }: {
    email: string;
    password: string;
    businessName: string;
    fullName?: string;
    role?: string;
  }) => {
    const cleanEmail = email.trim().toLowerCase();
    const cleanBusiness = (businessName || fullName || "My Store").trim();

    try {
      let createdUserId = "";
      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          data: {
            businessName: cleanBusiness,
            business_name: cleanBusiness,
            fullName: fullName || cleanBusiness,
            role,
          },
        },
      });

      if (!error && data.user) {
        createdUserId = data.user.id;
        setUser(data.user);
        setSession(data.session);
      }

      // Always persist store registration in backend database
      const regRes = await fetch(`${API_BASE}/api/v1/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: createdUserId || undefined,
          email: cleanEmail,
          businessName: cleanBusiness,
          fullName: fullName || cleanBusiness,
          role,
        }),
      }).catch(() => null);

      if (regRes && regRes.ok) {
        const json = await regRes.json();
        if (json.success && json.data?.storeId) {
          const sid = json.data.storeId;
          const sname = json.data.businessName;
          setStoreId(sid);
          setBusinessName(sname);
          localStorage.setItem("samrosa_store_id", sid);
          localStorage.setItem("samrosa_business_name", sname);

          const fallbackUser: any = data?.user || {
            id: sid,
            email: cleanEmail,
            user_metadata: { businessName: sname, role },
          };
          setUser(fallbackUser);
          localStorage.setItem("samrosa_auth_user", JSON.stringify(fallbackUser));
          return { success: true };
        }
      }

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (err: any) {
      console.error("[Auth] Signup exception:", err);
      return { success: false, error: err?.message || "Failed to create account." };
    }
  };

  // Logout handler
  const logout = async () => {
    try {
      await supabase.auth.signOut().catch(() => {});
    } finally {
      setUser(null);
      setSession(null);
      setStoreId(null);
      setBusinessName(null);
      localStorage.removeItem("samrosa_store_id");
      localStorage.removeItem("samrosa_business_name");
      localStorage.removeItem("samrosa_auth_user");
      router.push("/login");
    }
  };

  // Helper to use demo session if desired
  const setDemoSession = (demoId = DEMO_STORE_ID, demoName = "Samrosa Demo Supermarket") => {
    const mockUser: any = {
      id: demoId,
      email: "store@samrosa.demo",
      user_metadata: { businessName: demoName },
    };
    setUser(mockUser);
    setStoreId(demoId);
    setBusinessName(demoName);
    localStorage.setItem("samrosa_store_id", demoId);
    localStorage.setItem("samrosa_business_name", demoName);
    localStorage.setItem("samrosa_auth_user", JSON.stringify(mockUser));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        storeId,
        businessName,
        loading,
        login,
        signup,
        logout,
        setDemoSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

/**
 * Hook for pages requiring authentication.
 * Automatically redirects unauthenticated users to /login.
 */
export function useRequireAuth() {
  const auth = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!auth.loading && (!auth.user || !auth.storeId)) {
      router.replace("/login");
    }
  }, [auth.loading, auth.user, auth.storeId, router]);

  return auth;
}
