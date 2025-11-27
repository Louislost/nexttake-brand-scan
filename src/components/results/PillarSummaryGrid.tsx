import { PillarData } from "@/types/brandDiagnostic";
import EnhancedPillarCard from "./EnhancedPillarCard";

interface PillarSummaryGridProps {
  pillars: PillarData[];
}

const PillarSummaryGrid = ({ pillars }: PillarSummaryGridProps) => {
  return (
    <div className="mb-8">
      <h3 className="text-2xl font-bold mb-6">Pillar Analysis</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {pillars.map((pillar) => (
          <EnhancedPillarCard
            key={pillar.key}
            pillar={pillar}
          />
        ))}
      </div>
    </div>
  );
};

export default PillarSummaryGrid;
