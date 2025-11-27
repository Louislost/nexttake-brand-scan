import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { BrandDiagnosticResult, PillarData } from "@/types/brandDiagnostic";
import Header from "@/components/Header";
import AnimatedBackground from "@/components/AnimatedBackground";
import ScoreHero from "@/components/results/ScoreHero";
import ViewToggle from "@/components/results/ViewToggle";
import AnalystView from "@/components/results/AnalystView";
import ExecutiveView from "@/components/results/ExecutiveView";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

const PILLAR_DISPLAY_NAMES: { [key: string]: string } = {
  search_visibility_score: "Search Visibility",
  digital_authority_score: "Digital Authority",
  social_presence_score: "Social Presence",
  brand_mentions_score: "Brand Mentions",
  sentiment_analysis_score: "Sentiment Analysis",
  content_footprint_score: "Content Footprint",
  brand_consistency_score: "Brand Consistency",
  competitive_landscape_score: "Competitive Landscape"
};

const Result = () => {
  const [searchParams] = useSearchParams();
  const inputId = searchParams.get("input_id");
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [diagnosticResult, setDiagnosticResult] = useState<BrandDiagnosticResult | null>(null);
  const [brandName, setBrandName] = useState<string>("");
  const [industry, setIndustry] = useState<string>("");
  const [activeView, setActiveView] = useState<'analyst' | 'executive'>('analyst');
  const [analysisStatus, setAnalysisStatus] = useState<string>("Initializing analysis...");

  const calculateOverallScore = (result: BrandDiagnosticResult): number => {
    const scores = [
      result.search_visibility_score,
      result.digital_authority_score,
      result.social_presence_score,
      result.brand_mentions_score,
      result.sentiment_analysis_score,
      result.content_footprint_score,
      result.brand_consistency_score,
      result.competitive_landscape_score
    ];
    
    const validScores = scores.filter(score => typeof score === 'number' && !isNaN(score));
    if (validScores.length === 0) return 0;
    
    return Math.round(validScores.reduce((sum, score) => sum + score, 0) / validScores.length);
  };

  const getPillarData = (result: BrandDiagnosticResult): PillarData[] => {
    return Object.entries(PILLAR_DISPLAY_NAMES).map(([key, name]) => ({
      key: key.replace('_score', ''),
      name,
      score: (result as any)[key] || 0,
      recommendation: result.recommendations?.[key.replace('_score', '')] || ""
    }));
  };

  useEffect(() => {
    const fetchResults = async () => {
      if (!inputId) {
        setError("No input ID provided");
        setLoading(false);
        return;
      }

      try {
        // Fetch brand name and industry from inputs table
        const { data: inputData, error: inputError } = await supabase
          .from("brand_scans_inputs")
          .select("brand_name, industry")
          .eq("id", inputId)
          .single();

        if (inputError) throw inputError;
        
        setBrandName(inputData?.brand_name || "Unknown Brand");
        setIndustry(inputData?.industry || "");

        // Start polling for results
        const pollInterval = setInterval(async () => {
          const { data: resultData, error: resultError } = await supabase
            .from("brand_scans_results")
            .select("*")
            .eq("input_id", inputId)
            .order("created_at", { ascending: false })
            .limit(1)
            .single();

          if (resultError) {
            console.error("Error fetching results:", resultError);
            return;
          }

          const status = resultData?.status || "pending";
          
          // Update status message
          if (status === "analyzing") {
            setAnalysisStatus("Analyzing brand data...");
            
            // Trigger status check via edge function
            try {
              await supabase.functions.invoke("check-status", {
                body: { input_id: inputId }
              });
            } catch (err) {
              console.error("Error checking status:", err);
            }
          } else if (status === "completed") {
            setAnalysisStatus("Analysis complete!");
            
            // Parse the actual AI agent output
            if (resultData.result_json) {
              setDiagnosticResult(resultData.result_json as unknown as BrandDiagnosticResult);
              setLoading(false);
              clearInterval(pollInterval);
              toast.success("Analysis complete!");
            }
          } else if (status === "failed") {
            setError(resultData.error_message || "Analysis failed");
            setLoading(false);
            clearInterval(pollInterval);
            toast.error("Analysis failed");
          }
        }, 5000); // Poll every 5 seconds

        // Cleanup interval on unmount
        return () => clearInterval(pollInterval);
      } catch (err) {
        console.error("Error fetching results:", err);
        setError("Failed to fetch results");
        setLoading(false);
        toast.error("Failed to load results");
      }
    };

    fetchResults();
  }, [inputId]);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <AnimatedBackground />
      
      <main className="container mx-auto px-4 py-8 relative z-10">
        {loading ? (
          <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="text-lg text-muted-foreground">{analysisStatus}</p>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center space-y-4">
              <p className="text-xl text-destructive">Error: {error}</p>
              <p className="text-muted-foreground">Please try again or contact support.</p>
            </div>
          </div>
        ) : diagnosticResult ? (
          <div className="space-y-8">
            <ScoreHero 
              overallScore={calculateOverallScore(diagnosticResult)}
              brandName={brandName}
              industry={industry}
            />
            
            <ViewToggle 
              activeView={activeView}
              onChange={setActiveView}
            />
            
            {activeView === 'analyst' ? (
              <AnalystView 
                data={diagnosticResult}
                pillars={getPillarData(diagnosticResult)}
              />
            ) : (
              <ExecutiveView 
                data={diagnosticResult}
                pillars={getPillarData(diagnosticResult)}
              />
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center min-h-[60vh]">
            <p className="text-lg text-muted-foreground">No results available.</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default Result;
