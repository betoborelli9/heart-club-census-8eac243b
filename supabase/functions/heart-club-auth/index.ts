/**
 * [CAMINHO]: supabase/functions/heart-club-auth/index.ts
 * [MÓDULO]: SISTEMA DE AUTENTICAÇÃO E DISPARO RESEND
 * [STATUS]: PRODUÇÃO - VERSÃO 2.2 (ESTABILIDADE TOTAL)
 * [DESCRIÇÃO]: Gerencia tokens e dispara e-mail via Resend.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

/* ═══════════════════════════════════════════════════════════
   MÓDULO 1: CONFIGURAÇÕES E CORS
   ═══════════════════════════════════════════════════════════ */
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

/* ═══════════════════════════════════════════════════════════
   MÓDULO 2: HANDLER PRINCIPAL
   ═══════════════════════════════════════════════════════════ */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
    const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    const { email } = await req.json()
    const supabase = createClient(SUPABASE_URL!, SERVICE_ROLE_KEY!)

    /* ═══════════════════════════════════════════════════════════
       MÓDULO 3: TOKEN E BANCO
       ═══════════════════════════════════════════════════════════ */
    const token = crypto.randomUUID()
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString()

    const { error: dbError } = await supabase
      .from('auth_tokens')
      .insert([{ email: email.trim().toLowerCase(), token, expires_at: expiresAt }])

    if (dbError) throw new Error(`Erro Banco: ${dbError.message}`)

    const confirmationUrl = `https://www.heartclubapp.com/verify?token=${token}&redirect=/splash`

    /* ═══════════════════════════════════════════════════════════
       MÓDULO 4: DISPARO RESEND
       ═══════════════════════════════════════════════════════════ */
    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`
      },
      body: JSON.stringify({
        from: 'Heart Club <admin@heartclubapp.com>',
        to: [email],
        subject: '⚽ Seu acesso ao Heart Club',
        html: `
          <div style="background-color:#000;padding:50px 20px;color:#fff;text-align:center;font-family:sans-serif;">
            <div style="max-width:500px;margin:0 auto;background-color:#111;padding:40px;border-radius:20px;border:1px solid #333;">
              <img src="https://heartclubapp.com/logo.png" width="80" style="margin-bottom:20px;">
              <h1 style="color:#fff;font-style:italic;font-weight:900;">HEART CLUB</h1>
              <h2 style="color:#ff4500;">O MUNDO PRECISA OUVIR SEU GRITO!</h2>
              <p style="color:#ccc;">Clique abaixo para entrar no maior censo de torcidas do planeta.</p>
              <a href="${confirmationUrl}" style="background:#ff4500;color:#fff;padding:18px 30px;text-decoration:none;border-radius:12px;font-weight:900;display:inline-block;margin:30px 0;">ENTRAR AGORA</a>
              <p style="font-size:10px;color:#555;">Expira em 15 min. © 2026 Heart Club</p>
            </div>
          </div>
        `
      })
    })

    if (!emailRes.ok) throw new Error('Falha no Resend')

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})

/**
 * [RODAPÉ TÉCNICO]
 * - Verificado: Redirecionamento para /splash.
 * - Verificado: Compatibilidade Deno/Resend.
 */