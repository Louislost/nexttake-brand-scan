import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface ScoreHeroProps {
  overallScore: number;
  brandName: string;
  industry?: string;
}

const ScoreHero = ({ overallScore, brandName, industry }: ScoreHeroProps) => {
  const getScoreColor = (score: number) => {
    if (score >= 70) return "text-emerald-600 dark:text-emerald-400";
    if (score >= 40) return "text-amber-600 dark:text-amber-400";
    return "text-rose-600 dark:text-rose-400";
  };

  return (
    <Card className="mb-8 border-2">
      <CardContent className="p-8">
        <div className="text-center space-y-6">
          <div>
            <h1 className="text-3xl font-bold mb-2">{brandName}</h1>
            {industry && (
              <Badge variant="secondary" className="text-sm">
                {industry}
              </Badge>
            )}
          </div>
          
          <div className="flex flex-col items-center gap-2">
            <p className="text-sm text-muted-foreground uppercase tracking-wide">
              Overall Brand Health Score
            </p>
            <div className={`text-7xl font-bold ${getScoreColor(overallScore)}`}>
              {overallScore}
            </div>
            <p className="text-muted-foreground">out of 100</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ScoreHero;
