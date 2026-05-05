/**
 * PROJETO: Heart Club
 * ARQUIVO: supabase/functions/heart-club-auth/index.ts
 * DESCRIÇÃO: Central de autenticação. Ajustado destino do link para /verify.
 * STATUS: Produção - Link de redirecionamento corrigido.
 * AUTOR: Especialista Senior (AI) para Beto Borelli
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

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

    const token = crypto.randomUUID()
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString()

    const { error: dbError } = await supabase
      .from('auth_tokens')
      .insert([{ email: email.trim().toLowerCase(), token, expires_at: expiresAt }])

    if (dbError) throw new Error(`Erro Banco: ${dbError.message}`)

    // ==========================================
    // MÓDULO 3: DISPARO COM LINK CORRIGIDO
    // O link agora aponta para /verify que é quem processa o token.
    // ==========================================
    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`
      },
      body: JSON.stringify({
        from: 'Heart Club <admin@heartclubapp.com>',
        to: [email],
        subject: 'Seu acesso exclusivo ao Heart Club',
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px; text-align: center;">
            <h2 style="color: #333;">Olá, Torcedor!</h2>
            <p>Clique no botão abaixo para entrar com segurança no Heart Club:</p>
            <div style="margin: 30px 0;">
              <a href="https://www.heartclubapp.com/verify?token=${token}" 
                 style="display: inline-block; padding: 16px 40px; background-color: #ff5722; color: #fff; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
                 ENTRAR NO HEART CLUB
              </a>
            </div>
            <p style="font-size: 12px; color: #999;">Este link é de uso único e expira em 15 minutos.</p>
          </div>
        `
      })
    })

    if (!emailRes.ok) {
      const errorData = await emailRes.json()
      throw new Error(`Erro Resend: ${JSON.stringify(errorData)}`)
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