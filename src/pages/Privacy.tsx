/**
 * [CAMINHO]: src/pages/Privacy.tsx
 * [DESCRIÇÃO]: Política de Privacidade (v2.0, LGPD) — textos em src/lib/legal-texts.ts (pt/en/es).
 */
import LegalPage from "@/components/LegalPage";
import { PRIVACY } from "@/lib/legal-texts";

const Privacy = () => <LegalPage docs={PRIVACY} otherPath="/termos" otherLabel="seeTerms" />;

export default Privacy;
