import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ExecutiveSummaryCardProps {
  summary: string;
}

const ExecutiveSummaryCard = ({ summary }: ExecutiveSummaryCardProps) => {
  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle>Executive Summary</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground leading-relaxed">{summary}</p>
      </CardContent>
    </Card>
  );
};

export default ExecutiveSummaryCard;
