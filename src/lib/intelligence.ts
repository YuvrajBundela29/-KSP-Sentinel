// KSP Sentinel AI — Intelligence Analysis Engine
// Generates investigation briefs, similar crimes, timelines, feeds, and queue

import type {
  CrimeDataset, FIR, Accused, Gang,
  InvestigationBrief, SimilarCrimeResult, TimelineEvent,
  IntelFeedItem, InvestigationQueueItem, ExplainableResponse,
} from "./types";

// ═══════════════════════════════════════════════════════════════════
//  1. AI INVESTIGATION BRIEF GENERATOR
// ═══════════════════════════════════════════════════════════════════

export function generateInvestigationBrief(
  data: CrimeDataset,
  targetId: string,
  targetType: "accused" | "fir"
): InvestigationBrief {
  if (targetType === "accused") {
    return generateAccusedBrief(data, targetId);
  }
  return generateFIRBrief(data, targetId);
}

function generateAccusedBrief(data: CrimeDataset, accusedId: string): InvestigationBrief {
  const accused = data.accused.find(a => a.id === accusedId);
  if (!accused) {
    return emptyBrief();
  }

  const linkedFIRs = data.firs.filter(f => f.accused.includes(accusedId));
  const gang = accused.gang ? data.gangs.find(g => g.id === accused.gang) : null;
  const gangMembers = gang
    ? data.accused.filter(a => a.id !== accusedId && gang.members.includes(a.id))
    : [];

  // Related cases: other FIRs by same gang or co-accused
  const relatedCases = linkedFIRs.map(f => ({
    firId: f.fir_id,
    crimeType: f.crime_type,
    date: f.date,
    status: f.investigation_status,
    relevance: f.gang_id === accused.gang ? "Direct gang involvement" : "Co-accused in case",
  }));

  // Add FIRs from gang members not involving this accused
  if (gang) {
    for (const member of gangMembers) {
      const memberFIRs = data.firs.filter(f => f.accused.includes(member.id) && !f.accused.includes(accusedId));
      for (const f of memberFIRs) {
        if (!relatedCases.find(r => r.firId === f.fir_id)) {
          relatedCases.push({
            firId: f.fir_id,
            crimeType: f.crime_type,
            date: f.date,
            status: f.investigation_status,
            relevance: `Associate ${member.name} involved in same gang operation`,
          });
        }
      }
    }
  }

  // Likely associates
  const associateMap = new Map<string, { name: string; id: string; connection: string; strength: "strong" | "moderate" | "weak" }>();
  for (const f of linkedFIRs) {
    for (const aid of f.accused) {
      if (aid === accusedId) continue;
      const other = data.accused.find(a => a.id === aid);
      if (!other) continue;
      const existing = associateMap.get(aid);
      if (existing) {
        existing.connection += `, co-accused in ${f.fir_id}`;
      } else {
        const sameGang = accused.gang && other.gang && accused.gang === other.gang;
        associateMap.set(aid, {
          name: other.name,
          id: other.id,
          connection: sameGang
            ? `Same gang (${gang?.name}) — ${f.fir_id}`
            : `Co-accused in ${f.fir_id}`,
          strength: sameGang ? "strong" : "moderate",
        });
      }
    }
  }

  // Financial links
  const financialLinks: InvestigationBrief["financialLinks"] = [];
  const fTxs = linkedFIRs.filter(f => f.financial_transaction);
  const txAccounts = new Set(fTxs.map(f => f.financial_transaction!.account));
  for (const accId of txAccounts) {
    const bank = data.bank_accounts.find(b => b.id === accId);
    const txs = fTxs.filter(f => f.financial_transaction!.account === accId);
    const total = txs.reduce((s, f) => s + (f.financial_transaction?.amount_inr ?? 0), 0);
    financialLinks.push({
      bank: bank?.bank ?? "Unknown",
      account: bank?.acc ?? accId,
      holder: bank?.holder ?? "Unknown",
      totalAmount: total,
      transactions: txs.length,
      details: txs.map(t => `${t.fir_id}: ₹${t.financial_transaction?.amount_inr.toLocaleString("en-IN")} via ${t.financial_transaction?.mode}`).join("; "),
    });
  }

  // Behavioral analysis
  const timeSlots: Record<string, number> = { morning: 0, afternoon: 0, evening: 0, night: 0 };
  const crimeTypes: Record<string, number> = {};
  const districts: Record<string, number> = {};
  const modiSet = new Set<string>();
  for (const f of linkedFIRs) {
    const h = parseInt(f.time.split(":")[0]);
    if (h >= 6 && h < 12) timeSlots.morning++;
    else if (h >= 12 && h < 17) timeSlots.afternoon++;
    else if (h >= 17 && h < 21) timeSlots.evening++;
    else timeSlots.night++;
    crimeTypes[f.crime_type] = (crimeTypes[f.crime_type] ?? 0) + 1;
    districts[f.district] = (districts[f.district] ?? 0) + 1;
    modiSet.add(f.modus_operandi);
  }

  const peakTime = Object.entries(timeSlots).sort(([, a], [, b]) => b - a)[0];
  const topDistrict = Object.entries(districts).sort(([, a], [, b]) => b - a)[0];
  const topCrime = Object.entries(crimeTypes).sort(([, a], [, b]) => b - a)[0];

  const behavioralAnalysis: InvestigationBrief["behavioralAnalysis"] = [
    {
      pattern: "Temporal Pattern",
      description: `Peak activity during ${peakTime?.[0] ?? "unknown"} hours (${peakTime?.[1] ?? 0} incidents). ${peakTime?.[0] === "night" ? "Operates under cover of darkness — high evasion probability." : peakTime?.[0] === "evening" ? "Targets evening commuters and walkers in dimly lit areas." : "Daytime operations suggest confidence or opportunity-based targeting."}`,
      frequency: `${linkedFIRs.length} incidents analyzed`,
    },
    {
      pattern: "Geographic Preference",
      description: `Primary operating zone: ${topDistrict?.[0] ?? "unknown"} (${topDistrict?.[1] ?? 0} incidents). ${gang ? `Gang base at ${gang.base}.` : "No confirmed gang affiliation."} ${Object.keys(districts).length > 1 ? `Also active in ${Object.entries(districts).slice(1).map(([d, c]) => `${d} (${c})`).join(", ")}.` : ""}`,
      frequency: `${Object.keys(districts).length} district${Object.keys(districts).length > 1 ? "s" : ""} covered`,
    },
    {
      pattern: "Crime Specialization",
      description: `Primary crime type: ${topCrime?.[0] ?? "unknown"} (${topCrime?.[1] ?? 0} incidents). ${Object.keys(crimeTypes).length > 1 ? `Also involved in: ${Object.entries(crimeTypes).slice(1).map(([t, c]) => `${t} (${c})`).join(", ")}.` : ""}`,
      frequency: `${Object.keys(crimeTypes).length} distinct crime type${Object.keys(crimeTypes).length > 1 ? "s" : ""}`,
    },
    {
      pattern: "Modus Operandi",
      description: `${modiSet.size > 1 ? `Uses ${modiSet.size} different MOs, suggesting adaptability:` : "Consistent MO indicates specialization:"} ${[...modiSet].slice(0, 3).map(m => `"${m}"`).join("; ")}`,
      frequency: `${modiSet.size} unique method${modiSet.size > 1 ? "s" : ""} identified`,
    },
  ];

  // Missing evidence
  const missingEvidence: InvestigationBrief["missingEvidence"] = [];
  const noWitness = linkedFIRs.filter(f => f.witnesses.length === 0);
  const noVehicle = linkedFIRs.filter(f => !f.vehicle_used);
  const noFinancial = linkedFIRs.filter(f => !f.financial_transaction && (f.crime_type.includes("Fraud") || f.crime_type.includes("Heist")));
  const noCctv = linkedFIRs.filter(f => !f.witnesses.some(w => w.toLowerCase().includes("cctv") || w.toLowerCase().includes("camera")));

  if (noWitness.length > 0) missingEvidence.push({ type: "Witness Testimony", description: `${noWitness.length} case(s) have zero witnesses recorded — ${noWitness.map(f => f.fir_id).join(", ")}`, priority: "high" });
  if (noCctv.length > 0 && linkedFIRs.length > 2) missingEvidence.push({ type: "CCTV Footage", description: `No CCTV evidence documented in ${noCctv.length} case(s) — consider area surveillance audit`, priority: "medium" });
  if (noFinancial.length > 0) missingEvidence.push({ type: "Financial Trail", description: `No financial transaction data for ${noFinancial.length} financial crime(s) — ${noFinancial.map(f => f.fir_id).join(", ")}`, priority: "high" });
  if (noVehicle.length > 0 && gang?.type?.includes("Vehicle")) missingEvidence.push({ type: "Vehicle Intelligence", description: `No vehicle linked in ${noVehicle.length} case(s) despite vehicle theft gang profile`, priority: "medium" });
  missingEvidence.push({ type: "Mobile Tower Dump", description: "No phone interception data on record — recommend CDR analysis for all co-accused", priority: "medium" });
  missingEvidence.push({ type: "Social Media Intelligence", description: "No OSINT/social media profiling documented — recommended for cyber-crime linked accused", priority: "low" });

  // Suggested actions
  const suggestedActions: InvestigationBrief["suggestedActions"] = [
    { action: `Summon ${gangMembers.slice(0, 2).map(m => m.name).join(" & ")} for interrogation`, rationale: gang ? `Same gang (${gang.name}) — likely to reveal operational hierarchy and next targets` : "Frequent co-accused with shared criminal patterns", priority: "immediate" },
    { action: "Obtain CDR (Call Detail Records) for all co-accused", rationale: "Cross-reference call patterns during incident windows to establish communication chains", priority: "immediate" },
    { action: `Surveillance operation in ${topDistrict?.[0] ?? "primary district"} during ${peakTime?.[0] ?? "peak hours"}`, rationale: "Pattern analysis indicates high probability of repeat offending in this time/location window", priority: "short_term" },
    { action: "Freeze identified bank accounts and initiate KYC investigation", rationale: `₹${financialLinks.reduce((s, l) => s + l.totalAmount, 0).toLocaleString("en-IN")} in linked transactions across ${financialLinks.length} account(s)`, priority: "immediate" },
    { action: "Cross-reference with interstate crime databases (NCRB CCTNS)", rationale: `${accused.prior_firs} prior FIRs suggest interstate network — check for warrants in other states`, priority: "short_term" },
    { action: "Deploy technical surveillance at known associate addresses", rationale: "Intelligence indicates organized operation — monitoring communications may reveal upcoming plans", priority: "long_term" },
  ];

  // Confidence score based on data completeness
  let confidence = 40;
  if (linkedFIRs.length >= 2) confidence += 15;
  if (gang) confidence += 10;
  if (gangMembers.length >= 2) confidence += 5;
  if (financialLinks.length > 0) confidence += 10;
  if (linkedFIRs.some(f => f.witnesses.length > 0)) confidence += 8;
  if (linkedFIRs.some(f => f.vehicle_used)) confidence += 7;
  if (missingEvidence.filter(m => m.priority === "high").length === 0) confidence += 5;
  confidence = Math.min(confidence, 97);

  const executiveSummary = `${accused.name} (${accusedId}) is a ${accused.risk > 80 ? "high-risk" : accused.risk > 60 ? "moderate-risk" : "low-risk"} offender with ${linkedFIRs.length} linked FIR${linkedFIRs.length !== 1 ? "s" : ""} and ${accused.prior_firs} prior record${accused.prior_firs !== 1 ? "s" : ""}. ${gang ? `Confirmed member of "${gang.name}" (${gang.type}) based at ${gang.base} with ${gang.members.length} known members.` : "No confirmed gang affiliation identified."} Primary activity zone: ${topDistrict?.[0] ?? "unknown"}. ${financialLinks.length > 0 ? `Financial intelligence reveals ${financialLinks.length} account(s) with total transactions of ₹${financialLinks.reduce((s, l) => s + l.totalAmount, 0).toLocaleString("en-IN")}.` : ""} ${missingEvidence.filter(m => m.priority === "high").length > 0 ? `CRITICAL: ${missingEvidence.filter(m => m.priority === "high").length} high-priority evidence gaps identified.` : ""}`;

  return {
    executiveSummary,
    relatedCases,
    likelyAssociates: [...associateMap.values()].sort((a, b) => (a.strength === "strong" ? 0 : 1) - (b.strength === "strong" ? 0 : 1)),
    financialLinks,
    behavioralAnalysis,
    missingEvidence,
    suggestedActions,
    confidenceScore: confidence,
  };
}

