import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import Header from "@/components/Header";
import AnimatedBackground from "@/components/AnimatedBackground";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import ScoreHero from "@/components/results/ScoreHero";
import ViewToggle from "@/components/results/ViewToggle";
import AnalystView from "@/components/results/AnalystView";
import ExecutiveView from "@/components/results/ExecutiveView";
import { BrandDiagnosticResult } from "@/types/brandDiagnostic";

const Result = () => {
  const [searchParams] = useSearchParams();
  const inputId = searchParams.get("input_id");
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [diagnosticResult, setDiagnosticResult] = useState<BrandDiagnosticResult | null>(null);
  const [brandName, setBrandName] = useState<string>("");
  const [industry, setIndustry] = useState<string>("");
  const [activeView, setActiveView] = useState<'analyst' | 'executive'>('analyst');
  const [status, setStatus] = useState<string>('processing');
  const [pollingCount, setPollingCount] = useState(0);

  const parseDiagnosticResult = (resultJson: any): BrandDiagnosticResult | null => {
    try {
      const parsed = typeof resultJson === 'string' ? JSON.parse(resultJson) : resultJson;
      return parsed as BrandDiagnosticResult;
    } catch (err) {
      console.error("Error parsing diagnostic result:", err);
      return null;
    }
  };

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
        // Fetch input data for brand name and industry
        const { data: inputData } = await supabase
          .from("brand_scans_inputs")
          .select("brand_name, industry")
          .eq("id", inputId)
          .single();

        if (inputData) {
          setBrandName(inputData.brand_name);
          setIndustry(inputData.industry || "");
        }

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
            // Results found! Parse the full diagnostic result
            const parsed = parseDiagnosticResult(data.result_json);
            if (parsed) {
              setDiagnosticResult(parsed);
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
    <div className="min-h-screen relative">
      <AnimatedBackground />
      <Header />
      <main className="pb-24 relative z-10">
        <section className="pt-36 pb-16 px-4 animate-fade-in">
          <div className="container mx-auto max-w-7xl text-center">
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold mb-8 leading-tight tracking-tight">
              <span className="text-primary">Your Brand</span>
              {" "}
              <span className="text-foreground">Diagnostic Results</span>
            </h1>
          </div>
        </section>

        <div className="container mx-auto px-4 max-w-7xl">
          {loading && (
            <div className="space-y-4 text-center py-12">
              <div className="flex justify-center">
                <div className="w-20 h-20 rounded-full border-4 border-primary/20 border-t-primary animate-spin"></div>
              </div>
              <p className="text-xl font-semibold text-foreground">
                {status === 'processing' ? 'Collecting brand data from multiple sources…' : 
                 status === 'analyzing' ? 'AI is analyzing your brand data…' : 
                 'Loading results…'}
              </p>
              <p className="text-base text-muted-foreground">
                This may take up to 5 minutes. We're analyzing multiple data sources.
              </p>
            </div>
          )}

          {error && (
            <div className="backdrop-blur-sm bg-destructive/10 border-2 border-destructive/20 rounded-lg p-6">
              <p className="text-destructive font-semibold text-lg">{error}</p>
            </div>
          )}

          {!loading && !error && diagnosticResult && (
            <div className="space-y-8 animate-fade-in">
              <ScoreHero 
                overallScore={diagnosticResult.overall_score}
                confidenceIndex={diagnosticResult.confidence_index}
                brandName={brandName}
                industry={industry}
              />

              <ViewToggle activeView={activeView} onChange={setActiveView} />

              {activeView === 'analyst' ? (
                <AnalystView data={diagnosticResult} />
              ) : (
                <ExecutiveView data={diagnosticResult} />
              )}
            </div>
          )}

          {!loading && !error && !diagnosticResult && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No results available</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Result;
