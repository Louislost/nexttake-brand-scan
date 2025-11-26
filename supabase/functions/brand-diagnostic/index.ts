import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { brandName, websiteUrl, instagram, x, linkedin, tiktok, industry, market } = await req.json();
    
    console.log('Starting brand diagnostic for:', brandName);

    // Store input
    const { data: inputData, error: inputError } = await supabase
      .from('brand_scans_inputs')
      .insert({
        brand_name: brandName,
        brand_website_url: websiteUrl,
        instagram,
        x,
        linkedin,
        tiktok,
        industry,
        market,
        user_agent: req.headers.get('user-agent'),
        ip_address: req.headers.get('x-forwarded-for')
      })
      .select()
      .single();

    if (inputError || !inputData) {
      throw new Error(`Failed to store input: ${inputError?.message}`);
    }

    const inputId = inputData.id;

    // Create initial result record
    await supabase
      .from('brand_scans_results')
      .insert({
        input_id: inputId,
        status: 'processing'
      });

    // Process in background
    processBrandDiagnostic(supabase, inputId, {
      brandName,
      websiteUrl,
      instagram,
      x,
      linkedin,
      tiktok,
      industry,
      market
    }).catch(error => {
      console.error('Background processing error:', error);
    });

    return new Response(
      JSON.stringify({ input_id: inputId, status: 'processing' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in brand-diagnostic:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function processBrandDiagnostic(supabase: any, inputId: string, data: any) {
  try {
    console.log('Processing brand diagnostic for input:', inputId);

    // Parallel data collection
    const [
      websiteData,
      wikipediaData,
      waybackData,
      duckduckgoData,
      socialData
    ] = await Promise.all([
      fetchWebsiteData(data.websiteUrl),
      fetchWikipediaData(data.brandName),
      fetchWaybackData(data.websiteUrl),
      fetchDuckDuckGoData(data.brandName),
      fetchSocialMediaData({
        instagram: data.instagram,
        x: data.x,
        linkedin: data.linkedin,
        tiktok: data.tiktok
      })
    ]);

    // Aggregate 8 pillars
    const pillars = aggregatePillars({
      brandName: data.brandName,
      websiteUrl: data.websiteUrl,
      websiteData,
      wikipediaData,
      waybackData,
      duckduckgoData,
      socialData,
      industry: data.industry,
      market: data.market
    });

    console.log('Pillars aggregated:', Object.keys(pillars));

    // Build payload for OpenAI Assistant
    const aiPayload = buildAIPayload(data.brandName, pillars);

    // Call OpenAI Assistant API v2
    const assistantResult = await callOpenAIAssistant(aiPayload);

    // Extract scores from assistant response
    const pillarScores = extractPillarScores(assistantResult);
    const overallScore = calculateOverallScore(pillarScores);

    // Update result
    await supabase
      .from('brand_scans_results')
      .update({
        result_json: assistantResult,
        pillar_scores: pillarScores,
        overall_score: overallScore,
        status: 'completed'
      })
      .eq('input_id', inputId);

    console.log('Brand diagnostic completed for:', inputId);

  } catch (error) {
    console.error('Error processing brand diagnostic:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    await supabase
      .from('brand_scans_results')
      .update({
        status: 'failed',
        error_message: errorMessage
      })
      .eq('input_id', inputId);
  }
}

async function fetchWebsiteData(url: string) {
  try {
    console.log('Fetching website:', url);
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; BrandDiagnostic/1.0)'
      }
    });
    
    const html = await response.text();
    
    // Extract metadata using regex (graceful fallback without HTML parser)
    const metadata = {
      title: html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1] || '',
      description: html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i)?.[1] || '',
      ogTitle: html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i)?.[1] || '',
      ogDescription: html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i)?.[1] || '',
      rss: html.match(/type=["']application\/rss\+xml["'][^>]*href=["']([^"']+)["']/i)?.[1] || null,
      hasContactPage: /contact|kontakt|nous-contacter/i.test(html),
      hasAboutPage: /about|à-propos|über-uns/i.test(html)
    };

    return { success: true, metadata, htmlLength: html.length };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Website fetch failed:', errorMessage);
    return { success: false, error: errorMessage };
  }
}

