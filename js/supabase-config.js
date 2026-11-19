// Isi dua nilai ini dari Supabase: Project Settings -> API
//   SUPABASE_URL      = "Project URL"
//   SUPABASE_ANON_KEY = "anon public" key
// anon key AMAN ditaruh di sini selama RLS aktif (lihat supabase/schema.sql).
// JANGAN PERNAH menaruh service_role key di file ini.
const SUPABASE_URL = "https://oukyihgdirsavqjtqzuu.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_v4yu85tE5WCzajJcjyf-2w_4eN0BGF1";

window.db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
