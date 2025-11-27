import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";

interface RisksToMonitorProps {
  risks: string[];
}

const RisksToMonitor = ({ risks }: RisksToMonitorProps) => {
  if (!risks || risks.length === 0) {
    return (
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Risks to Monitor</CardTitle>
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
      <h3 className="text-2xl font-bold mb-6">Risks to Monitor</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {risks.map((risk, idx) => (
          <Card key={idx} className="border-l-4 border-orange-500 dark:border-orange-400 bg-orange-50/50 dark:bg-orange-950/20">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-orange-600 dark:text-orange-400 flex-shrink-0 mt-1" />
                <p className="text-sm text-muted-foreground">{risk}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default RisksToMonitor;
