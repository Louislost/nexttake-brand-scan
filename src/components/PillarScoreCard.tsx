import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, AlertCircle, XCircle } from "lucide-react";

interface PillarScoreCardProps {
  name: string;
  score: number;
}

const PillarScoreCard = ({ name, score }: PillarScoreCardProps) => {
  const getStatusColor = (score: number) => {
    if (score >= 70) return "text-green-500";
    if (score >= 40) return "text-yellow-500";
    return "text-red-500";
  };

  const getStatusIcon = (score: number) => {
    if (score >= 70) return <CheckCircle2 className="w-6 h-6" />;
    if (score >= 40) return <AlertCircle className="w-6 h-6" />;
    return <XCircle className="w-6 h-6" />;
  };

  const getStatusBg = (score: number) => {
    if (score >= 70) return "bg-green-500/10 border-green-500/20";
    if (score >= 40) return "bg-yellow-500/10 border-yellow-500/20";
    return "bg-red-500/10 border-red-500/20";
  };

  return (
    <Card className={`${getStatusBg(score)} border-2`}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">{name}</h3>
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
