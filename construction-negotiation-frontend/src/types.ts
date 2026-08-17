export type Page =
  | "dashboard"
  | "projects"
  | "scenarios"
  | "negotiations"
  | "resources"
  | "reports"
  | "agents"
  | "settings";

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

/* ── Task 3: Scenario Selection Module ── */

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