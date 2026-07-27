// supabase.js - Wokonzedwa kuti akhale yolimba kwa SPA
(function() {
    'use strict';
    // Ngati sizinayikidwe kale, tiyeni tiziyike pa window
    if (typeof window.SUPABASE_URL === 'undefined') {
        const SUPABASE_URL = "https://egepxfikpdmpruilzism.supabase.co";
        const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZXB4ZmlrcGRtcHJ1aWx6aXNtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg4MDY1NzgsImV4cCI6MjA5NDM4MjU3OH0.Jf3lQyKMXntcvrdsItEN-mPPTnQFCpJEGikO0cjInEc";
        const TABLE_NAME = "users";

        window.SUPABASE_URL = SUPABASE_URL;
        window.SUPABASE_ANON_KEY = SUPABASE_ANON_KEY;
        window.TABLE_NAME = TABLE_NAME;
        console.log("[SUPABASE] ✅ Variables exposed globally.");
    } else {
        console.log("[SUPABASE] ℹ️ Variables already present, skipping re-initialization.");
    }

    // FIX: Pangani Supabase client ndi kumuyika mu window object
    if (typeof supabase !== 'undefined') {
        if (!window.supabaseClient) {
            window.supabaseClient = supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
            console.log("[SUPABASE] Client initialized successfully.");
        }
    } else {
        console.error("[SUPABASE CRITICAL] Supabase CDN library is missing! Make sure script tag for supabase-js is present in layout.");
    }
})();
