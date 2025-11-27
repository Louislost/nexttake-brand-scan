import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ExecutiveView } from "@/types/brandDiagnostic";

interface RoadmapTimelineProps {
  roadmap: ExecutiveView['roadmap'];
}

const RoadmapTimeline = ({ roadmap }: RoadmapTimelineProps) => {
  if (!roadmap) return null;

  const timeframes = [
    { title: "30 Days", items: roadmap["30_days"] || [], color: "border-blue-500 dark:border-blue-400" },
    { title: "90 Days", items: roadmap["90_days"] || [], color: "border-amber-500 dark:border-amber-400" },
    { title: "180 Days", items: roadmap["180_days"] || [], color: "border-purple-500 dark:border-purple-400" }
  ];

  return (
    <div className="mb-8">
      <h3 className="text-2xl font-bold mb-6">Implementation Roadmap</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {timeframes.map((timeframe) => (
          <Card key={timeframe.title} className={`border-l-4 ${timeframe.color}`}>
            <CardHeader>
              <CardTitle>{timeframe.title}</CardTitle>
            </CardHeader>
            <CardContent>
              {timeframe.items.length > 0 ? (
                <ul className="space-y-4">
                  {timeframe.items.map((item, idx) => (
                    <li key={idx} className="border-l-2 border-muted pl-4">
                      <p className="font-semibold text-sm mb-1">{item.milestone}</p>
                      <p className="text-sm text-muted-foreground">{item.action}</p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground italic">
                  No milestones defined for this timeframe
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default RoadmapTimeline;
