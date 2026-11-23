// Supabase in the browser: only the URL and the publishable key. Row-level security (schema.sql) lets a signed-in
// user read only their own balance; credits change only on the server. The secret key is never used here.
import { createClient } from '@supabase/supabase-js';

const { VITE_SUPABASE_URL: url, VITE_SUPABASE_PUBLISHABLE_KEY: key } = import.meta.env;
export const supabase = url && key ? createClient(url, key) : null;

export async function credits(): Promise<{ email: string; credits: number } | null> {
  const user = (await supabase?.auth.getSession())?.data.session?.user;
  if (!user) return null;
  const { data } = await supabase!.from('credits').select('balance').eq('user_id', user.id).maybeSingle();
  return { email: user.email ?? '', credits: +Number(data?.balance ?? 0).toFixed(2) }; // numeric arrives as a string
}
