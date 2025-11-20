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
  const [results, setResults] = useState<any>(null);
  const [pollingCount, setPollingCount] = useState(0);

  useEffect(() => {
    if (!inputId) {
      setError("Missing or invalid input_id.");
      setLoading(false);
      return;
    }

    let pollInterval: NodeJS.Timeout;
    const maxPolls = 10; // 10 polls × 2 seconds = 20 seconds max

    const fetchResults = async () => {
      try {
        const { data, error: fetchError } = await supabase
          .from("brand_scans_results")
          .select("result_json")
          .eq("input_id", inputId)
          .limit(1)
          .maybeSingle();

        if (fetchError) throw fetchError;

        if (data && data.result_json) {
          // Results found!
          setResults(data.result_json);
          setLoading(false);
          if (pollInterval) clearInterval(pollInterval);
          return true;
        }

        // No results yet, continue polling
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

      // Start polling every 2 seconds
      pollInterval = setInterval(async () => {
        setPollingCount((prev) => {
          const newCount = prev + 1;
          if (newCount >= maxPolls) {
            clearInterval(pollInterval);
            setError("No results found for this diagnostic.");
            setLoading(false);
          }
          return newCount;
        });

        await fetchResults();
      }, 2000);
    });

    return () => {
      if (pollInterval) clearInterval(pollInterval);
    };
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
                <div className="space-y-4 text-center">
                  <div className="flex justify-center">
                    <div className="w-16 h-16 rounded-full border-4 border-primary/20 border-t-primary animate-spin"></div>
                  </div>
                  <p className="text-lg font-semibold text-foreground">Your brand diagnostic is processing… Please wait.</p>
                  <p className="text-sm text-muted-foreground">This may take up to 20 seconds.</p>
                </div>
              )}

              {error && (
                <div className="bg-destructive/10 border border-destructive/20 rounded-md p-4">
                  <p className="text-destructive font-semibold">{error}</p>
                </div>
              )}

              {!loading && !error && results && (
                <div>
                  <pre className="bg-muted/50 p-4 rounded-md overflow-auto text-sm text-foreground">
                    {JSON.stringify(results, null, 2)}
                  </pre>
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
