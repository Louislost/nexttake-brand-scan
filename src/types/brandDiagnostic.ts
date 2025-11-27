export interface BrandDiagnosticResult {
  overall_score: number;
  confidence_index: {
    score: number;
    data_coverage: string;
    consistency: string;
  };
  pillars: {
    [key: string]: Pillar;
  };
  analyst_view: AnalystView;
  executive_view: ExecutiveView;
}

export interface Pillar {
  score: number;
  max_score: number;
  qualitative_rating: string;
  data_coverage: string;
  key_drivers: string[];
}

export interface PillarSummary {
  summary: string;
  status: string;
  priority_level: string;
}

export interface AnalystView {
  executive_summary: string;
  key_findings: string[];
  pillar_summaries: {
    [key: string]: PillarSummary;
  };
  insights: {
    strengths: string[];
    weaknesses: string[];
    opportunities: string[];
    risks: string[];
  };
}

export interface ExecutiveView {
  strategic_priorities: StrategicPriority[];
  roadmap: {
    "30_days": RoadmapItem[];
    "90_days": RoadmapItem[];
    "180_days": RoadmapItem[];
  };
  pillar_recommendations: {
    [key: string]: string[];
  };
  risks_to_monitor: string[];
  creator_insights: CreatorInsight[];
  storytelling_angles: StorytellingAngle[];
  competitor_benchmark: CompetitorBenchmark;
  persona_recommendations: PersonaRecommendation[];
}

export interface StrategicPriority {
  area: string;
  action: string;
  expected_impact: string;
  time_horizon: string;
}

export interface RoadmapItem {
  milestone: string;
  action: string;
}

export interface CreatorInsight {
  category: string;
  insight: string;
}

export interface StorytellingAngle {
  angle: string;
  application: string;
}

export interface CompetitorBenchmark {
  summary: string;
  competitors: Competitor[];
}

export interface Competitor {
  name: string;
  position: string;
  comment: string;
}

export interface PersonaRecommendation {
  persona: string;
  description: string;
  recommended_actions: string[];
}
