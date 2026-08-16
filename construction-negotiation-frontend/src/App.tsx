// import { useState } from 'react'
// import reactLogo from './assets/react.svg'
// import viteLogo from './assets/vite.svg'
// import heroImg from './assets/hero.png'
// import './App.css'

// function App() {
//   const [count, setCount] = useState(0)

//   return (
//     <>
//       <section id="center">
//         <div className="hero">
//           <img src={heroImg} className="base" width="170" height="179" alt="" />
//           <img src={reactLogo} className="framework" alt="React logo" />
//           <img src={viteLogo} className="vite" alt="Vite logo" />
//         </div>
//         <div>
//           <h1>Get started</h1>
//           <p>
//             Edit <code>src/App.tsx</code> and save to test <code>HMR</code>
//           </p>
//         </div>
//         <button
//           type="button"
//           className="counter"
//           onClick={() => setCount((count) => count + 1)}
//         >
//           Count is {count}
//         </button>
//       </section>

//       <div className="ticks"></div>

//       <section id="next-steps">
//         <div id="docs">
//           <svg className="icon" role="presentation" aria-hidden="true">
//             <use href="/icons.svg#documentation-icon"></use>
//           </svg>
//           <h2>Documentation</h2>
//           <p>Your questions, answered</p>
//           <ul>
//             <li>
//               <a href="https://vite.dev/" target="_blank">
//                 <img className="logo" src={viteLogo} alt="" />
//                 Explore Vite
//               </a>
//             </li>
//             <li>
//               <a href="https://react.dev/" target="_blank">
//                 <img className="button-icon" src={reactLogo} alt="" />
//                 Learn more
//               </a>
//             </li>
//           </ul>
//         </div>
//         <div id="social">
//           <svg className="icon" role="presentation" aria-hidden="true">
//             <use href="/icons.svg#social-icon"></use>
//           </svg>
//           <h2>Connect with us</h2>
//           <p>Join the Vite community</p>
//           <ul>
//             <li>
//               <a href="https://github.com/vitejs/vite" target="_blank">
//                 <svg
//                   className="button-icon"
//                   role="presentation"
//                   aria-hidden="true"
//                 >
//                   <use href="/icons.svg#github-icon"></use>
//                 </svg>
//                 GitHub
//               </a>
//             </li>
//             <li>
//               <a href="https://chat.vite.dev/" target="_blank">
//                 <svg
//                   className="button-icon"
//                   role="presentation"
//                   aria-hidden="true"
//                 >
//                   <use href="/icons.svg#discord-icon"></use>
//                 </svg>
//                 Discord
//               </a>
//             </li>
//             <li>
//               <a href="https://x.com/vite_js" target="_blank">
//                 <svg
//                   className="button-icon"
//                   role="presentation"
//                   aria-hidden="true"
//                 >
//                   <use href="/icons.svg#x-icon"></use>
//                 </svg>
//                 X.com
//               </a>
//             </li>
//             <li>
//               <a href="https://bsky.app/profile/vite.dev" target="_blank">
//                 <svg
//                   className="button-icon"
//                   role="presentation"
//                   aria-hidden="true"
//                 >
//                   <use href="/icons.svg#bluesky-icon"></use>
//                 </svg>
//                 Bluesky
//               </a>
//             </li>
//           </ul>
//         </div>
//       </section>

//       <div className="ticks"></div>
//       <section id="spacer"></section>
//     </>
//   )
// }

