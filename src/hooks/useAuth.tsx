// @ts-nocheck
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  profileCompleted: boolean | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName: string, extra?: { phone?: string; cpf?: string }) => Promise<void>;
  signOut: () => Promise<void>;
  refreshRoles: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [profileCompleted, setProfileCompleted] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  const checkRoles = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId);
      
      if (error) {
        console.error("Error checking roles:", error);
        setIsAdmin(false);
        setIsSuperAdmin(false);
      } else {
        const roles = (data || []).map((r: any) => r.role);
        setIsAdmin(roles.includes("admin") || roles.includes("super_admin"));
        setIsSuperAdmin(roles.includes("super_admin"));
      }
    } catch (err) {
      console.error("checkRoles failed:", err);
      setIsAdmin(false);
      setIsSuperAdmin(false);
    }
  };

  const checkProfileCompleted = async (userId: string) => {
    try {
      const { data } = await supabase
        .from("profiles")
        .select("profile_completed")
        .eq("id", userId)
        .single();
      setProfileCompleted(data?.profile_completed ?? false);
    } catch {
      setProfileCompleted(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    let initialSessionResolved = false;

    // Set up listener FIRST but only allow it to set loading=false 
    // after getSession has resolved (prevents race condition on OAuth redirect)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, newSession) => {
        if (!mounted) return;
        setSession(newSession);
        setUser(newSession?.user ?? null);
        
        if (newSession?.user) {
          setTimeout(async () => {
            if (!mounted) return;
            await Promise.all([
              checkRoles(newSession.user.id),
              checkProfileCompleted(newSession.user.id),
            ]);
            if (initialSessionResolved) setLoading(false);
          }, 0);
        } else {
          setIsAdmin(false);
          setIsSuperAdmin(false);
          setProfileCompleted(null);
          // Only set loading false if initial session already resolved
          // This prevents flashing landing page during OAuth callback hydration
          if (initialSessionResolved) setLoading(false);
        }
      }
    );

    // getSession is the source of truth for the initial load
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!mounted) return;
      initialSessionResolved = true;
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        await Promise.all([
          checkRoles(session.user.id),
          checkProfileCompleted(session.user.id),
        ]);
      }
      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const signUp = async (email: string, password: string, fullName: string, extra?: { phone?: string; cpf?: string }) => {
    const { error, data } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: window.location.origin,
      },
    });
    if (error) throw error;

    // If phone/cpf provided, update profile immediately
    if (data?.user?.id && (extra?.phone || extra?.cpf)) {
      const updates: Record<string, any> = {};
      if (extra.phone) updates.phone = extra.phone.replace(/\D/g, "");
      if (extra.cpf) updates.cpf = extra.cpf.replace(/\D/g, "");
      updates.profile_completed = true;
      await supabase.from("profiles").update(updates).eq("id", data.user.id);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const refreshRoles = async () => {
    if (user?.id) {
      await Promise.all([
        checkRoles(user.id),
        checkProfileCompleted(user.id),
      ]);
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, isAdmin, isSuperAdmin, profileCompleted, loading, signIn, signUp, signOut, refreshRoles }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