async function fetchWikipediaData(brandName: string) {
  try {
    console.log('Fetching Wikipedia for:', brandName);
    const response = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(brandName)}`
    );
    
    if (response.ok) {
      const data = await response.json();
      return { 
        success: true, 
        exists: true,
        title: data.title,
        extract: data.extract,
        pageUrl: data.content_urls?.desktop?.page
      };
    }
    
    return { success: true, exists: false };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Wikipedia fetch failed:', errorMessage);
    return { success: false, error: errorMessage };
  }
}

async function fetchWaybackData(url: string) {
  try {
    console.log('Fetching Wayback Machine for:', url);
    const response = await fetch(
      `https://archive.org/wayback/available?url=${encodeURIComponent(url)}`
    );
    
    const data = await response.json();
    
    if (data.archived_snapshots?.closest) {
      const snapshot = data.archived_snapshots.closest;
      return {
        success: true,
        available: true,
        timestamp: snapshot.timestamp,
        url: snapshot.url
      };
    }
    
    return { success: true, available: false };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Wayback fetch failed:', errorMessage);
    return { success: false, error: errorMessage };
  }
}

async function fetchDuckDuckGoData(brandName: string) {
  try {
    console.log('Fetching DuckDuckGo for:', brandName);
    
    // Attempt basic search (will likely be blocked or rate-limited)
    const response = await fetch(
      `https://html.duckduckgo.com/html/?q=${encodeURIComponent(brandName)}`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; BrandDiagnostic/1.0)'
        }
      }
    );
    
    if (response.ok) {
      const html = await response.text();
      // Basic result count estimation
      const resultMatches = html.match(/result__/g);
      return {
        success: true,
        resultsEstimate: resultMatches ? resultMatches.length : 0
      };
    }
    
    return { success: false, blocked: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('DuckDuckGo fetch failed (expected):', errorMessage);
    return { success: false, error: errorMessage };
  }
}

async function fetchSocialMediaData(handles: any) {
  // Social media scraping is blocked - return graceful fallbacks
  console.log('Social media data collection (graceful fallback)');
  
  const results: any = {
    instagram: null,
    x: null,
    linkedin: null,
    tiktok: null
  };

  // We can only verify if URLs are provided
  if (handles.instagram) {
    results.instagram = { provided: true, handle: handles.instagram };
  }
  if (handles.x) {
    results.x = { provided: true, handle: handles.x };
  }
  if (handles.linkedin) {
    results.linkedin = { provided: true, handle: handles.linkedin };
  }
  if (handles.tiktok) {
    results.tiktok = { provided: true, handle: handles.tiktok };
  }

  return results;
}

function aggregatePillars(data: any) {
  const pillars: any = {};

  // Pillar 1: Search Visibility
  pillars.searchVisibility = {
    name: "Search Visibility",
    sources: {
      duckduckgo: data.duckduckgoData?.success ? 'available' : 'blocked',
      resultsCount: data.duckduckgoData?.resultsEstimate || 0
    },
    status: data.duckduckgoData?.success ? 'partial' : 'limited'
  };

  // Pillar 2: Digital Authority
  pillars.digitalAuthority = {
    name: "Digital Authority",
    sources: {
      wikipedia: data.wikipediaData?.exists ? 'found' : 'not_found',
      wikipediaExtract: data.wikipediaData?.extract || null,
      waybackArchive: data.waybackData?.available ? 'archived' : 'not_archived',
      waybackTimestamp: data.waybackData?.timestamp || null
    },
    status: 'available'
  };

  // Pillar 3: Social Presence
  pillars.socialPresence = {
    name: "Social Presence",
    sources: {
      instagram: data.socialData?.instagram?.provided ? 'provided' : 'missing',
      x: data.socialData?.x?.provided ? 'provided' : 'missing',
      linkedin: data.socialData?.linkedin?.provided ? 'provided' : 'missing',
      tiktok: data.socialData?.tiktok?.provided ? 'provided' : 'missing'
    },
    status: 'partial'
  };

  // Pillar 4: Brand Mentions
  pillars.brandMentions = {
    name: "Brand Mentions",
    sources: {
      searchResults: data.duckduckgoData?.resultsEstimate || 0
    },
    status: 'limited'
  };

  // Pillar 5: Sentiment Analysis
  pillars.sentimentAnalysis = {
    name: "Sentiment Analysis",
    sources: {
      websiteContent: data.websiteData?.success ? 'available' : 'unavailable'
    },
    status: data.websiteData?.success ? 'partial' : 'limited'
  };

  // Pillar 6: Content Footprint
  pillars.contentFootprint = {
    name: "Content Footprint",
    sources: {
      website: data.websiteData?.success ? 'available' : 'unavailable',
      rss: data.websiteData?.metadata?.rss ? 'found' : 'not_found',
      htmlSize: data.websiteData?.htmlLength || 0
    },
    status: data.websiteData?.success ? 'available' : 'limited'
  };

  // Pillar 7: Brand Consistency
  pillars.brandConsistency = {
    name: "Brand Consistency",
    sources: {
      websiteMetadata: data.websiteData?.metadata || {},
      multipleProfiles: Object.values(data.socialData || {}).filter((v: any) => v?.provided).length
    },
    status: 'partial'
  };

  // Pillar 8: Competitive Landscape
  pillars.competitiveLandscape = {
    name: "Competitive Landscape",
    sources: {
      industry: data.industry || 'unknown',
      market: data.market || 'unknown'
    },
    status: 'available'
  };

  return pillars;
}

