import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StorytellingAngle } from "@/types/brandDiagnostic";
import { Lightbulb } from "lucide-react";

interface StorytellingAnglesSectionProps {
  angles: StorytellingAngle[];
}

const StorytellingAnglesSection = ({ angles }: StorytellingAnglesSectionProps) => {
  if (!angles || angles.length === 0) {
    return (
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Storytelling Angles</CardTitle>
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
      <h3 className="text-2xl font-bold mb-6">Storytelling Angles</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {angles.map((angle, idx) => (
          <Card key={idx} className="border-2">
            <CardHeader>
              <div className="flex items-start gap-3">
                <Lightbulb className="w-5 h-5 text-primary flex-shrink-0 mt-1" />
                <CardTitle className="text-base">{angle.angle}</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{angle.application}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default StorytellingAnglesSection;
