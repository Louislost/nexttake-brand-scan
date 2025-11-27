import { BrandDiagnosticResult, PillarData } from "@/types/brandDiagnostic";
import ExecutiveSummaryCard from "./ExecutiveSummaryCard";
import PillarSummaryGrid from "./PillarSummaryGrid";

interface AnalystViewProps {
  data: BrandDiagnosticResult;
  pillars: PillarData[];
}

const AnalystView = ({ data, pillars }: AnalystViewProps) => {
  return (
    <div className="space-y-8 animate-fade-in">
      {data.summary && (
        <ExecutiveSummaryCard summary={data.summary} />
      )}
      
      <PillarSummaryGrid pillars={pillars} />
    </div>
  );
};

export default AnalystView;
