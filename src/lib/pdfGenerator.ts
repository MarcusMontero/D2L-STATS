import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Game, Team, PlayerBoxStat } from "./types";

export function exportBoxScorePDF(
  game: Game,
  homeTeam: Team,
  awayTeam: Team,
  boxScore: {
    home: PlayerBoxStat[];
    away: PlayerBoxStat[];
    homeTotals: PlayerBoxStat;
    awayTotals: PlayerBoxStat;
  }
) {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  // Background Header Banner (Deep Forest Green)
  doc.setFillColor(11, 59, 36); // #0B3B24
  doc.rect(0, 0, 210, 36, "F");

  // Gold accent line
  doc.setDrawColor(212, 175, 55); // #D4AF37
  doc.setLineWidth(1.5);
  doc.line(0, 36, 210, 36);

  // Title & League Details
  doc.setTextColor(212, 175, 55);
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text("DISTRICT 2 LEAGUE (D2L)", 105, 12, { align: "center" });

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(
    `AYALA ALABANG VILLAGE • ${game.season.toUpperCase()}`,
    105,
    19,
    { align: "center" }
  );

  doc.setFontSize(9);
  doc.setTextColor(220, 220, 220);
  const formattedDate = new Date(game.scheduledAt).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  doc.text(`Official Game Box Score | ${formattedDate} | ${game.venue}`, 105, 26, {
    align: "center",
  });

  // Scoreboard Card
  doc.setFillColor(245, 247, 245);
  doc.roundedRect(14, 42, 182, 30, 3, 3, "F");
  doc.setDrawColor(200, 210, 200);
  doc.setLineWidth(0.5);
  doc.roundedRect(14, 42, 182, 30, 3, 3, "D");

  // Home Team
  doc.setTextColor(11, 59, 36);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text(homeTeam.name.toUpperCase(), 35, 54, { align: "center" });
  doc.setFontSize(26);
  doc.setTextColor(255, 107, 0); // Orange
  doc.text(game.homeScore.toString(), 35, 66, { align: "center" });

  // VS / Quarter breakdown in middle
  doc.setTextColor(100, 100, 100);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("FINAL", 105, 50, { align: "center" });

  // Quarter Mini Table (with dynamic OT1 / OT2 overtime support)
  const ot1Home = game.quarterScores?.home?.OT1 ?? 0;
  const ot1Away = game.quarterScores?.away?.OT1 ?? 0;
  const ot2Home = game.quarterScores?.home?.OT2 ?? 0;
  const ot2Away = game.quarterScores?.away?.OT2 ?? 0;

  const hasOT1 = ot1Home > 0 || ot1Away > 0 || game.quarter === "OT1";
  const hasOT2 = ot2Home > 0 || ot2Away > 0 || game.quarter === "OT2";

  const qHeadRow = ["Team", "Q1", "Q2", "Q3", "Q4"];
  if (hasOT1) qHeadRow.push("OT1");
  if (hasOT2) qHeadRow.push("OT2");
  qHeadRow.push("Total");

  const homeQRow = [
    homeTeam.shortName,
    (game.quarterScores?.home?.Q1 ?? 0).toString(),
    (game.quarterScores?.home?.Q2 ?? 0).toString(),
    (game.quarterScores?.home?.Q3 ?? 0).toString(),
    (game.quarterScores?.home?.Q4 ?? 0).toString(),
  ];
  if (hasOT1) homeQRow.push(ot1Home.toString());
  if (hasOT2) homeQRow.push(ot2Home.toString());
  homeQRow.push(game.homeScore.toString());

  const awayQRow = [
    awayTeam.shortName,
    (game.quarterScores?.away?.Q1 ?? 0).toString(),
    (game.quarterScores?.away?.Q2 ?? 0).toString(),
    (game.quarterScores?.away?.Q3 ?? 0).toString(),
    (game.quarterScores?.away?.Q4 ?? 0).toString(),
  ];
  if (hasOT1) awayQRow.push(ot1Away.toString());
  if (hasOT2) awayQRow.push(ot2Away.toString());
  awayQRow.push(game.awayScore.toString());

  const qHeaders = [qHeadRow];
  const qRows = [homeQRow, awayQRow];

  autoTable(doc, {
    head: qHeaders,
    body: qRows,
    startY: 53,
    margin: { left: 70 },
    tableWidth: 70,
    styles: { fontSize: 7, cellPadding: 1, halign: "center" },
    headStyles: { fillColor: [11, 59, 36], textColor: [255, 255, 255] },
  });

  // Away Team
  doc.setTextColor(26, 54, 93);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text(awayTeam.name.toUpperCase(), 175, 54, { align: "center" });
  doc.setFontSize(26);
  doc.setTextColor(255, 107, 0);
  doc.text(game.awayScore.toString(), 175, 66, { align: "center" });

  // 1. HOME TEAM BOX SCORE TABLE
  let currentY = 78;
  doc.setTextColor(11, 59, 36);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text(`${homeTeam.name.toUpperCase()} (HOME)`, 14, currentY);

  const formatPlayerRows = (players: PlayerBoxStat[]) => {
    return players.map((p) => [
      `#${p.jerseyNumber} ${p.name}${p.isStarter ? " *" : ""}`,
      p.position,
      p.pts.toString(),
      p.oreb.toString(),
      p.dreb.toString(),
      p.reb.toString(),
      p.ast.toString(),
      p.stl.toString(),
      p.blk.toString(),
    ]);
  };

  const tableHeaders = [
    ["PLAYER", "POS", "PTS", "OR", "DR", "REB", "AST", "STL", "BLK"],
  ];

  const homeRows = formatPlayerRows(boxScore.home);
  homeRows.push([
    "TOTALS",
    "-",
    boxScore.homeTotals.pts.toString(),
    boxScore.homeTotals.oreb.toString(),
    boxScore.homeTotals.dreb.toString(),
    boxScore.homeTotals.reb.toString(),
    boxScore.homeTotals.ast.toString(),
    boxScore.homeTotals.stl.toString(),
    boxScore.homeTotals.blk.toString(),
  ]);

  autoTable(doc, {
    head: tableHeaders,
    body: homeRows,
    startY: currentY + 2,
    margin: { left: 14, right: 14 },
    styles: { fontSize: 7, cellPadding: 1.5, halign: "center" },
    columnStyles: {
      0: { halign: "left", cellWidth: 36 },
      1: { cellWidth: 8 },
      2: { fontStyle: "bold" },
    },
    headStyles: { fillColor: [11, 59, 36], textColor: [255, 255, 255] },
    alternateRowStyles: { fillColor: [248, 250, 248] },
  });

  // 2. AWAY TEAM BOX SCORE TABLE
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const lastTableEnd = (doc as any).lastAutoTable.finalY || 160;
  currentY = lastTableEnd + 10;

  doc.setTextColor(26, 54, 93);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text(`${awayTeam.name.toUpperCase()} (AWAY)`, 14, currentY);

  const awayRows = formatPlayerRows(boxScore.away);
  awayRows.push([
    "TOTALS",
    "-",
    boxScore.awayTotals.pts.toString(),
    boxScore.awayTotals.oreb.toString(),
    boxScore.awayTotals.dreb.toString(),
    boxScore.awayTotals.reb.toString(),
    boxScore.awayTotals.ast.toString(),
    boxScore.awayTotals.stl.toString(),
    boxScore.awayTotals.blk.toString(),
  ]);

  autoTable(doc, {
    head: tableHeaders,
    body: awayRows,
    startY: currentY + 2,
    margin: { left: 14, right: 14 },
    styles: { fontSize: 7, cellPadding: 1.5, halign: "center" },
    columnStyles: {
      0: { halign: "left", cellWidth: 36 },
      1: { cellWidth: 8 },
      2: { fontStyle: "bold" },
    },
    headStyles: { fillColor: [26, 54, 93], textColor: [255, 255, 255] },
    alternateRowStyles: { fillColor: [248, 250, 252] },
  });

  // Footer notes & officials
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const footerY = (doc as any).lastAutoTable.finalY + 8;
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.text(`* Indicates Starter | Referees: ${game.officials.join(", ")}`, 14, footerY);
  doc.text("District 2 League • Official Courtside Live Record", 210 - 14, footerY, {
    align: "right",
  });

  doc.save(`D2L_BoxScore_${homeTeam.shortName}_vs_${awayTeam.shortName}_${game.id}.pdf`);
}

