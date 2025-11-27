import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface KeyFindingsListProps {
  findings: string[];
}

const KeyFindingsList = ({ findings }: KeyFindingsListProps) => {
  if (!findings || findings.length === 0) return null;

  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle>Key Findings</CardTitle>
      </CardHeader>
      <CardContent>
        <ol className="space-y-3">
          {findings.map((finding, idx) => (
            <li key={idx} className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
                {idx + 1}
              </span>
              <span className="text-muted-foreground">{finding}</span>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
};

export default KeyFindingsList;
