import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PersonaRecommendation } from "@/types/brandDiagnostic";
import { Users } from "lucide-react";

interface PersonaCardsGridProps {
  personas: PersonaRecommendation[];
}

const PersonaCardsGrid = ({ personas }: PersonaCardsGridProps) => {
  if (!personas || personas.length === 0) {
    return (
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Persona Recommendations</CardTitle>
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
      <h3 className="text-2xl font-bold mb-6">Persona Recommendations</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {personas.map((persona, idx) => (
          <Card key={idx} className="border-2">
            <CardHeader>
              <div className="flex items-start gap-3">
                <Users className="w-5 h-5 text-primary flex-shrink-0 mt-1" />
                <div>
                  <CardTitle className="text-lg">{persona.persona}</CardTitle>
                  <p className="text-sm text-muted-foreground mt-2">{persona.description}</p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm font-semibold mb-2">Recommended Actions:</p>
              <ul className="space-y-1">
                {persona.recommended_actions.map((action, actionIdx) => (
                  <li key={actionIdx} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <span className="text-primary mt-1">•</span>
                    <span>{action}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default PersonaCardsGrid;
