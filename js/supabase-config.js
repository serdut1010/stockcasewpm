// Isi dua nilai ini dari Supabase: Project Settings -> API
// anon key AMAN ditaruh di sini selama RLS aktif (lihat supabase/schema.sql).
// JANGAN PERNAH menaruh service_role key di file ini.
const SUPABASE_URL = "https://GANTI-DENGAN-PROJECT-ID.supabase.co";
const SUPABASE_ANON_KEY = "GANTI-DENGAN-ANON-KEY";

window.db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
