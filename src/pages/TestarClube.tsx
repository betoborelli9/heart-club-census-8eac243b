/**
 * src/pages/TestarClube.tsx — Master test preview for clubs (i18n).
 */
import { useEffect } from "react";
import { Navigate, useSearchParams, Link } from "react-router-dom";
import { useUser } from "@/contexts/UserContext";
import ClubBanner from "@/components/dashboard/ClubBanner";
import ClubIdentityCard from "@/components/dashboard/ClubIdentityCard";
import { FlaskConical, ArrowLeft } from "lucide-react";
import { useTranslationApp } from "@/hooks/useTranslationApp";

const MASTER_EMAIL = "betoborelli9@gmail.com";

export default function TestarClube() {
  const { user } = useUser();
  const [searchParams] = useSearchParams();
  const { t } = useTranslationApp();
  const clubName = searchParams.get("club") || "";

  useEffect(() => {
    document.title = clubName
      ? t("testar.title_with_club", { club: clubName })
      : t("testar.title");
  }, [clubName, t]);

  if (!user) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-white/60 italic">
        {t("testar.loading")}
      </div>
    );
  }

  if (user.email !== MASTER_EMAIL) {
    return <Navigate to="/dashboard" replace />;
  }

  if (!clubName) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center gap-4 px-4">
        <FlaskConical className="w-10 h-10 text-[#ff6200]" />
        <p className="italic text-white/70 text-center">
          {t("testar.none_selected")} <strong>{t("testar.test_link_label")}</strong> {t("testar.to_open")}
        </p>
        <Link
          to="/voting?test=1"
          className="px-4 py-2 rounded-lg bg-[#ff6200] text-black font-bold italic text-xs uppercase"
        >
          {t("testar.start_test")}
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-5xl mx-auto px-4 py-6 space-y-4">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FlaskConical className="w-5 h-5 text-[#ff6200]" />
            <div>
              <h1 className="text-base font-bold italic" style={{ fontFamily: "Verdana" }}>
                {t("testar.mode", { club: clubName.toUpperCase() })}
              </h1>
              <p className="text-[11px] text-white/60 italic">
                {t("testar.disclaimer")}
              </p>
            </div>
          </div>
          <Link
            to="/voting?test=1"
            className="inline-flex items-center gap-1 text-xs text-[#ff6200] hover:underline italic"
          >
            <ArrowLeft className="w-3 h-3" /> {t("testar.test_another")}
          </Link>
        </header>

        <ClubBanner clubName={clubName} pageLabel={t("testar.preview_label")} />
        <ClubIdentityCard clubName={clubName} />
      </div>
    </div>
  );
}
