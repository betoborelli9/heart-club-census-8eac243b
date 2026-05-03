/**
 * badges.ts — Sistema de selos do embaixador.
 */
export type BadgeTier = "bronze" | "prata" | "ouro" | "lenda";

export const BADGES: Record<BadgeTier, { label: string; min: number; emoji: string; color: string }> = {
  bronze: { label: "Bronze", min: 10, emoji: "🥉", color: "#cd7f32" },
  prata: { label: "Prata", min: 50, emoji: "🥈", color: "#c0c0c0" },
  ouro: { label: "Ouro", min: 100, emoji: "🥇", color: "#ffd700" },
  lenda: { label: "Lenda", min: 500, emoji: "🏆", color: "#ff6200" },
};

export function getBadge(referrals: number): { tier: BadgeTier | null; next?: BadgeTier; toNext?: number; data?: typeof BADGES[BadgeTier] } {
  let tier: BadgeTier | null = null;
  const order: BadgeTier[] = ["bronze", "prata", "ouro", "lenda"];
  for (const t of order) if (referrals >= BADGES[t].min) tier = t;
  const idx = tier ? order.indexOf(tier) : -1;
  const next = order[idx + 1];
  return {
    tier,
    next,
    toNext: next ? BADGES[next].min - referrals : undefined,
    data: tier ? BADGES[tier] : undefined,
  };
}
