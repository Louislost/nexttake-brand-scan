export interface BrandDiagnosticResult {
  search_visibility_score: number;
  digital_authority_score: number;
  social_presence_score: number;
  brand_mentions_score: number;
  sentiment_analysis_score: number;
  content_footprint_score: number;
  brand_consistency_score: number;
  competitive_landscape_score: number;
  summary: string;
  full_report_markdown: string;
  recommendations: {
    [key: string]: string;
  };
}

export interface PillarData {
  key: string;
  name: string;
  score: number;
  recommendation: string;
}
