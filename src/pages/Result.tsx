import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import Header from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const Result = () => {
  const [searchParams] = useSearchParams();
  const inputId = searchParams.get("input_id");
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resultData, setResultData] = useState<any>(null);

  useEffect(() => {
    const fetchResults = async () => {
      if (!inputId) {
        setError("Missing or invalid input_id.");
        setLoading(false);
        return;
      }

      try {
        const { data, error: fetchError } = await supabase
          .from("brand_scans_results")
          .select("result_json")
          .eq("input_id", inputId)
          .limit(1)
          .maybeSingle();

        if (fetchError) throw fetchError;

        if (!data) {
          setError("No results found for this diagnostic.");
          setLoading(false);
          return;
        }

        setResultData(data.result_json);
        setLoading(false);
      } catch (err) {
        console.error("Error fetching results:", err);
        setError("Failed to load results. Please try again.");
        toast.error("Failed to load results");
        setLoading(false);
      }
    };

    fetchResults();
  }, [inputId]);

  const renderJsonSection = (title: string, data: any) => {
    if (!data) return null;

    if (typeof data === "object" && !Array.isArray(data)) {
      return (
        <div className="mb-6">
          <h3 className="text-xl font-bold mb-3 text-foreground">{title}</h3>
          <div className="space-y-2">
            {Object.entries(data).map(([key, value]) => (
              <div key={key} className="bg-muted/50 p-3 rounded-md">
                <span className="font-semibold text-foreground capitalize">
                  {key.replace(/_/g, " ")}:
                </span>{" "}
                <span className="text-muted-foreground">
                  {typeof value === "object" ? JSON.stringify(value, null, 2) : String(value)}
                </span>
              </div>
            ))}
          </div>
        </div>
      );
    }

    return (
      <div className="mb-6">
        <h3 className="text-xl font-bold mb-3 text-foreground">{title}</h3>
        <pre className="bg-muted/50 p-4 rounded-md overflow-auto text-sm text-muted-foreground">
          {JSON.stringify(data, null, 2)}
        </pre>
      </div>
    );
  };

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
                <div className="space-y-4">
                  <p className="text-muted-foreground">Loading your results…</p>
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-20 w-full" />
                </div>
              )}

              {error && (
                <div className="bg-destructive/10 border border-destructive/20 rounded-md p-4">
                  <p className="text-destructive font-semibold">{error}</p>
                </div>
              )}

              {!loading && !error && resultData && (
                <div>
                  {resultData.scores && renderJsonSection("Scores", resultData.scores)}
                  {resultData.insights && renderJsonSection("Insights", resultData.insights)}
                  {resultData.recommendations && renderJsonSection("Recommendations", resultData.recommendations)}
                  
                  {/* Render any other top-level properties */}
                  {Object.entries(resultData).map(([key, value]) => {
                    if (!["scores", "insights", "recommendations"].includes(key)) {
                      return renderJsonSection(key.replace(/_/g, " ").toUpperCase(), value);
                    }
                    return null;
                  })}
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
