// supabase.js
// Ma credentials anu a Tidye265 Supabase Project
const SUPABASE_URL = "https://egepxfikpdmpruilzism.supabase.co"; 
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZXB4ZmlrcGRtcHJ1aWx6aXNtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg4MDY1NzgsImV4cCI6MjA5NDM4MjU3OH0.Jf3lQyKMXntcvrdsItEN-mPPTnQFCpJEGikO0cjInEc";
const TABLE_NAME = "users"; // Wasungidwa ngati pakufunika kutsogolo

// FIX: Kupanga client ndikuwonetsetsa kuti ili mu global window scope ngati 'supabaseClient'
if (typeof supabase !== 'undefined') {
    window.supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log("[SUPABASE] Client initialized successfully as window.supabaseClient");
} else {
    console.error("[SUPABASE CRITICAL] Supabase CDN library is missing! Load index.html first.");
}
