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
// MÓDULO 3: DISPARO PROFISSIONAL ESTILIZADO (RESEND)
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
    subject: '⚽ Seu acesso ao Global Fan Census - Heart Club',
    html: `
      <div style="background-color: #000000; padding: 40px 20px; font-family: sans-serif; text-align: center; color: #ffffff;">
        <div style="max-width: 500px; margin: 0 auto; background-color: #121212; border-radius: 16px; padding: 32px; border: 1px solid #333;">
          
          <h1 style="color: #ff5722; font-size: 24px; margin-bottom: 16px; font-weight: bold;">
            Global Fan Census - Heart Club
          </h1>
          
          <p style="font-size: 18px; line-height: 1.5; color: #efefef; margin-bottom: 24px;">
            Vote no seu clube do coração e em até 4 clubes de simpatia.
          </p>
          
          <div style="margin: 40px 0;">
            <a href="https://www.heartclubapp.com/verify?token=${token}" 
               style="background: linear-gradient(90deg, #ff5722 0%, #ff7043 100%); 
                      color: #ffffff; 
                      padding: 16px 40px; 
                      text-decoration: none; 
                      border-radius: 50px; 
                      font-weight: bold; 
                      font-size: 18px;
                      box-shadow: 0 4px 15px rgba(255, 87, 34, 0.4);
                      display: inline-block;">
               ENTRAR NO HEART CLUB
            </a>
          </div>
          
          <p style="font-size: 14px; color: #888; line-height: 1.6; margin-top: 32px;">
            O Heart Club é uma plataforma dedicada a torcedores de futebol de todo o mundo para registrar a paixão clubística em um mapa interativo e dinâmico.
          </p>
          
          <hr style="border: 0; border-top: 1px solid #333; margin: 30px 0;">
          
          <p style="font-size: 11px; color: #666;">
            Este link é exclusivo e expira em 15 minutos.<br>
            Se você não solicitou este acesso, ignore este e-mail.
          </p>
        </div>
      </div>
    `
  })
})