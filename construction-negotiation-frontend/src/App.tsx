import { useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { scenarioTemplates } from "./data";
import type { CompletedReport, ScenarioTemplate } from "./types";
import { NegotiationArena } from "./components/NegotiationArena/NegotiationArena";
import { generateTranscriptPDF, generateSummaryReportPDF, generateAllReportsPDF } from "./utils/pdfExport";
import "./App.css";

type Agent = {
  name: string;
  role: string;
  focus: string;
  icon: string;
};

const agents: Agent[] = [
  {
    name: "Client Agent",
    role: "Client",
    focus: "Budget, Scope, Deadline",
    icon: "👤",
  },
  {
    name: "Contractor Agent",
    role: "Contractor",
    focus: "Labor, Equipment, Schedule, Profit",
    icon: "👷",
  },
  {
    name: "Supplier Agent",
    role: "Supplier",
    focus: "Pricing, Inventory, Delivery",
    icon: "🚚",
  },
  {
    name: "Project Manager Agent",
    role: "Project Manager",
    focus: "Resources, Schedule, Risk",
    icon: "📋",
  },
  {
    name: "Finance Manager Agent",
    role: "Finance Manager",
    focus: "Budget, Cost Control, Planning",
    icon: "💰",
  },
];



const INITIAL_REPORTS: CompletedReport[] = [
  {
    id: "REP-901",
    scenarioName: "Material Shortage",
    category: "Supply Chain",
    agentCount: 3,
    rounds: 4,
    finalOffer: 52000,
    outcome: "Successful",
    timestamp: "12 May 2026, 10:30 AM",
    historySummary: [
      "Supplier Agent opened at 58,000",
      "Contractor Agent countered at 50,000",
      "Supplier Agent revised to 55,000",
      "Final agreement settled at 52,000",
    ],
  },
  {
    id: "REP-902",
    scenarioName: "Labor Shortage",
    category: "Workforce",
    agentCount: 3,
    rounds: 3,
    finalOffer: 1.5,
    outcome: "Successful",
    timestamp: "09 May 2026, 04:15 PM",
    historySummary: [
      "Contractor requested 15 workers",
      "Project Manager proposed schedule shift",
      "Agreement reached on 1.5x overtime rate",
    ],
  },
  {
    id: "REP-903",
    scenarioName: "Budget Overrun",
    category: "Financial",
    agentCount: 3,
    rounds: 5,
    finalOffer: null,
    outcome: "No Agreement",
    timestamp: "07 May 2026, 02:00 PM",
    historySummary: [
      "Client requested ₹45L budget cap",
      "Finance Manager cap reached",
      "Rounds exceeded without consensus",
    ],
  },
];

function CustomScenarioModal({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (newScenario: ScenarioTemplate) => void;
}) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("Supply Chain");
  const [difficulty, setDifficulty] = useState<"Easy" | "Medium" | "Hard">("Medium");
  const [description, setDescription] = useState("");
  const [estimatedRounds, setEstimatedRounds] = useState(4);
  const [icon, setIcon] = useState("🏗️");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !description.trim()) return;

    const newScenario: ScenarioTemplate = {
      id: `CUST-${Date.now().toString().slice(-4)}`,
      name: name.trim(),
      icon: icon.trim() || "⚡",
      description: description.trim(),
      category: category.trim(),
      difficulty,
      estimatedRounds,
      agents: [
        {
          name: "Supplier Agent",
          icon: "🚚",
          role: "Material Provider",
          goal: "Deliver requested scope within profitable margins.",
          constraints: [
            `Minimum price limit: ₹50,000`,
            `Fastest delivery: 3 business days`,
          ],
        },
        {
          name: "Contractor Agent",
          icon: "👷",
          role: "Site Administrator",
          goal: "Maintain project timeline with minimal cost overrun.",
          constraints: [
            `Maximum budget cap: ₹55,000`,
            `Safety inspection compliance: Mandatory`,
          ],
        },
        {
          name: "Finance Manager Agent",
          icon: "💰",
          role: "Cost Controller",
          goal: "Ensure overall expenditure fits inside project baseline.",
          constraints: [
            `Maximum cost overrun: 5%`,
            `Contingency fund cap: ₹20 Lakhs`,
          ],
        },
      ],
    };

    onCreate(newScenario);
  };

  return (
    <div className="scenario-modal-overlay" onClick={onClose}>
      <div className="scenario-modal custom-scenario-modal" onClick={(e) => e.stopPropagation()}>
        <div className="scenario-modal-header">
          <div>
            <h3>Create Custom Scenario</h3>
            <p className="scenario-modal-subtitle">Define a new multi-agent negotiation problem</p>
          </div>
          <button type="button" className="scenario-modal-close" onClick={onClose}>
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="custom-scenario-form">
          <div className="form-row">
            <div className="form-group flex-2">
              <label>Scenario Title</label>
              <input
                type="text"
                placeholder="e.g. Concrete Supply Surge"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="form-group flex-1">
              <label>Icon / Emoji</label>
              <input
                type="text"
                value={icon}
                onChange={(e) => setIcon(e.target.value)}
                maxLength={4}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Category</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)}>
                <option value="Supply Chain">Supply Chain</option>
                <option value="Financial">Financial</option>
                <option value="Workforce">Workforce</option>
                <option value="Timeline">Timeline</option>
                <option value="Scope">Scope</option>
                <option value="Equipment">Equipment</option>
              </select>
            </div>

            <div className="form-group">
              <label>Difficulty</label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as "Easy" | "Medium" | "Hard")}
              >
                <option value="Easy">Easy</option>
                <option value="Medium">Medium</option>
                <option value="Hard">Hard</option>
              </select>
            </div>

            <div className="form-group">
              <label>Estimated Rounds</label>
              <input
                type="number"
                min={2}
                max={10}
                value={estimatedRounds}
                onChange={(e) => setEstimatedRounds(Number(e.target.value))}
              />
            </div>
          </div>

          <div className="form-group">
            <label>Problem Description & Objectives</label>
            <textarea
              rows={3}
              placeholder="Describe the operational conflict, constraint boundaries, and goals for participating agents..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
          </div>

          <div className="modal-actions">
            <button type="button" className="outline-button" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="primary-button">
              Create & Add Scenario →
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function App() {
  const [activePage, setActivePage] = useState("Dashboard");
  const [selectedScenario, setSelectedScenario] = useState("Material Shortage");
  const [personalities, setPersonalities] = useState<
    Record<string, Personality>
  >({});
  const [templates, setTemplates] = useState<ScenarioTemplate[]>(scenarioTemplates);
  const [reportsList, setReportsList] = useState<CompletedReport[]>(INITIAL_REPORTS);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  const handleCreateScenario = (newScenario: ScenarioTemplate) => {
    setTemplates((prev) => [newScenario, ...prev]);
    setSelectedScenario(newScenario.name);
    setShowCreateModal(false);
    showToast(`Scenario "${newScenario.name}" created successfully!`);
    setActivePage("Agent Configuration");
  };

  const handleAddReport = (report: CompletedReport) => {
    setReportsList((prev) => [report, ...prev]);
    showToast(`Negotiation completed! Saved report ${report.id}.`);
  };

  return (
    <div className="app">
      {/* Toast Notification Banner */}
      {toast && (
        <div className="toast-notification">
          <span>✨ {toast}</span>
        </div>
      )}

      {/* Custom Scenario Builder Modal */}
      {showCreateModal && (
        <CustomScenarioModal
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreateScenario}
        />
      )}

      {/* Sidebar */}
      <aside className="sidebar">
        <div className="logo">
          <div className="logo-mark">CN</div>
          <div>
            <h2>Construct<span>AI</span></h2>
            <p>Negotiation Simulator</p>
          </div>
        </div>

        <nav className="navigation">
          <button
            className={activePage === "Dashboard" ? "nav-item active" : "nav-item"}
            onClick={() => setActivePage("Dashboard")}
          >
            <span>▦</span>
            Dashboard
          </button>

          <button
            className={activePage === "Scenarios" ? "nav-item active" : "nav-item"}
            onClick={() => setActivePage("Scenarios")}
          >
            <span>▤</span>
            Scenarios
          </button>

          <button
            className={
              activePage === "Agent Configuration"
                ? "nav-item active"
                : "nav-item"
            }
            onClick={() => setActivePage("Agent Configuration")}
          >
            <span>◈</span>
            Agent Configuration
          </button>

          <button
            className={
              activePage === "Negotiation Arena" || activePage === "Negotiation Monitor"
                ? "nav-item active"
                : "nav-item"
            }
            onClick={() => setActivePage("Negotiation Arena")}
          >
            <span>⚔️</span>
            Negotiation Arena
          </button>

          <button
            className={
              activePage === "Reports & Analytics"
                ? "nav-item active"
                : "nav-item"
            }
            onClick={() => setActivePage("Reports & Analytics")}
          >
            <span>▥</span>
            Reports & Analytics
          </button>

          <button
            className={activePage === "Settings" ? "nav-item active" : "nav-item"}
            onClick={() => setActivePage("Settings")}
          >
            <span>⚙</span>
            Settings
          </button>
        </nav>

        <div className="sidebar-bottom">
          <div className="system-status">
            <span className="status-dot"></span>
            <div>
              <strong>System Online</strong>
              <small>All services operational</small>
            </div>
          </div>

          <div className="user-profile">
            <div className="avatar">PM</div>
            <div>
              <strong>Project Manager</strong>
              <small>Administrator</small>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <header className="topbar">
          <div>
            <h1>{activePage}</h1>
            <p>Multi-Agent Construction Project Resource Negotiation</p>
          </div>

          <div className="topbar-actions">
            <div className="connection">
              <span className="status-dot"></span>
              System Connected
            </div>

            <button className="notification">🔔</button>
            <div className="top-avatar">PM</div>
          </div>
        </header>

        {activePage === "Dashboard" && (
          <Dashboard
            selectedScenario={selectedScenario}
            setSelectedScenario={setSelectedScenario}
            templates={templates}
            onOpenCreateModal={() => setShowCreateModal(true)}
            onNavigate={(page) => setActivePage(page)}
          />
        )}

        {activePage === "Scenarios" && (
          <Scenarios
            selectedScenario={selectedScenario}
            setSelectedScenario={setSelectedScenario}
            templates={templates}
            onOpenCreateModal={() => setShowCreateModal(true)}
          />
        )}

        {activePage === "Agent Configuration" && (
          <AgentConfiguration
            selectedScenario={selectedScenario}
            personalities={personalities}
            setPersonalities={setPersonalities}
            templates={templates}
            setTemplates={setTemplates}
            onStartNegotiation={() => setActivePage("Negotiation Arena")}
          />
        )}

        {(activePage === "Negotiation Arena" || activePage === "Negotiation Monitor") && (
          <NegotiationArena
            selectedScenario={selectedScenario}
            personalities={personalities}
            templates={templates}
            onCompleteReport={handleAddReport}
            showToast={showToast}
          />
        )}

        {activePage === "Reports & Analytics" && (
          <Reports reportsList={reportsList} />
        )}

        {activePage === "Settings" && <Settings />}
      </main>
    </div>
  );
}

