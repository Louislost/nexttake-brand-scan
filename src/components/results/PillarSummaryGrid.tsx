import { BrandDiagnosticResult } from "@/types/brandDiagnostic";
import EnhancedPillarCard from "./EnhancedPillarCard";

interface PillarSummaryGridProps {
  data: BrandDiagnosticResult;
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

const PillarSummaryGrid = ({ data }: PillarSummaryGridProps) => {
  const pillars = data.pillars;
  const summaries = data.analyst_view?.pillar_summaries || {};

  return (
    <div className="mb-8">
      <h3 className="text-2xl font-bold mb-6">Pillar Analysis</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {Object.entries(pillars).map(([key, pillar]) => {
          const displayName = PILLAR_DISPLAY_NAMES[key] || key;
          const summary = summaries[key];
          
          return (
            <EnhancedPillarCard
              key={key}
              name={displayName}
              pillar={pillar}
              summary={summary?.summary}
              status={summary?.status}
              priorityLevel={summary?.priority_level}
            />
          );
        })}
      </div>
    </div>
  );
};

export default PillarSummaryGrid;
