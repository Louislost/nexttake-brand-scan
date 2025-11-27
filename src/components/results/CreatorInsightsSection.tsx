import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CreatorInsight } from "@/types/brandDiagnostic";

interface CreatorInsightsSectionProps {
  insights: CreatorInsight[];
}

const CreatorInsightsSection = ({ insights }: CreatorInsightsSectionProps) => {
  if (!insights || insights.length === 0) {
    return (
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Creator & Influencer Insights</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground italic">
            This section contains limited data based on the brand's inputs
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="mb-8">
      <h3 className="text-2xl font-bold mb-6">Creator & Influencer Insights</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {insights.map((insight, idx) => (
          <Card key={idx}>
            <CardHeader>
              <Badge variant="secondary" className="w-fit">{insight.category}</Badge>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{insight.insight}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default CreatorInsightsSection;