function generateFIRBrief(data: CrimeDataset, firId: string): InvestigationBrief {
  const fir = data.firs.find(f => f.fir_id === firId);
  if (!fir) return emptyBrief();

  const accusedProfiles = fir.accused.map(id => data.accused.find(a => a.id === id)).filter(Boolean) as Accused[];
  const gang = fir.gang_id ? data.gangs.find(g => g.id === fir.gang_id) : null;
  const allGangFIRs = gang ? data.firs.filter(f => f.gang_id === gang.id && f.fir_id !== firId) : [];

  const relatedCases = allGangFIRs.map(f => ({
    firId: f.fir_id, crimeType: f.crime_type, date: f.date, status: f.investigation_status,
    relevance: gang ? `Same gang (${gang.name}) operation` : "Related criminal network",
  }));

  // Co-accused in other cases
  for (const aid of fir.accused) {
    const otherFIRs = data.firs.filter(f => f.accused.includes(aid) && f.fir_id !== firId);
    for (const f of otherFIRs) {
      if (!relatedCases.find(r => r.firId === f.fir_id)) {
        relatedCases.push({ firId: f.fir_id, crimeType: f.crime_type, date: f.date, status: f.investigation_status, relevance: `Accused ${aid} also involved` });
      }
    }
  }

  const likelyAssociates = accusedProfiles.map(a => {
    const g = a.gang ? data.gangs.find(gg => gg.id === a.gang) : null;
    return {
      name: a.name, id: a.id,
      connection: g ? `Member of ${g.name}` : "Independent operator",
      strength: (a.risk > 75 ? "strong" : a.risk > 50 ? "moderate" : "weak") as "strong" | "moderate" | "weak",
    };
  });

  const financialLinks: InvestigationBrief["financialLinks"] = [];
  if (fir.financial_transaction) {
    const bank = data.bank_accounts.find(b => b.id === fir.financial_transaction!.account);
    financialLinks.push({
      bank: bank?.bank ?? "Unknown", account: bank?.acc ?? fir.financial_transaction!.account,
      holder: bank?.holder ?? "Unknown", totalAmount: fir.financial_transaction.amount_inr,
      transactions: 1, details: `₹${fir.financial_transaction.amount_inr.toLocaleString("en-IN")} via ${fir.financial_transaction.mode} — ${fir.financial_transaction.note}`,
    });
  }

  return {
    executiveSummary: `${fir.crime_type} (${fir.ipc_section}) reported on ${fir.date} at ${fir.time} in ${fir.district}. ${fir.accused.length} accused identified: ${accusedProfiles.map(a => `${a.name} (Risk: ${a.risk})`).join(", ")}. ${gang ? `Linked to ${gang.name} gang.` : ""} ${fir.vehicle_used ? `Vehicle used: ${fir.vehicle_used}.` : ""} Status: ${fir.investigation_status}.`,
    relatedCases, likelyAssociates, financialLinks,
    behavioralAnalysis: [
      { pattern: "Incident Timing", description: `Crime occurred at ${fir.time} — ${parseInt(fir.time) >= 18 || parseInt(fir.time) < 6 ? "night/evening operation suggesting premeditation" : "daylight operation suggesting opportunity or confidence"}.`, frequency: "Single incident" },
      { pattern: "Method of Operation", description: fir.modus_operandi, frequency: "Primary MO for this case" },
      { pattern: "Target Selection", description: `Victim: ${fir.victim.name} (${fir.victim.occupation}). ${fir.victim.age && fir.victim.age > 55 ? "Elderly victim — potential vulnerability targeting." : ""} ${fir.socio_tags.includes("high_value") ? "High-value target suggesting reconnaissance." : ""}`, frequency: "Single incident" },
    ],
    missingEvidence: fir.witnesses.length === 0
      ? [{ type: "Witness Testimony", description: "No witnesses recorded for this case", priority: "high" }]
      : [],
    suggestedActions: [
      { action: "Verify alibis of all accused", rationale: "Establish timeline consistency with incident timing", priority: "immediate" },
      { action: "Canvass CCTV in 500m radius", rationale: "Identify approach/escape routes and additional suspects", priority: "immediate" },
      { action: "Cross-reference with similar MO cases statewide", rationale: "May reveal series pattern or copycat crimes", priority: "short_term" },
    ],
    confidenceScore: fir.accused.length > 0 ? 75 : 40,
  };
}

