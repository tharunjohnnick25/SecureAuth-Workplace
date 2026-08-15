export interface User {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  role?: string;
  department?: string;
}

export interface RiskData {
  score: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  factors: string[];
  riskRecordId?: string;
}
