/**
 * [CAMINHO]: supabase/functions/heart-club-auth/index.ts
 * [MÓDULO]: SISTEMA DE AUTENTICAÇÃO E DISPARO RESEND
 * [STATUS]: PRODUÇÃO - VERSÃO 2.1 (FIX: REDIRECT + TEMPLATE STABILITY)
 * [DESCRIÇÃO]: Gerencia tokens e dispara e-mail premium. Corrigido erro de processamento.
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
       MÓDULO 3: GERAÇÃO E PERSISTÊNCIA DE TOKEN
       ═══════════════════════════════════════════════════════════ */
    const token = crypto.randomUUID()
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString()

    const { error: dbError } = await supabase
      .from('auth_tokens')
      .insert([{ email: email.trim().toLowerCase(), token, expires_at: expiresAt }])

    if (dbError) throw new Error(`Erro Banco: ${dbError.message}`)

    // URL Final de Verificação
    const confirmationUrl = `https://www.heartclubapp.com/verify?token=${token}&redirect=/splash`

    /* ═══════════════════════════════════════════════════════════
       MÓDULO 4: DISPARO RESEND (ESTRUTURA BLINDADA)
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
        subject: '⚽ O mundo precisa ouvir seu grito!',
        html: `
          <div style="background-color: #000000; padding: 40px 10px; font-family: sans-serif; color: #ffffff; text-align: center;">
            <div style="max-width: 500px; margin: 0 auto; background-color: #111111; border-radius: 20px; padding: 40px; border: 1px solid #333;">
              
              <img src="https://heartclubapp.com/logo.png" alt="Logo" width="80" style="margin-bottom: 20px;">
              
              <h1 style="color: #ffffff; font-size: 24px; font-weight: 900; font-style: italic; text-transform: uppercase; margin: 0;">HEART CLUB</h1>
              <div style="height: 2px; width: 40px; background-color: #ff4500; margin: 15px auto;"></div>
              
              <h2 style="color: #ff4500; font-size: 18px; font-weight: 800; text-transform: uppercase;">O mundo precisa ouvir seu grito!</h2>
              
              <p style="color: #ccc; font-size: 15px; line-height: 1.5;">Clique abaixo para entrar no maior censo de torcidas do planeta.</p>
              
              <div style="margin: 30px 0;">
                <a href="${confirmationUrl}" style="background: #ff4500; color: #ffffff; padding: 18px 30px; text-decoration: none; border-radius: 12px; font-weight: 900; font-size: 15px; display: inline-block; text-transform: uppercase; font-style: italic;">
                  ENTRAR AGORA
                </a>
              </div>
              
              <p style="font-size: 11px; color: #555; margin-top: 30px;">O link expira em 15 min. © 2026 Heart Club</p>
            </div>
          </div>
        `
      })
    })

    /* ═══════════════════════════════════════════════════════════
       MÓDULO 5: TRATAMENTO DE RESPOSTA
       ═══════════════════════════════════════════════════════════ */
    if (!emailRes.ok) {
      const errorData = await emailRes.json();
      console.error('Erro Resend:', errorData);
      throw new Error(`Erro API Resend: ${errorData.message || 'Falha no envio'}`);
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (err) {
    console.error('Erro Final:', err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})

/**
 * [RODAPÉ TÉCNICO]
 * - Correção de template literal para evitar quebra na API Resend.
 * - Log de erro detalhado no console do Supabase para debug.
 */