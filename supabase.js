// supabase.js
// Ma credentials anu a Tidye265 Supabase Project
const SUPABASE_URL = "https://egepxfikpdmpruilzism.supabase.co"; 
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZXB4ZmlrcGRtcHJ1aWx6aXNtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg4MDY1NzgsImV4cCI6MjA5NDM4MjU3OH0.Jf3lQyKMXntcvrdsItEN-mPPTnQFCpJEGikO0cjInEc";
const TABLE_NAME = "users";

// ✅ Onetsetsani kuti izi zilipo pa window kuti dashboard (ndi ma code ena) azitha kuzigwiritsa ntchito
window.SUPABASE_URL = SUPABASE_URL;
window.SUPABASE_ANON_KEY = SUPABASE_ANON_KEY;

// FIX: Pangani Supabase client ndi kumuyika mu window object
if (typeof supabase !== 'undefined') {
    window.supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log("[SUPABASE] Client initialized successfully as window.supabaseClient");
    console.log("[SUPABASE] URL exposed as window.SUPABASE_URL");
} else {
    console.error("[SUPABASE CRITICAL] Supabase CDN library is missing! Make sure script tag for supabase-js is present.");
}
