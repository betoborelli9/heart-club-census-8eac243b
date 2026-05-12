/**
 * 📁 src/pages/Convite.tsx
 * 🎟️ Redirecionamento — Convite agora cai direto no splash.
 * Mantém o ref code no localStorage para creditar o embaixador.
 */
import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

const Convite = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const ref = params.get("ref") || "";
    if (ref) {
      try {
        localStorage.setItem("hc_ref_code", ref);
        localStorage.setItem("hc_ref_at", new Date().toISOString());
      } catch {}
    }
    navigate("/splash", { replace: true });
  }, [params, navigate]);

  return null;
};

export default Convite;
