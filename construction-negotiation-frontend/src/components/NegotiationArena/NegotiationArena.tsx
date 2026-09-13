import React, { useCallback, useEffect, useState } from "react";
import type { CompletedReport, EvaluationData, NegotiationOutcome, NegotiationState, Personality, ScenarioTemplate } from "../../types";
import { AgentStancePanel } from "./AgentStancePanel";
import { ArenaControls } from "./ArenaControls";
import { ChatTranscript } from "./ChatTranscript";
import { HumanInputTray } from "./HumanInputTray";
import { OutcomeScreen } from "./OutcomeScreen";
import { RoundMetricsPanel } from "./RoundMetricsPanel";
import { NegotiationConclusionCard, type NegotiationConclusionData } from "./NegotiationConclusionCard";
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
  const [showOutcome, setShowOutcome] = useState(false);
  const [outcome, setOutcome] = useState<NegotiationOutcome | null>(null);
  const [loadingOutcome, setLoadingOutcome] = useState(false);

  // Conclusion & Debrief State
  const [conclusionData, setConclusionData] = useState<NegotiationConclusionData | null>(null);
  const [loadingConclusion, setLoadingConclusion] = useState(false);

  // Human Participant Practice Mode State
  const [practiceMode, setPracticeMode] = useState<boolean>(false);
  const [humanRole, setHumanRole] = useState<string>(
    template?.agents[0]?.name || "Contractor Agent"
  );

  // Update default human role when scenario changes
  useEffect(() => {
    if (template && template.agents.length > 0) {
      setHumanRole(template.agents[0].name);
    }
  }, [template]);

  // Reset arena state when switching scenarios
  useEffect(() => {
    setState(null);
    setReasoning([]);
    setEvaluations([]);
    setConclusionData(null);
    setAutoRun(false);
    setError("");
    setReportSaved(false);
    setShowOutcome(false);
    setOutcome(null);
    setLoadingOutcome(false);
  }, [selectedScenario]);

  // Determine current active agent and whether it's human's turn
  const currentAgentIndex = state && template
    ? state.history.length % template.agents.length
    : 0;
  const currentAgent = template?.agents[currentAgentIndex];
  const isHumanTurn =
    practiceMode &&
    state?.status === "active" &&
    currentAgent?.name === humanRole;

  // Start a fresh negotiation
  const startNegotiation = async () => {
    if (!template) return;
    setLoading(true);
    setError("");
    setReportSaved(false);
    setShowOutcome(false);
    setOutcome(null);

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
      showToast(
        practiceMode
          ? `🎮 Practice Mode active — playing as ${humanRole}!`
          : `Negotiation Arena launched for "${template.name}"!`
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to start negotiation."
      );
    } finally {
      setLoading(false);
    }
  };

  const stateRef = React.useRef<NegotiationState | null>(state);
  stateRef.current = state;

  // Run a single AI-reasoned turn
  const runNextTurn = useCallback(async (stateOverride?: NegotiationState) => {
    const currentState = stateOverride || stateRef.current;
    if (!currentState || currentState.status !== "active") return;
    setLoading(true);
    setError("");

    try {
      const activeAgentIndex =
        currentState.history.length % currentState.scenario.agents.length;

      const res = await fetch(`${API_BASE_URL}/api/negotiation/next-turn`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scenario: currentState.scenario,
          max_rounds: currentState.max_rounds,
          personalities,
          history: currentState.history,
          round: currentState.round,
          current_agent_index: activeAgentIndex,
          current_offer: currentState.current_offer,
          current_offer_unit: currentState.current_offer_unit,
          status: currentState.status,
          is_deadlocked: currentState.is_deadlocked,
          deadlock_rounds_remaining: currentState.deadlock_rounds_remaining,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate turn.");

      setState({
        scenario: currentState.scenario,
        max_rounds: currentState.max_rounds,
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
  }, [personalities]);

  // Handle Human Participant Turn Submission
  const handleHumanTurnSubmit = async (humanTurnData: {
    action: string;
    offer: number | null;
    unit: string;
    message: string;
  }) => {
    if (!state || !currentAgent) return;
    setLoading(true);
    setError("");

    try {
      const activeAgentIndex =
        state.history.length % state.scenario.agents.length;

      const res = await fetch(`${API_BASE_URL}/api/negotiation/human-turn`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scenario: state.scenario,
          max_rounds: state.max_rounds,
          personalities,
          history: state.history,
          round: state.round,
          current_agent_index: activeAgentIndex,
          current_offer: state.current_offer,
          current_offer_unit: state.current_offer_unit,
          status: state.status,
          is_deadlocked: state.is_deadlocked,
          deadlock_rounds_remaining: state.deadlock_rounds_remaining,
          agent_name: currentAgent.name,
          action: humanTurnData.action,
          offer: humanTurnData.offer,
          unit: humanTurnData.unit,
          message: humanTurnData.message,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to submit human turn.");

      const nextState: NegotiationState = {
        scenario: state.scenario,
        max_rounds: state.max_rounds,
        history: data.state.history,
        round: data.state.round,
        current_offer: data.state.current_offer,
        current_offer_unit: data.state.current_offer_unit,
        status: data.state.status,
        is_deadlocked: data.state.is_deadlocked,
        deadlock_rounds_remaining: data.state.deadlock_rounds_remaining,
      };

      setState(nextState);

      setReasoning((prev) => [
        ...prev,
        "Human strategic move submitted — awaiting AI stakeholder response.",
      ]);
      setEvaluations((prev) => [...prev, null]);

      showToast(`Move submitted as ${currentAgent.name}! AI stakeholders responding...`);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to process human turn."
      );
    } finally {
      setLoading(false);
    }
  };

  // Auto-run simulation timer with variable speed multiplier (only in AI sim mode)
  useEffect(() => {
    if (practiceMode || !autoRun || !state || state.status !== "active" || loading) return;
    const intervalMs = Math.round(1800 / speedMultiplier);
    const timer = setTimeout(() => {
      runNextTurn();
    }, intervalMs);
    return () => clearTimeout(timer);
  }, [practiceMode, autoRun, state, loading, runNextTurn, speedMultiplier]);

  // Practice Mode: automatically progress AI stakeholder turns until it is the human participant's turn
  useEffect(() => {
    if (!practiceMode || !state || state.status !== "active" || loading || isHumanTurn) return;
    const timer = setTimeout(() => {
      runNextTurn();
    }, 1000);
    return () => clearTimeout(timer);
  }, [practiceMode, state, loading, isHumanTurn, runNextTurn]);

  // Fetch Executive Negotiation Conclusion when state concludes
  useEffect(() => {
    if (!state || state.status === "active") {
      setConclusionData(null);
      return;
    }

    let isSubscribed = true;
    const fetchConclusion = async () => {
      setLoadingConclusion(true);
      try {
        const res = await fetch(`${API_BASE_URL}/api/negotiation/conclusion`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            scenario: state.scenario,
            history: state.history,
            status: state.status,
            final_offer: state.current_offer,
            final_offer_unit: state.current_offer_unit,
            total_rounds: state.round,
            human_role: practiceMode ? humanRole : null,
          }),
        });

        const data = await res.json();
        if (isSubscribed && res.ok && data.conclusion) {
          setConclusionData(data.conclusion);
        }
      } catch (err) {
        console.error("Failed to load conclusion debrief:", err);
      } finally {
        if (isSubscribed) setLoadingConclusion(false);
      }
    };

    fetchConclusion();
    return () => {
      isSubscribed = false;
    };
  }, [state?.status, state?.history.length, practiceMode, humanRole]);

  // Auto-complete / Fast-Forward remaining rounds straight to conclusion
  const handleAutoComplete = async () => {
    if (!state || state.status !== "active") return;
    setLoading(true);
    setError("");

    let curState: NegotiationState = state;
    let safetyLimit = 15;

    while (curState.status === "active" && safetyLimit > 0) {
      safetyLimit--;
      try {
        const activeIdx = curState.history.length % curState.scenario.agents.length;
        const res = await fetch(`${API_BASE_URL}/api/negotiation/next-turn`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            scenario: curState.scenario,
            max_rounds: curState.max_rounds,
            personalities,
            history: curState.history,
            round: curState.round,
            current_agent_index: activeIdx,
            current_offer: curState.current_offer,
            current_offer_unit: curState.current_offer_unit,
            status: curState.status,
            is_deadlocked: curState.is_deadlocked,
            deadlock_rounds_remaining: curState.deadlock_rounds_remaining,
          }),
        });

        const data = await res.json();
        if (!res.ok) break;

        curState = {
          scenario: curState.scenario,
          max_rounds: curState.max_rounds,
          history: data.state.history,
          round: data.state.round,
          current_offer: data.state.current_offer,
          current_offer_unit: data.state.current_offer_unit,
          status: data.state.status,
          is_deadlocked: data.state.is_deadlocked,
          deadlock_rounds_remaining: data.state.deadlock_rounds_remaining,
        };

        setState(curState);
        if (data.turn?.reasoning) setReasoning((prev) => [...prev, data.turn.reasoning]);
        setEvaluations((prev) => [...prev, data.turn?.evaluation ?? null]);

        if (curState.status !== "active") break;
      } catch (err) {
        break;
      }
    }

    setLoading(false);
    showToast("Simulation concluded — executive debrief report ready!");
  };

  // Auto-record completed report
  useEffect(() => {
    if (!state || state.status === "active" || reportSaved) return;

    const reportOutcome =
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
      outcome: reportOutcome,
      timestamp: new Date().toLocaleString(),
      historySummary: state.history.map(
        (h) => `${h.agent} [${h.action.toUpperCase()}]: ${h.message}`
      ),
    };

    onCompleteReport(report);
    setReportSaved(true);
    setShowOutcome(true);

    const fetchOutcome = async () => {
      setLoadingOutcome(true);
      try {
        const res = await fetch(`${API_BASE_URL}/api/negotiation/outcome`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            scenario: state.scenario,
            max_rounds: state.max_rounds,
            personalities,
            history: state.history,
            round: state.round,
            current_offer: state.current_offer,
            current_offer_unit: state.current_offer_unit,
            status: state.status,
          }),
        });
        const data = await res.json();
        if (res.ok && data.outcome) {
          setOutcome(data.outcome);
        }
      } catch {
        setOutcome(null);
      } finally {
        setLoadingOutcome(false);
      }
    };

    void fetchOutcome();
  }, [state, reportSaved, onCompleteReport, personalities]);

  const handleReset = () => {
    setState(null);
    setReasoning([]);
    setEvaluations([]);
    setConclusionData(null);
    setAutoRun(false);
    setError("");
    setReportSaved(false);
    setShowOutcome(false);
    setOutcome(null);
    showToast("Arena reset to initial state.");
  };

  const handleExportJSON = () => {
    if (!state) return;
    const reportData = {
      scenario: state.scenario.name,
      category: state.scenario.category,
      status: state.status,
      mode: practiceMode ? "Human Practice Mode" : "AI Autonomous Simulation",
      human_role: practiceMode ? humanRole : null,
      total_rounds: state.round,
      final_offer: state.current_offer,
      agents: state.scenario.agents.map((a) => ({
        name: a.name,
        role: a.role,
        personality: personalities[a.name] || "Collaborative",
        is_human: practiceMode && a.name === humanRole,
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
**Mode:** ${practiceMode ? `Human Practice Mode (Playing as ${humanRole})` : "AI Autonomous Simulation"}  
**Category:** ${state.scenario.category}  
**Status:** ${state.status.toUpperCase()}  
**Settled Offer:** ${state.current_offer ? `₹${state.current_offer.toLocaleString()} ${state.current_offer_unit || ""}` : "None"}  
**Rounds Elapsed:** ${state.round} / ${state.max_rounds}  
**Generated On:** ${new Date().toLocaleString()}

## Participating Agents
${state.scenario.agents.map((a) => `- **${a.name}** (${a.role}) ${practiceMode && a.name === humanRole ? "— **[HUMAN PARTICIPANT]**" : `— Personality: *${personalities[a.name] || "Collaborative"}*`}`).join("\n")}

## Negotiation Transcript
${state.history.map((h, i) => `### Turn ${i + 1}: ${h.agent} [${h.action.toUpperCase()}] ${h.is_human ? "👤 (YOU)" : ""}
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
    ? practiceMode
      ? "Practice Arena Ready"
      : "Arena Idle"
    : state.status === "active"
    ? practiceMode
      ? `🎮 Practice Mode (${humanRole})`
      : "Live AI Simulation"
    : state.status === "agreement"
    ? "Agreement Settled 🎉"
    : "Max Rounds Reached";

  const humanAgentConfig = template?.agents.find((a) => a.name === humanRole);

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
              <strong>Negotiation Deadlock Detected:</strong> Price movement has stagnated under 1% variation across recent rounds. Concession pressure is heightened.
            </div>
          </div>
        </div>
      )}

      {/* Arena Interactive Controls Bar */}
      <ArenaControls
        state={state}
        template={template}
        loading={loading}
        autoRun={autoRun}
        speedMultiplier={speedMultiplier}
        practiceMode={practiceMode}
        humanRole={humanRole}
        isHumanTurn={isHumanTurn}
        onRunNextTurn={runNextTurn}
        onToggleAutoRun={() => setAutoRun((v) => !v)}
        onChangeSpeed={setSpeedMultiplier}
        onTogglePracticeMode={(mode) => {
          setPracticeMode(mode);
          setAutoRun(false);
          showToast(
            mode
              ? `🎮 Practice Mode enabled! Select your role and make your moves.`
              : `🤖 AI Autonomous Simulation mode enabled.`
          );
        }}
        onChangeHumanRole={(role) => {
          setHumanRole(role);
          showToast(`Now negotiating as: ${role}`);
        }}
        onReset={handleReset}
        onStartNegotiation={startNegotiation}
        onAutoComplete={handleAutoComplete}
        onExportJSON={handleExportJSON}
        onExportMarkdown={handleExportMarkdown}
        showOutcome={showOutcome}
        onToggleOutcome={() => setShowOutcome((v) => !v)}
      />

      {/* Comprehensive Post-Negotiation Conclusion & Executive Debrief Card */}
      {state && state.status !== "active" && (
        <NegotiationConclusionCard
          state={state}
          conclusionData={conclusionData}
          loadingConclusion={loadingConclusion}
          practiceMode={practiceMode}
          humanRole={humanRole}
          onReset={handleReset}
          onStartNegotiation={startNegotiation}
          onExportMarkdown={handleExportMarkdown}
          onExportJSON={handleExportJSON}
        />
      )}

      {/* Human Participant Interactive Move Tray (when it's human's turn) */}
      {isHumanTurn && (
        <HumanInputTray
          humanAgent={humanAgentConfig}
          state={state}
          loading={loading}
          evaluations={evaluations}
          onSubmitTurn={handleHumanTurnSubmit}
        />
      )}

      {error && <p className="test-result error">{error}</p>}

      {showOutcome && state && state.status !== "active" ? (
        <OutcomeScreen
          template={template}
          personalities={personalities}
          state={state}
          evaluations={evaluations}
          outcome={outcome}
          loadingOutcome={loadingOutcome}
        />
      ) : (
        <div className="arena-grid">
          <AgentStancePanel
            template={template}
            personalities={personalities}
            state={state}
            evaluations={evaluations}
            isThinking={loading}
          />

          <ChatTranscript
            template={template}
            personalities={personalities}
            state={state}
            reasoning={reasoning}
            evaluations={evaluations}
            loading={loading}
            onStartNegotiation={startNegotiation}
          />

          <RoundMetricsPanel
            template={template}
            state={state}
            evaluations={evaluations}
          />
        </div>
      )}
    </div>
  );
};
