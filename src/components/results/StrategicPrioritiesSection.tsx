import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StrategicPriority } from "@/types/brandDiagnostic";

interface StrategicPrioritiesSectionProps {
  priorities: StrategicPriority[];
}

const StrategicPrioritiesSection = ({ priorities }: StrategicPrioritiesSectionProps) => {
  if (!priorities || priorities.length === 0) {
    return (
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Strategic Priorities</CardTitle>
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
      <h3 className="text-2xl font-bold mb-6">Strategic Priorities</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {priorities.map((priority, idx) => (
          <Card key={idx} className="border-2 hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
                      {idx + 1}
                    </span>
                    <CardTitle className="text-lg">{priority.area}</CardTitle>
                  </div>
                </div>
                <Badge variant="outline">{priority.time_horizon}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm font-semibold text-muted-foreground mb-1">Action</p>
                <p className="text-sm">{priority.action}</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-muted-foreground mb-1">Expected Impact</p>
                <p className="text-sm text-primary">{priority.expected_impact}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default StrategicPrioritiesSection;
