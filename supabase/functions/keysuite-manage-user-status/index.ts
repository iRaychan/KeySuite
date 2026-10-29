import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.118.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed.' }, 405);

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const publishableKeys = JSON.parse(Deno.env.get('SUPABASE_PUBLISHABLE_KEYS') ?? '{}');
    const secretKeys = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') ?? '{}');
    const anonKey = String(publishableKeys.default ?? Deno.env.get('SUPABASE_ANON_KEY') ?? '');
    const serviceKey = String(secretKeys.default ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
    if (!supabaseUrl || !anonKey || !serviceKey) throw new Error('Supabase function environment is incomplete.');

    const authHeader = req.headers.get('Authorization') ?? '';
    if (!authHeader.startsWith('Bearer ')) return json({ error: 'Missing login session.' }, 401);

    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: userData, error: userError } = await callerClient.auth.getUser();
    const callerEmail = String(userData.user?.email ?? '').toLowerCase();
    if (userError || !callerEmail) return json({ error: 'Invalid login session.' }, 401);

    const service = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: caller, error: callerError } = await service
      .from('ks_user_access')
      .select('email,role,active,company_id')
      .eq('email', callerEmail)
      .maybeSingle();
    if (callerError) throw callerError;
    if (!caller?.active || String(caller.role).toLowerCase() !== 'owner') return json({ error: 'Only the Owner can archive or restore users.' }, 403);

    const body = await req.json().catch(() => ({}));
    const action = String(body.action ?? '').trim().toLowerCase();
    const email = String(body.email ?? '').trim().toLowerCase();
    if (!['archive', 'restore'].includes(action)) return json({ error: 'Action must be archive or restore.' }, 400);
    if (!/^\S+@\S+\.\S+$/.test(email)) return json({ error: 'A valid user email is required.' }, 400);
    if (email === callerEmail) return json({ error: 'The Owner cannot archive their own account.' }, 400);

    const { data: target, error: targetError } = await service
      .from('ks_user_access')
      .select('email,display_name,active,company_id')
      .eq('email', email)
      .maybeSingle();
    if (targetError) throw targetError;
    if (!target) return json({ error: 'The selected KeySuite user was not found.' }, 404);
    if (target.company_id !== caller.company_id) return json({ error: 'The selected user belongs to a different company.' }, 403);

    if (action === 'archive') {
      const { error: accessError } = await service.rpc('keysuite_set_user_archive_v50013', {
        p_email: email,
        p_action: 'archive',
        p_changed_by: callerEmail,
      });
      if (accessError) throw accessError;

      const { data: revoked, error: revokeError } = await service.rpc('keysuite_revoke_user_sessions_v50013', { p_email: email });
      if (revokeError) throw revokeError;
      const authUserId = revoked?.user_id ?? null;
      if (authUserId) {
        const { error: banError } = await service.auth.admin.updateUserById(authUserId, { ban_duration: '876000h' });
        if (banError) throw banError;
      }
      return json({ status: 'archived', email, sessions_revoked: Number(revoked?.sessions_revoked ?? 0), auth_exists: Boolean(authUserId) });
    }

    const { data: revoked, error: lookupError } = await service.rpc('keysuite_revoke_user_sessions_v50013', { p_email: email, p_revoke: false });
    if (lookupError) throw lookupError;
    const authUserId = revoked?.user_id ?? null;
    if (authUserId) {
      const { error: unbanError } = await service.auth.admin.updateUserById(authUserId, { ban_duration: 'none' });
      if (unbanError) throw unbanError;
    }
    const { error: restoreError } = await service.rpc('keysuite_set_user_archive_v50013', {
      p_email: email,
      p_action: 'restore',
      p_changed_by: callerEmail,
    });
    if (restoreError) throw restoreError;
    return json({ status: 'restored', email, auth_exists: Boolean(authUserId) });
  } catch (error) {
    console.error(error);
    return json({ error: error instanceof Error ? error.message : String(error) }, 400);
  }
});

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
