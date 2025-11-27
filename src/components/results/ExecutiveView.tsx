import { BrandDiagnosticResult } from "@/types/brandDiagnostic";
import StrategicPrioritiesSection from "./StrategicPrioritiesSection";
import RoadmapTimeline from "./RoadmapTimeline";
import PillarRecommendationsAccordion from "./PillarRecommendationsAccordion";
import RisksToMonitor from "./RisksToMonitor";
import CreatorInsightsSection from "./CreatorInsightsSection";
import StorytellingAnglesSection from "./StorytellingAnglesSection";
import CompetitorBenchmarkTable from "./CompetitorBenchmarkTable";
import PersonaCardsGrid from "./PersonaCardsGrid";

interface ExecutiveViewProps {
  data: BrandDiagnosticResult;
}

const ExecutiveView = ({ data }: ExecutiveViewProps) => {
  const executiveView = data.executive_view;

  if (!executiveView) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">
          Executive view data is not available for this report.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <StrategicPrioritiesSection priorities={executiveView.strategic_priorities} />
      
      <RoadmapTimeline roadmap={executiveView.roadmap} />
      
      <PillarRecommendationsAccordion recommendations={executiveView.pillar_recommendations} />
      
      <RisksToMonitor risks={executiveView.risks_to_monitor} />
      
      <CreatorInsightsSection insights={executiveView.creator_insights} />
      
      <StorytellingAnglesSection angles={executiveView.storytelling_angles} />
      
      <CompetitorBenchmarkTable benchmark={executiveView.competitor_benchmark} />
      
      <PersonaCardsGrid personas={executiveView.persona_recommendations} />
    </div>
  );
};

export default ExecutiveView;
