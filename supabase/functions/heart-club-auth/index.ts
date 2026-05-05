/**
 * PROJETO: Heart Club
 * ARQUIVO: supabase/functions/heart-club-auth/index.ts
 * DESCRIÇÃO: Central de autenticação independente para evitar bloqueios de provedores.
 * STATUS: Produção - Domínio Verificado (admin@heartclubapp.com)
 * AUTOR: Especialista Senior (AI) para Beto Borelli
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// ==========================================
// MÓDULO 1: CONFIGURAÇÕES E VARIÁVEIS
// ==========================================
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

// ==========================================
// MÓDULO 2: LÓGICA PRINCIPAL (HANDLING)
// ==========================================
Deno.serve(async (req) => {
  try {
    const { email } = await req.json()
    
    // Instancia Supabase com permissão de admin (Service Role)
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

    // Geração de token UUID e validade de 15 minutos
    const token = crypto.randomUUID()
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString()

    // Registro na tabela de custódia auth_tokens
    const { error: dbError } = await supabase
      .from('auth_tokens')
      .insert([{ email, token, expires_at: expiresAt }])

    if (dbError) throw new Error(`Erro no Banco: ${dbError.message}`)

    // ==========================================
    // MÓDULO 3: DISPARO DE E-MAIL (RESEND)
    // Objetivo: Enviar via domínio profissional verificado.
    // ==========================================
    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`
      },
      body: JSON.stringify({
        // CONFIGURAÇÃO PROFISSIONAL ATIVADA
        from: 'Heart Club <admin@heartclubapp.com>', 
        to: [email],
        subject: 'Seu acesso exclusivo ao Heart Club',
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
            <h2 style="color: #333;">Olá, Torcedor!</h2>
            <p>Você solicitou acesso ao <strong>Heart Club</strong>.</p>
            <p>Clique no botão abaixo para entrar com segurança no Censo Global:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="https://heartclubapp.com/verify?token=${token}" 
                 style="display: inline-block; padding: 14px 30px; background-color: #ff5722; color: #fff; text-decoration: none; border-radius: 5px; font-weight: bold;">
                 ENTRAR NO HEART CLUB
              </a>
            </div>
            <p style="margin-top: 20px; font-size: 12px; color: #666;">
              Este link expira em 15 minutos. Se não foi você quem solicitou, ignore este e-mail.
            </p>
            <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
            <p style="font-size: 11px; color: #999; text-align: center;">
              Heart Club - Global Fan Census
            </p>
          </div>
        `
      })
    })

    if (!emailRes.ok) {
      const errorData = await emailRes.json();
      throw new Error(`Erro Resend: ${JSON.stringify(errorData)}`);
    }

    return new Response(JSON.stringify({ success: true, message: "Token gerado e enviado com domínio oficial." }), { 
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