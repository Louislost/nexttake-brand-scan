import { Button } from "@/components/ui/button";

interface ViewToggleProps {
  activeView: 'analyst' | 'executive';
  onChange: (view: 'analyst' | 'executive') => void;
}

const ViewToggle = ({ activeView, onChange }: ViewToggleProps) => {
  return (
    <div className="flex justify-center gap-2 mb-8">
      <Button
        variant={activeView === 'analyst' ? 'default' : 'outline'}
        onClick={() => onChange('analyst')}
        className="min-w-32"
      >
        Analyst View
      </Button>
      <Button
        variant={activeView === 'executive' ? 'default' : 'outline'}
        onClick={() => onChange('executive')}
        className="min-w-32"
      >
        Executive View
      </Button>
    </div>
  );
};

export default ViewToggle;
