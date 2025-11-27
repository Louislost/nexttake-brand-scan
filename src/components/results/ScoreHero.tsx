import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface ScoreHeroProps {
  overallScore: number;
  confidenceIndex?: {
    score: number;
    data_coverage: string;
    consistency: string;
  };
  brandName?: string;
  industry?: string;
}

const ScoreHero = ({ overallScore, confidenceIndex, brandName, industry }: ScoreHeroProps) => {
  const getScoreColor = (score: number) => {
    if (score >= 70) return "text-emerald-600 dark:text-emerald-400";
    if (score >= 40) return "text-amber-600 dark:text-amber-400";
    return "text-rose-600 dark:text-rose-400";
  };

  return (
    <Card className="mb-8 border-2 bg-card/50 backdrop-blur-sm">
      <CardContent className="p-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="text-center md:text-left">
            {brandName && (
              <h2 className="text-2xl font-bold mb-2">{brandName}</h2>
            )}
            {industry && (
              <Badge variant="secondary" className="mb-4">{industry}</Badge>
            )}
            <p className="text-muted-foreground">Brand Health Score</p>
          </div>
          
          <div className="text-center">
            <div className={`text-7xl font-bold ${getScoreColor(overallScore)}`}>
              {overallScore}
            </div>
            <p className="text-muted-foreground mt-2">out of 100</p>
          </div>

          {confidenceIndex && (
            <div className="text-center md:text-right">
              <p className="text-sm font-semibold mb-2">Confidence Index</p>
              <div className="text-3xl font-bold text-primary mb-1">
                {confidenceIndex.score}%
              </div>
              <p className="text-xs text-muted-foreground">
                Coverage: {confidenceIndex.data_coverage}
              </p>
              <p className="text-xs text-muted-foreground">
                Consistency: {confidenceIndex.consistency}
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ScoreHero;
