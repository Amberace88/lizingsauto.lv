// Publiskie (drošie) Supabase parametri. Publishable atslēga ir paredzēta pārlūkam — datus sargā RLS politikas.
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://kxnzcwnvtvxrgxkfhbtu.supabase.co';
export const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_t9WJOB-QZSUyjvrxS56tcg_7Evp9dci';