export function exportSchedulePDF(games: Game[], teams: Team[]) {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  // Header Banner
  doc.setFillColor(11, 59, 36);
  doc.rect(0, 0, 210, 32, "F");
  doc.setDrawColor(212, 175, 55);
  doc.setLineWidth(1.5);
  doc.line(0, 32, 210, 32);

  doc.setTextColor(212, 175, 55);
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text("DISTRICT 2 LEAGUE (D2L) - SCHEDULE", 105, 14, { align: "center" });

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("OFFICIAL GAME CALENDAR • AYALA ALABANG VILLAGE", 105, 22, { align: "center" });

  const getTeamName = (id: string) => teams.find((t) => t.id === id)?.name || id;

  const rows = games.map((g) => {
    const d = new Date(g.scheduledAt);
    const dateStr = d.toLocaleDateString("en-US", { month: "short", day: "numeric", weekday: "short" });
    const timeStr = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
    const matchup = `${getTeamName(g.homeTeamId)} vs ${getTeamName(g.awayTeamId)}`;
    const score = g.status === "final" ? `${g.homeScore} - ${g.awayScore}` : g.status.toUpperCase();
    return [dateStr, timeStr, matchup, g.venue, score];
  });

  autoTable(doc, {
    head: [["DATE", "TIME", "MATCHUP", "VENUE / COURT", "STATUS / SCORE"]],
    body: rows,
    startY: 40,
    margin: { left: 14, right: 14 },
    styles: { fontSize: 8, cellPadding: 2.5 },
    headStyles: { fillColor: [11, 59, 36], textColor: [255, 255, 255], fontStyle: "bold" },
    alternateRowStyles: { fillColor: [248, 250, 248] },
  });

  doc.save("D2L_Official_Schedule.pdf");
}
