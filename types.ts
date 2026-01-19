export enum ProjectTypology {
  ROOF_NEW = 'ROOF_NEW',
  ROOF_EXISTING = 'ROOF_EXISTING',
  SHADE = 'SHADE', // Ombrière
  GROUND = 'GROUND' // Sol
}

export enum InjectionType {
  TOTAL_INJECTION = 'TOTAL_INJECTION',
  AUTOCONSUMPTION = 'AUTOCONSUMPTION'
}

export enum InvestmentModel {
  OWN_INVESTMENT = 'OWN_INVESTMENT', // Tiers-Investissement
  CLIENT_INVESTMENT = 'CLIENT_INVESTMENT'
}

export interface PhaseOverride {
  negotiationDuration?: number;
  urbanismDuration?: number; // months
  creDuration?: number;
  leaseDuration?: number;
  connectionDuration?: number;
  constructionDuration?: number;
}

export interface SkippedPhases {
  negotiation?: boolean;
  urbanism?: boolean;
  aoCre?: boolean;
  leaseManagement?: boolean;
  connection?: boolean; // Rare but possible
  construction?: boolean; // Buying an asset?
}

export interface ProjectConfig {
  id: string;
  name: string;
  signatureDate: string; // YYYY-MM-DD
  powerKWc: number;
  typology: ProjectTypology;
  injectionType: InjectionType;
  investmentModel: InvestmentModel;
  isSubcontracted: boolean;
  overrides: PhaseOverride;
  skippedPhases: SkippedPhases;
}

export interface DateRange {
  start: Date;
  end: Date;
  durationMonths: number;
}

export interface PhaseResult {
  negotiation?: DateRange;
  urbanism?: DateRange;
  aoCre?: DateRange; // Optional
  leaseManagement?: DateRange; // Optional
  connection: DateRange;
  construction: DateRange;
  operation: DateRange; // Only start matters effectively
  milestones: {
    loi?: Date;
    signature: Date;
    urbanismOk?: Date;
    laureate?: Date; // AO CRE result
    leaseSigned?: Date;
    constructionCompletion: Date;
    cod: Date; // Commercial Operation Date
  };
  totalDurationMonths: number;
}

export interface ChartMonth {
  date: Date;
  label: string;
  isRestricted: boolean; // Jan, Apr, Aug
  year: number;
  monthIndex: number;
}