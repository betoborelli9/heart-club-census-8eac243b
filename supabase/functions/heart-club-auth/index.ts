/**
 * PROJETO: Heart Club
 * ARQUIVO: supabase/functions/heart-club-auth/index.ts
 * DESCRIÇÃO: Central de autenticação independente para evitar bloqueios de provedores.
 * AUTOR: Especialista Senior (AI) para Beto Borelli
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// ==========================================
// MÓDULO 1: CONFIGURAÇÕES E VARIÁVEIS
// Objetivo: Carregar chaves de ambiente e instanciar clientes.
// ==========================================
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

// ==========================================
// MÓDULO 2: LÓGICA PRINCIPAL (HANDLING)
// Objetivo: Processar requisição, gerar token e registrar no banco.
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
    // Objetivo: Enviar o link de acesso sem passar pelos filtros do Supabase.
    // ==========================================
    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`
      },
      body: JSON.stringify({
        from: 'Heart Club <contato@heart-club.com>',
        to: [email],
        subject: 'Seu acesso exclusivo ao Heart Club',
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Olá, Torcedor!</h2>
            <p>Você solicitou acesso ao <strong>Heart Club</strong>.</p>
            <p>Clique no botão abaixo para entrar com segurança:</p>
            <a href="https://heart-club.com/verify?token=${token}" 
               style="display: inline-block; padding: 12px 24px; background-color: #000; color: #fff; text-decoration: none; border-radius: 5px;">
               Entrar Agora
            </a>
            <p style="margin-top: 20px; font-size: 12px; color: #666;">
              Este link expira em 15 minutos. Se não foi você quem solicitou, ignore este e-mail.
            </p>
          </div>
        `
      })
    })

    if (!emailRes.ok) throw new Error('Falha ao disparar e-mail via Resend.')

    return new Response(JSON.stringify({ success: true, message: "Token gerado e enviado." }), { 
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

/**
 * RODAPÉ: Fim do arquivo.
 * PRÓXIMO PASSO: Configurar as secrets no Supabase e realizar o Deploy.
 */