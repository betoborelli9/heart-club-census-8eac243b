/**
 * PROJETO: Heart Club
 * ARQUIVO: supabase/functions/heart-club-auth/index.ts
 * STATUS: Produção - Domínio Verificado
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

Deno.serve(async (req) => {
  try {
    const { email } = await req.json()
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

    const token = crypto.randomUUID()
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString()

    const { error: dbError } = await supabase
      .from('auth_tokens')
      .insert([{ email, token, expires_at: expiresAt }])

    if (dbError) throw new Error(`Erro no Banco: ${dbError.message}`)

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
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
            <h2 style="color: #333;">Olá, Torcedor!</h2>
            <p>Você solicitou acesso ao <strong>Heart Club</strong>.</p>
            <p>Clique no botão abaixo para entrar com segurança:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="https://www.heartclubapp.com/verify?token=${token}" 
                 style="display: inline-block; padding: 14px 30px; background-color: #000; color: #fff; text-decoration: none; border-radius: 5px; font-weight: bold;">
                 ENTRAR NO HEART CLUB
              </a>
            </div>
            <p style="margin-top: 20px; font-size: 12px; color: #666;">
              Este link expira em 15 minutos.
            </p>
          </div>
        `
      })
    })

    if (!emailRes.ok) {
      const errorData = await emailRes.json();
      // Se der erro de remetente, o log vai nos dizer se o Resend ainda acha que é onboarding
      throw new Error(`Erro Resend: ${errorData.message || JSON.stringify(errorData)}`);
    }

    return new Response(JSON.stringify({ success: true }), { 
      status: 200, 
      headers: { "Content-Type": "application/json" } 
    })

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { 
      status: 500, 
      headers: { "Content-Type": "application/json" } 
    })
  }
})