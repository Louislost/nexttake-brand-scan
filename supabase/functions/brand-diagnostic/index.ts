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

    // Parallel data collection - all 6 DDG queries + website + RSS + Wikipedia + Wayback + social
    const [
      websiteData,
      rssData,
      wikipediaData,
      waybackData,
      duckduckgoMain,
      duckduckgoNews,
      duckduckgoComplaints,
      duckduckgoReviews,
      duckduckgoAlternatives,
      duckduckgoContent,
      socialData
    ] = await Promise.all([
      fetchWebsiteData(data.websiteUrl),
      fetchRSSFeed(data.websiteUrl),
      fetchWikipediaData(data.brandName),
      fetchWaybackData(data.websiteUrl),
      fetchDuckDuckGoMain(data.brandName),
      fetchDuckDuckGoNews(data.brandName),
      fetchDuckDuckGoComplaints(data.brandName),
      fetchDuckDuckGoReviews(data.brandName),
      fetchDuckDuckGoAlternatives(data.brandName),
      fetchDuckDuckGoContent(data.brandName),
      fetchSocialMediaData({
        instagram: data.instagram,
        x: data.x,
        linkedin: data.linkedin,
        tiktok: data.tiktok
      })
    ]);

    // Aggregate 8 pillars with complete data
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

