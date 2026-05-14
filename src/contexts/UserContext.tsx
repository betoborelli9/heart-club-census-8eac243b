import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from "react";
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
  cep: string | null;
  bairro: string | null;
  latitude: number | null;
  longitude: number | null;
  address_confirmed: boolean | null;
}

interface UserContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  hasVoted: boolean;
  isLoading: boolean;
  isAuthReady: boolean;
  isAuthenticated: boolean;
  isProfileComplete: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateProfile: (data: Partial<Profile>) => Promise<void>;
}

type ProfileUpdate = Partial<Profile> & { faixa_etaria?: string };

const UserContext = createContext<UserContextType | null>(null);
const AUTH_DATA_TIMEOUT_MS = 3000;
const AUTH_CALLBACK_TIMEOUT_MS = 10000;

const hasAuthCallbackParams = () => {
  const search = new URLSearchParams(window.location.search);
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  return search.has("code") || hash.has("access_token") || hash.has("refresh_token") || hash.has("token_hash");
};

const withAuthTimeout = async <T,>(promise: Promise<T>, fallback: T): Promise<T> => {
  let timeoutId: number | undefined;
  const timeout = new Promise<T>((resolve) => {
    timeoutId = window.setTimeout(() => resolve(fallback), AUTH_DATA_TIMEOUT_MS);
  });

  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timeoutId) window.clearTimeout(timeoutId);
  }
};

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
  const [isAuthReady, setIsAuthReady] = useState(false);
  const userDataRequestRef = useRef(0);

  const fetchProfile = async (userId: string): Promise<Profile | null> => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    return data ? (data as Profile) : null;
  };

  const checkVoted = async (userId: string): Promise<boolean> => {
    const { count } = await supabase
      .from("votos")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId);

    return (count ?? 0) > 0;
  };

  const refreshProfile = async () => {
    if (user) {
      const [profileData, voted] = await Promise.all([
        withAuthTimeout(fetchProfile(user.id), profile),
        withAuthTimeout(checkVoted(user.id), hasVoted),
      ]);
      setProfile(profileData);
      setHasVoted(voted);
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
    let cancelled = false;
    let authFallback: number | undefined;

    const resetAnonymousState = () => {
      setProfile(null);
      setHasVoted(false);
      setIsLoading(false);
    };

    const loadUserData = (userId: string) => {
      const requestId = ++userDataRequestRef.current;
      setIsLoading(true);

      void Promise.all([
        withAuthTimeout(fetchProfile(userId), null),
        withAuthTimeout(checkVoted(userId), false),
        tryRegisterReferral(userId),
      ]).then(([profileData, voted]) => {
        if (!cancelled && requestId === userDataRequestRef.current) {
          setProfile(profileData);
          setHasVoted(voted);
        }
      }).catch((error) => {
        console.warn("[AUTH] Falha ao carregar dados do usuário:", error);
        if (!cancelled && requestId === userDataRequestRef.current) {
          setProfile(null);
          setHasVoted(false);
        }
      }).finally(() => {
        if (!cancelled && requestId === userDataRequestRef.current) {
          setIsLoading(false);
        }
      });
    };

    const applySession = (nextSession: Session | null, source: "initial" | "event") => {
      if (cancelled) return;

      if (authFallback) window.clearTimeout(authFallback);
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      setIsAuthReady(true);

      if (nextSession?.user) {
        // Supabase recomenda não chamar outras APIs dentro do callback de auth.
        // Adiar evita deadlocks e mantém o login respondendo rápido.
        window.setTimeout(() => {
          if (!cancelled) loadUserData(nextSession.user.id);
        }, source === "event" ? 0 : 1);
      } else {
        userDataRequestRef.current += 1;
        resetAnonymousState();
      }
    };

    authFallback = window.setTimeout(() => {
      if (!cancelled) {
        setIsAuthReady(true);
        setIsLoading(false);
      }
    }, hasAuthCallbackParams() ? AUTH_CALLBACK_TIMEOUT_MS : AUTH_DATA_TIMEOUT_MS);

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        applySession(session, "event");
      }
    );

    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        applySession(session, "initial");
      })
      .catch((error) => {
        if (cancelled) return;
        console.warn("[AUTH] Sessão Supabase indisponível:", error);
        if (authFallback) window.clearTimeout(authFallback);
        setIsAuthReady(true);
        resetAnonymousState();
      });

    return () => {
      cancelled = true;
      if (authFallback) window.clearTimeout(authFallback);
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    userDataRequestRef.current += 1;
    await supabase.auth.signOut();
    setProfile(null);
    setHasVoted(false);
  };

  const updateProfile = async (data: Partial<Profile>) => {
    if (!user) return;

    // Calculate faixa_etaria if birthdate provided
    const updates: ProfileUpdate = { ...data };
    if (data.data_nascimento) {
      updates.faixa_etaria = calcFaixaEtaria(data.data_nascimento);
    }

    // Try upsert (insert if not exists, update if exists)
    const { error } = await supabase
      .from("profiles")
      .upsert({ id: user.id, ...updates }, { onConflict: "id" });
    
    if (!error) {
      setProfile(await withAuthTimeout(fetchProfile(user.id), profile));
    }
  };

  // Perfil é considerado completo quando o usuário preencheu os campos
  // que o ProfileSetup realmente coleta (nome, nascimento e gênero).
  // Cidade/estado/bairro são capturados depois pelo AddressModal e não
  // devem causar loop no /profile-setup.
  const isProfileComplete = !!(
    profile?.nome_exibicao &&
    profile?.data_nascimento &&
    profile?.genero
  );

  const isAuthenticated = !!user;

  return (
    <UserContext.Provider value={{
      user, session, profile, hasVoted, isLoading, isAuthReady, isAuthenticated,
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
