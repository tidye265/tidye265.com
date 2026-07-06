// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "jsr:@supabase/server@^1";

interface ReqPayload {
  name: string;
}

console.info("server started");

export default {
  fetch: withSupabase({ auth: ["publishable", "secret"] }, async (req, ctx) => {
    const { name }: ReqPayload = await req.json();

    // Using 'sb_secret_xyz' bypasses RLS — use for privileged operations
    if (ctx.authMode === "secret") {
      return Response.json({
        message: `Hello ${name} admin!`,
      });
    }

    return Response.json({
      message: `Hello ${name}!`,
    });
  }),
};
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'); 

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY!);

serve(async (req) => {
  const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, accept',
              'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                };

                  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

                    try {
                        console.log("📥 [FRONTEND FETCH] Client requested game lobby data...");

                            // Kupempha masewera onse omwe ali active komanso asali pa maintenance ku local DB
                                // ⚠️ Tikuwonetsetsa kuti select ili ndi column ya 'trending' yomwe mwawonjezerayo
                                    const { data: games, error: dbError } = await supabase
                                          .from('casino-games')
                                                .select('provider_code, game_symbol, game_name, localized_title, game_image, category, trending')
                                                      .eq('launch_enable', true)
                                                            .eq('under_maintenance', false)
                                                                  .order('game_name', { ascending: true });

                                                                      if (dbError) throw dbError;

                                                                          // KUGANIZA MA CATEGORIES DYNAMICALLY + TRENDING LOGIC
                                                                              const categorizedGames = games.reduce((acc: any, game: any) => {
                                                                                    const categoryName = game.category || 'Other';
                                                                                          
                                                                                                // 1. Ikani game mu Category yake yeniyeni (e.g. 'Slot', 'Live', 'Crash')
                                                                                                      if (!acc[categoryName]) {
                                                                                                              acc[categoryName] = [];
                                                                                                                    }
                                                                                                                          
                                                                                                                                const gamePayload = {
                                                                                                                                        provider_code: game.provider_code,
                                                                                                                                                game_symbol: game.game_symbol,
                                                                                                                                                        game_name: game.game_name,
                                                                                                                                                                localized_title: game.localized_title,
                                                                                                                                                                        game_image: game.game_image
                                                                                                                                                                              };

                                                                                                                                                                                    acc[categoryName].push(gamePayload);
                                                                                                                                                                                          
                                                                                                                                                                                                // 2. 🔥 THE TRENDING INJECTION (Njira yatsopano)
                                                                                                                                                                                                      // Ngati column ya trending ili TRUE, iyikeninso mu gulu la "Trending"
                                                                                                                                                                                                            if (game.trending === true) {
                                                                                                                                                                                                                    if (!acc['Trending']) {
                                                                                                                                                                                                                              acc['Trending'] = []; // Pangani array ya Trending ngati kulibe
                                                                                                                                                                                                                                      }
                                                                                                                                                                                                                                              acc['Trending'].push(gamePayload);
                                                                                                                                                                                                                                                    }
                                                                                                                                                                                                                                                          
                                                                                                                                                                                                                                                                return acc;
                                                                                                                                                                                                                                                                    }, {});

                                                                                                                                                                                                                                                                        // Kubwenzera Frontend exact data yopepuka komanso yadongosolo lamakono
                                                                                                                                                                                                                                                                            return new Response(JSON.stringify({
                                                                                                                                                                                                                                                                                  code: 0,
                                                                                                                                                                                                                                                                                        message: "Ok",
                                                                                                                                                                                                                                                                                              timestamp: Math.floor(Date.now() / 1000),
                                                                                                                                                                                                                                                                                                    data: {
                                                                                                                                                                                                                                                                                                            total_games: games.length,
                                                                                                                                                                                                                                                                                                                    categories: categorizedGames // Izi tsopano zibwera ndi "Trending", "Crash", "Slot", etc.
                                                                                                                                                                                                                                                                                                                          }
                                                                                                                                                                                                                                                                                                                              }), {
                                                                                                                                                                                                                                                                                                                                    status: 200,
                                                                                                                                                                                                                                                                                                                                          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                                                                                                                                                                                                                                                                                                                                              });

                                                                                                                                                                                                                                                                                                                                                } catch (err: any) {
                                                                                                                                                                                                                                                                                                                                                    console.error("❌ Error fetching active games:", err);
                                                                                                                                                                                                                                                                                                                                                        return new Response(JSON.stringify({ error: "Failed to retrieve games", details: err.message }), { 
                                                                                                                                                                                                                                                                                                                                                              status: 500,
                                                                                                                                                                                                                                                                                                                                                                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                                                                                                                                                                                                                                                                                                                                                                        });
                                                                                                                                                                                                                                                                                                                                                                          }
                                                                                                                                                                                                                                                                                                                                                                          });