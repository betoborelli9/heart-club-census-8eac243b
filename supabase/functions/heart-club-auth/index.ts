/**
 * [CAMINHO]: supabase/functions/heart-club-auth/index.ts
 * [MÓDULO]: SISTEMA DE AUTENTICAÇÃO E DISPARO RESEND
 * [STATUS]: PRODUÇÃO - VERSÃO 2.0 (PREMIUM DESIGN + SPLASH REDIRECT)
 * [DESCRIÇÃO]: Gerencia tokens de acesso e dispara e-mails via Resend com branding Heart Club.
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
   MÓDULO 2: HANDLER PRINCIPAL (DENO SERVE)
   ═══════════════════════════════════════════════════════════ */
Deno.serve(async (req) => {
  // Tratamento de Preflight CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
    const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

    const { email } = await req.json()
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

    /* ═══════════════════════════════════════════════════════════
       MÓDULO 3: GERAÇÃO E PERSISTÊNCIA DE TOKEN
       ═══════════════════════════════════════════════════════════ */
    const token = crypto.randomUUID()
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString()

    const { error: dbError } = await supabase
      .from('auth_tokens')
      .insert([{ email: email.trim().toLowerCase(), token, expires_at: expiresAt }])

    if (dbError) throw new Error(`Erro Banco: ${dbError.message}`)

    /* ═══════════════════════════════════════════════════════════
       MÓDULO 4: TEMPLATE DE E-MAIL PREMIUM (RESEND)
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
        subject: '⚽ O mundo precisa ouvir seu grito! - Heart Club',
        html: `
          <div style="background-color: #000000; padding: 50px 10px; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #ffffff;">
            <div style="max-width: 550px; margin: 0 auto; background-color: #111111; border-radius: 24px; padding: 40px; border: 1px solid #333333; text-align: center;">
              
              <div style="margin-bottom: 25px;">
                <img src="https://heartclubapp.com/logo.png" alt="Heart Club" width="90" style="display: block; margin: 0 auto;">
              </div>

              <h1 style="color: #ffffff; font-size: 28px; margin-bottom: 10px; font-weight: 900; font-style: italic; text-transform: uppercase; letter-spacing: -1px;">
                HEART CLUB
              </h1>
              
              <div style="height: 2px; width: 60px; background-color: #ff4500; margin: 0 auto 30px auto;"></div>

              <h2 style="color: #ff4500; font-size: 20px; font-weight: 800; text-transform: uppercase; margin-bottom: 20px; letter-spacing: 1px;">
                O MUNDO PRECISA OUVIR SEU GRITO!
              </h2>

              <p style="font-size: 16px; line-height: 1.6; color: #cccccc; margin-bottom: 35px;">
                Você solicitou um acesso rápido ao maior censo de torcidas do planeta. Clique abaixo para entrar e marcar seu território no mapa.
              </p>
              
              <div style="margin: 40px 0;">
                <a href="https://www.heartclubapp.com/verify?token=${token}&redirect=/splash" 
                   style="background: #ff4500; 
                          color: #ffffff; 
                          padding: 20px 45px; 
                          text-decoration: none; 
                          border-radius: 14px; 
                          font-weight: 900; 
                          font-size: 16px;
                          display: inline-block;
                          text-transform: uppercase;
                          font-style: italic;
                          box-shadow: 0 4px 20px rgba(255, 69, 0, 0.4);">
                    ENTRAR AGORA
                </a>
              </div>
              
              <p style="font-size: 12px; color: #555555; line-height: 1.6; margin-top: 40px; font-style: italic;">
                Jure lealdade ao seu clube e ajude a mapear a maior base de dados de torcedores do planeta.
              </p>
              
              <div style="margin-top: 30px; border-top: 1px solid #222222; padding-top: 25px;">
                <p style="font-size: 10px; color: #444444; text-transform: uppercase; letter-spacing: 1px;">
                  Este link expira em 15 min | © 2026 HEART CLUB
                </p>
              </div>
            </div>
          </div>
        `
      })
    })

    /* ═══════════════════════════════════════════════════════════
       MÓDULO 5: TRATAMENTO DE RESPOSTA
       ═══════════════════════════════════════════════════════════ */
    if (!emailRes.ok) {
      const errorText = await emailRes.text();
      throw new Error(`Erro Resend: ${errorText}`);
    }

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
 * - Template Black & Orange injetado com logo oficial.
 * - Parâmetro 'redirect=/splash' adicionado à URL de verificação.
 * - Modularização por blocos de lógica garantida.
 */