function emptyBrief(): InvestigationBrief {
  return {
    executiveSummary: "Insufficient data to generate investigation brief.",
    relatedCases: [], likelyAssociates: [], financialLinks: [],
    behavioralAnalysis: [], missingEvidence: [], suggestedActions: [],
    confidenceScore: 0,
  };
}

// ═══════════════════════════════════════════════════════════════════
//  2. SIMILAR CRIME ENGINE
// ═══════════════════════════════════════════════════════════════════

export function computeSimilarCrimes(
  data: CrimeDataset,
  targetFirId: string,
  maxResults: number = 5
): SimilarCrimeResult[] {
  const target = data.firs.find(f => f.fir_id === targetFirId);
  if (!target) return [];

  const results: SimilarCrimeResult[] = [];

  for (const fir of data.firs) {
    if (fir.fir_id === targetFirId) continue;

    const factors: SimilarCrimeResult["matchedFactors"] = [];
    let totalWeight = 0;
    let matchedWeight = 0;

    // Crime type match (weight: 30)
    const crimeMatch = fir.crime_type === target.crime_type;
    factors.push({ factor: "Crime Type", weight: 30, matched: crimeMatch, detail: crimeMatch ? `Both are ${fir.crime_type}` : `${target.crime_type} vs ${fir.crime_type}` });
    totalWeight += 30;
    if (crimeMatch) matchedWeight += 30;

    // Modus operandi similarity (weight: 25)
    const modiWords = new Set(target.modus_operandi.toLowerCase().split(/\s+/));
    const firModiWords = fir.modus_operandi.toLowerCase().split(/\s+/);
    const commonWords = firModiWords.filter(w => modiWords.has(w) && w.length > 3);
    const modiSimilarity = commonWords.length / Math.max(modiWords.size, 1);
    const modiMatch = modiSimilarity >= 0.3;
    factors.push({ factor: "Modus Operandi", weight: 25, matched: modiMatch, detail: modiMatch ? `${Math.round(modiSimilarity * 100)}% keyword overlap: "${commonWords.slice(0, 3).join(", ")}"` : "Different methods employed" });
    totalWeight += 25;
    if (modiMatch) matchedWeight += Math.round(25 * modiSimilarity);

    // District proximity (weight: 15)
    const districtMatch = fir.district === target.district;
    factors.push({ factor: "District", weight: 15, matched: districtMatch, detail: districtMatch ? `Both in ${fir.district}` : `${target.district} vs ${fir.district}` });
    totalWeight += 15;
    if (districtMatch) matchedWeight += 15;

    // Vehicle match (weight: 15)
    const vehicleMatch = target.vehicle_used && fir.vehicle_used && target.vehicle_used === fir.vehicle_used;
    const vehiclePartial = target.vehicle_used && fir.vehicle_used && target.vehicle_used !== fir.vehicle_used;
    factors.push({ factor: "Vehicle", weight: 15, matched: !!vehicleMatch, detail: vehicleMatch ? `Same vehicle: ${target.vehicle_used}` : vehiclePartial ? `Different vehicles: ${target.vehicle_used} vs ${fir.vehicle_used}` : !target.vehicle_used ? "No vehicle in reference case" : "No vehicle in this case" });
    totalWeight += 15;
    if (vehicleMatch) matchedWeight += 15;

    // Gang match (weight: 10)
    const gangMatch = target.gang_id && fir.gang_id && target.gang_id === fir.gang_id;
    factors.push({ factor: "Gang", weight: 10, matched: !!gangMatch, detail: gangMatch ? `Same gang implicated` : target.gang_id ? "Different gangs or no gang link" : "No gang in reference case" });
    totalWeight += 10;
    if (gangMatch) matchedWeight += 10;

    // Time proximity (weight: 5)
    const targetDate = new Date(target.date).getTime();
    const firDate = new Date(fir.date).getTime();
    const daysDiff = Math.abs(targetDate - firDate) / (1000 * 60 * 60 * 24);
    const timeProximity = daysDiff <= 30;
    factors.push({ factor: "Time", weight: 5, matched: timeProximity, detail: timeProximity ? `${Math.round(daysDiff)} days apart` : `${Math.round(daysDiff)} days apart — outside 30-day window` });
    totalWeight += 5;
    if (timeProximity) matchedWeight += 5;

    const score = Math.round((matchedWeight / totalWeight) * 100);

    // Accused overlap bonus
    const accusedOverlap = fir.accused.filter(a => target.accused.includes(a));
    if (accusedOverlap.length > 0) {
      const names = accusedOverlap.map(a => data.accused.find(ac => ac.id === a)?.name ?? a).join(", ");
      factors.push({ factor: "Shared Accused", weight: 0, matched: true, detail: `Common accused: ${names}` });
    }

    if (score >= 25) {
      const matchedFactors = factors.filter(f => f.matched);
      results.push({
        fir,
        similarityScore: score,
        matchedFactors: factors,
        explanation: `${score}% similar to ${targetFirId}. ${matchedFactors.length} factor${matchedFactors.length !== 1 ? "s" : ""} matched: ${matchedFactors.map(f => f.detail).join("; ")}. ${accusedOverlap.length > 0 ? `ALERT: Shared accused (${accusedOverlap.join(", ")}).` : ""}`,
      });
    }
  }

  return results.sort((a, b) => b.similarityScore - a.similarityScore).slice(0, maxResults);
}

