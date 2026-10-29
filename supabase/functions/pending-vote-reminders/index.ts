/**
 * PROJETO: Heart Club
 * ARQUIVO: supabase/functions/pending-vote-reminders/index.ts
 * DESCRIÇÃO: Lembrete ÚNICO (24h depois) para quem tocou em "Enviar link" e não abriu o e-mail:
 *            "Seu voto no <CLUBE> está esperando. Toque para confirmar". Chamada a cada hora pelo agendador (pg_cron).
 *            Nunca repete (a reserva é feita no banco antes do envio) e nunca avisa quem já votou.
 *            Os votos pendentes NÃO contam em ranking nenhum: ficam na tabela votos_pendentes.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SITE_ORIGIN = 'https://votenoseutime.com.br'
const REMINDER_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000 // o link do lembrete vale por 7 dias

const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')

const buildEmail = (club: string, accessUrl: string) => {
  const safeClub = escapeHtml(club)
  return `
    <div style="background-color: #000000; padding: 40px 10px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #ffffff;">
      <div style="max-width: 480px; margin: 0 auto; background-color: #121212; border-radius: 20px; padding: 40px; border: 1px solid #222; text-align: center;">
        <img src="https://heartclubapp.com/logo.png" alt="Heart Club" width="120" style="display: block; margin: 0 auto 24px auto; max-width: 120px; height: auto;" />
        <h1 style="color: #ff4500; font-size: 24px; margin-bottom: 10px; font-weight: 800; letter-spacing: -0.5px; font-style: italic;">
          Seu voto no ${safeClub} está esperando
        </h1>
        <p style="font-size: 16px; line-height: 1.5; color: #a1a1aa; margin-bottom: 30px;">
          Falta só um toque para confirmar o seu voto e entrar para a torcida.
        </p>
        <div style="margin: 36px 0;">
          <a href="${accessUrl}"
             style="background: #ff4500; color: #ffffff; padding: 16px 36px; text-decoration: none; border-radius: 999px; font-weight: 800; font-style: italic; font-size: 16px; display: inline-block; text-transform: uppercase; letter-spacing: 0.5px;">
             Toque para confirmar
          </a>
        </div>
        <div style="margin-top: 30px; border-top: 1px solid #222; padding-top: 20px;">
          <p style="font-size: 11px; color: #52525b; line-height: 1.6;">
            Este é um lembrete único: você pediu um link de acesso ao Heart Club e não chegamos a confirmar o seu voto.
            O link vale por 7 dias e é de uso único. Se não foi você, é só ignorar este e-mail.
          </p>
        </div>
      </div>
    </div>`
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  try {
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
    const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

    const body = await req.json().catch(() => ({}))
    // "dry_run" NUNCA envia nada (vale para qualquer chamador). Os detalhes (e-mails) só aparecem para quem prova
    // ter a chave de serviço; o agendador e qualquer outra chamada recebem apenas contagens.
    const trusted = !!SERVICE_ROLE_KEY && req.headers.get('authorization') === `Bearer ${SERVICE_ROLE_KEY}`
    const dryRun = body?.dry_run === true

    const { data: due, error: dueError } = await supabase.rpc('pending_votes_due', { p_limit: 50 })
    if (dueError) throw new Error(`pending_votes_due: ${dueError.message}`)

    const rows = (due ?? []) as { id: string; email: string; clube_nome: string; pv: string | null }[]
    const preview = rows.map((r) => ({ id: r.id, email: r.email, club: r.clube_nome, subject: `Seu voto no ${r.clube_nome} está esperando` }))
    if (dryRun) return json(trusted ? { dry_run: true, due: rows.length, preview } : { dry_run: true, due: rows.length })

    let sent = 0
    let failed = 0
    for (const row of rows) {
      // reserva ANTES de enviar: garante um único lembrete mesmo se a rotina rodar duas vezes ao mesmo tempo
      const { data: claimed, error: claimError } = await supabase.rpc('claim_pending_reminder', { p_id: row.id })
      if (claimError || claimed !== true) continue

      try {
        const token = crypto.randomUUID()
        const { error: tokenError } = await supabase
          .from('auth_tokens')
          .insert([{ email: row.email, token, expires_at: new Date(Date.now() + REMINDER_TOKEN_TTL_MS).toISOString() }])
        if (tokenError) throw new Error(`token: ${tokenError.message}`)

        const pv = row.pv && /^[A-Za-z0-9_-]+$/.test(row.pv) && row.pv.length <= 1800 ? `&pv=${row.pv}` : ''
        const accessUrl = `${SITE_ORIGIN}/voting?token=${token}${pv}`

        const emailRes = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${RESEND_API_KEY}` },
          body: JSON.stringify({
            from: 'Heart Club <admin@heartclubapp.com>',
            to: [row.email],
            subject: `Seu voto no ${row.clube_nome} está esperando`,
            html: buildEmail(row.clube_nome, accessUrl),
          }),
        })
        if (!emailRes.ok) throw new Error(`resend: ${emailRes.status} ${await emailRes.text()}`)
        sent++
      } catch (err) {
        failed++
        console.error('[pending-vote-reminders] envio falhou, devolvendo a reserva', err)
        await supabase.rpc('release_pending_reminder', { p_id: row.id })
      }
    }

    return json({ due: rows.length, sent, failed })
  } catch (err) {
    console.error('[pending-vote-reminders] erro', err)
    return json({ error: 'temporary_error' }, 500)
  }
})
