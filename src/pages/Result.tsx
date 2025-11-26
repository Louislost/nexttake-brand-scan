import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import Header from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import PillarScoreCard from "@/components/PillarScoreCard";
import { Award, TrendingUp, FileText, Lightbulb, ChevronDown } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

const Result = () => {
  const [searchParams] = useSearchParams();
  const inputId = searchParams.get("input_id");
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<any>(null);
  const [pillarScores, setPillarScores] = useState<any>(null);
  const [overallScore, setOverallScore] = useState<number | null>(null);
  const [status, setStatus] = useState<string>('processing');
  const [pollingCount, setPollingCount] = useState(0);
  const [summary, setSummary] = useState<string>('');
  const [recommendations, setRecommendations] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!inputId) {
      setError("Missing or invalid input_id.");
      setLoading(false);
      return;
    }

    let pollInterval: NodeJS.Timeout;
    const maxPolls = 60; // 60 polls × 5 seconds = 5 minutes max

    const fetchResults = async () => {
      try {
        const { data, error: fetchError } = await supabase
          .from("brand_scans_results")
          .select("*")
          .eq("input_id", inputId)
          .limit(1)
          .maybeSingle();

        if (fetchError) throw fetchError;

        if (data) {
          setStatus(data.status);
          
          if (data.status === 'completed' && data.result_json) {
            // Results found!
            setResults(data.result_json);
            setPillarScores(data.pillar_scores);
            setOverallScore(data.overall_score);
            
            // Parse summary and recommendations from AI response
            if (typeof data.result_json === 'object' && data.result_json !== null && !Array.isArray(data.result_json)) {
              const resultObj = data.result_json as Record<string, any>;
              
              // Handle new AI format with summary object
              if (resultObj.summary && typeof resultObj.summary === 'object') {
                const summaryObj = resultObj.summary as Record<string, any>;
                setSummary(summaryObj.one_line || '');
                
                // Convert summary fields to recommendations format for display
                const recs: Record<string, string> = {};
                if (summaryObj.strengths && Array.isArray(summaryObj.strengths)) {
                  recs.strengths = summaryObj.strengths.join(', ');
                }
                if (summaryObj.weaknesses && Array.isArray(summaryObj.weaknesses)) {
                  recs.weaknesses = summaryObj.weaknesses.join(', ');
                }
                if (summaryObj.opportunities && Array.isArray(summaryObj.opportunities)) {
                  recs.opportunities = summaryObj.opportunities.join(', ');
                }
                if (summaryObj.risks && Array.isArray(summaryObj.risks)) {
                  recs.risks = summaryObj.risks.join(', ');
                }
                setRecommendations(recs);
              } else {
                // Handle old format
                setSummary(resultObj.summary || '');
                setRecommendations(resultObj.recommendations || {});
              }
            }
            
            setLoading(false);
            if (pollInterval) clearInterval(pollInterval);
            toast.success("Analysis complete!");
            return true;
          } else if (data.status === 'failed') {
            setError(data.error_message || "Analysis failed");
            setLoading(false);
            if (pollInterval) clearInterval(pollInterval);
            toast.error("Analysis failed");
            return true;
          } else if (data.status === 'analyzing' && data.thread_id && data.run_id) {
            // Data collection is done, AI is analyzing
            // Trigger status check to see if OpenAI has completed
            try {
              const { data: statusData, error: statusError } = await supabase.functions.invoke('check-status', {
                body: { input_id: inputId }
              });

              if (statusError) {
                console.error('Status check error:', statusError);
              } else {
                console.log('Status check response:', statusData);
              }
            } catch (err) {
              console.error('Failed to check status:', err);
            }
          }
        }

        // No results yet or still processing, continue polling
        return false;
      } catch (err) {
        console.error("Error fetching results:", err);
        setError("Failed to load results. Please try again.");
        toast.error("Failed to load results");
        setLoading(false);
        if (pollInterval) clearInterval(pollInterval);
        return true; // Stop polling on error
      }
    };

    // Initial fetch
    fetchResults().then((shouldStop) => {
      if (shouldStop) return;

      // Start polling every 5 seconds
      pollInterval = setInterval(async () => {
        setPollingCount((prev) => {
          const newCount = prev + 1;
          if (newCount >= maxPolls) {
            clearInterval(pollInterval);
            setError("Analysis is taking longer than expected. Please check back later.");
            setLoading(false);
          }
          return newCount;
        });

        await fetchResults();
      }, 5000);
    });

    return () => {
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [inputId]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-secondary/20">
      <Header />
      <main className="pb-20">
        <section className="pt-32 pb-12 px-4 animate-fade-in">
          <div className="container mx-auto max-w-4xl text-left">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-black mb-6 leading-tight md:leading-[1.15] lg:leading-[1.2] uppercase max-w-7xl bg-secondary inline-block px-4 py-3">
              Your Brand Diagnostic Results
            </h1>
          </div>
        </section>

        <div className="container mx-auto px-4 max-w-4xl">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="text-2xl">Diagnostic Report</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {loading && (
                <div className="space-y-4 text-center">
                  <div className="flex justify-center">
                    <div className="w-16 h-16 rounded-full border-4 border-primary/20 border-t-primary animate-spin"></div>
                  </div>
                  <p className="text-lg font-semibold text-foreground">
                    {status === 'processing' ? 'Collecting brand data from multiple sources…' : 
                     status === 'analyzing' ? 'AI is analyzing your brand data…' : 
                     'Loading results…'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    This may take up to 5 minutes. We're analyzing multiple data sources.
                  </p>
                </div>
              )}

              {error && (
                <div className="bg-destructive/10 border border-destructive/20 rounded-md p-4">
                  <p className="text-destructive font-semibold">{error}</p>
                </div>
              )}

              {!loading && !error && overallScore !== null && (
                <div className="space-y-8">
                  {/* Overall Score */}
                  <Card className="bg-gradient-to-br from-primary/10 to-accent/10 border-2 border-primary/20">
                    <CardContent className="p-8 text-center">
                      <Award className="w-16 h-16 mx-auto mb-4 text-primary" />
                      <h2 className="text-2xl font-bold mb-2">Overall Brand Health Score</h2>
                      <div className="flex items-baseline justify-center gap-2">
                        <span className="text-7xl font-black text-primary">{overallScore}</span>
                        <span className="text-3xl text-muted-foreground">/100</span>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Executive Summary */}
                  {summary && (
                    <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border-blue-200 dark:border-blue-800">
                      <CardContent className="p-6">
                        <h3 className="text-xl font-bold mb-3 flex items-center gap-2">
                          <FileText className="w-5 h-5" />
                          Executive Summary
                        </h3>
                        <p className="text-foreground/90 leading-relaxed">{summary}</p>
                      </CardContent>
                    </Card>
                  )}

                  {/* Pillar Scores Grid */}
                  {pillarScores && (
                    <div>
                      <div className="flex items-center gap-2 mb-6">
                        <TrendingUp className="w-6 h-6 text-primary" />
                        <h2 className="text-2xl font-bold">8 Pillar Analysis</h2>
                      </div>
                      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <PillarScoreCard name="Search Visibility" score={pillarScores.searchVisibility || 0} />
                        <PillarScoreCard name="Digital Authority" score={pillarScores.digitalAuthority || 0} />
                        <PillarScoreCard name="Social Presence" score={pillarScores.socialPresence || 0} />
                        <PillarScoreCard name="Brand Mentions" score={pillarScores.brandMentions || 0} />
                        <PillarScoreCard name="Sentiment" score={pillarScores.sentimentAnalysis || 0} />
                        <PillarScoreCard name="Content Footprint" score={pillarScores.contentFootprint || 0} />
                        <PillarScoreCard name="Brand Consistency" score={pillarScores.brandConsistency || 0} />
                        <PillarScoreCard name="Competitive Landscape" score={pillarScores.competitiveLandscape || 0} />
                      </div>
                    </div>
                  )}

                  {/* Actionable Recommendations */}
                  {Object.keys(recommendations).length > 0 && (
                    <div className="space-y-4">
                      <h3 className="text-xl font-bold flex items-center gap-2">
                        <Lightbulb className="w-5 h-5" />
                        Key Insights
                      </h3>
                      <div className="space-y-3">
                        {Object.entries(recommendations).map(([pillar, content]) => (
                          <Collapsible key={pillar}>
                            <CollapsibleTrigger className="w-full">
                              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                                <CardContent className="p-4 flex justify-between items-center">
                                  <span className="font-semibold capitalize text-left">
                                    {pillar.replace(/_/g, ' ')}
                                  </span>
                                  <ChevronDown className="w-4 h-4 transition-transform ui-expanded:rotate-180" />
                                </CardContent>
                              </Card>
                            </CollapsibleTrigger>
                            <CollapsibleContent>
                              <div className="p-4 bg-muted/30 rounded-b-lg border-t mt-[-1px]">
                                <p className="text-sm text-foreground/80 leading-relaxed">{content}</p>
                              </div>
                            </CollapsibleContent>
                          </Collapsible>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Result;
