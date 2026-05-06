/**
 * PROJETO: Heart Club
 * ARQUIVO: supabase/functions/verify-auth-token/index.ts
 * DESCRIÇÃO: Valida token de custódia (auth_tokens) usando service role,
 *            evitando bloqueio de RLS no client anônimo.
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

    await supabase.from('auth_tokens').update({ used: true }).eq('id', data.id)

    return new Response(JSON.stringify({ valid: true, email: data.email }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (err) {
    return new Response(JSON.stringify({ valid: false, error: 'server_error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
