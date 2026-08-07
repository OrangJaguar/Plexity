import { createClient, type SupabaseClient, type User } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

export class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export function getServiceClient(): SupabaseClient {
  const url = Deno.env.get('SUPABASE_URL');
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  return createClient(url, key);
}

export function getUserClient(req: Request): SupabaseClient {
  const url = Deno.env.get('SUPABASE_URL');
  const anon = Deno.env.get('SUPABASE_ANON_KEY');
  if (!url || !anon) throw new Error('Missing SUPABASE_URL or SUPABASE_ANON_KEY');
  const auth = req.headers.get('Authorization') || '';
  return createClient(url, anon, {
    global: { headers: { Authorization: auth } },
  });
}

export async function requireUser(req: Request): Promise<{ user: User; userClient: SupabaseClient }> {
  const userClient = getUserClient(req);
  const { data, error } = await userClient.auth.getUser();
  if (error || !data.user) {
    throw new HttpError(401, 'Unauthorized');
  }
  return { user: data.user, userClient };
}

export async function requireAdmin(req: Request) {
  const { user } = await requireUser(req);
  const service = getServiceClient();
  const { data: profile, error } = await service
    .from('profiles')
    .select('role, email, full_name')
    .eq('id', user.id)
    .maybeSingle();
  if (error) throw error;
  if (profile?.role !== 'admin') {
    throw new HttpError(403, 'Admin access required');
  }
  return {
    user,
    email: profile.email || user.email || '',
    role: 'admin' as const,
    service,
  };
}
