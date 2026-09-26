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

  // Quarter Mini Table
  const qHeaders = [["Team", "Q1", "Q2", "Q3", "Q4", "Total"]];
  const qRows = [
    [
      homeTeam.shortName,
      game.quarterScores.home.Q1.toString(),
      game.quarterScores.home.Q2.toString(),
      game.quarterScores.home.Q3.toString(),
      game.quarterScores.home.Q4.toString(),
      game.homeScore.toString(),
    ],
    [
      awayTeam.shortName,
      game.quarterScores.away.Q1.toString(),
      game.quarterScores.away.Q2.toString(),
      game.quarterScores.away.Q3.toString(),
      game.quarterScores.away.Q4.toString(),
      game.awayScore.toString(),
    ],
  ];

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
      p.minutes.toString(),
      p.pts.toString(),
      `${p.fgm}-${p.fga}`,
      `${p.fgPct}%`,
      `${p.fg3m}-${p.fg3a}`,
      `${p.fg3Pct}%`,
      `${p.ftm}-${p.fta}`,
      `${p.ftPct}%`,
      p.oreb.toString(),
      p.dreb.toString(),
      p.reb.toString(),
      p.ast.toString(),
      p.stl.toString(),
      p.blk.toString(),
      p.to.toString(),
      p.pf.toString(),
    ]);
  };

  const tableHeaders = [
    ["PLAYER", "POS", "MIN", "PTS", "FG", "FG%", "3PT", "3P%", "FT", "FT%", "OR", "DR", "REB", "AST", "STL", "BLK", "TO", "PF"],
  ];

  const homeRows = formatPlayerRows(boxScore.home);
  homeRows.push([
    "TOTALS",
    "-",
    "200",
    boxScore.homeTotals.pts.toString(),
    `${boxScore.homeTotals.fgm}-${boxScore.homeTotals.fga}`,
    `${boxScore.homeTotals.fgPct}%`,
    `${boxScore.homeTotals.fg3m}-${boxScore.homeTotals.fg3a}`,
    `${boxScore.homeTotals.fg3Pct}%`,
    `${boxScore.homeTotals.ftm}-${boxScore.homeTotals.fta}`,
    `${boxScore.homeTotals.ftPct}%`,
    boxScore.homeTotals.oreb.toString(),
    boxScore.homeTotals.dreb.toString(),
    boxScore.homeTotals.reb.toString(),
    boxScore.homeTotals.ast.toString(),
    boxScore.homeTotals.stl.toString(),
    boxScore.homeTotals.blk.toString(),
    boxScore.homeTotals.to.toString(),
    boxScore.homeTotals.pf.toString(),
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
      3: { fontStyle: "bold" },
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
    "200",
    boxScore.awayTotals.pts.toString(),
    `${boxScore.awayTotals.fgm}-${boxScore.awayTotals.fga}`,
    `${boxScore.awayTotals.fgPct}%`,
    `${boxScore.awayTotals.fg3m}-${boxScore.awayTotals.fg3a}`,
    `${boxScore.awayTotals.fg3Pct}%`,
    `${boxScore.awayTotals.ftm}-${boxScore.awayTotals.fta}`,
    `${boxScore.awayTotals.ftPct}%`,
    boxScore.awayTotals.oreb.toString(),
    boxScore.awayTotals.dreb.toString(),
    boxScore.awayTotals.reb.toString(),
    boxScore.awayTotals.ast.toString(),
    boxScore.awayTotals.stl.toString(),
    boxScore.awayTotals.blk.toString(),
    boxScore.awayTotals.to.toString(),
    boxScore.awayTotals.pf.toString(),
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
      3: { fontStyle: "bold" },
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
