// Função de teste usada em 13/10/2026 para inspecionar técnicos da API-Football. Desativada (não consome a API).
Deno.serve(() => new Response(JSON.stringify({ error: "desativada" }), { status: 410, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }));
