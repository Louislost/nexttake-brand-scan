import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Card } from "@/components/ui/card";
import { ExecutiveView } from "@/types/brandDiagnostic";

interface PillarRecommendationsAccordionProps {
  recommendations: ExecutiveView['pillar_recommendations'];
}

const PILLAR_DISPLAY_NAMES: { [key: string]: string } = {
  search_visibility: "Search Visibility",
  content_quality: "Content Quality",
  social_proof: "Social Proof",
  technical_performance: "Technical Performance",
  brand_consistency: "Brand Consistency",
  engagement_signals: "Engagement Signals",
  competitive_positioning: "Competitive Positioning",
  conversion_readiness: "Conversion Readiness"
};

const PillarRecommendationsAccordion = ({ recommendations }: PillarRecommendationsAccordionProps) => {
  if (!recommendations || Object.keys(recommendations).length === 0) {
    return (
      <Card className="mb-8 p-6">
        <h3 className="text-2xl font-bold mb-4">Pillar Recommendations</h3>
        <p className="text-sm text-muted-foreground italic">
          This section contains limited data based on the brand's inputs
        </p>
      </Card>
    );
  }

  return (
    <div className="mb-8">
      <h3 className="text-2xl font-bold mb-6">Pillar Recommendations</h3>
      <Accordion type="single" collapsible className="space-y-4">
        {Object.entries(recommendations).map(([key, items]) => {
          const displayName = PILLAR_DISPLAY_NAMES[key] || key;
          return (
            <AccordionItem key={key} value={key} className="border rounded-lg px-4">
              <AccordionTrigger className="text-lg font-semibold hover:no-underline">
                {displayName}
              </AccordionTrigger>
              <AccordionContent>
                {items && items.length > 0 ? (
                  <ul className="space-y-2 mt-2">
                    {items.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <span className="text-primary mt-1">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground italic">
                    No recommendations available for this pillar
                  </p>
                )}
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
    </div>
  );
};

export default PillarRecommendationsAccordion;
