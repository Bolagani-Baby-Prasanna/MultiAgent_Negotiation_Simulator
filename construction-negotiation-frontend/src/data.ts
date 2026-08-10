import { Negotiation, Resource, Scenario } from "./types";

export const scenarios: Scenario[] = [
  {
    id: "SC-104",
    name: "Material Shortage",
    type: "Material",
    status: "Active",
    createdOn: "12 May 2026"
  },
  {
    id: "SC-103",
    name: "Budget Overrun",
    type: "Budget",
    status: "Active",
    createdOn: "10 May 2026"
  },
  {
    id: "SC-102",
    name: "Labor Shortage",
    type: "Labor",
    status: "Active",
    createdOn: "09 May 2026"
  },
  {
    id: "SC-101",
    name: "Deadline Reduction",
    type: "Timeline",
    status: "Draft",
    createdOn: "08 May 2026"
  },
  {
    id: "SC-100",
    name: "Scope Changes",
    type: "Scope",
    status: "Draft",
    createdOn: "07 May 2026"
  },
  {
    id: "SC-099",
    name: "Weather Delays",
    type: "External",
    status: "Draft",
    createdOn: "06 May 2026"
  },
  {
    id: "SC-098",
    name: "Equipment Breakdown",
    type: "Equipment",
    status: "Draft",
    createdOn: "05 May 2026"
  }
];

export const negotiations: Negotiation[] = [
  {
    id: "NG-210",
    issue: "Steel Shortage",
    agents: "Contractor, Supplier, Finance",
    status: "In Progress",
    updatedOn: "12 May 2026"
  },
  {
    id: "NG-209",
    issue: "Budget Overrun",
    agents: "Contractor, Finance, Client",
    status: "Completed",
    updatedOn: "10 May 2026"
  },
  {
    id: "NG-208",
    issue: "Labor Shortage",
    agents: "Contractor, Finance, Project Manager",
    status: "In Progress",
    updatedOn: "09 May 2026"
  }
];

export const resources: Resource[] = [
  {
    name: "Steel",
    total: 800,
    allocated: 500,
    available: 300,
    unit: "Ton",
    status: "Low"
  },
  {
    name: "Cement",
    total: 3000,
    allocated: 1800,
    available: 1200,
    unit: "Bags",
    status: "OK"
  },
  {
    name: "Bricks",
    total: 50000,
    allocated: 25000,
    available: 25000,
    unit: "Nos",
    status: "OK"
  },
  {
    name: "Sand",
    total: 2000,
    allocated: 1200,
    available: 800,
    unit: "Cft",
    status: "OK"
  },
  {
    name: "Aggregate",
    total: 1500,
    allocated: 900,
    available: 600,
    unit: "Cft",
    status: "OK"
  }
];

export const messages = [
  {
    time: "10:00 AM",
    speaker: "Contractor",
    message: "Requested 600 tons of steel at the current price."
  },
  {
    time: "10:05 AM",
    speaker: "Supplier",
    message: "Offered 500 tons at ₹5,000 per ton with delivery in 10 days."
  },
  {
    time: "10:10 AM",
    speaker: "Finance Manager",
    message: "Countered: additional increase up to ₹10 lakh only."
  },
  {
    time: "10:15 AM",
    speaker: "Contractor",
    message: "Countered: need early delivery within 5 days."
  },
  {
    time: "10:20 AM",
    speaker: "Project Manager",
    message: "Proposed accepting 500 tons with 5-day delivery."
  },
  {
    time: "10:25 AM",
    speaker: "Supplier",
    message: "Accepted the revised delivery condition."
  },
  {
    time: "10:30 AM",
    speaker: "System",
    message: "Agreement reached and submitted for validation."
  }
];

export const agreement = {
  scenario: "Material Shortage (Steel)",
  date: "12 May 2026",

  terms: [
    "Steel Quantity: 500 Tons",
    "Price: ₹5,000 / Ton",
    "Delivery Time: Within 5 Days",
    "Additional Budget: ₹10,00,000",
    "Scheduled Impact: Delay 1 Day",
    "Approval: All Active Agents"
  ],

  impact: [
    {
      label: "Total Cost",
      value: "+ ₹10,00,000"
    },
    {
      label: "Project Delay",
      value: "+ 1 Day"
    },
    {
      label: "Risk Level",
      value: "Low"
    }
  ]
};

export const agents = [
  {
    name: "Client Agent",
    owner: "Client",
    responsibility: "Budget, scope, quality, deadline"
  },
  {
    name: "Contractor Agent",
    owner: "Contractor",
    responsibility: "Labor, equipment, schedule, profit"
  },
  {
    name: "Supplier Agent",
    owner: "Supplier",
    responsibility: "Pricing, inventory, delivery"
  },
  {
    name: "Project Manager Agent",
    owner: "Project Manager",
    responsibility: "Resources, schedule, risk"
  },
  {
    name: "Finance Manager Agent",
    owner: "Finance Manager",
    responsibility: "Budget, cost control, planning"
  }
];