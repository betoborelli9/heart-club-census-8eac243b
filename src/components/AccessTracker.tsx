/**
 * [CAMINHO]: src/components/AccessTracker.tsx
 * [MÓDULO]: Registro de acesso ao Heart Club (site + app Android/TWA).
 *
 * Grava 1 evento por sessão de navegador (não a cada troca de página),
 * sem exigir login — pra sabermos quantas pessoas realmente abrem o
 * Heart Club, mesmo quem só olha e não interage com nada.
 */
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/contexts/UserContext";
import { useViewedClub } from "@/contexts/ViewedClubContext";

const VISITOR_ID_KEY = "hc_visitor_id";
const SESSION_LOGGED_KEY = "hc_access_logged";

function getVisitorId(): string {
  let id = localStorage.getItem(VISITOR_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(VISITOR_ID_KEY, id);
  }
  return id;
}

export default function AccessTracker() {
  const { user } = useUser();
  const { heartClubName, viewedClubName, ready } = useViewedClub();

  useEffect(() => {
    if (!ready) return;
    if (sessionStorage.getItem(SESSION_LOGGED_KEY)) return;
    sessionStorage.setItem(SESSION_LOGGED_KEY, "1");

    const isTwa = document.referrer.startsWith("android-app://");
    supabase.from("access_log").insert({
      visitor_id: getVisitorId(),
      user_id: user?.id || null,
      club_viewed: viewedClubName || heartClubName || null,
      platform: isTwa ? "android_twa" : "web",
      path: window.location.pathname,
    }).then(({ error }) => {
      if (error) sessionStorage.removeItem(SESSION_LOGGED_KEY);
    });
  }, [ready, user, viewedClubName, heartClubName]);

  return null;
}