// ============= ENHANCED WEBSITE METADATA EXTRACTION =============
async function fetchWebsiteData(url: string) {
  try {
    console.log('Fetching website:', url);
    const response = await fetch(url, {
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
    const response = await fetch(websiteUrl, {
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
    const rssResponse = await fetch(rssUrl, {
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
  if (items.length < 2) return 'insufficient_data';
  
  try {
    const dates = items
      .map(item => item.pubDate)
      .filter(d => d)
      .map(d => new Date(d))
      .filter(d => !isNaN(d.getTime()))
      .sort((a, b) => b.getTime() - a.getTime());
    
    if (dates.length < 2) return 'insufficient_data';
    
    // Calculate average days between posts
    let totalDays = 0;
    for (let i = 0; i < dates.length - 1; i++) {
      const diff = dates[i].getTime() - dates[i + 1].getTime();
      totalDays += diff / (1000 * 60 * 60 * 24);
    }
    const avgDays = totalDays / (dates.length - 1);
    
    if (avgDays < 1) return 'multiple_per_day';
    if (avgDays < 7) return 'weekly';
    if (avgDays < 30) return 'monthly';
    return 'infrequent';
    
  } catch {
    return 'calculation_error';
  }
}

// ============= 6 DUCKDUCKGO QUERIES =============
async function fetchDuckDuckGoMain(brandName: string) {
  return fetchDuckDuckGo(brandName, 'main');
}

async function fetchDuckDuckGoNews(brandName: string) {
  return fetchDuckDuckGo(`${brandName} news`, 'news');
}

async function fetchDuckDuckGoComplaints(brandName: string) {
  return fetchDuckDuckGo(`${brandName} complaints`, 'complaints');
}

async function fetchDuckDuckGoReviews(brandName: string) {
  return fetchDuckDuckGo(`${brandName} reviews`, 'reviews');
}

async function fetchDuckDuckGoAlternatives(brandName: string) {
  return fetchDuckDuckGo(`${brandName} alternatives`, 'alternatives');
}

async function fetchDuckDuckGoContent(brandName: string) {
  return fetchDuckDuckGo(`${brandName} content marketing`, 'content');
}

async function fetchDuckDuckGo(query: string, type: string) {
  try {
    console.log(`Fetching DuckDuckGo ${type} for:`, query);
    
    const response = await fetch(
      `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      }
    );
    
    if (!response.ok) {
      return { success: false, blocked: true, type };
    }
    
    const html = await response.text();
    
    // Extract result snippets
    const snippets = [];
    const resultMatches = html.matchAll(/<a[^>]*class=["'][^"']*result__snippet[^"']*["'][^>]*>([\s\S]*?)<\/a>/gi);
    for (const match of resultMatches) {
      const snippet = match[1].replace(/<[^>]+>/g, '').trim();
      if (snippet) snippets.push(snippet);
      if (snippets.length >= 5) break;
    }
    
    // Estimate result count
    const resultElements = html.match(/result__/g);
    const resultsCount = resultElements ? resultElements.length : 0;
    
    return {
      success: true,
      type,
      query,
      resultsCount,
      snippets
    };
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`DuckDuckGo ${type} fetch failed:`, errorMessage);
    return { success: false, type, error: errorMessage };
  }
}

// ============= WIKIPEDIA DATA =============
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

// ============= WAYBACK MACHINE DATA =============
async function fetchWaybackData(url: string) {
  try {
    console.log('Fetching Wayback Machine for:', url);
    const response = await fetch(
      `https://archive.org/wayback/available?url=${encodeURIComponent(url)}`
    );
    
    const data = await response.json();
    
    if (data.archived_snapshots?.closest) {
      const snapshot = data.archived_snapshots.closest;
      
      // Calculate domain age from timestamp
      const timestamp = snapshot.timestamp; // Format: YYYYMMDDHHMMSS
      const year = parseInt(timestamp.substring(0, 4));
      const month = parseInt(timestamp.substring(4, 6));
      const day = parseInt(timestamp.substring(6, 8));
      const firstSeen = new Date(year, month - 1, day);
      const now = new Date();
      const ageYears = (now.getTime() - firstSeen.getTime()) / (1000 * 60 * 60 * 24 * 365);
      
      return {
        success: true,
        available: true,
        timestamp,
        url: snapshot.url,
        firstSeen: firstSeen.toISOString(),
        ageYears: Math.round(ageYears * 10) / 10
      };
    }
    
    return { success: true, available: false };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Wayback fetch failed:', errorMessage);
    return { success: false, error: errorMessage };
  }
}

// ============= SOCIAL MEDIA DATA =============
async function fetchSocialMediaData(handles: any) {
  console.log('Social media data collection (handles only)');
  
  const results: any = {
    instagram: null,
    x: null,
    linkedin: null,
    tiktok: null
  };

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

// ============= 8 PILLAR AGGREGATION (EXACT N8N STRUCTURE) =============
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
    domainAge: data.waybackData?.ageYears || null
  };

  // Pillar 3: Social Presence
  const socialProfiles = [];
  if (data.socialData?.instagram?.provided) socialProfiles.push('instagram');
  if (data.socialData?.x?.provided) socialProfiles.push('x');
  if (data.socialData?.linkedin?.provided) socialProfiles.push('linkedin');
  if (data.socialData?.tiktok?.provided) socialProfiles.push('tiktok');
  
  pillars.socialPresence = {
    name: "Social Presence",
    instagram: data.socialData?.instagram || { provided: false },
    x: data.socialData?.x || { provided: false },
    linkedin: data.socialData?.linkedin || { provided: false },
    tiktok: data.socialData?.tiktok || { provided: false },
    profilesCount: socialProfiles.length,
    platforms: socialProfiles
  };

  // Pillar 4: Brand Mentions
  const totalMentions = (data.duckduckgoData?.main?.resultsCount || 0) + 
                        (data.duckduckgoData?.news?.resultsCount || 0) + 
                        (data.duckduckgoData?.reviews?.resultsCount || 0);
  
  pillars.brandMentions = {
    name: "Brand Mentions",
    totalMentions,
    newsMentions: data.duckduckgoData?.news?.resultsCount || 0,
    reviewMentions: data.duckduckgoData?.reviews?.resultsCount || 0,
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
      duckduckgo: 'partial',
      social_media: 'handles_only',
      rss: pillars.contentFootprint?.rss?.found ? 'available' : 'unavailable'
    },
    instructions: `Analyze this comprehensive brand diagnostic data and provide scores (0-100) for each of the 8 pillars:

1. Search Visibility - Evaluate based on search results across main, news, and content queries
2. Digital Authority - Consider Wikipedia presence, domain age, and archived history
3. Social Presence - Assess number and variety of social media profiles
4. Brand Mentions - Analyze total mentions, news coverage, and review presence
5. Sentiment Analysis - Evaluate based on complaints vs reviews ratio and snippets
6. Content Footprint - Consider website metadata, RSS feed, blog presence, and content marketing
7. Brand Consistency - Check consistency across titles, metadata, and social profiles
8. Competitive Landscape - Assess industry positioning and alternatives found

IMPORTANT NOTES:
- DuckDuckGo data may be limited or blocked (rate limits)
- Social media data is handles only (no real metrics scraped)
- Focus on available data and provide realistic scores
- Provide specific recommendations for each pillar based on gaps found

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
    "pillar_name": "specific actionable recommendation"
  },
  "summary": "overall brand health summary"
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