function Dashboard({
  selectedScenario,
  setSelectedScenario,
  templates,
  onOpenCreateModal,
  onNavigate,
}: {
  selectedScenario: string;
  setSelectedScenario: (scenario: string) => void;
  templates: ScenarioTemplate[];
  onOpenCreateModal: () => void;
  onNavigate: (page: string) => void;
}) {
  return (
    <div className="page-content">
      <section className="welcome-section">
        <div>
          <h2>Project Overview</h2>
          <p>
            Monitor construction resources, stakeholder agents and active
            negotiations.
          </p>
        </div>

        <button className="primary-button" onClick={onOpenCreateModal}>
          + New Scenario
        </button>
      </section>

      {/* Statistics */}
      <section className="stats-grid">
        <StatCard
          title="Active Negotiations"
          value="3"
          description="Currently running"
          icon="🤝"
        />

        <StatCard
          title="Available Budget"
          value="₹2.3 Cr"
          description="Current allocation"
          icon="₹"
        />

        <StatCard
          title="Resources"
          value="18"
          description="Being monitored"
          icon="▣"
        />

        <StatCard
          title="Agreements"
          value="12"
          description="Successfully completed"
          icon="✓"
        />
      </section>

      <div className="dashboard-grid">
        {/* Agents */}
        <section className="panel agents-panel">
          <div className="panel-header">
            <div>
              <h3>Active Agents</h3>
              <p>Construction stakeholders</p>
            </div>

            <span className="count-badge">5 Agents</span>
          </div>

          <div className="agent-list">
            {agents.map((agent) => (
              <div className="agent-card" key={agent.name}>
                <div className="agent-icon">{agent.icon}</div>

                <div className="agent-information">
                  <strong>{agent.name}</strong>
                  <span>{agent.role}</span>
                  <small>{agent.focus}</small>
                </div>

                <span className="agent-online">
                  <i></i>
                  Active
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* Scenario */}
        <section className="panel scenario-panel">
          <div className="panel-header">
            <div>
              <h3>Scenario Library</h3>
              <p>Select a construction problem</p>
            </div>

            <button className="text-button" onClick={onOpenCreateModal}>
              + Create Custom
            </button>
          </div>

          <div className="scenario-list">
            {templates.map((tpl) => (
              <button
                key={tpl.id}
                className={
                  selectedScenario === tpl.name
                    ? "scenario-item selected"
                    : "scenario-item"
                }
                onClick={() => {
                  setSelectedScenario(tpl.name);
                  onNavigate("Agent Configuration");
                }}
              >
                <span>{tpl.icon}</span>
                {tpl.name}
                <b>›</b>
              </button>
            ))}
          </div>
        </section>
      </div>

      {/* Current Negotiation */}
      <section className="panel negotiation-panel">
        <div className="panel-header">
          <div>
            <h3>Current Negotiation</h3>
            <p>{selectedScenario}</p>
          </div>

          <span className="negotiation-status">
            <i></i>
            Ready for Simulation
          </span>
        </div>

        <div className="negotiation-content">
          <div className="negotiation-agents">
            <NegotiationAgent name="Supplier Agent" icon="🚚" />
            <div className="negotiation-arrow">⇄</div>
            <NegotiationAgent name="Contractor Agent" icon="👷" />
            <div className="negotiation-arrow">⇄</div>
            <NegotiationAgent name="Finance Manager Agent" icon="💰" />
          </div>

          <div className="negotiation-details">
            <div>
              <span>Negotiation Issue</span>
              <strong>{selectedScenario}</strong>
            </div>

            <div>
              <span>Agents</span>
              <strong>3 Active</strong>
            </div>

            <div>
              <span>Status</span>
              <strong className="success-text">Configured</strong>
            </div>

            <div>
              <button
                className="primary-button compact-btn"
                onClick={() => onNavigate("Negotiation Arena")}
              >
                Enter Arena →
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function Scenarios({
  selectedScenario,
  setSelectedScenario,
  templates,
  onOpenCreateModal,
}: {
  selectedScenario: string;
  setSelectedScenario: (scenario: string) => void;
  templates: ScenarioTemplate[];
  onOpenCreateModal: () => void;
}) {
  const [viewingTemplate, setViewingTemplate] = useState<ScenarioTemplate | null>(null);

  const handleSelectTemplate = (template: ScenarioTemplate) => {
    setSelectedScenario(template.name);
    setViewingTemplate(template);
  };

  return (
    <div className="page-content">
      <section className="welcome-section">
        <div>
          <h2>Scenario Selection</h2>
          <p>
            Choose a construction negotiation template or build your own custom problem to configure agent roles and constraints.
          </p>
        </div>

        <div className="welcome-actions">
          <button className="primary-button" onClick={onOpenCreateModal}>
            + Create Custom Scenario
          </button>
          <span className="count-badge">{templates.length} Scenarios</span>
        </div>
      </section>

      {/* ── Template Cards Grid ── */}
      <div className="template-grid">
        {templates.map((template) => {
          const isSelected = selectedScenario === template.name;

          return (
            <div
              className={`template-card ${isSelected ? "selected" : ""}`}
              key={template.id}
            >
              {/* Card Header & Main Info */}
              <div
                className="template-card-main"
                onClick={() => handleSelectTemplate(template)}
              >
                <div className="template-card-header">
                  <div className="template-icon">{template.icon}</div>

                  <div className="template-badges">
                    <span
                      className={`difficulty-badge difficulty-${template.difficulty.toLowerCase()}`}
                    >
                      {template.difficulty}
                    </span>
                    <span className="category-badge">{template.category}</span>
                  </div>
                </div>

                <h3>{template.name}</h3>
                <p className="template-description">{template.description}</p>

                {/* Card Meta */}
                <div className="template-meta">
                  <div className="meta-item">
                    <span>Agents</span>
                    <strong>{template.agents.length}</strong>
                  </div>
                  <div className="meta-item">
                    <span>Rounds</span>
                    <strong>~{template.estimatedRounds}</strong>
                  </div>
                </div>

                {/* Agent Avatars */}
                <div className="template-agent-avatars">
                  {template.agents.map((agent) => (
                    <div
                      className="template-avatar"
                      key={agent.name}
                      title={`${agent.name} (${agent.role})`}
                    >
                      {agent.icon}
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  className={
                    isSelected
                      ? "primary-button template-select-btn"
                      : "outline-button template-select-btn"
                  }
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSelectTemplate(template);
                  }}
                >
                  {isSelected
                    ? "✓ Selected — View Details"
                    : "Select & View Details ▼"}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Agent Configuration Modal ── */}
      {viewingTemplate && (
        <div
          className="scenario-modal-overlay"
          onClick={() => setViewingTemplate(null)}
        >
          <div
            className="scenario-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="scenario-modal-header">
              <div>
                <h3>{viewingTemplate.name}</h3>
                <span className="agent-count-tag">
                  {viewingTemplate.agents.length} Configured Agents
                </span>
              </div>
              <button
                type="button"
                className="scenario-modal-close"
                onClick={() => setViewingTemplate(null)}
                aria-label="Close details"
              >
                ✕
              </button>
            </div>

            <div className="agent-detail-grid">
              {viewingTemplate.agents.map((agent) => (
                <div className="agent-detail-card" key={agent.name}>
                  <div className="agent-detail-header">
                    <span className="agent-detail-icon">{agent.icon}</span>
                    <div>
                      <strong>{agent.name}</strong>
                      <span className="agent-role-badge">{agent.role}</span>
                    </div>
                  </div>

                  <div className="agent-section">
                    <span className="section-label">
                      <span className="section-icon">🎯</span> Goal
                    </span>
                    <p className="agent-goal">{agent.goal}</p>
                  </div>

                  <div className="agent-section">
                    <span className="section-label">
                      <span className="section-icon">🚧</span> Constraints
                    </span>
                    <ul className="constraint-list">
                      {agent.constraints.map((constraint, idx) => (
                        <li key={idx}>{constraint}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const PERSONALITIES = [
  {
    key: "Aggressive",
    icon: "🔥",
    description: "Pushes hard for maximum gain and is slow to concede.",
  },
  {
    key: "Collaborative",
    icon: "🤝",
    description: "Seeks win-win outcomes and concedes readily for consensus.",
  },
  {
    key: "Risk-Averse",
    icon: "🛡️",
    description: "Prioritizes safe, predictable outcomes over upside.",
  },
] as const;

type Personality = (typeof PERSONALITIES)[number]["key"];

function AgentConfiguration({
  selectedScenario,
  personalities,
  setPersonalities,
  templates,
  setTemplates,
  onStartNegotiation,
}: {
  selectedScenario: string;
  personalities: Record<string, Personality>;
  setPersonalities: Dispatch<SetStateAction<Record<string, Personality>>>;
  templates: ScenarioTemplate[];
  setTemplates: Dispatch<SetStateAction<ScenarioTemplate[]>>;
  onStartNegotiation: () => void;
}) {
  const template = templates.find((t) => t.name === selectedScenario);
  const [newConstraintInputs, setNewConstraintInputs] = useState<Record<string, string>>({});

  const allConfigured =
    !!template && template.agents.every((agent) => personalities[agent.name]);

  const handleSelectPersonality = (
    agentName: string,
    personality: Personality
  ) => {
    setPersonalities((prev) => ({ ...prev, [agentName]: personality }));
  };

  const handleAddConstraint = (agentName: string) => {
    const text = newConstraintInputs[agentName]?.trim();
    if (!text) return;

    setTemplates((prev) =>
      prev.map((tpl) => {
        if (tpl.name !== selectedScenario) return tpl;
        return {
          ...tpl,
          agents: tpl.agents.map((ag) => {
            if (ag.name !== agentName) return ag;
            return {
              ...ag,
              constraints: [...ag.constraints, text],
            };
          }),
        };
      })
    );

    setNewConstraintInputs((prev) => ({ ...prev, [agentName]: "" }));
  };

  const handleRemoveConstraint = (agentName: string, index: number) => {
    setTemplates((prev) =>
      prev.map((tpl) => {
        if (tpl.name !== selectedScenario) return tpl;
        return {
          ...tpl,
          agents: tpl.agents.map((ag) => {
            if (ag.name !== agentName) return ag;
            return {
              ...ag,
              constraints: ag.constraints.filter((_, i) => i !== index),
            };
          }),
        };
      })
    );
  };

  return (
    <div className="page-content">
      <section className="welcome-section">
        <div>
          <h2>Agent Configuration</h2>
          <p>
            Assign a negotiation personality and customize hard constraints for each agent in "
            {selectedScenario}" before running the simulation.
          </p>
        </div>

        <span className="count-badge">
          {template?.agents.length ?? 0} Agents
        </span>
      </section>

      <div className="agent-config-grid">
        {template?.agents.map((agent) => {
          const selected = personalities[agent.name];
          const activeConstraints = agent.constraints;

          return (
            <div className="agent-config-card" key={agent.name}>
              <div className="agent-detail-header">
                <span className="agent-detail-icon">{agent.icon}</span>
                <div>
                  <strong>{agent.name}</strong>
                  <span className="agent-role-badge">{agent.role}</span>
                </div>
              </div>

              <div className="agent-section">
                <span className="section-label">
                  <span className="section-icon">🎯</span> Goal
                </span>
                <p className="agent-goal">{agent.goal}</p>
              </div>

              <div className="agent-section">
                <span className="section-label">
                  <span className="section-icon">🚧</span> Hard Constraints
                </span>
                <ul className="constraint-list editable-constraint-list">
                  {activeConstraints.map((c, idx) => (
                    <li key={idx} className="editable-constraint-item">
                      <span>{c}</span>
                      <button
                        type="button"
                        className="remove-constraint-btn"
                        onClick={() => handleRemoveConstraint(agent.name, idx)}
                        title="Remove constraint"
                      >
                        ×
                      </button>
                    </li>
                  ))}
                </ul>
                <div className="add-constraint-box">
                  <input
                    type="text"
                    placeholder="+ Add custom constraint limit..."
                    value={newConstraintInputs[agent.name] || ""}
                    onChange={(e) =>
                      setNewConstraintInputs((prev) => ({
                        ...prev,
                        [agent.name]: e.target.value,
                      }))
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddConstraint(agent.name);
                      }
                    }}
                  />
                  <button
                    type="button"
                    className="add-constraint-btn"
                    onClick={() => handleAddConstraint(agent.name)}
                  >
                    Add
                  </button>
                </div>
              </div>

              <div className="agent-section">
                <span className="section-label">
                  <span className="section-icon">🧭</span> Negotiation Personality
                </span>

                <div className="personality-options">
                  {PERSONALITIES.map((p) => (
                    <button
                      type="button"
                      key={p.key}
                      className={
                        selected === p.key
                          ? "personality-btn selected"
                          : "personality-btn"
                      }
                      onClick={() => handleSelectPersonality(agent.name, p.key)}
                      title={p.description}
                    >
                      <span>{p.icon}</span>
                      {p.key}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="start-negotiation-bar">
        <p>
          {allConfigured
            ? "All agents are configured — ready to start."
            : "Select a personality for every agent to start the negotiation."}
        </p>

        <button
          type="button"
          className="primary-button"
          disabled={!allConfigured}
          onClick={onStartNegotiation}
        >
          Start Negotiation →
        </button>
      </div>
    </div>
  );
}



function Reports({ reportsList }: { reportsList: CompletedReport[] }) {
  const totalRuns = reportsList.length;
  const successCount = reportsList.filter((r) => r.outcome === "Successful").length;
  const successRate = totalRuns ? Math.round((successCount / totalRuns) * 100) : 0;
  const avgRounds = totalRuns
    ? (reportsList.reduce((acc, r) => acc + r.rounds, 0) / totalRuns).toFixed(1)
    : "0";

  return (
    <div className="page-content">
      <section className="welcome-section">
        <div>
          <h2>Reports &amp; Analytics</h2>
          <p>Review completed negotiation performance, audit histories and optimization savings.</p>
        </div>

        <span className="count-badge">{totalRuns} Recorded Sessions</span>
      </section>

      <section className="stats-grid">
        <StatCard
          title="Total Negotiations"
          value={totalRuns.toString()}
          description="Recorded simulation runs"
          icon="🤝"
        />

        <StatCard
          title="Successful Agreements"
          value={`${successCount}`}
          description={`${successRate}% success rate`}
          icon="✓"
        />

        <StatCard
          title="Average Rounds"
          value={avgRounds}
          description="Per negotiation session"
          icon="↻"
        />

        <StatCard
          title="Cost Optimized"
          value="₹18.6 L"
          description="Estimated savings achieved"
          icon="₹"
        />
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h3>Negotiation Performance Log</h3>
            <p>Historical simulation outcomes and deal summaries</p>
          </div>
          {reportsList.length > 0 && (
            <button
              className="pdf-export-all-btn"
              onClick={() => generateAllReportsPDF(reportsList)}
              title="Download all sessions as a consolidated PDF report"
            >
              📥 Export All as PDF
            </button>
          )}
        </div>

        <div className="report-table report-table--with-actions">
          <div className="table-row table-header">
            <span>Scenario</span>
            <span>Category</span>
            <span>Agents</span>
            <span>Rounds</span>
            <span>Final Offer</span>
            <span>Outcome</span>
            <span>Downloads</span>
          </div>

          {reportsList.map((rep) => (
            <div className="table-row" key={rep.id}>
              <strong>{rep.scenarioName}</strong>
              <span className="category-tag">{rep.category}</span>
              <span>{rep.agentCount}</span>
              <span>{rep.rounds}</span>
              <span>{rep.finalOffer ? rep.finalOffer.toLocaleString() : "—"}</span>
              <span
                className={
                  rep.outcome === "Successful"
                    ? "success-text"
                    : rep.outcome === "No Agreement"
                    ? "error-text"
                    : "warning-text"
                }
              >
                {rep.outcome === "Successful" ? "✓ Agreed" : "✕ No Deal"}
              </span>
              <span className="pdf-actions-cell">
                <button
                  className="pdf-btn pdf-btn--transcript"
                  onClick={() => generateTranscriptPDF(rep)}
                  title="Download negotiation transcript as PDF"
                >
                  📄 Transcript
                </button>
                <button
                  className="pdf-btn pdf-btn--summary"
                  onClick={() => generateSummaryReportPDF(rep)}
                  title="Download summary report as PDF"
                >
                  📊 Summary
                </button>
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";

function Settings() {
  const [testPrompt, setTestPrompt] = useState("Say hello in exactly 5 words.");
  const [testReply, setTestReply] = useState("");
  const [testError, setTestError] = useState("");
  const [testLoading, setTestLoading] = useState(false);

  const handleTestAI = async () => {
    setTestLoading(true);
    setTestError("");
    setTestReply("");

    try {
      const res = await fetch(`${API_BASE_URL}/api/test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: testPrompt }),
      });

      const data = await res.json();

      if (!res.ok) {
        setTestError(data.error || "Something went wrong.");
      } else {
        setTestReply(data.reply);
      }
    } catch {
      setTestError(`Could not reach the backend at ${API_BASE_URL}.`);
    } finally {
      setTestLoading(false);
    }
  };

  return (
    <div className="page-content">
      <section className="welcome-section">
        <div>
          <h2>Settings</h2>
          <p>Configure simulator and negotiation preferences.</p>
        </div>
      </section>

      <section className="settings-grid">
        <div className="panel settings-card">
          <h3>Project Configuration</h3>

          <label>Project Name</label>
          <input value="Construction Resource Negotiation" readOnly />

          <label>Currency</label>
          <select defaultValue="INR">
            <option value="INR">Indian Rupee (₹)</option>
          </select>

          <label>Default Negotiation Rounds</label>
          <input type="number" value="5" readOnly />
        </div>

        <div className="panel settings-card">
          <h3>Agent Configuration</h3>

          {agents.map((agent) => (
            <div className="setting-agent" key={agent.name}>
              <span>{agent.icon}</span>
              <div>
                <strong>{agent.name}</strong>
                <small>{agent.focus}</small>
              </div>
              <span className="agent-online">
                <i></i>
                Enabled
              </span>
            </div>
          ))}
        </div>

        <div className="panel settings-card">
          <h3>AI Connection Test</h3>
          <p className="settings-hint">
            Sends a message to the backend, which forwards it to the AI model
            and returns the reply — use this to confirm the backend is
            reachable and connected.
          </p>

          <label>Test Message</label>
          <input
            value={testPrompt}
            onChange={(e) => setTestPrompt(e.target.value)}
          />

          <button
            type="button"
            className="primary-button"
            disabled={testLoading}
            onClick={handleTestAI}
          >
            {testLoading ? "Sending…" : "Send Test Message"}
          </button>

          {testReply && <p className="test-result success">{testReply}</p>}
          {testError && <p className="test-result error">{testError}</p>}
        </div>
      </section>
    </div>
  );
}

function StatCard({
  title,
  value,
  description,
  icon,
}: {
  title: string;
  value: string;
  description: string;
  icon: string;
}) {
  return (
    <div className="stat-card">
      <div className="stat-icon">{icon}</div>

      <div>
        <span>{title}</span>
        <strong>{value}</strong>
        <small>{description}</small>
      </div>
    </div>
  );
}

function NegotiationAgent({
  name,
  icon,
}: {
  name: string;
  icon: string;
}) {
  return (
    <div className="negotiation-agent">
      <div>{icon}</div>
      <strong>{name}</strong>
      <span>Active</span>
    </div>
  );
}

export default App;