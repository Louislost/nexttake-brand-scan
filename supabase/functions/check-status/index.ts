import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Extract pillar scores from the assistant result
function extractPillarScores(result: any): any {
  try {
    return {
      searchVisibility: result.search_visibility_score || 0,
      digitalAuthority: result.digital_authority_score || 0,
      socialPresence: result.social_presence_score || 0,
      brandMentions: result.brand_mentions_score || 0,
      sentimentAnalysis: result.sentiment_analysis_score || 0,
      contentFootprint: result.content_footprint_score || 0,
      brandConsistency: result.brand_consistency_score || 0,
      competitiveLandscape: result.competitive_landscape_score || 0
    };
  } catch (error) {
    console.error('Error extracting pillar scores:', error);
    return {};
  }
}

// Calculate overall score from pillar scores
function calculateOverallScore(pillarScores: any): number {
  const scores = Object.values(pillarScores).filter((score): score is number => typeof score === 'number');
  if (scores.length === 0) return 0;
  return Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length);
}

// SHA-256 hash function for cache keys
async function hashCacheKey(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { input_id } = await req.json();

    if (!input_id) {
      return new Response(
        JSON.stringify({ error: 'input_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Checking status for input:', input_id);

    // Get the current result from database
    const { data: result, error: resultError } = await supabase
      .from('brand_scans_results')
      .select('thread_id, run_id, status, input_id')
      .eq('input_id', input_id)
      .single();

    if (resultError || !result) {
      console.error('Failed to fetch result:', resultError);
      return new Response(
        JSON.stringify({ error: 'Result not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // If already completed or failed, no need to check
    if (result.status === 'completed' || result.status === 'failed') {
      console.log('Status already final:', result.status);
      return new Response(
        JSON.stringify({ status: result.status }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // If no thread_id or run_id, still processing data collection
    if (!result.thread_id || !result.run_id) {
      console.log('Still collecting data, no thread/run IDs yet');
      return new Response(
        JSON.stringify({ status: 'processing' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check OpenAI run status
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not configured');
    }

    console.log('Checking OpenAI run status:', result.thread_id, result.run_id);

    const statusResponse = await fetch(
      `https://api.openai.com/v1/threads/${result.thread_id}/runs/${result.run_id}`,
      {
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'OpenAI-Beta': 'assistants=v2'
        }
      }
    );

    if (!statusResponse.ok) {
      const errorText = await statusResponse.text();
      console.error('Failed to check OpenAI status:', statusResponse.status, errorText);
      
      await supabase
        .from('brand_scans_results')
        .update({
          status: 'failed',
          error_message: `OpenAI status check failed: ${statusResponse.status}`
        })
        .eq('input_id', input_id);

      return new Response(
        JSON.stringify({ status: 'failed', error: 'Failed to check OpenAI status' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const runStatus = await statusResponse.json();
    console.log('OpenAI run status:', runStatus.status);

    // If still running, return analyzing status
    if (runStatus.status === 'queued' || runStatus.status === 'in_progress') {
      return new Response(
        JSON.stringify({ status: 'analyzing' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // If failed
    if (runStatus.status === 'failed') {
      await supabase
        .from('brand_scans_results')
        .update({
          status: 'failed',
          error_message: 'OpenAI assistant run failed'
        })
        .eq('input_id', input_id);

      return new Response(
        JSON.stringify({ status: 'failed', error: 'OpenAI assistant run failed' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // If completed, fetch the result
    if (runStatus.status === 'completed') {
      console.log('Run completed, fetching messages');

      const messagesResponse = await fetch(
        `https://api.openai.com/v1/threads/${result.thread_id}/messages`,
        {
          headers: {
            'Authorization': `Bearer ${OPENAI_API_KEY}`,
            'OpenAI-Beta': 'assistants=v2'
          }
        }
      );

      if (!messagesResponse.ok) {
        const errorText = await messagesResponse.text();
        console.error('Failed to fetch messages:', messagesResponse.status, errorText);
        throw new Error('Failed to fetch OpenAI messages');
      }

      const messages = await messagesResponse.json();
      const assistantMessages = messages.data.filter((m: any) => m.role === 'assistant');

      if (assistantMessages.length === 0) {
        throw new Error('No assistant response found');
      }

      const lastMessage = assistantMessages[0];
      const textContent = lastMessage.content.find((c: any) => c.type === 'text');

      if (!textContent) {
        throw new Error('No text content in assistant response');
      }

      let assistantResult;
      try {
        assistantResult = JSON.parse(textContent.text.value);
      } catch (parseError) {
        console.error('Failed to parse assistant response:', textContent.text.value);
        throw new Error('Invalid JSON response from assistant');
      }

      // Extract scores
      const pillarScores = extractPillarScores(assistantResult);
      const overallScore = calculateOverallScore(pillarScores);

      console.log('Updating database with final results');

      // Update the database with results
      await supabase
        .from('brand_scans_results')
        .update({
          result_json: assistantResult,
          pillar_scores: pillarScores,
          overall_score: overallScore,
          status: 'completed'
        })
        .eq('input_id', input_id);

      // Get the input data for caching
      const { data: inputData } = await supabase
        .from('brand_scans_inputs')
        .select('brand_name, brand_website_url')
        .eq('id', input_id)
        .single();

      // Get the raw pillars data
      const { data: resultData } = await supabase
        .from('brand_scans_results')
        .select('raw_pillars_json')
        .eq('input_id', input_id)
        .single();

      // Store in cache
      if (inputData && resultData?.raw_pillars_json) {
        const domain = new URL(inputData.brand_website_url).hostname;
        const cacheKey = await hashCacheKey(`${inputData.brand_name}|${domain}`);
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

        await supabase
          .from('brand_scan_cache')
          .upsert({
            cache_key: cacheKey,
            data: {
              pillars: resultData.raw_pillars_json,
              result_json: assistantResult,
              pillar_scores: pillarScores,
              overall_score: overallScore
            },
            expires_at: expiresAt
          }, { onConflict: 'cache_key' });

        console.log('Results cached with key:', cacheKey);
      }

      console.log('Analysis completed for:', input_id);

      return new Response(
        JSON.stringify({ status: 'completed' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Unknown status
    return new Response(
      JSON.stringify({ status: runStatus.status }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in check-status function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
