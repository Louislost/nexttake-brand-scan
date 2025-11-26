import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ============= UTILITY FUNCTIONS =============
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// MD5 hash function for cache keys
async function md5(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('MD5', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Helper function to log fetch results for internal debugging
async function logFetchResult(
  supabase: any,
  inputId: string,
  source: string,
  status: 'success' | 'failed' | 'blocked' | 'timeout',
  durationMs: number,
  errorMessage: string | null = null,
  dataSize: number | null = null
) {
  try {
    await supabase
      .from('brand_scan_logs')
      .insert({
        input_id: inputId,
        source,
        status,
        duration_ms: durationMs,
        error_message: errorMessage,
        data_size: dataSize
      });
  } catch (logError) {
    console.error(`Failed to log ${source}:`, logError);
  }
}

async function fetchWithRetry(
  url: string, 
  options: RequestInit = {}, 
  maxRetries: number = 3
): Promise<Response> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);
      
      // If rate limited, wait and retry
      if (response.status === 429) {
        const waitTime = Math.pow(2, attempt) * 1000; // Exponential backoff
        console.log(`Rate limited on ${url}, retrying in ${waitTime}ms (attempt ${attempt + 1}/${maxRetries})`);
        await delay(waitTime);
        continue;
      }
      
      return response;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error');
      
      if (attempt < maxRetries - 1) {
        const waitTime = Math.pow(2, attempt) * 1000;
        console.log(`Fetch failed for ${url}, retrying in ${waitTime}ms (attempt ${attempt + 1}/${maxRetries}):`, lastError.message);
        await delay(waitTime);
      }
    }
  }
  
  throw lastError || new Error('Max retries exceeded');
}

