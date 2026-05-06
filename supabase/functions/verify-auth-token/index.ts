/**
 * PROJETO: Heart Club
 * ARQUIVO: supabase/functions/verify-auth-token/index.ts
 * DESCRIÇÃO: Valida token de custódia (auth_tokens) e gera token_hash de
 *            magic link via admin para estabelecer sessão real no client.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
    const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

    const { token } = await req.json()
    if (!token || typeof token !== 'string' || token.length < 10 || token.length > 200) {
      return new Response(JSON.stringify({ valid: false, error: 'invalid_token' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const { data, error } = await supabase
      .from('auth_tokens')
      .select('id, email, used, expires_at')
      .eq('token', token)
      .maybeSingle()

    if (error || !data) {
      return new Response(JSON.stringify({ valid: false, error: 'not_found' }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (data.used) {
      return new Response(JSON.stringify({ valid: false, error: 'already_used' }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (new Date(data.expires_at).getTime() < Date.now()) {
      return new Response(JSON.stringify({ valid: false, error: 'expired' }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Garantir usuário existente (cria se necessário)
    const { data: existing } = await supabase.auth.admin.listUsers()
    const found = existing?.users?.find((u: any) => u.email?.toLowerCase() === data.email.toLowerCase())
    if (!found) {
      await supabase.auth.admin.createUser({ email: data.email, email_confirm: true })
    }

    // Gerar magic link admin → extrair hashed_token para verifyOtp no client
    const { data: linkData, error: linkErr } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: data.email,
    })

    if (linkErr || !linkData?.properties?.hashed_token) {
      console.error('[verify-auth-token] generateLink falhou', linkErr)
      return new Response(JSON.stringify({ valid: false, error: 'link_generation_failed' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Marca token como usado SOMENTE após gerar a sessão
    await supabase.from('auth_tokens').update({ used: true }).eq('id', data.id)

    return new Response(JSON.stringify({
      valid: true,
      email: data.email,
      token_hash: linkData.properties.hashed_token,
    }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (err) {
    console.error('[verify-auth-token] erro', err)
    return new Response(JSON.stringify({ valid: false, error: 'server_error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
