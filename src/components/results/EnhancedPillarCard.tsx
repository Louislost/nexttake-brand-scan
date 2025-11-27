import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, AlertCircle, XCircle, ChevronDown, ChevronUp } from "lucide-react";
import { PillarData } from "@/types/brandDiagnostic";
import { useState } from "react";

interface EnhancedPillarCardProps {
  pillar: PillarData;
}

const EnhancedPillarCard = ({ pillar }: EnhancedPillarCardProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const score = pillar.score;

  const getStatusColor = (score: number) => {
    if (score >= 70) return "text-emerald-600 dark:text-emerald-400";
    if (score >= 40) return "text-amber-600 dark:text-amber-400";
    return "text-rose-600 dark:text-rose-400";
  };

  const getStatusIcon = (score: number) => {
    if (score >= 70) return <CheckCircle2 className="w-5 h-5" />;
    if (score >= 40) return <AlertCircle className="w-5 h-5" />;
    return <XCircle className="w-5 h-5" />;
  };

  const getStatusBg = (score: number) => {
    if (score >= 70) return "bg-emerald-50/80 dark:bg-emerald-950/30 border-emerald-200/50 dark:border-emerald-800/50";
    if (score >= 40) return "bg-amber-50/80 dark:bg-amber-950/30 border-amber-200/50 dark:border-amber-800/50";
    return "bg-rose-50/80 dark:bg-rose-950/30 border-rose-200/50 dark:border-rose-800/50";
  };

  return (
    <Card className={`${getStatusBg(score)} border-2 transition-all duration-300 hover:shadow-lg`}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <CardTitle className="text-lg">{pillar.name}</CardTitle>
          <div className={getStatusColor(score)}>
            {getStatusIcon(score)}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="flex items-baseline gap-2 mb-2">
            <span className={`text-3xl font-bold ${getStatusColor(score)}`}>
              {score}
            </span>
            <span className="text-muted-foreground">/ 100</span>
          </div>
        </div>

        {pillar.recommendation && (
          <div className="pt-2 border-t border-border">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex items-center justify-between w-full text-sm font-medium hover:text-primary transition-colors"
            >
              <span>Recommendation</span>
              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            
            {isExpanded && (
              <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
                {pillar.recommendation}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default EnhancedPillarCard;