// ═══════════════════════════════════════════════════════════════════
//  3. INVESTIGATION TIMELINE GENERATOR
// ═══════════════════════════════════════════════════════════════════

export function generateTimeline(
  data: CrimeDataset,
  firId: string
): TimelineEvent[] {
  const fir = data.firs.find(f => f.fir_id === firId);
  if (!fir) return [];

  const baseDate = new Date(fir.date + "T" + fir.time + ":00");
  const events: TimelineEvent[] = [];
  let evtIdx = 0;

  // FIR Filed
  events.push({
    id: `${firId}-evt-${evtIdx++}`, type: "fir_filed",
    title: "FIR Registered", description: `${fir.fir_id} filed at ${fir.police_station} under IPC ${fir.ipc_section}. Crime: ${fir.crime_type}. Severity: ${fir.severity.toUpperCase()}.`,
    timestamp: fir.date + "T" + fir.time, firId, icon: "FileText", status: "completed",
  });

  // Complaint
  events.push({
    id: `${firId}-evt-${evtIdx++}`, type: "complaint",
    title: "Complaint Received", description: `Complaint from ${fir.victim.name} (${fir.victim.occupation}). ${fir.victim.age ? `Age: ${fir.victim.age}.` : ""} Location: ${fir.location.place}.`,
    timestamp: shiftTime(baseDate, -2, "hours"), firId, icon: "MessageSquare", status: "completed",
  });

  // Witnesses
  if (fir.witnesses.length > 0) {
    events.push({
      id: `${firId}-evt-${evtIdx++}`, type: "witness",
      title: "Witness Statements", description: `${fir.witnesses.length} witness(es) identified: ${fir.witnesses.join("; ")}. Statements recorded.`,
      timestamp: shiftTime(baseDate, 1, "hours"), firId, icon: "Users", status: "completed",
    });
  } else {
    events.push({
      id: `${firId}-evt-${evtIdx++}`, type: "witness",
      title: "Witness Search", description: "No witnesses identified at scene. Area canvass recommended.",
      timestamp: shiftTime(baseDate, 1, "hours"), firId, icon: "Users", status: "pending",
    });
  }

  // CCTV
  const hasCCTV = fir.witnesses.some(w => w.toLowerCase().includes("cctv") || w.toLowerCase().includes("camera"));
  events.push({
    id: `${firId}-evt-${evtIdx++}`, type: "cctv",
    title: hasCCTV ? "CCTV Footage Retrieved" : "CCTV Analysis",
    description: hasCCTV
      ? "CCTV footage from nearby location obtained and under analysis. Suspect movements being tracked."
      : "CCTV survey within 500m radius requested. Awaiting footage from commercial and traffic cameras.",
    timestamp: shiftTime(baseDate, 4, "hours"), firId, icon: "Camera", status: hasCCTV ? "completed" : "in_progress",
  });

  // Phone/Communication
  events.push({
    id: `${firId}-evt-${evtIdx++}`, type: "phone",
    title: "Phone Interception", description: fir.crime_type === "Cyber Fraud"
      ? "Digital forensics initiated on victim's devices. CDR analysis requested for accused numbers."
      : "Mobile tower dump analysis requested for incident location and time window. CDR analysis pending for identified accused.",
    timestamp: shiftTime(baseDate, 8, "hours"), firId, icon: "Phone", status: "in_progress",
  });

  // Vehicle
  if (fir.vehicle_used) {
    const vehicle = data.vehicles.find(v => v.id === fir.vehicle_used);
    events.push({
      id: `${firId}-evt-${evtIdx++}`, type: "vehicle",
      title: "Vehicle Traced", description: `Vehicle: ${vehicle ? `${vehicle.reg} (${vehicle.make}, ${vehicle.color})` : fir.vehicle_used}. FASTag/toll data pulled. RTO records being verified.`,
      timestamp: shiftTime(baseDate, 12, "hours"), firId, icon: "Car", status: "completed",
    });
  } else {
    events.push({
      id: `${firId}-evt-${evtIdx++}`, type: "vehicle",
      title: "Vehicle Check", description: "No vehicle directly linked. Checking ANPR camera data for suspicious vehicles near scene.",
      timestamp: shiftTime(baseDate, 12, "hours"), firId, icon: "Car", status: "pending",
    });
  }

  // Financial
  if (fir.financial_transaction) {
    const bank = data.bank_accounts.find(b => b.id === fir.financial_transaction!.account);
    events.push({
      id: `${firId}-evt-${evtIdx++}`, type: "financial",
      title: "Financial Trail Identified", description: `Account: ${bank?.acc ?? "N/A"} (${bank?.bank ?? "Unknown"}, Holder: ${bank?.holder ?? "Unknown"}). Amount: ₹${fir.financial_transaction.amount_inr.toLocaleString("en-IN")} via ${fir.financial_transaction.mode}. ${fir.financial_transaction.note}.`,
      timestamp: shiftTime(baseDate, 24, "hours"), firId, icon: "Banknote", status: "in_progress",
    });
  }

  // Investigation
  events.push({
    id: `${firId}-evt-${evtIdx++}`, type: "investigation",
    title: "Investigation Status", description: `Current status: ${fir.investigation_status}. Officer: ${fir.officer_id}. ${fir.investigation_status === "Under Investigation" ? "Case is actively being investigated. Multiple leads being pursued." : fir.investigation_status === "Arrested" ? "Arrest(s) made. Chargesheet preparation underway." : "Case closed."}`,
    timestamp: shiftTime(baseDate, 48, "hours"), firId, icon: "Search", status: fir.investigation_status === "Arrested" ? "completed" : "in_progress",
  });

  // Arrest
  if (fir.investigation_status === "Arrested") {
    const names = fir.accused.map(a => data.accused.find(ac => ac.id === a)?.name ?? a).join(", ");
    events.push({
      id: `${firId}-evt-${evtIdx++}`, type: "arrest",
      title: "Arrest Executed", description: `${fir.accused.length} accused arrested: ${names}. Remanded to judicial custody. Legal proceedings initiated.`,
      timestamp: shiftTime(baseDate, 72, "hours"), firId, icon: "Handcuffs", status: "completed",
    });
  } else {
    events.push({
      id: `${firId}-evt-${evtIdx++}`, type: "arrest",
      title: "Arrest Pending", description: `${fir.accused.length} accused identified but not yet arrested: ${fir.accused.join(", ")}. Lookout notices issued.`,
      timestamp: shiftTime(baseDate, 120, "hours"), firId, icon: "Handcuffs", status: "pending",
    });
  }

  return events;
}

