import jsPDF from "jspdf";
import type { CompletedReport } from "../types";

/* ── Color Palette ── */
const COLORS = {
  primary: [30, 58, 138] as [number, number, number],       // Deep blue
  secondary: [51, 65, 85] as [number, number, number],      // Slate
  accent: [16, 185, 129] as [number, number, number],       // Emerald
  danger: [220, 38, 38] as [number, number, number],        // Red
  warning: [217, 119, 6] as [number, number, number],       // Amber
  text: [30, 41, 59] as [number, number, number],           // Dark slate
  muted: [100, 116, 139] as [number, number, number],       // Muted slate
  lightBg: [241, 245, 249] as [number, number, number],     // Light slate bg
  white: [255, 255, 255] as [number, number, number],
  divider: [226, 232, 240] as [number, number, number],
};

/**
 * Renders a styled header bar at the top of the PDF page.
 */
function renderHeader(doc: jsPDF, title: string, subtitle: string) {
  const pageW = doc.internal.pageSize.getWidth();

  // Header background
  doc.setFillColor(...COLORS.primary);
  doc.rect(0, 0, pageW, 38, "F");

  // Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(...COLORS.white);
  doc.text(title, 14, 16);

  // Subtitle
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(180, 200, 255);
  doc.text(subtitle, 14, 26);

  // Brand mark
  doc.setFontSize(8);
  doc.setTextColor(...COLORS.white);
  doc.text("Multi-Agent Negotiation Simulator", pageW - 14, 16, { align: "right" });

  // Date
  doc.setTextColor(180, 200, 255);
  doc.text(`Generated: ${new Date().toLocaleString()}`, pageW - 14, 24, { align: "right" });
}

/**
 * Renders a page footer with page number.
 */
function renderFooter(doc: jsPDF, pageNum: number, totalPages: number) {
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();

  doc.setDrawColor(...COLORS.divider);
  doc.line(14, pageH - 16, pageW - 14, pageH - 16);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(...COLORS.muted);
  doc.text("Confidential — Multi-Agent Negotiation Simulator", 14, pageH - 10);
  doc.text(`Page ${pageNum} of ${totalPages}`, pageW - 14, pageH - 10, { align: "right" });
}

/**
 * Renders a section title with colored left bar.
 */
function renderSectionTitle(doc: jsPDF, y: number, title: string, color: [number, number, number] = COLORS.primary): number {
  doc.setFillColor(...color);
  doc.rect(14, y, 3, 8, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...COLORS.text);
  doc.text(title, 20, y + 6);
  return y + 14;
}

/**
 * Renders a metadata row with label and value.
 */
function renderMetaRow(doc: jsPDF, y: number, label: string, value: string): number {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...COLORS.muted);
  doc.text(label, 20, y);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(...COLORS.text);
  doc.text(value, 70, y);

  return y + 7;
}

/**
 * Check if we need a new page and add one if necessary.
 */
function checkPageBreak(doc: jsPDF, y: number, needed: number): number {
  const pageH = doc.internal.pageSize.getHeight();
  if (y + needed > pageH - 24) {
    doc.addPage();
    return 20;
  }
  return y;
}

/**
 * Wraps long text into lines that fit within maxWidth and renders them.
 * Returns the new Y position after rendering.
 */
function renderWrappedText(doc: jsPDF, text: string, x: number, y: number, maxWidth: number, lineHeight: number = 5): number {
  const lines = doc.splitTextToSize(text, maxWidth);
  for (const line of lines) {
    y = checkPageBreak(doc, y, lineHeight + 2);
    doc.text(line, x, y);
    y += lineHeight;
  }
  return y;
}

/* ═══════════════════════════════════════════════════
   1. NEGOTIATION TRANSCRIPT PDF
   ═══════════════════════════════════════════════════ */

