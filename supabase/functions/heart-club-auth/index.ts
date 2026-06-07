/**
 * PROJETO: Heart Club
 * ARQUIVO: supabase/functions/heart-club-auth/index.ts
 * DESCRIÇÃO: Disparo de e-mail com Design Premium (Dark Mode).
 * STATUS: Produção - Visual Atualizado
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const resolveRedirectOrigin = (origin?: string) => {
  const fallback = 'https://votenoseuclube.com.br'

  if (!origin) return fallback

  try {
    const url = new URL(origin)
    const isLovablePreview = url.hostname.endsWith('.lovableproject.com') || url.hostname.endsWith('.lovable.app')
    const isHeartClubDomain = url.hostname === 'heartclubapp.com' || url.hostname === 'www.heartclubapp.com'
    const isVoteDomain = url.hostname === 'votenoseuclube.com.br' || url.hostname === 'www.votenoseuclube.com.br'

    if (url.protocol === 'https:' && (isLovablePreview || isHeartClubDomain || isVoteDomain)) {
      return url.origin
    }
  } catch {
    return fallback
  }

  return fallback
}

const isValidEmail = (email: unknown): email is string => {
  return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) && email.length <= 254
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
    const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

    const { email, redirectOrigin } = await req.json()
    if (!isValidEmail(email)) {
      return new Response(JSON.stringify({ error: 'email_invalid' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)
    const normalizedEmail = email.trim().toLowerCase()

    const token = crypto.randomUUID()
    const accessUrl = `${resolveRedirectOrigin(redirectOrigin)}/verify?token=${token}&redirect=/voting`
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString()

    const { error: dbError } = await supabase
      .from('auth_tokens')
      .insert([{ email: normalizedEmail, token, expires_at: expiresAt }])

    if (dbError) throw new Error(`Erro Banco: ${dbError.message}`)

    // --- DISPARO COM DESIGN PREMIUM ---
    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`
      },
      body: JSON.stringify({
        from: 'Heart Club <admin@heartclubapp.com>',
        to: [normalizedEmail],
        subject: '⚽ Seu acesso ao Global Fan Census - Heart Club',
        html: `
          <div style="background-color: #000000; padding: 40px 10px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #ffffff;">
            <div style="max-width: 480px; margin: 0 auto; background-color: #121212; border-radius: 20px; padding: 40px; border: 1px solid #222; text-align: center;">

              <img src="https://heartclubapp.com/logo.png" alt="Heart Club" width="120" style="display: block; margin: 0 auto 24px auto; max-width: 120px; height: auto;" />

              <h1 style="color: #ff4500; font-size: 26px; margin-bottom: 10px; font-weight: 800; letter-spacing: -0.5px; font-style: italic;">
                HEART CLUB
              </h1>

              <p style="font-size: 16px; line-height: 1.5; color: #a1a1aa; margin-bottom: 30px;">
                O maior censo de torcidas do mundo convida você para registrar sua paixão.
              </p>

              <div style="margin: 40px 0;">
                <a href="${accessUrl}"
                   style="background: #ff4500;
                          color: #ffffff;
                          padding: 16px 36px;
                          text-decoration: none;
                          border-radius: 999px;
                          font-weight: 800;
                          font-style: italic;
                          font-size: 16px;
                          display: inline-block;
                          text-transform: uppercase;
                          letter-spacing: 0.5px;">
                   ENTRAR NO HEART CLUB
                </a>
              </div>

              <p style="font-size: 13px; color: #52525b; line-height: 1.6; margin-top: 40px;">
                Vote no seu clube do coração e em até 4 clubes de simpatia. Ajude a mapear a maior base de dados de torcedores do planeta.
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

    if (!emailRes.ok) {
      console.error('[heart-club-auth] email provider failed', await emailRes.text())
      throw new Error('email_delivery_failed')
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (err) {
    console.error('[heart-club-auth] erro', err)
    const message = err instanceof Error && err.message === 'email_delivery_failed'
      ? 'email_delivery_failed'
      : 'temporary_auth_error'
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