// ============= WEBHOOK NOTIFICATION =============
async function sendWebhookNotification(webhookUrl: string, payload: any) {
  try {
    console.log('Sending webhook notification to:', webhookUrl);
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'BrandDiagnostic/1.0'
      },
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
      console.error('Webhook notification failed:', response.status, response.statusText);
    } else {
      console.log('Webhook notification sent successfully');
    }
  } catch (error) {
    console.error('Webhook notification error:', error);
  }
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

    const { brandName, websiteUrl, instagram, x, linkedin, tiktok, industry, market, webhookUrl } = await req.json();
    
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
        webhook_url: webhookUrl || null,
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
      market,
      webhookUrl
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
    const startTime = Date.now();

    // ============= PHASE 1: CHECK CACHE =============
    const domain = new URL(data.websiteUrl).hostname;
    const cacheKey = await md5(`${data.brandName}|${domain}`);
    
    console.log('Checking cache with key:', cacheKey);
    const { data: cachedData, error: cacheError } = await supabase
      .from('brand_scan_cache')
      .select('*')
      .eq('cache_key', cacheKey)
      .gte('expires_at', new Date().toISOString())
      .single();

    if (cachedData && !cacheError) {
      console.log('Cache hit! Returning cached results');
      const cached = cachedData.data;
      
      await supabase
        .from('brand_scans_results')
        .update({
          raw_pillars_json: cached.pillars,
          result_json: cached.result_json,
          pillar_scores: cached.pillar_scores,
          overall_score: cached.overall_score,
          status: 'completed'
        })
        .eq('input_id', inputId);

      // Send webhook if provided
      if (data.webhookUrl) {
        await sendWebhookNotification(data.webhookUrl, {
          input_id: inputId,
          status: 'completed',
          overall_score: cached.overall_score,
          pillar_scores: cached.pillar_scores,
          brand_name: data.brandName,
          cached: true
        });
      }

      console.log('Cached result returned for:', inputId);
      return;
    }

    console.log('Cache miss, proceeding with full analysis');

    // ============= PHASE 2: PARALLEL DATA COLLECTION =============
    const [websiteData, rssData, wikipediaData, waybackData, socialData, 
           rdapData, httpsCheckData, hackerNewsData, techStackData] = await Promise.all([
      (async () => {
        const fetchStart = Date.now();
        try {
          const result = await fetchWebsiteData(data.websiteUrl);
          await logFetchResult(supabase, inputId, 'website', result ? 'success' : 'failed', Date.now() - fetchStart, null, result ? JSON.stringify(result).length : 0);
          return result;
        } catch (err) {
          await logFetchResult(supabase, inputId, 'website', 'failed', Date.now() - fetchStart, err instanceof Error ? err.message : 'Unknown error', 0);
          return null;
        }
      })(),
      (async () => {
        const fetchStart = Date.now();
        try {
          const result = await fetchRSSFeed(data.websiteUrl);
          await logFetchResult(supabase, inputId, 'rss', result ? 'success' : 'failed', Date.now() - fetchStart, null, result ? JSON.stringify(result).length : 0);
          return result;
        } catch (err) {
          await logFetchResult(supabase, inputId, 'rss', 'failed', Date.now() - fetchStart, err instanceof Error ? err.message : 'Unknown error', 0);
          return null;
        }
      })(),
      (async () => {
        const fetchStart = Date.now();
        try {
          const result = await fetchWikipediaData(data.brandName);
          await logFetchResult(supabase, inputId, 'wikipedia', result ? 'success' : 'failed', Date.now() - fetchStart, null, result ? JSON.stringify(result).length : 0);
          return result;
        } catch (err) {
          await logFetchResult(supabase, inputId, 'wikipedia', 'failed', Date.now() - fetchStart, err instanceof Error ? err.message : 'Unknown error', 0);
          return null;
        }
      })(),
      (async () => {
        const fetchStart = Date.now();
        try {
          const result = await fetchWaybackData(data.websiteUrl);
          await logFetchResult(supabase, inputId, 'wayback', result ? 'success' : 'failed', Date.now() - fetchStart, null, result ? JSON.stringify(result).length : 0);
          return result;
        } catch (err) {
          await logFetchResult(supabase, inputId, 'wayback', 'failed', Date.now() - fetchStart, err instanceof Error ? err.message : 'Unknown error', 0);
          return null;
        }
      })(),
      (async () => {
        const fetchStart = Date.now();
        try {
          const result = await fetchSocialMediaData({
            instagram: data.instagram,
            x: data.x,
            linkedin: data.linkedin,
            tiktok: data.tiktok
          });
          await logFetchResult(supabase, inputId, 'social_media', 'success', Date.now() - fetchStart, null, JSON.stringify(result).length);
          return result;
        } catch (err) {
          await logFetchResult(supabase, inputId, 'social_media', 'failed', Date.now() - fetchStart, err instanceof Error ? err.message : 'Unknown error', 0);
          return { instagram: null, x: null, linkedin: null, tiktok: null };
        }
      })(),
      // Reliable free data sources
      (async () => {
        const fetchStart = Date.now();
        try {
          const result = await fetchRDAPWhois(domain);
          await logFetchResult(supabase, inputId, 'rdap_whois', result ? 'success' : 'failed', Date.now() - fetchStart, null, result ? JSON.stringify(result).length : 0);
          return result;
        } catch (err) {
          await logFetchResult(supabase, inputId, 'rdap_whois', 'failed', Date.now() - fetchStart, err instanceof Error ? err.message : 'Unknown error', 0);
          return null;
        }
      })(),
      (async () => {
        const fetchStart = Date.now();
        try {
          const result = await checkHTTPSAvailable(domain);
          await logFetchResult(supabase, inputId, 'https_check', result ? 'success' : 'failed', Date.now() - fetchStart, null, result ? JSON.stringify(result).length : 0);
          return result;
        } catch (err) {
          await logFetchResult(supabase, inputId, 'https_check', 'failed', Date.now() - fetchStart, err instanceof Error ? err.message : 'Unknown error', 0);
          return null;
        }
      })(),
      (async () => {
        const fetchStart = Date.now();
        try {
          const result = await fetchHackerNews(data.brandName);
          await logFetchResult(supabase, inputId, 'hackernews', result ? 'success' : 'failed', Date.now() - fetchStart, null, result ? JSON.stringify(result).length : 0);
          return result;
        } catch (err) {
          await logFetchResult(supabase, inputId, 'hackernews', 'failed', Date.now() - fetchStart, err instanceof Error ? err.message : 'Unknown error', 0);
          return null;
        }
      })(),
      (async () => {
        const fetchStart = Date.now();
        try {
          const result = await detectTechStack(data.websiteUrl);
          await logFetchResult(supabase, inputId, 'tech_stack', result ? 'success' : 'failed', Date.now() - fetchStart, null, result ? JSON.stringify(result).length : 0);
          return result;
        } catch (err) {
          await logFetchResult(supabase, inputId, 'tech_stack', 'failed', Date.now() - fetchStart, err instanceof Error ? err.message : 'Unknown error', 0);
          return null;
        }
      })()
    ]);

    // Sequential DuckDuckGo queries with delays to avoid rate limits
    console.log('Starting staggered DuckDuckGo queries (1.5s delays between queries)');
    
    const fetchDDG = async (fetchFn: () => Promise<any>, type: string) => {
      const fetchStart = Date.now();
      try {
        const result = await fetchFn();
        await logFetchResult(supabase, inputId, `duckduckgo_${type}`, result ? 'success' : 'failed', Date.now() - fetchStart, null, result ? JSON.stringify(result).length : 0);
        return result;
      } catch (err) {
        await logFetchResult(supabase, inputId, `duckduckgo_${type}`, 'failed', Date.now() - fetchStart, err instanceof Error ? err.message : 'Unknown error', 0);
        return null;
      }
    };
    
    const duckduckgoMain = await fetchDDG(() => fetchDuckDuckGoMain(data.brandName), 'main');
    await delay(1500);
    
    const duckduckgoNews = await fetchDDG(() => fetchDuckDuckGoNews(data.brandName), 'news');
    await delay(1500);
    
    const duckduckgoComplaints = await fetchDDG(() => fetchDuckDuckGoComplaints(data.brandName), 'complaints');
    await delay(1500);
    
    const duckduckgoReviews = await fetchDDG(() => fetchDuckDuckGoReviews(data.brandName), 'reviews');
    await delay(1500);
    
    const duckduckgoAlternatives = await fetchDDG(() => fetchDuckDuckGoAlternatives(data.brandName), 'alternatives');
    await delay(1500);
    
    const duckduckgoContent = await fetchDDG(() => fetchDuckDuckGoContent(data.brandName), 'content');

    // ============= PHASE 3: AGGREGATE PILLARS =============
    const pillars = aggregatePillars({
      brandName: data.brandName,
      websiteUrl: data.websiteUrl,
      websiteData,
      rssData,
      wikipediaData,
      waybackData,
      duckduckgoData: {
        main: duckduckgoMain,
        news: duckduckgoNews,
        complaints: duckduckgoComplaints,
        reviews: duckduckgoReviews,
        alternatives: duckduckgoAlternatives,
        content: duckduckgoContent
      },
      socialData,
      rdapData,
      httpsCheckData,
      hackerNewsData,
      techStackData,
      industry: data.industry,
      market: data.market
    });

    console.log('Pillars aggregated:', Object.keys(pillars));

    // Store raw pillars data before AI processing
    console.log('Storing raw pillars data...');
    await supabase
      .from('brand_scans_results')
      .update({ raw_pillars_json: pillars })
      .eq('input_id', inputId);

    // ============= PHASE 4: AI ANALYSIS =============
    const aiPayload = buildAIPayload(data.brandName, pillars);
    const assistantResult = await callOpenAIAssistant(aiPayload);

    // Extract scores from assistant response
    const pillarScores = extractPillarScores(assistantResult);
    const overallScore = calculateOverallScore(pillarScores);

    // ============= PHASE 5: UPDATE RESULTS =============
    await supabase
      .from('brand_scans_results')
      .update({
        result_json: assistantResult,
        pillar_scores: pillarScores,
        overall_score: overallScore,
        status: 'completed'
      })
      .eq('input_id', inputId);

    // ============= PHASE 6: STORE IN CACHE =============
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    await supabase
      .from('brand_scan_cache')
      .upsert({
        cache_key: cacheKey,
        data: { pillars, result_json: assistantResult, pillar_scores: pillarScores, overall_score: overallScore },
        expires_at: expiresAt
      }, { onConflict: 'cache_key' });

    console.log('Results cached with key:', cacheKey);

    // ============= PHASE 7: SEND WEBHOOK =============
    if (data.webhookUrl) {
      await sendWebhookNotification(data.webhookUrl, {
        input_id: inputId,
        status: 'completed',
        overall_score: overallScore,
        pillar_scores: pillarScores,
        brand_name: data.brandName,
        cached: false
      });
    }

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

    // Send webhook with failure status
    if (data.webhookUrl) {
      await sendWebhookNotification(data.webhookUrl, {
        input_id: inputId,
        status: 'failed',
        error: errorMessage,
        brand_name: data.brandName
      });
    }
  }
}

