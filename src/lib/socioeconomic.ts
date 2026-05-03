/**
 * socioeconomic.ts
 * Engine de classificação socioeconômica.
 * Cruza Profissão + Dispositivo + Bairro para inferir Classe (A/B/C/D/E)
 * e renda média estimada (BRL/mês). Heurística transparente, sem PII.
 */

// Tabela referência simplificada (fonte: PNAD/CBO faixas médias 2024). Ajustar conforme estudo.
const PROFESSION_INCOME: Array<{ match: RegExp; income: number }> = [
  { match: /(médic|cirurg|cardiolog|anestes)/i, income: 25000 },
  { match: /(juiz|desembarg|promotor|procurador)/i, income: 30000 },
  { match: /(engenh|arquitet)/i, income: 12000 },
  { match: /(advogad|advoc)/i, income: 9000 },
  { match: /(dentist|odonto|veterin|farmac)/i, income: 8500 },
  { match: /(professor universit|docente|pesquisador)/i, income: 9000 },
  { match: /(professor|educad)/i, income: 4500 },
  { match: /(executivo|diretor|gerente|ceo|cfo|cto)/i, income: 18000 },
  { match: /(empresári|empreendedor|sócio)/i, income: 12000 },
  { match: /(analista|consultor|programador|desenvolvedor|software|dados)/i, income: 8500 },
  { match: /(designer|publicitári|marketing)/i, income: 6000 },
  { match: /(jornalist|comunic)/i, income: 5500 },
  { match: /(contad|administrad|economist)/i, income: 6500 },
  { match: /(enfermeir|fisioterap|psicólog|nutric)/i, income: 5500 },
  { match: /(polici|bombeir|militar|sargent)/i, income: 5500 },
  { match: /(servidor|funcionári público)/i, income: 6500 },
  { match: /(vendedor|comerciante|representante)/i, income: 3500 },
  { match: /(motorist|caminh|uber|app)/i, income: 3000 },
  { match: /(operári|industri|metalúrg|construç|pedreir)/i, income: 2800 },
  { match: /(autônom|prestador)/i, income: 3200 },
  { match: /(estudant|estagiári|trainee)/i, income: 1800 },
  { match: /(aposentad|pension)/i, income: 2500 },
  { match: /(domestic|empregad|cuidador)/i, income: 1800 },
  { match: /(agricult|rural|pescador)/i, income: 2500 },
  { match: /(cabelei|estetic|manicur|barbeir)/i, income: 2500 },
  { match: /(artes|músic|ator|atriz|fotograf)/i, income: 4000 },
];

// Premium device → +20% sinal de classe; básico → -15%
const PREMIUM_DEVICE = /(iPhone|iPad|Galaxy S2[0-9]|Galaxy Note|Pixel [6-9]|Pixel 1[0-9]|Mac)/i;
const BASIC_DEVICE = /(Moto E|Moto G[1-9]\b|Redmi (?!Note 1[3-9])|Galaxy A0|Galaxy J|Nokia)/i;

export function estimateIncomeFromProfession(profession?: string | null): number {
  if (!profession) return 3000; // mediana BR
  for (const row of PROFESSION_INCOME) {
    if (row.match.test(profession)) return row.income;
  }
  return 3000;
}

export function classFromIncome(income: number): "A" | "B" | "C" | "D" | "E" {
  if (income >= 20000) return "A";
  if (income >= 8000) return "B";
  if (income >= 4000) return "C";
  if (income >= 2000) return "D";
  return "E";
}

export interface ScoreInput {
  profession?: string | null;
  device?: string | null;
  // bairro opcional (futuro: cruzar com índice de renda IBGE por setor censitário)
  neighborhood?: string | null;
}

export interface ScoreResult {
  estimatedIncome: number;
  socialClass: "A" | "B" | "C" | "D" | "E";
  rationale: string[];
}

export function computePurchasePowerScore(input: ScoreInput): ScoreResult {
  const rationale: string[] = [];
  let income = estimateIncomeFromProfession(input.profession);
  rationale.push(`Profissão "${input.profession || "n/d"}" → R$ ${income.toLocaleString("pt-BR")}`);

  if (input.device) {
    if (PREMIUM_DEVICE.test(input.device)) {
      income = Math.round(income * 1.2);
      rationale.push(`Dispositivo premium (${input.device}) +20%`);
    } else if (BASIC_DEVICE.test(input.device)) {
      income = Math.round(income * 0.85);
      rationale.push(`Dispositivo básico (${input.device}) -15%`);
    }
  }

  const socialClass = classFromIncome(income);
  return { estimatedIncome: income, socialClass, rationale };
}
