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