// ============= RELIABLE FREE DATA FETCHERS =============

async function fetchRDAPWhois(domain: string) {
  try {
    console.log('Fetching RDAP/WHOIS for:', domain);
    const response = await fetchWithRetry(`https://rdap.org/domain/${domain}`, {}, 2);
    
    if (!response.ok) {
      return { success: false, error: `Status ${response.status}` };
    }
    
    const data = await response.json();
    
    return {
      success: true,
      registration_date: data.events?.find((e: any) => e.eventAction === 'registration')?.eventDate || null,
      registrar: data.entities?.[0]?.vcardArray?.[1]?.find((v: any) => v[0] === 'fn')?.[3] || null,
      expires: data.events?.find((e: any) => e.eventAction === 'expiration')?.eventDate || null
    };
  } catch (error) {
    console.error('RDAP fetch failed:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

async function checkHTTPSAvailable(domain: string) {
  try {
    console.log('Checking HTTPS availability for:', domain);
    const response = await fetchWithRetry(`https://${domain}`, { method: 'HEAD' }, 1);
    
    return {
      success: true,
      https_available: response.ok,
      status: response.status
    };
  } catch (error) {
    console.error('HTTPS check failed:', error);
    return { success: false, https_available: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

async function fetchHackerNews(brandName: string) {
  try {
    console.log('Fetching Hacker News for:', brandName);
    const response = await fetchWithRetry(
      `https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(brandName)}&hitsPerPage=10`,
      {},
      2
    );
    
    if (!response.ok) {
      return { success: false, error: `Status ${response.status}` };
    }
    
    const data = await response.json();
    
    return {
      success: true,
      hits: data.hits?.map((hit: any) => ({
        title: hit.title,
        points: hit.points,
        num_comments: hit.num_comments,
        url: hit.url || `https://news.ycombinator.com/item?id=${hit.objectID}`
      })) || [],
      nbHits: data.nbHits || 0
    };
  } catch (error) {
    console.error('Hacker News fetch failed:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

async function detectTechStack(websiteUrl: string) {
  try {
    console.log('Detecting technologies for:', websiteUrl);
    const response = await fetchWithRetry(websiteUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; BrandDiagnostic/1.0)'
      }
    }, 1);
    
    const html = await response.text();
    
    // Detect common technologies from HTML
    const technologies = [];
    
    if (/react/i.test(html)) technologies.push('React');
    if (/vue/i.test(html)) technologies.push('Vue.js');
    if (/angular/i.test(html)) technologies.push('Angular');
    if (/wordpress/i.test(html)) technologies.push('WordPress');
    if (/shopify/i.test(html)) technologies.push('Shopify');
    if (/wix/i.test(html)) technologies.push('Wix');
    if (/squarespace/i.test(html)) technologies.push('Squarespace');
    if (/jquery/i.test(html)) technologies.push('jQuery');
    if (/bootstrap/i.test(html)) technologies.push('Bootstrap');
    if (/tailwind/i.test(html)) technologies.push('Tailwind CSS');
    
    return {
      success: true,
      technologies
    };
  } catch (error) {
    console.error('Tech stack detection failed:', error);
    return { success: false, technologies: [], error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// ============= ENHANCED WEBSITE METADATA EXTRACTION =============
async function fetchWebsiteData(url: string) {
  try {
    console.log('Fetching website:', url);
    const response = await fetchWithRetry(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; BrandDiagnostic/1.0)'
      }
    });
    
    const html = await response.text();
    
    // Extract comprehensive metadata
    const metadata = {
      // Standard meta tags
      title: html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim() || '',
      description: html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i)?.[1]?.trim() || '',
      keywords: html.match(/<meta[^>]*name=["']keywords["'][^>]*content=["']([^"']+)["']/i)?.[1]?.trim() || '',
      author: html.match(/<meta[^>]*name=["']author["'][^>]*content=["']([^"']+)["']/i)?.[1]?.trim() || '',
      robots: html.match(/<meta[^>]*name=["']robots["'][^>]*content=["']([^"']+)["']/i)?.[1]?.trim() || '',
      
      // Open Graph tags
      ogTitle: html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i)?.[1]?.trim() || '',
      ogDescription: html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i)?.[1]?.trim() || '',
      ogImage: html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i)?.[1]?.trim() || '',
      ogUrl: html.match(/<meta[^>]*property=["']og:url["'][^>]*content=["']([^"']+)["']/i)?.[1]?.trim() || '',
      ogType: html.match(/<meta[^>]*property=["']og:type["'][^>]*content=["']([^"']+)["']/i)?.[1]?.trim() || '',
      ogSiteName: html.match(/<meta[^>]*property=["']og:site_name["'][^>]*content=["']([^"']+)["']/i)?.[1]?.trim() || '',
      
      // Twitter Card tags
      twitterCard: html.match(/<meta[^>]*name=["']twitter:card["'][^>]*content=["']([^"']+)["']/i)?.[1]?.trim() || '',
      twitterSite: html.match(/<meta[^>]*name=["']twitter:site["'][^>]*content=["']([^"']+)["']/i)?.[1]?.trim() || '',
      twitterTitle: html.match(/<meta[^>]*name=["']twitter:title["'][^>]*content=["']([^"']+)["']/i)?.[1]?.trim() || '',
      twitterDescription: html.match(/<meta[^>]*name=["']twitter:description["'][^>]*content=["']([^"']+)["']/i)?.[1]?.trim() || '',
      twitterImage: html.match(/<meta[^>]*name=["']twitter:image["'][^>]*content=["']([^"']+)["']/i)?.[1]?.trim() || '',
      
      // Link tags
      canonical: html.match(/<link[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)["']/i)?.[1]?.trim() || '',
      favicon: html.match(/<link[^>]*rel=["'](?:icon|shortcut icon)["'][^>]*href=["']([^"']+)["']/i)?.[1]?.trim() || '',
      rssUrl: html.match(/<link[^>]*type=["']application\/(?:rss|atom)\+xml["'][^>]*href=["']([^"']+)["']/i)?.[1]?.trim() || null,
      
      // HTML structure detection
      hasContactPage: /contact|kontakt|nous-contacter/i.test(html),
      hasAboutPage: /about|à-propos|über-uns/i.test(html),
      hasBlogSection: /blog|articles|news|actualités/i.test(html),
      
      // Schema.org structured data
      schemaOrg: extractSchemaOrg(html)
    };

    return { success: true, metadata, htmlLength: html.length };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Website fetch failed:', errorMessage);
    return { success: false, error: errorMessage };
  }
}

function extractSchemaOrg(html: string) {
  try {
    const schemaMatches = html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
    if (!schemaMatches) return null;
    
    const schemas = [];
    for (const match of schemaMatches) {
      const jsonContent = match.replace(/<script[^>]*>/i, '').replace(/<\/script>/i, '').trim();
      try {
        const parsed = JSON.parse(jsonContent);
        schemas.push(parsed);
      } catch {
        // Skip invalid JSON
      }
    }
    return schemas.length > 0 ? schemas : null;
  } catch {
    return null;
  }
}

// ============= RSS FEED PARSING =============
async function fetchRSSFeed(websiteUrl: string) {
  try {
    console.log('Detecting RSS feed for:', websiteUrl);
    
    // First fetch the website to detect RSS URL
    const response = await fetchWithRetry(websiteUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; BrandDiagnostic/1.0)'
      }
    });
    const html = await response.text();
    
    // Find RSS feed URL
    const rssUrlMatch = html.match(/<link[^>]*type=["']application\/(?:rss|atom)\+xml["'][^>]*href=["']([^"']+)["']/i);
    if (!rssUrlMatch) {
      console.log('No RSS feed found');
      return { success: true, found: false };
    }
    
    let rssUrl = rssUrlMatch[1].trim();
    
    // Handle relative URLs
    if (rssUrl.startsWith('/')) {
      const urlObj = new URL(websiteUrl);
      rssUrl = `${urlObj.protocol}//${urlObj.host}${rssUrl}`;
    } else if (!rssUrl.startsWith('http')) {
      const urlObj = new URL(websiteUrl);
      rssUrl = `${urlObj.protocol}//${urlObj.host}/${rssUrl}`;
    }
    
    console.log('Fetching RSS feed:', rssUrl);
    
    // Fetch the RSS feed
    const rssResponse = await fetchWithRetry(rssUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; BrandDiagnostic/1.0)'
      }
    });
    
    if (!rssResponse.ok) {
      return { success: true, found: true, fetchFailed: true, rssUrl };
    }
    
    const rssXml = await rssResponse.text();
    
    // Parse RSS items (basic XML parsing with regex)
    const items = [];
    const itemMatches = rssXml.matchAll(/<item[^>]*>([\s\S]*?)<\/item>/gi);
    
    for (const itemMatch of itemMatches) {
      const itemContent = itemMatch[1];
      const item = {
        title: itemContent.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/, '$1').trim() || '',
        link: itemContent.match(/<link[^>]*>([\s\S]*?)<\/link>/i)?.[1]?.trim() || '',
        pubDate: itemContent.match(/<pubDate[^>]*>([\s\S]*?)<\/pubDate>/i)?.[1]?.trim() || '',
        description: itemContent.match(/<description[^>]*>([\s\S]*?)<\/description>/i)?.[1]?.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/, '$1').trim() || ''
      };
      items.push(item);
      
      // Limit to 10 items
      if (items.length >= 10) break;
    }
    
    // Calculate publishing frequency
    const frequency = calculatePublishingFrequency(items);
    
    return {
      success: true,
      found: true,
      rssUrl,
      itemsCount: items.length,
      recentPosts: items,
      frequency
    };
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('RSS fetch failed:', errorMessage);
    return { success: false, error: errorMessage };
  }
}

function calculatePublishingFrequency(items: any[]) {
  if (items.length < 2) return 'unknown';
  
  try {
    const dates = items
      .map(item => item.pubDate ? new Date(item.pubDate).getTime() : null)
      .filter(d => d !== null && !isNaN(d))
      .sort((a, b) => b! - a!);
    
    if (dates.length < 2) return 'unknown';
    
    const daysDiff = (dates[0]! - dates[dates.length - 1]!) / (1000 * 60 * 60 * 24);
    const postsPerDay = dates.length / daysDiff;
    
    if (postsPerDay >= 1) return 'daily';
    if (postsPerDay >= 0.5) return 'multiple_per_week';
    if (postsPerDay >= 0.14) return 'weekly';
    if (postsPerDay >= 0.033) return 'monthly';
    return 'infrequent';
  } catch {
    return 'unknown';
  }
}

// ============= DUCKDUCKGO SEARCH (IMPROVED PARSING) =============
async function fetchDuckDuckGo(query: string) {
  try {
    const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
    console.log('DuckDuckGo search:', query);
    
    const response = await fetchWithRetry(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    }, 2);
    
    if (!response.ok) {
      console.log(`DuckDuckGo returned status ${response.status}`);
      return { success: false, blocked: response.status === 403 || response.status === 429 };
    }
    
    const html = await response.text();
    
    // Improved result count extraction with multiple patterns
    let resultsCount = 0;
    
    // Pattern 1: Look for result divs
    const resultDivs = html.match(/class="result[^"]*"/g);
    if (resultDivs) {
      resultsCount = Math.max(resultsCount, resultDivs.length);
    }
    
    // Pattern 2: Look for links-main divs
    const linksMain = html.match(/class="links_main[^"]*"/g);
    if (linksMain) {
      resultsCount = Math.max(resultsCount, linksMain.length);
    }
    
    // Pattern 3: Count actual result snippets
    const snippetMatches = html.match(/class="result__snippet[^"]*"/g);
    if (snippetMatches) {
      resultsCount = Math.max(resultsCount, snippetMatches.length);
    }
    
    // Extract result snippets with improved regex
    const snippets = [];
    const snippetRegex = /<a[^>]*class="result__snippet[^"]*"[^>]*>([\s\S]*?)<\/a>/gi;
    let match;
    
    while ((match = snippetRegex.exec(html)) !== null && snippets.length < 5) {
      const snippet = match[1]
        .replace(/<[^>]+>/g, '') // Remove HTML tags
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/\s+/g, ' ')
        .trim();
      
      if (snippet && snippet.length > 20) {
        snippets.push(snippet);
      }
    }
    
    console.log(`Found ${resultsCount} results, extracted ${snippets.length} snippets`);
    
    return {
      success: true,
      resultsCount,
      snippets
    };
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('DuckDuckGo search failed:', errorMessage);
    return { success: false, error: errorMessage };
  }
}

async function fetchDuckDuckGoMain(brandName: string) {
  return fetchDuckDuckGo(`"${brandName}"`);
}

async function fetchDuckDuckGoNews(brandName: string) {
  return fetchDuckDuckGo(`"${brandName}" news`);
}

async function fetchDuckDuckGoComplaints(brandName: string) {
  return fetchDuckDuckGo(`"${brandName}" complaints OR scam OR fraud`);
}

async function fetchDuckDuckGoReviews(brandName: string) {
  return fetchDuckDuckGo(`"${brandName}" reviews OR ratings`);
}

async function fetchDuckDuckGoAlternatives(brandName: string) {
  return fetchDuckDuckGo(`"${brandName}" alternatives OR competitors`);
}

async function fetchDuckDuckGoContent(brandName: string) {
  return fetchDuckDuckGo(`site:${brandName} blog OR articles OR content`);
}

// ============= WIKIPEDIA =============
async function fetchWikipediaData(brandName: string) {
  try {
    console.log('Fetching Wikipedia for:', brandName);
    const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(brandName)}&format=json&origin=*`;
    
    const searchResponse = await fetchWithRetry(searchUrl);
    const searchData = await searchResponse.json();
    
    if (!searchData.query?.search?.length) {
      return { exists: false };
    }
    
    const pageTitle = searchData.query.search[0].title;
    const pageId = searchData.query.search[0].pageid;
    
    const extractUrl = `https://en.wikipedia.org/w/api.php?action=query&prop=extracts&exintro&explaintext&pageids=${pageId}&format=json&origin=*`;
    const extractResponse = await fetchWithRetry(extractUrl);
    const extractData = await extractResponse.json();
    
    const page = extractData.query?.pages?.[pageId];
    
    return {
      exists: true,
      title: pageTitle,
      extract: page?.extract || null,
      pageUrl: `https://en.wikipedia.org/wiki/${encodeURIComponent(pageTitle.replace(/ /g, '_'))}`
    };
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Wikipedia fetch failed:', errorMessage);
    return { exists: false, error: errorMessage };
  }
}

// ============= WAYBACK MACHINE =============
async function fetchWaybackData(url: string) {
  try {
    console.log('Fetching Wayback Machine for:', url);
    const apiUrl = `https://archive.org/wayback/available?url=${encodeURIComponent(url)}`;
    
    const response = await fetchWithRetry(apiUrl);
    const data = await response.json();
    
    if (!data.archived_snapshots?.closest) {
      return { available: false };
    }
    
    const snapshot = data.archived_snapshots.closest;
    const timestamp = snapshot.timestamp;
    
    // Parse timestamp (format: YYYYMMDDhhmmss)
    const year = parseInt(timestamp.substring(0, 4));
    const currentYear = new Date().getFullYear();
    const ageYears = currentYear - year;
    
    return {
      available: true,
      timestamp: timestamp,
      url: snapshot.url,
      firstSeen: `${timestamp.substring(0, 4)}-${timestamp.substring(4, 6)}-${timestamp.substring(6, 8)}`,
      ageYears
    };
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Wayback fetch failed:', errorMessage);
    return { available: false, error: errorMessage };
  }
}

// ============= SOCIAL MEDIA SCRAPING =============
const BROWSER_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  'Accept-Encoding': 'gzip, deflate, br',
  'DNT': '1',
  'Connection': 'keep-alive',
  'Upgrade-Insecure-Requests': '1',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'none',
  'Cache-Control': 'max-age=0'
};

const cookieJar = new Map<string, string>();

function getCookieHeader(domain: string): string | null {
  return cookieJar.get(domain) || null;
}

function extractCookies(response: Response, domain: string) {
  const setCookieHeader = response.headers.get('set-cookie');
  if (setCookieHeader) {
    const cookies = setCookieHeader.split(',').map(c => c.split(';')[0].trim());
    const existingCookies = cookieJar.get(domain) || '';
    const allCookies = existingCookies ? `${existingCookies}; ${cookies.join('; ')}` : cookies.join('; ');
    cookieJar.set(domain, allCookies);
  }
}

async function fetchInstagramProfile(handle: string) {
  try {
    console.log('Fetching Instagram profile:', handle);
    const url = `https://www.instagram.com/${handle}/`;
    const domain = 'instagram.com';
    
    const headers: any = { ...BROWSER_HEADERS };
    const existingCookies = getCookieHeader(domain);
    if (existingCookies) {
      headers['Cookie'] = existingCookies;
    }
    
    const response = await fetchWithRetry(url, { 
      headers,
      redirect: 'follow'
    }, 2);
    
    extractCookies(response, domain);
    
    if (!response.ok) {
      console.log('Instagram profile fetch failed:', response.status);
      return { provided: true, handle, fetched: false, blocked: true, status: response.status };
    }
    
    const html = await response.text();
    
    // Extract og:description which often contains follower info
    const ogDescMatch = html.match(/<meta property="og:description" content="([^"]+)"/);
    const ogImageMatch = html.match(/<meta property="og:image" content="([^"]+)"/);
    
    if (ogDescMatch) {
      const description = ogDescMatch[1];
      const followersMatch = description.match(/([\d,\.]+[KkMm]?)\s*Followers/);
      const postsMatch = description.match(/([\d,\.]+[KkMm]?)\s*Posts/);
      const followingMatch = description.match(/([\d,\.]+[KkMm]?)\s*Following/);
      
      return {
        provided: true,
        handle,
        fetched: true,
        followers: followersMatch ? followersMatch[1] : null,
        posts: postsMatch ? postsMatch[1] : null,
        following: followingMatch ? followingMatch[1] : null,
        bio: description,
        profileImage: ogImageMatch ? ogImageMatch[1] : null
      };
    }
    
    return { provided: true, handle, fetched: true, noData: true };
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Instagram fetch error:', errorMessage);
    return { provided: true, handle, fetched: false, error: errorMessage };
  }
}

async function fetchXProfile(handle: string) {
  try {
    console.log('Fetching X/Twitter profile:', handle);
    const url = `https://twitter.com/${handle}`;
    const domain = 'twitter.com';
    
    const headers: any = { ...BROWSER_HEADERS };
    const existingCookies = getCookieHeader(domain);
    if (existingCookies) {
      headers['Cookie'] = existingCookies;
    }
    
    const response = await fetchWithRetry(url, { 
      headers,
      redirect: 'follow'
    }, 2);
    
    extractCookies(response, domain);
    
    if (!response.ok) {
      console.log('X profile fetch failed:', response.status);
      return { provided: true, handle, fetched: false, blocked: true, status: response.status };
    }
    
    const html = await response.text();
    
    // Extract og:description
    const ogDescMatch = html.match(/<meta property="og:description" content="([^"]+)"/);
    const ogImageMatch = html.match(/<meta property="og:image" content="([^"]+)"/);
    
    if (ogDescMatch || ogImageMatch) {
      return {
        provided: true,
        handle,
        fetched: true,
        bio: ogDescMatch ? ogDescMatch[1] : null,
        profileImage: ogImageMatch ? ogImageMatch[1] : null
      };
    }
    
    return { provided: true, handle, fetched: true, noData: true };
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('X fetch error:', errorMessage);
    return { provided: true, handle, fetched: false, error: errorMessage };
  }
}

async function fetchTikTokProfile(handle: string) {
  try {
    console.log('Fetching TikTok profile:', handle);
    const url = `https://www.tiktok.com/@${handle}`;
    const domain = 'tiktok.com';
    
    const headers: any = { ...BROWSER_HEADERS };
    const existingCookies = getCookieHeader(domain);
    if (existingCookies) {
      headers['Cookie'] = existingCookies;
    }
    
    const response = await fetchWithRetry(url, { 
      headers,
      redirect: 'follow'
    }, 2);
    
    extractCookies(response, domain);
    
    if (!response.ok) {
      console.log('TikTok profile fetch failed:', response.status);
      return { provided: true, handle, fetched: false, blocked: true, status: response.status };
    }
    
    const html = await response.text();
    
    // Extract og:description which often contains follower/likes info
    const ogDescMatch = html.match(/<meta property="og:description" content="([^"]+)"/);
    const ogImageMatch = html.match(/<meta property="og:image" content="([^"]+)"/);
    
    if (ogDescMatch) {
      const description = ogDescMatch[1];
      const followersMatch = description.match(/([\d,\.]+[KkMm]?)\s*Followers/);
      const likesMatch = description.match(/([\d,\.]+[KkMm]?)\s*Likes/);
      
      return {
        provided: true,
        handle,
        fetched: true,
        followers: followersMatch ? followersMatch[1] : null,
        likes: likesMatch ? likesMatch[1] : null,
        bio: description,
        profileImage: ogImageMatch ? ogImageMatch[1] : null
      };
    }
    
    return { provided: true, handle, fetched: true, noData: true };
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('TikTok fetch error:', errorMessage);
    return { provided: true, handle, fetched: false, error: errorMessage };
  }
}

async function fetchLinkedInProfile(handle: string) {
  try {
    console.log('Fetching LinkedIn profile:', handle);
    const url = `https://www.linkedin.com/company/${handle}/`;
    const domain = 'linkedin.com';
    
    const headers: any = { ...BROWSER_HEADERS };
    const existingCookies = getCookieHeader(domain);
    if (existingCookies) {
      headers['Cookie'] = existingCookies;
    }
    
    const response = await fetchWithRetry(url, { 
      headers,
      redirect: 'follow'
    }, 2);
    
    extractCookies(response, domain);
    
    if (!response.ok) {
      console.log('LinkedIn profile fetch failed:', response.status);
      return { provided: true, handle, fetched: false, blocked: true, status: response.status };
    }
    
    const html = await response.text();
    
    // Extract og:title, og:description, and og:image
    const ogTitleMatch = html.match(/<meta property="og:title" content="([^"]+)"/);
    const ogDescMatch = html.match(/<meta property="og:description" content="([^"]+)"/);
    const ogImageMatch = html.match(/<meta property="og:image" content="([^"]+)"/);
    
    if (ogTitleMatch || ogDescMatch) {
      return {
        provided: true,
        handle,
        fetched: true,
        companyName: ogTitleMatch ? ogTitleMatch[1] : null,
        description: ogDescMatch ? ogDescMatch[1] : null,
        profileImage: ogImageMatch ? ogImageMatch[1] : null
      };
    }
    
    return { provided: true, handle, fetched: true, noData: true };
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('LinkedIn fetch error:', errorMessage);
    return { provided: true, handle, fetched: false, error: errorMessage };
  }
}

async function fetchSocialMediaData(handles: any) {
  console.log('Fetching social media profiles with OG meta tags and retry logic');
  
  // Fetch with small delays between platforms to be polite
  const results: any = {
    instagram: { provided: false },
    x: { provided: false },
    linkedin: { provided: false },
    tiktok: { provided: false }
  };
  
  if (handles.instagram) {
    results.instagram = await fetchInstagramProfile(handles.instagram);
    await delay(500);
  }
  
  if (handles.x) {
    results.x = await fetchXProfile(handles.x);
    await delay(500);
  }
  
  if (handles.linkedin) {
    results.linkedin = await fetchLinkedInProfile(handles.linkedin);
    await delay(500);
  }
  
  if (handles.tiktok) {
    results.tiktok = await fetchTikTokProfile(handles.tiktok);
  }
  
  return results;
}

// ============= 8 PILLAR AGGREGATION (ENHANCED WITH NEW DATA) =============
function aggregatePillars(data: any) {
  const pillars: any = {};

  // Pillar 1: Search Visibility
  pillars.searchVisibility = {
    name: "Search Visibility",
    mainSearchResults: data.duckduckgoData?.main?.resultsCount || 0,
    newsResults: data.duckduckgoData?.news?.resultsCount || 0,
    contentResults: data.duckduckgoData?.content?.resultsCount || 0,
    totalSearchVisibility: (data.duckduckgoData?.main?.resultsCount || 0) + 
                           (data.duckduckgoData?.news?.resultsCount || 0) + 
                           (data.duckduckgoData?.content?.resultsCount || 0),
    searchSnippets: {
      main: data.duckduckgoData?.main?.snippets || [],
      news: data.duckduckgoData?.news?.snippets || [],
      content: data.duckduckgoData?.content?.snippets || []
    }
  };

  // Pillar 2: Digital Authority
  pillars.digitalAuthority = {
    name: "Digital Authority",
    wikipedia: {
      exists: data.wikipediaData?.exists || false,
      extract: data.wikipediaData?.extract || null,
      url: data.wikipediaData?.pageUrl || null
    },
    wayback: {
      available: data.waybackData?.available || false,
      timestamp: data.waybackData?.timestamp || null,
      firstSeen: data.waybackData?.firstSeen || null,
      ageYears: data.waybackData?.ageYears || null
    },
    whoisData: {
      available: data.rdapData?.success || false,
      registrationDate: data.rdapData?.registration_date || null,
      registrar: data.rdapData?.registrar || null,
      expires: data.rdapData?.expires || null
    },
    httpsCheck: {
      httpsAvailable: data.httpsCheckData?.https_available || false,
      status: data.httpsCheckData?.status || null
    },
    hackerNewsMentions: data.hackerNewsData?.nbHits || 0,
    domainAge: data.waybackData?.ageYears || null
  };

  // Pillar 3: Social Presence
  const socialProfiles = [];
  const fetchedProfiles = [];
  let totalFollowers = 0;
  
  if (data.socialData?.instagram?.provided) {
    socialProfiles.push('instagram');
    if (data.socialData.instagram.fetched) fetchedProfiles.push('instagram');
    // Try to parse follower count (handle K, M, B suffixes)
    if (data.socialData.instagram.followers) {
      const followers = data.socialData.instagram.followers;
      const num = parseFloat(followers.replace(/,/g, ''));
      if (followers.includes('K')) totalFollowers += num * 1000;
      else if (followers.includes('M')) totalFollowers += num * 1000000;
      else if (followers.includes('B')) totalFollowers += num * 1000000000;
      else totalFollowers += num;
    }
  }
  if (data.socialData?.x?.provided) {
    socialProfiles.push('x');
    if (data.socialData.x.fetched) fetchedProfiles.push('x');
  }
  if (data.socialData?.linkedin?.provided) {
    socialProfiles.push('linkedin');
    if (data.socialData.linkedin.fetched) fetchedProfiles.push('linkedin');
  }
  if (data.socialData?.tiktok?.provided) {
    socialProfiles.push('tiktok');
    if (data.socialData.tiktok.fetched) fetchedProfiles.push('tiktok');
    // Add TikTok followers
    if (data.socialData.tiktok.followers) {
      const followers = data.socialData.tiktok.followers;
      const num = parseFloat(followers.replace(/,/g, ''));
      if (followers.includes('K')) totalFollowers += num * 1000;
      else if (followers.includes('M')) totalFollowers += num * 1000000;
      else if (followers.includes('B')) totalFollowers += num * 1000000000;
      else totalFollowers += num;
    }
  }
  
  pillars.socialPresence = {
    name: "Social Presence",
    instagram: data.socialData?.instagram || { provided: false },
    x: data.socialData?.x || { provided: false },
    linkedin: data.socialData?.linkedin || { provided: false },
    tiktok: data.socialData?.tiktok || { provided: false },
    profilesCount: socialProfiles.length,
    platforms: socialProfiles,
    fetchedCount: fetchedProfiles.length,
    fetchedPlatforms: fetchedProfiles,
    estimatedTotalFollowers: totalFollowers > 0 ? Math.round(totalFollowers) : null
  };

  // Pillar 4: Brand Mentions
  const totalMentions = (data.duckduckgoData?.main?.resultsCount || 0) + 
                        (data.duckduckgoData?.news?.resultsCount || 0) + 
                        (data.duckduckgoData?.reviews?.resultsCount || 0) +
                        (data.hackerNewsData?.nbHits || 0);
  
  pillars.brandMentions = {
    name: "Brand Mentions",
    totalMentions,
    newsMentions: data.duckduckgoData?.news?.resultsCount || 0,
    reviewMentions: data.duckduckgoData?.reviews?.resultsCount || 0,
    hackerNewsMentions: data.hackerNewsData?.nbHits || 0,
    snippets: [
      ...(data.duckduckgoData?.main?.snippets || []).slice(0, 3),
      ...(data.duckduckgoData?.news?.snippets || []).slice(0, 2)
    ]
  };

  // Pillar 5: Sentiment Analysis
  pillars.sentimentAnalysis = {
    name: "Sentiment Analysis",
    complaintsFound: data.duckduckgoData?.complaints?.resultsCount || 0,
    reviewsFound: data.duckduckgoData?.reviews?.resultsCount || 0,
    complaintsSnippets: data.duckduckgoData?.complaints?.snippets || [],
    reviewsSnippets: data.duckduckgoData?.reviews?.snippets || [],
    sentimentIndicators: {
      hasComplaints: (data.duckduckgoData?.complaints?.resultsCount || 0) > 0,
      hasReviews: (data.duckduckgoData?.reviews?.resultsCount || 0) > 0
    }
  };

  // Pillar 6: Content Footprint
  pillars.contentFootprint = {
    name: "Content Footprint",
    websiteMetadata: data.websiteData?.metadata || {},
    rss: {
      found: data.rssData?.found || false,
      url: data.rssData?.rssUrl || null,
      itemsCount: data.rssData?.itemsCount || 0,
      frequency: data.rssData?.frequency || 'unknown',
      recentPosts: data.rssData?.recentPosts || []
    },
    techStack: data.techStackData?.technologies || [],
    blogDetected: data.websiteData?.metadata?.hasBlogSection || false,
    contentSearchResults: data.duckduckgoData?.content?.resultsCount || 0,
    htmlSize: data.websiteData?.htmlLength || 0
  };

  // Pillar 7: Brand Consistency
  const titles = [
    data.websiteData?.metadata?.title,
    data.websiteData?.metadata?.ogTitle,
    data.websiteData?.metadata?.twitterTitle
  ].filter(t => t);
  
  pillars.brandConsistency = {
    name: "Brand Consistency",
    websiteTitle: data.websiteData?.metadata?.title || '',
    ogTitle: data.websiteData?.metadata?.ogTitle || '',
    twitterTitle: data.websiteData?.metadata?.twitterTitle || '',
    ogSiteName: data.websiteData?.metadata?.ogSiteName || '',
    socialProfiles: socialProfiles,
    consistencyCheck: {
      titlesProvided: titles.length,
      allTitlesMatch: titles.length > 1 && titles.every(t => t === titles[0]),
      socialProfilesCount: socialProfiles.length
    }
  };

  // Pillar 8: Competitive Landscape
  pillars.competitiveLandscape = {
    name: "Competitive Landscape",
    industry: data.industry || 'not_specified',
    market: data.market || 'not_specified',
    alternativesFound: data.duckduckgoData?.alternatives?.resultsCount || 0,
    alternativesSnippets: data.duckduckgoData?.alternatives?.snippets || [],
    competitiveIndicators: {
      hasAlternatives: (data.duckduckgoData?.alternatives?.resultsCount || 0) > 0,
      industrySpecified: !!data.industry,
      marketSpecified: !!data.market
    }
  };

  return pillars;
}

// ============= ENHANCED AI PAYLOAD =============
function buildAIPayload(brandName: string, pillars: any) {
  return {
    brand_name: brandName,
    analysis_date: new Date().toISOString(),
    pillars: pillars,
    data_sources: {
      website: pillars.contentFootprint?.websiteMetadata ? 'available' : 'unavailable',
      wikipedia: pillars.digitalAuthority?.wikipedia?.exists ? 'available' : 'unavailable',
      wayback: pillars.digitalAuthority?.wayback?.available ? 'available' : 'unavailable',
      duckduckgo: 'partial (6 queries)',
      social_media: 'og_metadata_with_metrics',
      rss: pillars.contentFootprint?.rss?.found ? 'available' : 'unavailable',
      rdap_whois: pillars.digitalAuthority?.whoisData?.available ? 'available' : 'unavailable',
      https_check: pillars.digitalAuthority?.httpsCheck?.httpsAvailable ? 'available' : 'unavailable',
      hackernews: pillars.brandMentions?.hackerNewsMentions > 0 ? 'available' : 'unavailable',
      tech_stack_detection: pillars.contentFootprint?.techStack?.length > 0 ? 'available' : 'unavailable'
    },
    instructions: `Analyze this comprehensive brand diagnostic data and provide scores (0-100) for each of the 8 pillars.

DATA SOURCES USED:
- DuckDuckGo: 6 different query types (main, news, complaints, reviews, alternatives, content)
- Website Metadata: Full HTML + OG tags + structured data
- Wikipedia: Existence check + content extract
- Wayback Machine: Domain age + archive availability
- Social Media: OG metadata from Instagram, X/Twitter, LinkedIn, TikTok (may be blocked)
- RSS Feed: Detection + recent posts + publishing frequency
- RDAP/WHOIS: Domain registration data (free public protocol)
- HTTPS Check: Website HTTPS availability
- Hacker News: Tech community mentions via Algolia API (free, stable)
- Tech Stack Detection: Website technology detection from HTML

SCORING GUIDELINES:

1. Search Visibility (0-100)
   - Evaluate DuckDuckGo results across main, news, and content queries
   - Weight: Higher counts indicate better visibility

2. Digital Authority (0-100)
   - Wikipedia presence (major authority signal)
   - Domain age from Wayback Machine (older = more established)
   - RDAP/WHOIS registration data (domain legitimacy)
   - HTTPS availability (security indicator)
   - Hacker News mentions (tech authority)
   - Weight factors: Wikipedia > Domain Age > HTTPS

3. Social Presence (0-100)
   - Number of platforms provided
   - Successfully fetched OG metadata (followers, bio, profile images)
   - Estimated total follower count
   - Note: Platforms may block fetching (check 'fetched: true/false')
   - Score based on both platform diversity AND follower metrics

4. Brand Mentions (0-100)
   - DuckDuckGo mentions (news, reviews, general)
   - Hacker News mentions (tech community)
   - Weight: News mentions > Reviews > Hacker News

5. Sentiment Analysis (0-100)
   - Complaints vs Reviews ratio
   - Review snippets analysis
   - Score: Higher reviews + lower complaints = better score
   - Neutral baseline: 50-60 if limited data

6. Content Footprint (0-100)
   - Website metadata quality
   - RSS feed presence + publishing frequency
   - Blog section detection
   - Technology stack detection (React, WordPress, etc.)
   - Content search results
   - Weight: Active RSS > Blog > Tech Stack

7. Brand Consistency (0-100)
   - Title tag consistency (website, OG, Twitter)
   - Social media profile completeness
   - Branding elements across platforms
   - Weight: Perfect consistency = 90-100, minor variations = 70-80

8. Competitive Landscape (0-100)
   - Industry/market specification
   - Alternatives found (DuckDuckGo)
   - Position relative to competitors
   - Score: Few alternatives + strong authority = higher score

IMPORTANT NOTES:
- DuckDuckGo may be rate-limited (results could be 0)
- Social media platforms may block OG fetching
- Focus on available data, provide realistic scores
- Provide specific, actionable recommendations for each pillar
- Consider data availability when scoring (missing data shouldn't penalize unfairly)

Return a structured JSON response with:
{
  "search_visibility_score": 0-100,
  "digital_authority_score": 0-100,
  "social_presence_score": 0-100,
  "brand_mentions_score": 0-100,
  "sentiment_analysis_score": 0-100,
  "content_footprint_score": 0-100,
  "brand_consistency_score": 0-100,
  "competitive_landscape_score": 0-100,
  "recommendations": {
    "search_visibility": "specific actionable recommendation",
    "digital_authority": "specific actionable recommendation",
    "social_presence": "specific actionable recommendation",
    "brand_mentions": "specific actionable recommendation",
    "sentiment_analysis": "specific actionable recommendation",
    "content_footprint": "specific actionable recommendation",
    "brand_consistency": "specific actionable recommendation",
    "competitive_landscape": "specific actionable recommendation"
  },
  "summary": "overall brand health summary and key takeaways (2-3 sentences)"
}`
  };
}

// ============= OPENAI ASSISTANT API V2 =============
async function callOpenAIAssistant(payload: any) {
  const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
  const ASSISTANT_ID = 'asst_b7HEiJmlfVfr2j2yWRfJm4Wb';

  console.log('Creating thread...');
  
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

  await fetch(`https://api.openai.com/v1/threads/${threadId}/messages`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
      'OpenAI-Beta': 'assistants=v2'
    },
    body: JSON.stringify({
      role: 'user',
      content: JSON.stringify(payload, null, 2)
    })
  });

  console.log('Creating run...');

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

  let runStatus = run.status;
  let attempts = 0;
  const maxAttempts = 60;

  while (runStatus !== 'completed' && runStatus !== 'failed' && attempts < maxAttempts) {
    await new Promise(resolve => setTimeout(resolve, 5000));
    
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

  try {
    return JSON.parse(responseText);
  } catch {
    return { raw_response: responseText };
  }
}

// ============= SCORE EXTRACTION =============
function extractPillarScores(assistantResult: any) {
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