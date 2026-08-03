export interface ExtractedParameter {
  name: string;
  type: 'query' | 'body' | 'path' | 'header';
  required: boolean;
}

export interface ExtractedEndpoint {
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'OPTIONS';
  parameters: ExtractedParameter[];
  headers: string[];
  sourceFile: string;
  lineLocation: number;
}

export type DriftStatus = 'DOCUMENTED' | 'SHADOW' | 'ZOMBIE';

export interface AnalysisResult extends ExtractedEndpoint {
  status: DriftStatus;
  remediationHint?: string;
}