function buildAIPayload(brandName: string, pillars: any) {
  return {
    brand_name: brandName,
    pillars: pillars,
    instructions: `Analyze this brand diagnostic data and provide scores (0-100) for each of the 8 pillars:
    1. Search Visibility
    2. Digital Authority
    3. Social Presence
    4. Brand Mentions
    5. Sentiment Analysis
    6. Content Footprint
    7. Brand Consistency
    8. Competitive Landscape
    
    Consider that some data sources may be limited or blocked. Focus on available data and provide insights.
    Return a structured JSON response with scores and recommendations for each pillar.`
  };
}

async function callOpenAIAssistant(payload: any) {
  const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
  const ASSISTANT_ID = 'asst_b7HEiJmlfVfr2j2yWRfJm4Wb';

  console.log('Creating thread...');
  
  // Create thread
  const threadResponse = await fetch('https://api.openai.com/v1/threads', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
      'OpenAI-Beta': 'assistants=v2'
    },
    body: JSON.stringify({})
  });

  const thread = await threadResponse.json();
  const threadId = thread.id;

  console.log('Adding message to thread:', threadId);

  // Add message
  await fetch(`https://api.openai.com/v1/threads/${threadId}/messages`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
      'OpenAI-Beta': 'assistants=v2'
    },
    body: JSON.stringify({
      role: 'user',
      content: JSON.stringify(payload)
    })
  });

  console.log('Creating run...');

  // Create run
  const runResponse = await fetch(`https://api.openai.com/v1/threads/${threadId}/runs`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
      'OpenAI-Beta': 'assistants=v2'
    },
    body: JSON.stringify({
      assistant_id: ASSISTANT_ID
    })
  });

  const run = await runResponse.json();
  const runId = run.id;

  console.log('Polling for completion...');

  // Poll for completion
  let runStatus = run.status;
  let attempts = 0;
  const maxAttempts = 60; // 5 minutes max

  while (runStatus !== 'completed' && runStatus !== 'failed' && attempts < maxAttempts) {
    await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
    
    const statusResponse = await fetch(`https://api.openai.com/v1/threads/${threadId}/runs/${runId}`, {
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'OpenAI-Beta': 'assistants=v2'
      }
    });

    const statusData = await statusResponse.json();
    runStatus = statusData.status;
    attempts++;
    
    console.log(`Run status: ${runStatus} (attempt ${attempts}/${maxAttempts})`);
  }

  if (runStatus !== 'completed') {
    throw new Error(`Assistant run failed with status: ${runStatus}`);
  }

  console.log('Retrieving messages...');

  // Get messages
  const messagesResponse = await fetch(`https://api.openai.com/v1/threads/${threadId}/messages`, {
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'OpenAI-Beta': 'assistants=v2'
    }
  });

  const messages = await messagesResponse.json();
  const assistantMessage = messages.data.find((m: any) => m.role === 'assistant');

  if (!assistantMessage) {
    throw new Error('No assistant response found');
  }

  const textContent = assistantMessage.content.find((c: any) => c.type === 'text');
  const responseText = textContent?.text?.value || '';

  // Try to parse JSON from response
  try {
    return JSON.parse(responseText);
  } catch {
    // If not JSON, return as text
    return { raw_response: responseText };
  }
}

function extractPillarScores(assistantResult: any) {
  // Extract scores from assistant response
  const scores: any = {
    searchVisibility: assistantResult.search_visibility_score || 50,
    digitalAuthority: assistantResult.digital_authority_score || 50,
    socialPresence: assistantResult.social_presence_score || 50,
    brandMentions: assistantResult.brand_mentions_score || 50,
    sentimentAnalysis: assistantResult.sentiment_analysis_score || 50,
    contentFootprint: assistantResult.content_footprint_score || 50,
    brandConsistency: assistantResult.brand_consistency_score || 50,
    competitiveLandscape: assistantResult.competitive_landscape_score || 50
  };

  return scores;
}

function calculateOverallScore(pillarScores: any) {
  const scores = Object.values(pillarScores) as number[];
  return Math.round(scores.reduce((a: number, b: number) => a + b, 0) / scores.length);
}
