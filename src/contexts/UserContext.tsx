import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Session, User } from "@supabase/supabase-js";

interface Profile {
  id: string;
  username: string | null;
  nome_exibicao: string | null;
  data_nascimento: string | null;
  genero: string | null;
  cidade: string | null;
  estado: string | null;
  pais: string | null;
  faixa_etaria: string | null;
  profissao: string | null;
  classe_social: string | null;
  device_hardware: string | null;
  role: string | null;
  telefone: string | null;
  codigo_indicacao: string | null;
  nivel_embaixador: string | null;
}

interface UserContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  hasVoted: boolean;
  isLoading: boolean;
  isAuthenticated: boolean;
  isProfileComplete: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateProfile: (data: Partial<Profile>) => Promise<void>;
}

const UserContext = createContext<UserContextType | null>(null);

function calcFaixaEtaria(dataNascimento: string): string {
  const birth = new Date(dataNascimento);
  const age = Math.floor((Date.now() - birth.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
  if (age < 18) return "menor-18";
  if (age < 25) return "18-24";
  if (age < 35) return "25-34";
  if (age < 45) return "35-44";
  if (age < 55) return "45-54";
  if (age < 65) return "55-64";
  return "65+";
}

export function UserProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [hasVoted, setHasVoted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();
    
    if (data) {
      setProfile(data as Profile);
    } else {
      setProfile(null);
    }
  };

  const checkVoted = async (userId: string) => {
    const { count } = await supabase
      .from("votos")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId);
    setHasVoted((count ?? 0) > 0);
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id);
      await checkVoted(user.id);
    }
  };

  // Registra a indicação se houver hc_ref_code no localStorage (1x por usuário)
  const tryRegisterReferral = async (uid: string) => {
    try {
      const code = localStorage.getItem("hc_ref_code");
      const done = localStorage.getItem(`hc_ref_done_${uid}`);
      if (!code || done) return;
      const { data, error } = await supabase.rpc("register_referral_from_code", {
        p_codigo: code,
        p_indicado_id: uid,
      });
      if (!error) {
        localStorage.setItem(`hc_ref_done_${uid}`, "1");
        if (data === true) localStorage.removeItem("hc_ref_code");
      }
    } catch (e) {
      console.warn("[REFERRAL] não foi possível registrar:", e);
    }
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Use setTimeout to avoid Supabase deadlock
          setTimeout(async () => {
            await fetchProfile(session.user.id);
            await checkVoted(session.user.id);
            await tryRegisterReferral(session.user.id);
            setIsLoading(false);
          }, 0);
        } else {
          setProfile(null);
          setHasVoted(false);
          setIsLoading(false);
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id).then(() => 
          checkVoted(session.user.id).then(() => setIsLoading(false))
        );
      } else {
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setHasVoted(false);
  };

  const updateProfile = async (data: Partial<Profile>) => {
    if (!user) return;

    // Calculate faixa_etaria if birthdate provided
    const updates: any = { ...data };
    if (data.data_nascimento) {
      updates.faixa_etaria = calcFaixaEtaria(data.data_nascimento);
    }

    // Try upsert (insert if not exists, update if exists)
    const { error } = await supabase
      .from("profiles")
      .upsert({ id: user.id, ...updates }, { onConflict: "id" });
    
    if (!error) {
      await fetchProfile(user.id);
    }
  };

  const isProfileComplete = !!(
    profile?.nome_exibicao &&
    profile?.data_nascimento &&
    profile?.genero &&
    profile?.cidade &&
    profile?.estado
  );

  const isAuthenticated = !!user;

  return (
    <UserContext.Provider value={{
      user, session, profile, hasVoted, isLoading, isAuthenticated,
      isProfileComplete, signOut, refreshProfile, updateProfile,
    }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error("useUser must be inside UserProvider");
  return ctx;
}
