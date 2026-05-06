/**
 * [CAMINHO]: supabase/functions/heart-club-auth/index.ts
 * [MÓDULO]: SISTEMA DE AUTENTICAÇÃO E DISPARO RESEND
 * [STATUS]: PRODUÇÃO - VERSÃO ESTÁVEL RECUPERADA
 * [DESCRIÇÃO]: Restauração da base funcional com adição de branding e redirect /splash.
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
       MÓDULO 3: GERAÇÃO DE TOKEN E BANCO DE DADOS
       ═══════════════════════════════════════════════════════════ */
    const token = crypto.randomUUID()
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString()

    const { error: dbError } = await supabase
      .from('auth_tokens')
      .insert([{ email: email.trim().toLowerCase(), token, expires_at: expiresAt }])

    if (dbError) throw new Error(`Erro Banco: ${dbError.message}`)

    /* ═══════════════════════════════════════════════════════════
       MÓDULO 4: DISPARO RESEND (DESIGN PREMIUM ATUALIZADO)
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
        subject: '⚽ Seu acesso ao Global Fan Census - Heart Club',
        html: `
          <div style="background-color: #000000; padding: 40px 10px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #ffffff;">
            <div style="max-width: 480px; margin: 0 auto; background-color: #121212; border-radius: 20px; padding: 40px; border: 1px solid #222; text-align: center;">
              
              <div style="margin-bottom: 20px;">
                <img src="https://heartclubapp.com/logo.png" alt="Heart Club" width="80" style="display: block; margin: 0 auto;">
              </div>

              <h1 style="color: #ff5722; font-size: 26px; margin-bottom: 10px; font-weight: 800; letter-spacing: -0.5px;">
                HEART CLUB
              </h1>
              
              <p style="font-size: 16px; line-height: 1.5; color: #a1a1aa; margin-bottom: 30px;">
                O maior censo de torcidas do mundo convida você para registrar sua paixão.
              </p>
              
              <div style="margin: 40px 0;">
                <a href="https://www.heartclubapp.com/verify?token=${token}&redirect=/splash"
                   style="background: #ff5722;
                          color: #ffffff;
                          padding: 18px 35px;
                          text-decoration: none;
                          border-radius: 12px;
                          font-weight: bold;
                          font-size: 16px;
                          display: inline-block;">
                   ENTRAR NO HEART CLUB
                </a>
              </div>
              
              <p style="font-size: 13px; color: #52525b; line-height: 1.6; margin-top: 40px;">
                Vote no seu clube do coração e ajude a mapear a maior base de dados de torcedores do planeta.
              </p>
              
              <div style="margin-top: 30px; border-top: 1px solid #222; padding-top: 20px;">
                <p style="font-size: 11px; color: #3f3f46;">
                  Este link expira em 15 minutos e é de uso único.
                </p>
              </div>
            </div>
          </div>
        `
      })
    })

    /* ═══════════════════════════════════════════════════════════
       MÓDULO 5: RESPOSTA DA FUNÇÃO
       ═══════════════════════════════════════════════════════════ */
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
 * - Lógica original 100% preservada.
 * - Inserida a logo e o parâmetro de redirect para /splash.
 * - Organização modular para facilitar manutenção.
 */