// export default App
import { useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { scenarioTemplates } from "./data";
import type { ScenarioTemplate } from "./types";
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

const scenarios = [
  "Material Shortage",
  "Budget Overrun",
  "Labor Shortage",
  "Deadline Reduction",
  "Scope Changes",
  "Weather Delays",
  "Equipment Breakdown",
];

function App() {
  const [activePage, setActivePage] = useState("Dashboard");
  const [selectedScenario, setSelectedScenario] = useState("Material Shortage");
  const [personalities, setPersonalities] = useState<
    Record<string, Personality>
  >({});

  return (
    <div className="app">
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
              activePage === "Negotiation Monitor"
                ? "nav-item active"
                : "nav-item"
            }
            onClick={() => setActivePage("Negotiation Monitor")}
          >
            <span>◉</span>
            Negotiation Monitor
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
          />
        )}

        {activePage === "Scenarios" && (
          <Scenarios
            selectedScenario={selectedScenario}
            setSelectedScenario={setSelectedScenario}
          />
        )}

        {activePage === "Agent Configuration" && (
          <AgentConfiguration
            selectedScenario={selectedScenario}
            personalities={personalities}
            setPersonalities={setPersonalities}
            onStartNegotiation={() => setActivePage("Negotiation Monitor")}
          />
        )}

        {activePage === "Negotiation Monitor" && (
          <NegotiationMonitor
            selectedScenario={selectedScenario}
            personalities={personalities}
          />
        )}

        {activePage === "Reports & Analytics" && <Reports />}

        {activePage === "Settings" && <Settings />}
      </main>
    </div>
  );
}