export function generateTranscriptPDF(report: CompletedReport): void {
  const doc = new jsPDF("p", "mm", "a4");
  const pageW = doc.internal.pageSize.getWidth();
  const contentW = pageW - 28;

  // ── Page 1: Header ──
  renderHeader(doc, "Negotiation Transcript", `${report.scenarioName} — ${report.id}`);

  let y = 48;

  // ── Meta Info Card ──
  doc.setFillColor(...COLORS.lightBg);
  doc.roundedRect(14, y, contentW, 40, 3, 3, "F");

  y += 10;
  y = renderMetaRow(doc, y, "Scenario:", report.scenarioName);
  y = renderMetaRow(doc, y, "Category:", report.category);
  y = renderMetaRow(doc, y, "Agents:", `${report.agentCount} participants`);
  y = renderMetaRow(doc, y, "Rounds:", `${report.rounds} rounds completed`);
  y = renderMetaRow(doc, y, "Timestamp:", report.timestamp);

  y += 10;

  // ── Outcome Badge ──
  const outcomeColor = report.outcome === "Successful" ? COLORS.accent : COLORS.danger;
  const outcomeLabel = report.outcome === "Successful" ? "✓ AGREEMENT REACHED" : "✕ NO AGREEMENT";
  const offerText = report.finalOffer ? `Final Offer: ₹${report.finalOffer.toLocaleString()}` : "No final offer";

  doc.setFillColor(...outcomeColor);
  doc.roundedRect(14, y, contentW, 14, 3, 3, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...COLORS.white);
  doc.text(outcomeLabel, 20, y + 6);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(offerText, pageW - 20, y + 6, { align: "right" });

  y += 22;

  // ── Transcript Section ──
  y = renderSectionTitle(doc, y, "Full Negotiation Transcript");
  y += 2;

  if (report.historySummary && report.historySummary.length > 0) {
    report.historySummary.forEach((entry, idx) => {
      y = checkPageBreak(doc, y, 22);

      // Turn number badge
      doc.setFillColor(...COLORS.primary);
      doc.roundedRect(14, y - 1, 18, 7, 2, 2, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7);
      doc.setTextColor(...COLORS.white);
      doc.text(`Turn ${idx + 1}`, 15.5, y + 4);

      // Entry text
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(...COLORS.text);
      y = renderWrappedText(doc, entry, 36, y + 4, contentW - 26, 5);
      y += 4;

      // Subtle divider between entries
      if (idx < report.historySummary.length - 1) {
        doc.setDrawColor(...COLORS.divider);
        doc.setLineWidth(0.3);
        doc.line(36, y - 1, pageW - 14, y - 1);
        y += 3;
      }
    });
  } else {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    doc.setTextColor(...COLORS.muted);
    doc.text("No transcript entries recorded for this negotiation.", 20, y);
    y += 10;
  }

  // ── Add page numbers ──
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    renderFooter(doc, i, totalPages);
  }

  // ── Download ──
  const filename = `transcript_${report.scenarioName.toLowerCase().replace(/\s+/g, "_")}_${report.id}.pdf`;
  doc.save(filename);
}


/* ═══════════════════════════════════════════════════
   2. SUMMARY REPORT PDF
   ═══════════════════════════════════════════════════ */

