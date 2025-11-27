import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CompetitorBenchmark } from "@/types/brandDiagnostic";

interface CompetitorBenchmarkTableProps {
  benchmark: CompetitorBenchmark;
}

const CompetitorBenchmarkTable = ({ benchmark }: CompetitorBenchmarkTableProps) => {
  if (!benchmark || !benchmark.competitors || benchmark.competitors.length === 0) {
    return (
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Competitor Benchmark</CardTitle>
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
      <h3 className="text-2xl font-bold mb-6">Competitor Benchmark</h3>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-6">{benchmark.summary}</p>
          
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Competitor</TableHead>
                  <TableHead>Position</TableHead>
                  <TableHead>Analysis</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {benchmark.competitors.map((competitor, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="font-medium">{competitor.name}</TableCell>
                    <TableCell>{competitor.position}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {competitor.comment}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CompetitorBenchmarkTable;
