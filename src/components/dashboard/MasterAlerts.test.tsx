// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

const answers: Record<string, unknown> = {
  admin_get_api_health: [
    {
      service: "API-Football",
      healthy: true,
      details: { days_until_renewal: 20, requests_used: 120, requests_limit: 7500, subscription_end: "2026-10-24T00:00:00Z" },
      checked_at: "2026-10-04T12:00:00Z",
    },
  ],
  admin_get_lovable_alerts: [
    {
      sha: "9eaa718abc",
      branch: "main",
      message: "Lovable update",
      committed_at: "2026-10-03T20:16:00Z",
      files: ["src/integrations/supabase/client.ts"],
      critical_files: ["src/integrations/supabase/client.ts"],
      is_critical: true,
      url: null,
    },
  ],
  admin_get_db_health: {
    connections: 22,
    max_connections: 60,
    http_log_bytes: 49152,
    cron_log_bytes: 90112,
    yellow_bytes: 26214400,
    red_bytes: 52428800,
    last_cleanup_at: null,
    last_cleanup_ok: null,
  },
};

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    rpc: (fn: string) => Promise.resolve({ data: answers[fn] ?? null, error: null }),
  },
}));

import MasterAlerts from "./MasterAlerts";

describe("MasterAlerts", () => {
  it("mostra API-Football, Supabase, aviso da Lovable e termômetros", async () => {
    render(<MasterAlerts />);
    await waitFor(() => expect(screen.getByText(/API-Football vence em/)).toBeTruthy());
    expect(screen.getByText(/120\/7500 requisições usadas hoje/)).toBeTruthy();
    expect(screen.getByText(/Supabase/)).toBeTruthy();
    await waitFor(() => expect(screen.getByText(/A Lovable subiu 1 alteração/)).toBeTruthy());
    expect(screen.getByText(/arquivo crítico/)).toBeTruthy();
    await waitFor(() => expect(screen.getByText(/Saúde do banco/)).toBeTruthy());
    expect(screen.getByText("22/60")).toBeTruthy();
    expect(screen.getByText(/Servidor com folga/)).toBeTruthy();
  });

  it("não derruba a tela se o banco devolver lixo", async () => {
    answers.admin_get_db_health = "lixo";
    answers.admin_get_lovable_alerts = null;
    render(<MasterAlerts />);
    await waitFor(() => expect(screen.getByText(/API-Football vence em/)).toBeTruthy());
  });
});
