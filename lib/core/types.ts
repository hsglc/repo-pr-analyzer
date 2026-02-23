export interface ParsedFile {
  path: string;
  additions: number;
  deletions: number;
  chunks: ParsedChunk[];
  status: "added" | "deleted" | "modified" | "renamed";
  oldPath?: string;
}

export interface ParsedChunk {
  content: string;
  changes: ParsedChange[];
  oldStart: number;
  newStart: number;
}

export interface ParsedChange {
  type: "add" | "del" | "normal";
  content: string;
  lineNumber: number;
}

export interface ImpactResult {
  features: FeatureImpact[];
  services: string[];
  pages: string[];
  riskLevel: "low" | "medium" | "high" | "critical";
  summary: string;
}

export interface FeatureImpact {
  name: string;
  affectedFiles: string[];
  changeType: "direct" | "indirect";
  description: string;
}

export interface TestScenario {
  id: string;
  title: string;
  feature: string;
  priority: "critical" | "high" | "medium" | "low";
  type: "functional" | "regression" | "edge-case" | "integration";
  steps: string[];
  expectedResult: string;
}

export interface CodeReviewItem {
  id: string;
  file: string;
  line?: number;
  severity: "critical" | "warning" | "info" | "suggestion";
  category: "bug" | "security" | "performance" | "maintainability" | "style";
  title: string;
  description: string;
  suggestion?: string;
}

export interface AnalysisReport {
  prNumber: number;
  prTitle: string;
  timestamp: string;
  impact: ImpactResult;
  testScenarios: TestScenario[];
  codeReview: CodeReviewItem[];
  stats: {
    filesChanged: number;
    additions: number;
    deletions: number;
    featuresAffected: number;
  };
}

export interface ImpactMapConfig {
  features: Record<string, FeatureMapping>;
  services: Record<string, string[]>;
  pages: Record<string, string[]>;
  ignorePatterns: string[];
}

export interface FeatureMapping {
  description: string;
  paths: string[];
  relatedFeatures?: string[];
}
