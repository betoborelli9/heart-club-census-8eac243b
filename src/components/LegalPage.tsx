/**
 * [CAMINHO]: src/components/LegalPage.tsx
 * [MÓDULO]: Moldura única das páginas jurídicas (Termos / Privacidade), no idioma do torcedor.
 */
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useTranslationApp } from "@/hooks/useTranslationApp";
import { LEGAL_UI, type LegalDoc, type LegalLang } from "@/lib/legal-texts";

interface Props {
  docs: Record<LegalLang, LegalDoc>;
  otherPath: string;
  otherLabel: "seePrivacy" | "seeTerms";
}

const LegalPage = ({ docs, otherPath, otherLabel }: Props) => {
  const { language } = useTranslationApp();
  const lang: LegalLang = language === "en" || language === "es" ? language : "pt";
  const doc = docs[lang];
  const ui = LEGAL_UI[lang];

  return (
    <div className="min-h-screen bg-background text-foreground px-4 py-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <Link to="/" className="inline-flex items-center gap-2 text-primary text-sm">
          <ArrowLeft className="w-4 h-4" /> {ui.back}
        </Link>

        <header className="space-y-2">
          <h1 className="text-3xl font-display font-bold">{doc.title}</h1>
          <p className="text-sm text-muted-foreground">{doc.updated}</p>
        </header>

        <section className="space-y-4 text-sm leading-relaxed text-foreground/90">
          {doc.intro?.map((p) => (
            <p key={p}>{p}</p>
          ))}
          {doc.sections.map((s) => (
            <div key={s.h} className="space-y-2">
              <h2 className="text-lg font-bold pt-4">{s.h}</h2>
              {s.ul && (
                <ul className="list-disc pl-5 space-y-1">
                  {s.ul.map((li) => (
                    <li key={li}>{li}</li>
                  ))}
                </ul>
              )}
              {s.p?.map((p) => (
                <p key={p}>{p}</p>
              ))}
            </div>
          ))}
          <p className="pt-4">
            <Link to={otherPath} className="text-primary underline">
              {ui[otherLabel]}
            </Link>
          </p>
        </section>
      </div>
    </div>
  );
};

export default LegalPage;
