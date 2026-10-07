/**
 * [CAMINHO]: src/pages/Terms.tsx
 * [DESCRIÇÃO]: Termos de Uso (v2.0) — textos em src/lib/legal-texts.ts (pt/en/es).
 */
import LegalPage from "@/components/LegalPage";
import { TERMS } from "@/lib/legal-texts";

const Terms = () => <LegalPage docs={TERMS} otherPath="/privacidade" otherLabel="seePrivacy" />;

export default Terms;
