import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AnalystView } from "@/types/brandDiagnostic";

interface SWOTGridProps {
  insights: AnalystView['insights'];
}

const SWOTGrid = ({ insights }: SWOTGridProps) => {
  if (!insights) return null;

  const sections = [
    { 
      title: "Strengths", 
      items: insights.strengths || [], 
      bgColor: "bg-emerald-50/80 dark:bg-emerald-950/30",
      borderColor: "border-emerald-200 dark:border-emerald-800",
      iconColor: "text-emerald-600 dark:text-emerald-400"
    },
    { 
      title: "Weaknesses", 
      items: insights.weaknesses || [], 
      bgColor: "bg-rose-50/80 dark:bg-rose-950/30",
      borderColor: "border-rose-200 dark:border-rose-800",
      iconColor: "text-rose-600 dark:text-rose-400"
    },
    { 
      title: "Opportunities", 
      items: insights.opportunities || [], 
      bgColor: "bg-blue-50/80 dark:bg-blue-950/30",
      borderColor: "border-blue-200 dark:border-blue-800",
      iconColor: "text-blue-600 dark:text-blue-400"
    },
    { 
      title: "Risks", 
      items: insights.risks || [], 
      bgColor: "bg-orange-50/80 dark:bg-orange-950/30",
      borderColor: "border-orange-200 dark:border-orange-800",
      iconColor: "text-orange-600 dark:text-orange-400"
    }
  ];

  return (
    <div className="mb-8">
      <h3 className="text-2xl font-bold mb-6">SWOT Analysis</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {sections.map((section) => (
          <Card key={section.title} className={`${section.bgColor} ${section.borderColor} border-2`}>
            <CardHeader>
              <CardTitle className={section.iconColor}>{section.title}</CardTitle>
            </CardHeader>
            <CardContent>
              {section.items.length > 0 ? (
                <ul className="space-y-2">
                  {section.items.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <span className={`${section.iconColor} mt-1`}>•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground italic">
                  This section contains limited data based on the brand's inputs
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default SWOTGrid;