function shiftTime(base: Date, amount: number, unit: "hours" | "days"): string {
  const d = new Date(base);
  if (unit === "hours") d.setHours(d.getHours() + amount);
  else d.setDate(d.getDate() + amount);
  return d.toISOString();
}

// ═══════════════════════════════════════════════════════════════════
//  4. LIVE INTELLIGENCE FEED
// ═══════════════════════════════════════════════════════════════════

export function getIntelFeedItems(data: CrimeDataset): IntelFeedItem[] {
  const items: IntelFeedItem[] = [];
  const now = new Date();

  // Critical severity alerts
  for (const fir of data.firs) {
    if (fir.severity === "critical" && fir.investigation_status === "Under Investigation") {
      items.push({
        id: `feed-${fir.fir_id}`, type: "alert",
        title: `Critical Case Active: ${fir.fir_id}`,
        description: `${fir.crime_type} in ${fir.district} — ${fir.investigation_status}. ${fir.accused.length} suspects identified.`,
        timestamp: new Date(now.getTime() - Math.random() * 3600000 * 2).toISOString(),
        severity: "critical", relatedFirs: [fir.fir_id],
      });
    }
  }

  // Arrest updates
  for (const fir of data.firs) {
    if (fir.investigation_status === "Arrested") {
      const names = fir.accused.map(a => data.accused.find(ac => ac.id === a)?.name ?? a).join(", ");
      items.push({
        id: `feed-arrest-${fir.fir_id}`, type: "arrest",
        title: `Arrest: ${names}`,
        description: `Arrested in connection with ${fir.fir_id} (${fir.crime_type}) at ${fir.police_station}.`,
        timestamp: new Date(now.getTime() - Math.random() * 86400000 * 7).toISOString(),
        severity: "medium", relatedFirs: [fir.fir_id],
      });
    }
  }

  // Pattern detections
  const byGang = new Map<string, FIR[]>();
  for (const fir of data.firs) {
    if (fir.gang_id) {
      const arr = byGang.get(fir.gang_id) ?? [];
      arr.push(fir);
      byGang.set(fir.gang_id, arr);
    }
  }
  for (const [gid, firs] of byGang) {
    const gang = data.gangs.find(g => g.id === gid);
    if (gang && firs.length >= 3) {
      const districts = [...new Set(firs.map(f => f.district))];
      items.push({
        id: `feed-pattern-${gid}`, type: "pattern",
        title: `Emerging Pattern: ${gang.name}`,
        description: `${firs.length} linked incidents across ${districts.join(", ")}. ${districts.length > 1 ? "Cross-district operation detected — possible interstate network." : "Localized gang activity concentrated in single district."}`,
        timestamp: new Date(now.getTime() - Math.random() * 3600000 * 4).toISOString(),
        severity: "high", relatedFirs: firs.map(f => f.fir_id),
      });
    }
  }

  // Intelligence updates
  for (const fir of data.firs) {
    if (fir.financial_transaction) {
      const bank = data.bank_accounts.find(b => b.id === fir.financial_transaction!.account);
      items.push({
        id: `feed-fin-${fir.fir_id}`, type: "intelligence",
        title: `Financial Intelligence: ₹${fir.financial_transaction.amount_inr.toLocaleString("en-IN")}`,
        description: `Transaction traced to ${bank?.bank ?? "Unknown Bank"} (A/C: ${bank?.acc?.slice(-4) ?? "XXXX"}). ${fir.financial_transaction.mode} — ${fir.financial_transaction.note}.`,
        timestamp: new Date(now.getTime() - Math.random() * 86400000 * 3).toISOString(),
        severity: fir.financial_transaction.amount_inr > 500000 ? "high" : "medium",
        relatedFirs: [fir.fir_id],
      });
    }
  }

  // High risk offender alerts
  for (const acc of data.accused) {
    if (acc.risk >= 85) {
      const firs = data.firs.filter(f => f.accused.includes(acc.id) && f.investigation_status === "Under Investigation");
      if (firs.length > 0) {
        items.push({
          id: `feed-risk-${acc.id}`, type: "alert",
          title: `High-Risk Offender Active: ${acc.name}`,
          description: `Risk score ${acc.risk}/100. ${firs.length} active case(s). ${acc.prior_firs} prior FIRs. Consider priority surveillance.`,
          timestamp: new Date(now.getTime() - Math.random() * 3600000 * 6).toISOString(),
          severity: "high", relatedFirs: firs.map(f => f.fir_id),
        });
      }
    }
  }

  return items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

// ═══════════════════════════════════════════════════════════════════
//  5. INVESTIGATION QUEUE
// ═══════════════════════════════════════════════════════════════════

export function getInvestigationQueue(data: CrimeDataset): InvestigationQueueItem[] {
  const now = new Date();
  return data.firs
    .filter(f => f.investigation_status === "Under Investigation")
    .map(f => {
      const daysOpen = Math.floor((now.getTime() - new Date(f.date).getTime()) / 86400000);
      const severityPriority = f.severity === "critical" ? 100 : f.severity === "high" ? 75 : f.severity === "medium" ? 50 : 25;
      const agePriority = Math.min(daysOpen / 2, 25);
      const evidencePenalty = f.witnesses.length === 0 ? -10 : 0;
      const priority = Math.round(severityPriority + agePriority + evidencePenalty);

      let reason = "";
      if (f.severity === "critical") reason += "Critical severity — ";
      if (daysOpen > 90) reason += `Cold case risk (${daysOpen} days open) — `;
      if (f.witnesses.length === 0) reason += "No witnesses — ";
      if (f.accused.length === 0) reason += "No accused identified — ";
      if (f.financial_transaction && f.financial_transaction.amount_inr > 500000) reason += "High-value financial crime — ";
      if (!reason) reason = "Active investigation — requires follow-up";

      return {
        firId: f.fir_id, crimeType: f.crime_type, district: f.district,
        priority, status: f.investigation_status, daysOpen, reason: reason.replace(/ — $/, ""),
      };
    })
    .sort((a, b) => b.priority - a.priority);
}

// ═══════════════════════════════════════════════════════════════════
//  6. AI RECOMMENDATIONS
// ═══════════════════════════════════════════════════════════════════

export function getAIRecommendations(data: CrimeDataset): { title: string; description: string; priority: "high" | "medium" | "low"; action: string }[] {
  const recs: { title: string; description: string; priority: "high" | "medium" | "low"; action: string }[] = [];

  // Check for cross-district gang activity
  for (const gang of data.gangs) {
    const gangFirs = data.firs.filter(f => f.gang_id === gang.id);
    const districts = [...new Set(gangFirs.map(f => f.district))];
    if (districts.length >= 2) {
      recs.push({
        title: `Cross-District Alert: ${gang.name}`,
        description: `${gang.name} is operating across ${districts.length} districts (${districts.join(", ")}). Recommend coordinated multi-district operation with shared intelligence.`,
        priority: "high", action: "Coordinate with SPs of all affected districts",
      });
    }
  }

  // Under-investigated cyber crimes
  const cyberOpen = data.firs.filter(f => f.crime_type === "Cyber Fraud" && f.investigation_status === "Under Investigation");
  if (cyberOpen.length >= 2) {
    const totalAmt = cyberOpen.reduce((s, f) => s + (f.financial_transaction?.amount_inr ?? 0), 0);
    recs.push({
      title: "Cyber Crime Task Force Activation",
      description: `${cyberOpen.length} active cyber fraud cases with total loss of ₹${totalAmt.toLocaleString("en-IN")}. Pattern suggests organized operation requiring specialized cyber cell intervention.`,
      priority: "high", action: "Escalate to Cyber Crime Division",
    });
  }

  // Serial offenders still active
  for (const acc of data.accused) {
    if (acc.risk >= 80) {
      const activeFirs = data.firs.filter(f => f.accused.includes(acc.id) && f.investigation_status === "Under Investigation");
      if (activeFirs.length > 0) {
        recs.push({
          title: `Priority Surveillance: ${acc.name} (${acc.id})`,
          description: `Risk score ${acc.risk}/100 with ${activeFirs.length} active cases. ${acc.prior_firs} prior FIRs indicate repeat offending pattern. Immediate surveillance recommended.`,
          priority: "high", action: "Initiate technical and physical surveillance",
        });
      }
    }
  }

  // Vehicle pattern analysis
  const vehicleFirs = data.firs.filter(f => f.vehicle_used);
  const vehicleUsage = new Map<string, number>();
  for (const f of vehicleFirs) { if (f.vehicle_used) vehicleUsage.set(f.vehicle_used, (vehicleUsage.get(f.vehicle_used) ?? 0) + 1); }
  for (const [vid, count] of vehicleUsage) {
    if (count >= 2) {
      const v = data.vehicles.find(ve => ve.id === vid);
      recs.push({
        title: `Vehicle Pattern: ${v?.reg ?? vid}`,
        description: `Vehicle ${v?.reg ?? vid} (${v?.make ?? "Unknown"} ${v?.color ?? ""}) linked to ${count} crimes. Recommend ANPR alert and RTO intelligence sharing.`,
        priority: "medium", action: "Set up ANPR alert network",
      });
    }
  }

  // Cold case warnings
  for (const fir of data.firs) {
    const daysOpen = Math.floor((Date.now() - new Date(fir.date).getTime()) / 86400000);
    if (daysOpen > 180 && fir.investigation_status === "Under Investigation") {
      recs.push({
        title: `Cold Case Warning: ${fir.fir_id}`,
        description: `${fir.crime_type} in ${fir.district} has been open for ${daysOpen} days with no arrest. Evidence degradation risk. Recommend case review and fresh investigation team.`,
        priority: "medium", action: "Schedule case review meeting",
      });
    }
  }

  // Financial intelligence
  const bankTxMap = new Map<string, { amount: number; firs: string[] }>();
  for (const fir of data.firs) {
    if (fir.financial_transaction) {
      const existing = bankTxMap.get(fir.financial_transaction.account) ?? { amount: 0, firs: [] };
      existing.amount += fir.financial_transaction.amount_inr;
      existing.firs.push(fir.fir_id);
      bankTxMap.set(fir.financial_transaction.account, existing);
    }
  }
  for (const [accId, info] of bankTxMap) {
    const bank = data.bank_accounts.find(b => b.id === accId);
    if (info.amount > 1000000) {
      recs.push({
        title: `High-Value Account: ${bank?.holder ?? "Unknown"}`,
        description: `Account at ${bank?.bank ?? "Unknown"} shows ₹${info.amount.toLocaleString("en-IN")} across ${info.firs.length} linked cases. Recommend ED notification and account freeze.`,
        priority: "high", action: "Initiate account freeze and ED referral",
      });
    }
  }

  return recs.sort((a, b) => (a.priority === "high" ? 0 : 1) - (b.priority === "high" ? 0 : 1));
}

// ═══════════════════════════════════════════════════════════════════
//  7. CRIME TREND DATA (for sparklines)
// ═══════════════════════════════════════════════════════════════════

export function getCrimeTrendByMonth(data: CrimeDataset): { month: string; count: number }[] {
  const monthMap = new Map<string, number>();
  for (const fir of data.firs) {
    const d = new Date(fir.date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    monthMap.set(key, (monthMap.get(key) ?? 0) + 1);
  }
  return [...monthMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, count]) => ({ month, count }));
}

