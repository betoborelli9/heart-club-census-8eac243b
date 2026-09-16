/**
 * [CAMINHO]: src/components/AccessTracker.tsx
 * [MÓDULO]: Registro de acesso ao Heart Club (site + app Android/TWA).
 *
 * Grava 1 evento por página visitada, por visitante, por dia (evita
 * lotar o banco a cada re-render, mas ainda mostra quais páginas cada
 * torcedor já abriu). Não exige login — visitante anônimo também conta.
 */
import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/contexts/UserContext";
import { useViewedClub } from "@/contexts/ViewedClubContext";

const VISITOR_ID_KEY = "hc_visitor_id";

function getVisitorId(): string {
  let id = localStorage.getItem(VISITOR_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(VISITOR_ID_KEY, id);
  }
  return id;
}

function alreadyLoggedToday(path: string): boolean {
  const today = new Date().toISOString().slice(0, 10);
  const key = `hc_logged_${today}`;
  const raw = localStorage.getItem(key);
  const paths: string[] = raw ? JSON.parse(raw) : [];
  if (paths.includes(path)) return true;
  paths.push(path);
  localStorage.setItem(key, JSON.stringify(paths));
  return false;
}

export default function AccessTracker() {
  const { user } = useUser();
  const { heartClubName, viewedClubName, ready } = useViewedClub();
  const location = useLocation();

  useEffect(() => {
    if (!ready) return;
    if (alreadyLoggedToday(location.pathname)) return;

    const isTwa = document.referrer.startsWith("android-app://");
    supabase.from("access_log").insert({
      visitor_id: getVisitorId(),
      user_id: user?.id || null,
      club_viewed: viewedClubName || heartClubName || null,
      platform: isTwa ? "android_twa" : "web",
      path: location.pathname,
    });
  }, [ready, user, viewedClubName, heartClubName, location.pathname]);

  return null;
}