export function generateSummaryReportPDF(report: CompletedReport): void {
  const doc = new jsPDF("p", "mm", "a4");
  const pageW = doc.internal.pageSize.getWidth();
  const contentW = pageW - 28;

  // ── Page 1: Header ──
  renderHeader(doc, "Negotiation Summary Report", `Executive Debrief — ${report.id}`);

  let y = 48;

  // ── Executive Summary Card ──
  y = renderSectionTitle(doc, y, "Executive Summary");
  y += 2;

  doc.setFillColor(...COLORS.lightBg);
  doc.roundedRect(14, y, contentW, 48, 3, 3, "F");

  y += 10;
  y = renderMetaRow(doc, y, "Scenario:", report.scenarioName);
  y = renderMetaRow(doc, y, "Category:", report.category);
  y = renderMetaRow(doc, y, "Participants:", `${report.agentCount} AI agents`);
  y = renderMetaRow(doc, y, "Rounds:", `${report.rounds}`);
  y = renderMetaRow(doc, y, "Final Offer:", report.finalOffer ? `₹${report.finalOffer.toLocaleString()}` : "N/A");
  y = renderMetaRow(doc, y, "Date:", report.timestamp);

  y += 10;

  // ── Outcome Analysis ──
  y = renderSectionTitle(doc, y, "Outcome Analysis",
    report.outcome === "Successful" ? COLORS.accent : COLORS.danger
  );
  y += 2;

  // Large outcome indicator
  const isSuccess = report.outcome === "Successful";
  doc.setFillColor(...(isSuccess ? COLORS.accent : COLORS.danger));
  doc.roundedRect(14, y, contentW, 20, 3, 3, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(...COLORS.white);
  doc.text(isSuccess ? "AGREEMENT REACHED" : "NO AGREEMENT", pageW / 2, y + 9, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(
    isSuccess
      ? `Deal closed at ₹${report.finalOffer?.toLocaleString() || "N/A"} after ${report.rounds} rounds`
      : `Negotiation concluded after ${report.rounds} rounds without consensus`,
    pageW / 2, y + 16, { align: "center" }
  );

  y += 28;

  // ── Key Metrics ──
  y = renderSectionTitle(doc, y, "Key Performance Metrics");
  y += 4;

  // Metric boxes
  const boxW = (contentW - 8) / 3;
  const metrics = [
    { label: "Total Rounds", value: `${report.rounds}`, icon: "↻" },
    { label: "Agents Involved", value: `${report.agentCount}`, icon: "👥" },
    { label: "Result", value: isSuccess ? "Success" : "No Deal", icon: isSuccess ? "✓" : "✕" },
  ];

  metrics.forEach((m, i) => {
    const boxX = 14 + i * (boxW + 4);
    doc.setFillColor(...COLORS.lightBg);
    doc.roundedRect(boxX, y, boxW, 22, 3, 3, "F");

    // Accent top border
    doc.setFillColor(...COLORS.primary);
    doc.rect(boxX, y, boxW, 2, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(...COLORS.primary);
    doc.text(`${m.icon} ${m.value}`, boxX + boxW / 2, y + 11, { align: "center" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...COLORS.muted);
    doc.text(m.label, boxX + boxW / 2, y + 18, { align: "center" });
  });

  y += 32;

  // ── Negotiation Timeline ──
  y = renderSectionTitle(doc, y, "Negotiation Timeline");
  y += 4;

  if (report.historySummary && report.historySummary.length > 0) {
    report.historySummary.forEach((entry, idx) => {
      y = checkPageBreak(doc, y, 16);

      // Timeline dot
      doc.setFillColor(...COLORS.primary);
      doc.circle(20, y + 2, 2, "F");

      // Timeline line (connect dots)
      if (idx < report.historySummary.length - 1) {
        doc.setDrawColor(...COLORS.divider);
        doc.setLineWidth(0.5);
        doc.line(20, y + 5, 20, y + 14);
      }

      // Entry text
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(...COLORS.text);
      y = renderWrappedText(doc, entry, 28, y + 3, contentW - 20, 5);
      y += 5;
    });
  } else {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    doc.setTextColor(...COLORS.muted);
    doc.text("No timeline data available.", 20, y);
    y += 10;
  }

  y += 6;
  y = checkPageBreak(doc, y, 35);

  // ── Recommendations ──
  y = renderSectionTitle(doc, y, "Recommendations", COLORS.warning);
  y += 4;

  doc.setFillColor(255, 251, 235);
  doc.roundedRect(14, y, contentW, 28, 3, 3, "F");

  // Amber left border
  doc.setFillColor(...COLORS.warning);
  doc.rect(14, y, 3, 28, "F");

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...COLORS.text);

  const recommendations = isSuccess
    ? [
        "• Document agreed terms and circulate to all stakeholders for sign-off.",
        "• Schedule follow-up review within 2 weeks to assess implementation progress.",
        "• Analyze concession patterns to optimize future negotiation strategies.",
      ]
    : [
        "• Review each agent's constraints to identify primary blockers.",
        "• Consider adjusting scope parameters or introducing mediator agent.",
        "• Re-run simulation with modified personalities (e.g., Collaborative mode).",
      ];

  let recY = y + 8;
  recommendations.forEach((rec) => {
    doc.text(rec, 22, recY);
    recY += 7;
  });

  // ── Add page numbers ──
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    renderFooter(doc, i, totalPages);
  }

  // ── Download ──
  const filename = `summary_report_${report.scenarioName.toLowerCase().replace(/\s+/g, "_")}_${report.id}.pdf`;
  doc.save(filename);
}


/* ═══════════════════════════════════════════════════
   3. BULK EXPORT — All Reports Summary PDF
   ═══════════════════════════════════════════════════ */

export function generateAllReportsPDF(reports: CompletedReport[]): void {
  const doc = new jsPDF("p", "mm", "a4");
  const pageW = doc.internal.pageSize.getWidth();
  const contentW = pageW - 28;

  renderHeader(doc, "Negotiation Analytics Report", `${reports.length} Sessions — Consolidated Overview`);

  let y = 48;

  // ── Aggregate Stats ──
  y = renderSectionTitle(doc, y, "Aggregate Performance");
  y += 4;

  const totalRuns = reports.length;
  const successCount = reports.filter((r) => r.outcome === "Successful").length;
  const successRate = totalRuns ? Math.round((successCount / totalRuns) * 100) : 0;
  const avgRounds = totalRuns
    ? (reports.reduce((acc, r) => acc + r.rounds, 0) / totalRuns).toFixed(1)
    : "0";

  const statBoxW = (contentW - 12) / 4;
  const stats = [
    { label: "Total Sessions", value: `${totalRuns}`, color: COLORS.primary },
    { label: "Agreements", value: `${successCount}`, color: COLORS.accent },
    { label: "Success Rate", value: `${successRate}%`, color: COLORS.primary },
    { label: "Avg Rounds", value: avgRounds, color: COLORS.secondary },
  ];

  stats.forEach((s, i) => {
    const boxX = 14 + i * (statBoxW + 4);
    doc.setFillColor(...COLORS.lightBg);
    doc.roundedRect(boxX, y, statBoxW, 24, 3, 3, "F");

    doc.setFillColor(...s.color);
    doc.rect(boxX, y, statBoxW, 2.5, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(...s.color);
    doc.text(s.value, boxX + statBoxW / 2, y + 13, { align: "center" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...COLORS.muted);
    doc.text(s.label, boxX + statBoxW / 2, y + 20, { align: "center" });
  });

  y += 34;

  // ── Sessions Table ──
  y = renderSectionTitle(doc, y, "Session Details");
  y += 4;

  // Table header
  doc.setFillColor(...COLORS.primary);
  doc.rect(14, y, contentW, 9, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(...COLORS.white);
  const colX = [16, 60, 100, 122, 142, 165];
  const headers = ["Scenario", "Category", "Agents", "Rounds", "Final Offer", "Outcome"];
  headers.forEach((h, i) => doc.text(h, colX[i], y + 6));

  y += 11;

  // Table rows
  reports.forEach((rep, idx) => {
    y = checkPageBreak(doc, y, 10);

    // Alternating row bg
    if (idx % 2 === 0) {
      doc.setFillColor(...COLORS.lightBg);
      doc.rect(14, y - 2, contentW, 9, "F");
    }

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.text);

    // Truncate long scenario names
    const scenarioTrunc = rep.scenarioName.length > 22
      ? rep.scenarioName.substring(0, 20) + "…"
      : rep.scenarioName;

    doc.text(scenarioTrunc, colX[0], y + 4);
    doc.text(rep.category, colX[1], y + 4);
    doc.text(`${rep.agentCount}`, colX[2], y + 4);
    doc.text(`${rep.rounds}`, colX[3], y + 4);
    doc.text(rep.finalOffer ? `₹${rep.finalOffer.toLocaleString()}` : "—", colX[4], y + 4);

    // Outcome with color
    const outcomeColor = rep.outcome === "Successful" ? COLORS.accent : COLORS.danger;
    doc.setTextColor(...outcomeColor);
    doc.setFont("helvetica", "bold");
    doc.text(rep.outcome === "Successful" ? "✓ Agreed" : "✕ No Deal", colX[5], y + 4);

    y += 9;
  });

  // ── Add page numbers ──
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    renderFooter(doc, i, totalPages);
  }

  const filename = `all_negotiations_report_${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(filename);
}
