import type { Negotiation, Resource, Scenario, ScenarioTemplate } from "./types";

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

/* ── Task 3: Three Pre-Built Scenario Templates ── */

export const scenarioTemplates: ScenarioTemplate[] = [
  {
    id: "TPL-001",
    name: "Material Shortage",
    icon: "🧱",
    description:
      "Critical construction materials (steel) are running low due to supply chain disruptions. Agents must negotiate alternative procurement strategies, pricing, and delivery timelines to keep the project on track.",
    category: "Supply Chain",
    difficulty: "Medium",
    estimatedRounds: 4,
    agents: [
      {
        name: "Supplier Agent",
        icon: "🚚",
        role: "Material Provider",
        goal: "Maximize profit margin on steel supply while retaining the client relationship.",
        constraints: [
          "Maximum supply capacity: 600 tons",
          "Minimum price: ₹52,000 per ton",
          "Fastest delivery: 5 business days",
          "Cannot source from more than 2 sub-suppliers"
        ]
      },
      {
        name: "Contractor Agent",
        icon: "👷",
        role: "Material Buyer",
        goal: "Procure 600 tons of steel at the lowest possible cost with fastest delivery.",
        constraints: [
          "Budget cap for steel: ₹3.5 Cr",
          "Project deadline cannot extend beyond 3 days",
          "Quality grade must be Fe-500 or above",
          "Must maintain 50-ton safety stock"
        ]
      },
      {
        name: "Finance Manager Agent",
        icon: "💰",
        role: "Budget Gatekeeper",
        goal: "Keep total procurement cost within the approved project budget.",
        constraints: [
          "Total approved procurement budget: ₹3.4 Cr",
          "Emergency fund usage requires board approval",
          "Cost overrun must not exceed 5% of baseline",
          "Payment terms: 60-day credit cycle"
        ]
      }
    ]
  },
  {
    id: "TPL-002",
    name: "Budget Overrun",
    icon: "💸",
    description:
      "The project has exceeded its planned budget by 18% due to unforeseen ground conditions and material price inflation. Agents must negotiate cost-cutting measures, scope adjustments, and revised financial plans.",
    category: "Financial",
    difficulty: "Hard",
    estimatedRounds: 5,
    agents: [
      {
        name: "Client Agent",
        icon: "👤",
        role: "Project Owner",
        goal: "Ensure the project is completed within a revised budget without sacrificing critical deliverables.",
        constraints: [
          "Maximum additional budget: ₹45 Lakhs",
          "Core scope items are non-negotiable",
          "Project completion date must not shift by more than 2 weeks",
          "Quality standards as per original contract"
        ]
      },
      {
        name: "Finance Manager Agent",
        icon: "💰",
        role: "Cost Controller",
        goal: "Identify savings and reallocate funds to cover the overrun while maintaining financial compliance.",
        constraints: [
          "Cannot reallocate more than 10% from contingency reserves",
          "All cost adjustments require documented justification",
          "Monthly cash flow must remain positive",
          "Vendor payments cannot be delayed beyond 45 days"
        ]
      },
      {
        name: "Project Manager Agent",
        icon: "📋",
        role: "Scope & Schedule Mediator",
        goal: "Propose scope and schedule trade-offs that satisfy both the client and the finance team.",
        constraints: [
          "Cannot remove more than 2 non-critical scope items",
          "Resource reallocation limited to existing workforce",
          "Must maintain safety and compliance standards",
          "Progress reporting frequency increases to weekly"
        ]
      }
    ]
  },
  {
    id: "TPL-003",
    name: "Labor Shortage",
    icon: "👷",
    description:
      "A shortage of 40% skilled labor due to regional migration and competing projects threatens to delay construction by 3 weeks. Agents must negotiate workforce solutions, overtime policies, and schedule adjustments.",
    category: "Workforce",
    difficulty: "Medium",
    estimatedRounds: 3,
    agents: [
      {
        name: "Contractor Agent",
        icon: "👷",
        role: "Workforce Manager",
        goal: "Secure enough skilled workers to maintain the construction schedule with minimal delay.",
        constraints: [
          "Maximum overtime: 12 hours per worker per week",
          "Overtime pay premium: 1.5x standard rate",
          "Cannot hire more than 30 temporary workers",
          "All workers must have valid safety certifications"
        ]
      },
      {
        name: "Project Manager Agent",
        icon: "📋",
        role: "Schedule Coordinator",
        goal: "Re-sequence activities to minimize overall project delay despite reduced workforce.",
        constraints: [
          "Critical path activities cannot be deferred",
          "Maximum acceptable delay: 10 working days",
          "Must maintain minimum 2 parallel work-fronts",
          "Safety inspections cannot be rescheduled"
        ]
      },
      {
        name: "Client Agent",
        icon: "👤",
        role: "Deadline Enforcer",
        goal: "Ensure project milestones are met with minimal deviation from the original schedule.",
        constraints: [
          "Milestone 1 (foundation) date is fixed",
          "Penalty clause: ₹50,000 per day of delay beyond 10 days",
          "No compromise on structural quality",
          "Weekly progress reports required"
        ]
      }
    ]
  },
  {
    id: "TPL-004",
    name: "Deadline Reduction",
    icon: "⏱️",
    description:
      "The client has requested the project completion date be moved forward by 4 weeks due to regulatory requirements. Agents must negotiate resource acceleration, overtime budgets, and schedule compression strategies.",
    category: "Timeline",
    difficulty: "Hard",
    estimatedRounds: 5,
    agents: [
      {
        name: "Client Agent",
        icon: "👤",
        role: "Deadline Requester",
        goal: "Achieve a 4-week reduction in project completion date with acceptable cost increases.",
        constraints: [
          "Maximum additional budget for acceleration: ₹30 Lakhs",
          "No reduction in scope or deliverables",
          "Safety standards must remain unchanged",
          "Regulatory submission deadline: non-negotiable"
        ]
      },
      {
        name: "Contractor Agent",
        icon: "👷",
        role: "Execution Accelerator",
        goal: "Develop a feasible fast-track schedule with adequate resources and compensation.",
        constraints: [
          "Maximum additional workforce: 25 workers",
          "Overtime limited to 15 hours per worker per week",
          "Concurrent work-fronts cannot exceed 5",
          "Equipment availability depends on vendor confirmation"
        ]
      },
      {
        name: "Project Manager Agent",
        icon: "📋",
        role: "Schedule Optimizer",
        goal: "Identify critical path activities that can be overlapped or fast-tracked safely.",
        constraints: [
          "Activity overlapping must maintain 2-day buffer",
          "Quality inspection durations cannot be compressed",
          "Must maintain minimum 1 rest day per week for workers",
          "Weather-sensitive activities cannot be rescheduled to monsoon weeks"
        ]
      }
    ]
  },
  {
    id: "TPL-005",
    name: "Scope Changes",
    icon: "✏️",
    description:
      "The client has requested additional amenities including a rooftop garden and upgraded lobby finishes. Agents must negotiate the cost, schedule, and resource impact of these scope additions.",
    category: "Scope",
    difficulty: "Medium",
    estimatedRounds: 4,
    agents: [
      {
        name: "Client Agent",
        icon: "👤",
        role: "Scope Requester",
        goal: "Add desired features (rooftop garden, upgraded lobby) while keeping budget impact below ₹25 Lakhs.",
        constraints: [
          "Maximum additional budget: ₹25 Lakhs",
          "Project completion delay must not exceed 1 week",
          "Original scope items are non-negotiable",
          "Upgraded finishes must match approved design standards"
        ]
      },
      {
        name: "Contractor Agent",
        icon: "👷",
        role: "Scope Implementer",
        goal: "Accurately estimate effort and cost for new scope items and negotiate fair compensation.",
        constraints: [
          "Existing workforce must handle at least 70% of new scope work",
          "New material procurement lead time: minimum 10 days",
          "Cannot work on new scope until current phase is 80% complete",
          "Subcontractor rates are fixed for this quarter"
        ]
      },
      {
        name: "Finance Manager Agent",
        icon: "💰",
        role: "Change Order Evaluator",
        goal: "Ensure all scope changes are financially justified and within revised budget limits.",
        constraints: [
          "Change order must include detailed cost breakdown",
          "Contingency reserve cannot fund scope additions",
          "Approval required from both client and finance head",
          "Payment for new scope follows milestone-based billing"
        ]
      }
    ]
  },
  {
    id: "TPL-006",
    name: "Weather Delays",
    icon: "🌧️",
    description:
      "Unexpected extended monsoon rains have halted outdoor construction for 12 days. Agents must negotiate schedule recovery plans, cost of idle resources, and revised milestone dates.",
    category: "External",
    difficulty: "Easy",
    estimatedRounds: 3,
    agents: [
      {
        name: "Project Manager Agent",
        icon: "📋",
        role: "Recovery Planner",
        goal: "Develop a recovery schedule that minimizes overall project delay after weather disruption.",
        constraints: [
          "Indoor activities must continue during rain days",
          "Recovery plan must be submitted within 3 days of weather clearance",
          "Cannot schedule concrete pouring within 48 hours of heavy rain",
          "Must account for ground drying time (minimum 2 days)"
        ]
      },
      {
        name: "Contractor Agent",
        icon: "👷",
        role: "Resource Standby Manager",
        goal: "Minimize cost of idle workers and equipment while being ready to resume immediately.",
        constraints: [
          "Idle worker pay: 50% of daily wage for standby",
          "Equipment rental charges continue during weather delay",
          "Cannot release more than 30% of workforce during delay",
          "Must maintain site safety measures during rain"
        ]
      },
      {
        name: "Client Agent",
        icon: "👤",
        role: "Timeline Negotiator",
        goal: "Ensure weather delay does not cascade into major project delay beyond 5 additional days.",
        constraints: [
          "Force majeure clause covers up to 10 days of weather delay",
          "Additional delay costs must be shared 50-50 with contractor",
          "Key milestone (structural completion) date has 5-day flexibility",
          "Insurance claim must be filed within 7 days of weather event"
        ]
      }
    ]
  },
  {
    id: "TPL-007",
    name: "Equipment Breakdown",
    icon: "⚙️",
    description:
      "The primary tower crane has suffered a hydraulic failure, halting all high-rise lifting operations. Agents must negotiate repair vs. replacement decisions, rental alternatives, and schedule impact mitigation.",
    category: "Equipment",
    difficulty: "Medium",
    estimatedRounds: 4,
    agents: [
      {
        name: "Contractor Agent",
        icon: "👷",
        role: "Equipment Decision Maker",
        goal: "Resume lifting operations within 3 days at the lowest possible cost — repair, replace, or rent.",
        constraints: [
          "Crane repair estimate: ₹8 Lakhs, timeline: 5-7 days",
          "Replacement crane cost: ₹45 Lakhs, delivery: 15 days",
          "Rental crane available: ₹1.5 Lakhs per day",
          "Site can accommodate maximum 1 additional crane"
        ]
      },
      {
        name: "Finance Manager Agent",
        icon: "💰",
        role: "Cost Analyst",
        goal: "Find the most cost-effective solution that balances repair, rental, and delay penalty costs.",
        constraints: [
          "Equipment maintenance budget remaining: ₹12 Lakhs",
          "Insurance covers 60% of repair cost only (not rental)",
          "Delay penalty: ₹75,000 per day after 3 days of stoppage",
          "Capital expenditure above ₹20 Lakhs requires management approval"
        ]
      },
      {
        name: "Project Manager Agent",
        icon: "📋",
        role: "Impact Assessor",
        goal: "Reorganize the construction sequence to minimize idle time while crane issue is resolved.",
        constraints: [
          "Ground-level activities can proceed without crane",
          "Upper floor work is fully blocked without lifting capability",
          "Alternative manual lifting limited to loads under 500 kg",
          "Must maintain at least 60% workforce utilization during downtime"
        ]
      }
    ]
  }
];