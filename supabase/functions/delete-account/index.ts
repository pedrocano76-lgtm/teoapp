import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { z } from 'npm:zod@3';
import { deleteAccountSteps, type OwnedFile } from './cleanup.ts';

const BodySchema = z.object({ confirmation: z.literal('DELETE') }).strict();
const respond = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
});

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return respond({ error: 'Method not allowed' }, 405);
  const authorization = req.headers.get('Authorization');
  if (!authorization?.startsWith('Bearer ')) return respond({ error: 'Unauthorized' }, 401);

  try {
    const url = Deno.env.get('SUPABASE_URL');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!url || !anonKey || !serviceKey) throw new Error('Account deletion is not configured.');
    const caller = createClient(url, anonKey, {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const token = authorization.slice(7);
    const { data, error } = await caller.auth.getClaims(token);
    const userId = data?.claims?.sub;
    if (error || typeof userId !== 'string') return respond({ error: 'Unauthorized' }, 401);
    // Also reject a previously revoked/deleted user's otherwise unexpired JWT.
    const { data: identity, error: identityError } = await caller.auth.getUser(token);
    if (identityError || identity.user?.id !== userId) return respond({ error: 'Unauthorized' }, 401);
    const parsed = BodySchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return respond({ error: 'Type DELETE to confirm account deletion.' }, 400);

    const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
    await deleteAccountSteps({
      listFiles: async () => {
        const files: OwnedFile[] = [];
        for (let offset = 0; ; offset += 500) {
          const { data: page, error } = await admin.rpc('account_deletion_files', { target_user: userId })
            .order('bucket').order('path').range(offset, offset + 499);
          if (error) throw new Error(`Could not inspect owned files: ${error.message}`);
          files.push(...(page ?? []));
          if (!page || page.length < 500) break;
        }
        return files;
      },
      removeFiles: async (bucket, paths) => {
        const { data, error } = await admin.storage.from(bucket).remove(paths);
        if (error) throw new Error(`Could not delete owned files: ${error.message}`);
        return data ?? [];
      },
      deleteData: async () => {
        const { error } = await admin.rpc('delete_account_data', { target_user: userId });
        if (error) throw new Error(`Could not delete account data: ${error.message}`);
      },
      deleteUser: async () => {
        const { error } = await admin.auth.admin.deleteUser(userId);
        if (error) throw new Error(`Could not delete your login account: ${error.message}`);
      },
    });
    return respond({ success: true });
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'Account deletion failed.';
    return respond({ error: detail, code: 'account_deletion_failed' }, 500);
  }
});