// ═══════════════════════════════════════════════════════════════════
//  8. EXPLAINABLE AI WRAPPER
// ═══════════════════════════════════════════════════════════════════

export function wrapExplainableAI(
  content: string,
  data: CrimeDataset
): ExplainableResponse {
  const firIds = content.match(/FIR-\d{4}-KA-\d{4}/g) ?? [];
  const uniqueFirIds = [...new Set(firIds)];

  const evidenceChain = uniqueFirIds.map(id => {
    const fir = data.firs.find(f => f.fir_id === id);
    return {
      firId: id,
      relevance: fir ? `${fir.crime_type} in ${fir.district} (${fir.date})` : "Referenced in analysis",
    };
  });

  // Confidence based on data support
  let confidence = 50;
  if (uniqueFirIds.length >= 3) confidence += 20;
  else if (uniqueFirIds.length >= 1) confidence += 15;
  if (content.includes("gang") || content.includes("Gang")) confidence += 10;
  if (content.includes("pattern") || content.includes("Pattern")) confidence += 5;
  if (uniqueFirIds.length === 0) confidence = 25;
  confidence = Math.min(confidence, 96);

  // Extract reasoning summary from first 2 lines
  const lines = content.split("\n").filter(l => l.trim().length > 0);
  const reasoningSummary = lines.slice(0, 2).join(" ").slice(0, 200);

  // Alternative explanations when confidence is low
  const alternatives: string[] = [];
  if (confidence < 70) {
    alternatives.push("Data may be incomplete — additional FIR records could change the analysis.");
    alternatives.push("Temporal patterns might be skewed due to limited dataset window.");
  }
  if (uniqueFirIds.length < 3) {
    alternatives.push("Low evidence count — conclusions should be verified with additional intelligence sources.");
  }

  return {
    content,
    evidenceChain,
    confidenceScore: confidence,
    reasoningSummary,
    alternativeExplanations: alternatives.length > 0 ? alternatives : undefined,
  };
}