function Dashboard({
  selectedScenario,
  setSelectedScenario,
}: {
  selectedScenario: string;
  setSelectedScenario: (scenario: string) => void;
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

        <button className="primary-button">+ New Scenario</button>
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
          </div>

          <div className="scenario-list">
            {scenarios.map((scenario) => (
              <button
                key={scenario}
                className={
                  selectedScenario === scenario
                    ? "scenario-item selected"
                    : "scenario-item"
                }
                onClick={() => setSelectedScenario(scenario)}
              >
                <span>{getScenarioIcon(scenario)}</span>
                {scenario}
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
            In Progress
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
              <span>Negotiation Round</span>
              <strong>Round 3</strong>
            </div>

            <div>
              <span>Resource</span>
              <strong>Steel</strong>
            </div>

            <div>
              <span>Quantity</span>
              <strong>600 Tons</strong>
            </div>

            <div>
              <span>Status</span>
              <strong className="warning-text">Counter-offer</strong>
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
}: {
  selectedScenario: string;
  setSelectedScenario: (scenario: string) => void;
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
            Choose a pre-built construction negotiation template to inspect and configure agent roles, goals, and constraints.
          </p>
        </div>

        <span className="count-badge">{scenarioTemplates.length} Templates</span>
      </section>

      {/* ── Template Cards Grid ── */}
      <div className="template-grid">
        {scenarioTemplates.map((template) => {
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
  onStartNegotiation,
}: {
  selectedScenario: string;
  personalities: Record<string, Personality>;
  setPersonalities: Dispatch<SetStateAction<Record<string, Personality>>>;
  onStartNegotiation: () => void;
}) {
  const template = scenarioTemplates.find((t) => t.name === selectedScenario);

  const allConfigured =
    !!template && template.agents.every((agent) => personalities[agent.name]);

  const handleSelectPersonality = (
    agentName: string,
    personality: Personality
  ) => {
    setPersonalities((prev) => ({ ...prev, [agentName]: personality }));
  };

  return (
    <div className="page-content">
      <section className="welcome-section">
        <div>
          <h2>Agent Configuration</h2>
          <p>
            Assign a negotiation personality to each agent in "
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
                  <span className="section-icon">🧭</span> Negotiation
                  Personality
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

function NegotiationMonitor({
  selectedScenario,
  personalities,
}: {
  selectedScenario: string;
  personalities: Record<string, Personality>;
}) {
  const template = scenarioTemplates.find(
    (t) => t.name === selectedScenario
  );

  const stepTypes = ["offer", "counter", "review"];

  return (
    <div className="page-content">
      <section className="welcome-section">
        <div>
          <h2>Negotiation Monitor</h2>
          <p>Track agent offers, counter-offers and agreement progress.</p>
        </div>

        <span className="live-badge">
          <i></i>
          Live
        </span>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h3>{selectedScenario} Negotiation</h3>
            <p>{getScenarioDescription(selectedScenario)}</p>
          </div>

          <span className="negotiation-status">
            <i></i>
            ~{template?.estimatedRounds ?? "—"} Rounds Expected
          </span>
        </div>

        <div className="timeline">
          {template?.agents.map((agent, idx) => (
            <NegotiationStep
              key={agent.name}
              agent={agent.name}
              personality={personalities[agent.name]}
              action="Opening Position"
              message={agent.goal}
              time="Not yet started"
              type={stepTypes[idx % stepTypes.length]}
            />
          ))}
        </div>
      </section>

      <section className="agreement-card">
        <div>
          <span>Agreement Evaluation</span>
          <h2>Awaiting Simulation</h2>
          <p>
            This scenario hasn't been run yet — agent offers and an agreement
            score will appear here once the negotiation is simulated.
          </p>
        </div>

        <div className="agreement-score">
          <strong>—</strong>
          <span>Compatibility</span>
        </div>
      </section>
    </div>
  );
}

function Reports() {
  return (
    <div className="page-content">
      <section className="welcome-section">
        <div>
          <h2>Reports & Analytics</h2>
          <p>Review negotiation performance and project decisions.</p>
        </div>

        <button className="primary-button">Generate Report</button>
      </section>

      <section className="stats-grid">
        <StatCard
          title="Total Negotiations"
          value="15"
          description="This project"
          icon="🤝"
        />

        <StatCard
          title="Successful Agreements"
          value="12"
          description="80% success rate"
          icon="✓"
        />

        <StatCard
          title="Average Rounds"
          value="3.2"
          description="Per negotiation"
          icon="↻"
        />

        <StatCard
          title="Cost Optimized"
          value="₹18.6 L"
          description="Total savings"
          icon="₹"
        />
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h3>Negotiation Performance</h3>
            <p>Recent negotiation outcomes</p>
          </div>
        </div>

        <div className="report-table">
          <div className="table-row table-header">
            <span>Scenario</span>
            <span>Agents</span>
            <span>Rounds</span>
            <span>Outcome</span>
          </div>

          <div className="table-row">
            <span>Material Shortage</span>
            <span>3</span>
            <span>4</span>
            <span className="success-text">Successful</span>
          </div>

          <div className="table-row">
            <span>Labor Shortage</span>
            <span>3</span>
            <span>3</span>
            <span className="success-text">Successful</span>
          </div>

          <div className="table-row">
            <span>Budget Overrun</span>
            <span>3</span>
            <span>5</span>
            <span className="warning-text">Under Review</span>
          </div>
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

function NegotiationStep({
  agent,
  personality,
  action,
  message,
  time,
  type,
}: {
  agent: string;
  personality?: string;
  action: string;
  message: string;
  time: string;
  type: string;
}) {
  return (
    <div className="timeline-item">
      <div className={`timeline-icon ${type}`}>●</div>

      <div className="timeline-body">
        <div className="timeline-heading">
          <div className="timeline-agent-name">
            <strong>{agent}</strong>
            {personality && (
              <span className="personality-tag">{personality}</span>
            )}
          </div>
          <span>{time}</span>
        </div>

        <b>{action}</b>
        <p>{message}</p>
      </div>
    </div>
  );
}

function getScenarioIcon(scenario: string) {
  const icons: Record<string, string> = {
    "Material Shortage": "▣",
    "Budget Overrun": "₹",
    "Labor Shortage": "👷",
    "Deadline Reduction": "◷",
    "Scope Changes": "✎",
    "Weather Delays": "☁",
    "Equipment Breakdown": "⚙",
  };

  return icons[scenario] || "●";
}

function getScenarioDescription(scenario: string) {
  const descriptions: Record<string, string> = {
    "Material Shortage":
      "Negotiate alternative suppliers, procurement cost and delivery schedules.",
    "Budget Overrun":
      "Resolve unexpected project cost increases through budget negotiation.",
    "Labor Shortage":
      "Balance workforce requirements, overtime and project priorities.",
    "Deadline Reduction":
      "Negotiate accelerated completion through additional resources.",
    "Scope Changes":
      "Evaluate additional requirements and their cost and schedule impact.",
    "Weather Delays":
      "Reschedule construction activities affected by environmental conditions.",
    "Equipment Breakdown":
      "Compare repair, replacement and rental options for failed equipment.",
  };

  return descriptions[scenario] || "";
}

export default App;