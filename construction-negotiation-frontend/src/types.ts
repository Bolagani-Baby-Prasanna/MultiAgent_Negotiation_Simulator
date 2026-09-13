export type Page =
  | "Dashboard"
  | "Scenarios"
  | "Agent Configuration"
  | "Negotiation Arena"
  | "Reports & Analytics"
  | "Settings";

export type Status =
  | "Active"
  | "Completed"
  | "Draft"
  | "In Progress"
  | "Low"
  | "OK";

export interface Scenario {
  id: string;
  name: string;
  type: string;
  status: Status;
  createdOn: string;
}

export interface Negotiation {
  id: string;
  issue: string;
  agents: string;
  status: Status;
  updatedOn: string;
}

export interface Resource {
  name: string;
  total: number;
  allocated: number;
  available: number;
  unit: string;
  status: Status;
}

/* ── Scenario & Agent Configs ── */

export interface AgentConfig {
  name: string;
  icon: string;
  role: string;
  goal: string;
  constraints: string[];
}

export interface ScenarioTemplate {
  id: string;
  name: string;
  icon: string;
  description: string;
  category: string;
  difficulty: "Easy" | "Medium" | "Hard";
  estimatedRounds: number;
  agents: AgentConfig[];
}

export type Personality = "Aggressive" | "Collaborative" | "Risk-Averse";

export interface CompletedReport {
  id: string;
  scenarioName: string;
  category: string;
  agentCount: number;
  rounds: number;
  finalOffer: number | null;
  outcome: "Successful" | "No Agreement" | "Under Review";
  timestamp: string;
  historySummary: string[];
}

/* ── Negotiation Arena & Reasoning Types ── */

export interface NegotiationHistoryEntry {
  round: number;
  agent: string;
  action: "offer" | "counter" | "accept" | "reject" | string;
  message: string;
  offer: number | null;
  unit?: string | null;
  is_human?: boolean;
}

export interface ConstraintCheckData {
  text: string;
  status: "pass" | "warn" | "fail";
  detail: string;
}

export interface OfferScoreData {
  score: number;
  constraints_met: number;
  constraints_total: number;
  constraint_checks: ConstraintCheckData[];
  distance_from_ideal: number;
  summary: string;
}

export interface ConcessionDataItem {
  agent_name: string;
  opening_offer: number | null;
  current_offer: number | null;
  concession_rate: number;
  concession_velocity: number;
  remaining_room: number;
  offer_history: number[];
}

export interface RecommendationData {
  action: "accept" | "counter" | "reject" | string;
  confidence: number;
  reasoning: string;
  suggested_counter_low: number | null;
  suggested_counter_high: number | null;
}

export interface EvaluationData {
  agent_name: string;
  offer_score: OfferScoreData;
  concession_data: ConcessionDataItem;
  recommendation: RecommendationData;
  all_concessions: ConcessionDataItem[];
}

export interface NegotiationState {
  scenario: ScenarioTemplate;
  max_rounds: number;
  history: NegotiationHistoryEntry[];
  round: number;
  current_agent_index?: number;
  current_offer: number | null;
  current_offer_unit?: string | null;
  status: "active" | "agreement" | "max_rounds" | "breakdown" | string;
  is_deadlocked?: boolean;
  deadlock_rounds_remaining?: number | null;
}

export interface NegotiationOutcome {
  status: string;
  rounds_elapsed: number;
  max_rounds: number;
  turns_elapsed: number;
  final_offer: number | null;
  final_offer_unit?: string | null;
  accepted_by: string | null;
  evaluations: EvaluationData[];
}

export interface AgentStanceInfo {
  name: string;
  role: string;
  icon: string;
  personality: Personality;
  status: "active_speaking" | "waiting" | "accepted" | "conceding" | "firm";
  openingOffer: number | null;
  currentOffer: number | null;
  unit?: string | null;
  concessionRate: number;
  sentiment: "Firm" | "Flexible" | "Collaborating" | "Cautious" | "Agreed";
  constraintsMetRatio: string;
}