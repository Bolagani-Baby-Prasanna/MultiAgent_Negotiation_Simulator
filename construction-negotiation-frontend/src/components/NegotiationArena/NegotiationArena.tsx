import React, { useCallback, useEffect, useState } from "react";
import type { CompletedReport, EvaluationData, NegotiationState, Personality, ScenarioTemplate } from "../../types";
import { AgentStancePanel } from "./AgentStancePanel";
import { ArenaControls } from "./ArenaControls";
import { ChatTranscript } from "./ChatTranscript";
import { RoundMetricsPanel } from "./RoundMetricsPanel";
import "./arena.css";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";

interface NegotiationArenaProps {
  selectedScenario: string;
  personalities: Record<string, Personality>;
  templates: ScenarioTemplate[];
  onCompleteReport: (report: CompletedReport) => void;
  showToast: (msg: string) => void;
}

export const NegotiationArena: React.FC<NegotiationArenaProps> = ({
  selectedScenario,
  personalities,
  templates,
  onCompleteReport,
  showToast,
}) => {
  const template = templates.find((t) => t.name === selectedScenario);

  const [state, setState] = useState<NegotiationState | null>(null);
  const [reasoning, setReasoning] = useState<string[]>([]);
  const [evaluations, setEvaluations] = useState<(EvaluationData | null)[]>([]);
  const [autoRun, setAutoRun] = useState(false);
  const [speedMultiplier, setSpeedMultiplier] = useState<1 | 2 | 5>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [reportSaved, setReportSaved] = useState(false);

  // Reset arena state when switching scenarios
  useEffect(() => {
    setState(null);
    setReasoning([]);
    setEvaluations([]);
    setAutoRun(false);
    setError("");
    setReportSaved(false);
  }, [selectedScenario]);

  // Start a fresh negotiation
  const startNegotiation = async () => {
    if (!template) return;
    setLoading(true);
    setError("");
    setReportSaved(false);

    try {
      const res = await fetch(`${API_BASE_URL}/api/negotiation/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scenario: template,
          max_rounds: template.estimatedRounds || 10,
          personalities,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to start negotiation.");

      setState({
        scenario: template,
        max_rounds: template.estimatedRounds || 10,
        history: data.state.history,
        round: data.state.round,
        current_offer: data.state.current_offer,
        current_offer_unit: data.state.current_offer_unit,
        status: data.state.status,
        is_deadlocked: data.state.is_deadlocked,
        deadlock_rounds_remaining: data.state.deadlock_rounds_remaining,
      });
      setReasoning([]);
      setEvaluations([]);
      showToast(`Negotiation Arena launched for "${template.name}"!`);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to start negotiation."
      );
    } finally {
      setLoading(false);
    }
  };

  // Run a single AI-reasoned turn
  const runNextTurn = useCallback(async () => {
    if (!state || state.status !== "active") return;
    setLoading(true);
    setError("");

    try {
      const currentAgentIndex =
        state.history.length % state.scenario.agents.length;

      const res = await fetch(`${API_BASE_URL}/api/negotiation/next-turn`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scenario: state.scenario,
          max_rounds: state.max_rounds,
          personalities,
          history: state.history,
          round: state.round,
          current_agent_index: currentAgentIndex,
          current_offer: state.current_offer,
          current_offer_unit: state.current_offer_unit,
          status: state.status,
          is_deadlocked: state.is_deadlocked,
          deadlock_rounds_remaining: state.deadlock_rounds_remaining,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate turn.");

      setState({
        scenario: state.scenario,
        max_rounds: state.max_rounds,
        history: data.state.history,
        round: data.state.round,
        current_offer: data.state.current_offer,
        current_offer_unit: data.state.current_offer_unit,
        status: data.state.status,
        is_deadlocked: data.state.is_deadlocked,
        deadlock_rounds_remaining: data.state.deadlock_rounds_remaining,
      });

      if (data.turn?.reasoning) {
        setReasoning((prev) => [...prev, data.turn.reasoning]);
      } else {
        setReasoning((prev) => [...prev, "Strategizing next position based on project constraints."]);
      }

      setEvaluations((prev) => [...prev, data.turn?.evaluation ?? null]);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to generate turn."
      );
      setAutoRun(false);
    } finally {
      setLoading(false);
    }
  }, [state, personalities]);

  // Auto-run simulation timer with variable speed multiplier
  useEffect(() => {
    if (!autoRun || !state || state.status !== "active" || loading) return;
    const intervalMs = Math.round(1800 / speedMultiplier);
    const timer = setTimeout(runNextTurn, intervalMs);
    return () => clearTimeout(timer);
  }, [autoRun, state, loading, runNextTurn, speedMultiplier]);

  // Auto-record completed report
  useEffect(() => {
    if (!state || state.status === "active" || reportSaved) return;

    const outcome =
      state.status === "agreement"
        ? "Successful"
        : "No Agreement";

    const report: CompletedReport = {
      id: `REP-${Math.floor(100 + Math.random() * 900)}`,
      scenarioName: state.scenario.name,
      category: state.scenario.category,
      agentCount: state.scenario.agents.length,
      rounds: state.round,
      finalOffer: state.current_offer,
      outcome,
      timestamp: new Date().toLocaleString(),
      historySummary: state.history.map(
        (h) => `${h.agent} [${h.action.toUpperCase()}]: ${h.message}`
      ),
    };

    onCompleteReport(report);
    setReportSaved(true);
  }, [state, reportSaved, onCompleteReport]);

  const handleReset = () => {
    setState(null);
    setReasoning([]);
    setEvaluations([]);
    setAutoRun(false);
    setError("");
    setReportSaved(false);
    showToast("Arena reset to initial state.");
  };

  const handleExportJSON = () => {
    if (!state) return;
    const reportData = {
      scenario: state.scenario.name,
      category: state.scenario.category,
      status: state.status,
      total_rounds: state.round,
      final_offer: state.current_offer,
      agents: state.scenario.agents.map((a) => ({
        name: a.name,
        role: a.role,
        personality: personalities[a.name] || "Collaborative",
      })),
      history: state.history,
      evaluations: evaluations.filter(Boolean),
    };

    const blob = new Blob([JSON.stringify(reportData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `arena_report_${selectedScenario.toLowerCase().replace(/\s+/g, "_")}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("JSON report downloaded.");
  };

  const handleExportMarkdown = () => {
    if (!state) return;
    const mdContent = `# Negotiation Arena Audit Report: ${state.scenario.name}
**Category:** ${state.scenario.category}  
**Status:** ${state.status.toUpperCase()}  
**Settled Offer:** ${state.current_offer ? `₹${state.current_offer.toLocaleString()} ${state.current_offer_unit || ""}` : "None"}  
**Rounds Elapsed:** ${state.round} / ${state.max_rounds}  
**Generated On:** ${new Date().toLocaleString()}

## Participating Agents
${state.scenario.agents.map((a) => `- **${a.name}** (${a.role}) — Personality: *${personalities[a.name] || "Collaborative"}*`).join("\n")}

## Negotiation Transcript
${state.history.map((h, i) => `### Turn ${i + 1}: ${h.agent} [${h.action.toUpperCase()}]
- **Offer:** ${h.offer ? `₹${h.offer.toLocaleString()} ${h.unit || ""}` : "N/A"}
- **Dialogue:** "${h.message}"
${reasoning[i] ? `- **Agent Reasoning:** *"${reasoning[i]}"*` : ""}
`).join("\n")}
`;

    const blob = new Blob([mdContent], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `arena_transcript_${selectedScenario.toLowerCase().replace(/\s+/g, "_")}.md`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("Markdown transcript summary downloaded.");
  };

  const statusType = !state
    ? "idle"
    : state.status === "active"
    ? "active"
    : state.status === "agreement"
    ? "agreement"
    : "max_rounds";

  const statusLabel = !state
    ? "Arena Idle"
    : state.status === "active"
    ? "Live Arena Simulation"
    : state.status === "agreement"
    ? "Agreement Settled 🎉"
    : "Max Rounds Reached";

  return (
    <div className="page-content arena-container">
      {/* Arena Header Banner */}
      <section className="arena-header-banner">
        <div className="arena-title-area">
          <h2>
            <span className="scenario-icon-chip">{template?.icon || "⚡"}</span>
            {selectedScenario} — Negotiation Arena
          </h2>
          <p>{template?.description}</p>
        </div>

        <div className="arena-header-badges">
          <span className={`arena-status-pill status-${statusType}`}>
            {statusType === "active" && <span className="pulse-dot"></span>}
            {statusLabel}
          </span>
        </div>
      </section>

      {/* Deadlock Detection Alert Banner */}
      {state?.is_deadlocked && (
        <div className="deadlock-alert-banner">
          <div className="deadlock-alert-content">
            <span style={{ fontSize: "20px" }}>⚠️</span>
            <div>
              <strong>Negotiation Deadlock Detected:</strong> Price movement has stagnated under 1% variation across recent rounds. Agents are adjusting concession pressure.
            </div>
          </div>
        </div>
      )}

      {/* Arena Interactive Controls */}
      <ArenaControls
        state={state}
        loading={loading}
        autoRun={autoRun}
        speedMultiplier={speedMultiplier}
        onRunNextTurn={runNextTurn}
        onToggleAutoRun={() => setAutoRun((v) => !v)}
        onChangeSpeed={setSpeedMultiplier}
        onReset={handleReset}
        onStartNegotiation={startNegotiation}
        onExportJSON={handleExportJSON}
        onExportMarkdown={handleExportMarkdown}
      />

      {error && <p className="test-result error">{error}</p>}

      {/* Arena Main 3-Column Grid */}
      <div className="arena-grid">
        {/* Left Column: Live Agent Stances */}
        <AgentStancePanel
          template={template}
          personalities={personalities}
          state={state}
          evaluations={evaluations}
          isThinking={loading}
        />

        {/* Center Column: Chat-Style Transcript with Per-Turn Reasoning */}
        <ChatTranscript
          template={template}
          personalities={personalities}
          state={state}
          reasoning={reasoning}
          evaluations={evaluations}
          loading={loading}
          onStartNegotiation={startNegotiation}
        />

        {/* Right Column: Round Metrics, Trajectory, and Convergence Panel */}
        <RoundMetricsPanel
          template={template}
          state={state}
          evaluations={evaluations}
        />
      </div>
    </div>
  );
};
