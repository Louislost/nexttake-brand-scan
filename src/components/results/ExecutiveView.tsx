import { BrandDiagnosticResult, PillarData } from "@/types/brandDiagnostic";
import ReactMarkdown from "react-markdown";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ExecutiveViewProps {
  data: BrandDiagnosticResult;
  pillars: PillarData[];
}

const ExecutiveView = ({ data, pillars }: ExecutiveViewProps) => {
  return (
    <div className="space-y-8 animate-fade-in">
      <Card>
        <CardHeader>
          <CardTitle>Full Strategic Report</CardTitle>
        </CardHeader>
        <CardContent className="prose prose-slate dark:prose-invert max-w-none">
          <ReactMarkdown>{data.full_report_markdown}</ReactMarkdown>
        </CardContent>
      </Card>
    </div>
  );
};

export default ExecutiveView;
