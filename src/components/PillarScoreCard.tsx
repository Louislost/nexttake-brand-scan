import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, AlertCircle, XCircle } from "lucide-react";

interface PillarScoreCardProps {
  name: string;
  score: number;
}

const PillarScoreCard = ({ name, score }: PillarScoreCardProps) => {
  const getStatusColor = (score: number) => {
    if (score >= 70) return "text-emerald-600 dark:text-emerald-400";
    if (score >= 40) return "text-amber-600 dark:text-amber-400";
    return "text-rose-600 dark:text-rose-400";
  };

  const getStatusIcon = (score: number) => {
    if (score >= 70) return <CheckCircle2 className="w-6 h-6" />;
    if (score >= 40) return <AlertCircle className="w-6 h-6" />;
    return <XCircle className="w-6 h-6" />;
  };

  const getStatusBg = (score: number) => {
    if (score >= 70) return "bg-emerald-50/80 dark:bg-emerald-950/30 border-emerald-200/50 dark:border-emerald-800/50";
    if (score >= 40) return "bg-amber-50/80 dark:bg-amber-950/30 border-amber-200/50 dark:border-amber-800/50";
    return "bg-rose-50/80 dark:bg-rose-950/30 border-rose-200/50 dark:border-rose-800/50";
  };

  return (
    <Card className={`${getStatusBg(score)} border-2 backdrop-blur-sm transition-all duration-300 hover:scale-105 hover:shadow-[var(--shadow-soft)]`}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-foreground">{name}</h3>
          <div className={getStatusColor(score)}>
            {getStatusIcon(score)}
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <span className={`text-4xl font-bold ${getStatusColor(score)}`}>
            {score}
          </span>
          <span className="text-muted-foreground">/100</span>
        </div>
      </CardContent>
    </Card>
  );
};

export default PillarScoreCard;
