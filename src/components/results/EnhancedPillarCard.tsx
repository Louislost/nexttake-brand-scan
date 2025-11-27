import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertCircle, XCircle, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import { Pillar } from "@/types/brandDiagnostic";

interface EnhancedPillarCardProps {
  name: string;
  pillar: Pillar;
  summary?: string;
  status?: string;
  priorityLevel?: string;
}

const EnhancedPillarCard = ({ name, pillar, summary, status, priorityLevel }: EnhancedPillarCardProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const normalizedScore = (pillar.score / pillar.max_score) * 100;
  
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

  const getRatingVariant = (rating: string) => {
    if (rating.toLowerCase().includes('strong')) return "default";
    if (rating.toLowerCase().includes('moderate')) return "secondary";
    return "destructive";
  };

  return (
    <Card className={`${getStatusBg(normalizedScore)} border-2 backdrop-blur-sm transition-all duration-300 hover:scale-105 hover:shadow-lg`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <CardTitle className="text-lg">{name}</CardTitle>
          <div className={getStatusColor(normalizedScore)}>
            {getStatusIcon(normalizedScore)}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-baseline gap-2">
          <span className={`text-4xl font-bold ${getStatusColor(normalizedScore)}`}>
            {pillar.score}
          </span>
          <span className="text-muted-foreground">/ {pillar.max_score}</span>
        </div>

        <div className="flex flex-wrap gap-2">
          <Badge variant={getRatingVariant(pillar.qualitative_rating)}>
            {pillar.qualitative_rating}
          </Badge>
          {priorityLevel && (
            <Badge variant="outline">{priorityLevel}</Badge>
          )}
        </div>

        {pillar.data_coverage && (
          <p className="text-xs text-muted-foreground">
            Data Coverage: {pillar.data_coverage}
          </p>
        )}

        {summary && (
          <p className="text-sm text-muted-foreground mt-2">{summary}</p>
        )}

        {status && (
          <p className="text-sm font-medium">{status}</p>
        )}

        {pillar.key_drivers && pillar.key_drivers.length > 0 && (
          <div className="mt-3">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex items-center gap-1 text-sm font-medium text-primary hover:underline"
            >
              Key Drivers
              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            {isExpanded && (
              <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                {pillar.key_drivers.map((driver, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span>{driver}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default EnhancedPillarCard;
