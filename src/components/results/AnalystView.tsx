import { BrandDiagnosticResult } from "@/types/brandDiagnostic";
import ExecutiveSummaryCard from "./ExecutiveSummaryCard";
import KeyFindingsList from "./KeyFindingsList";
import PillarSummaryGrid from "./PillarSummaryGrid";
import SWOTGrid from "./SWOTGrid";

interface AnalystViewProps {
  data: BrandDiagnosticResult;
}

const AnalystView = ({ data }: AnalystViewProps) => {
  const analystView = data.analyst_view;

  if (!analystView) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">
          Analyst view data is not available for this report.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {analystView.executive_summary && (
        <ExecutiveSummaryCard summary={analystView.executive_summary} />
      )}
      
      {analystView.key_findings && analystView.key_findings.length > 0 && (
        <KeyFindingsList findings={analystView.key_findings} />
      )}
      
      <PillarSummaryGrid data={data} />
      
      {analystView.insights && (
        <SWOTGrid insights={analystView.insights} />
      )}
    </div>
  );
};

export default AnalystView;
