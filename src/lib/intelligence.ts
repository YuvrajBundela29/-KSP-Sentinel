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

// ═══════════════════════════════════════════════════════════════════
// 9. SOCIOLOGICAL CRIME INSIGHTS
// ═══════════════════════════════════════════════════════════════════

export interface DemographicInsight {
  category: string;
  breakdown: { label: string; count: number; percentage: number; crimeTypes: string[] }[];
  riskFactors: { factor: string; description: string; severity: "high" | "medium" | "low"; supportingData: string }[];
  socialCorrelations: { indicator: string; correlation: string; strength: "strong" | "moderate" | "weak"; description: string }[];
}

export function analyzeSociologicalPatterns(data: CrimeDataset): DemographicInsight[] {
  const insights: DemographicInsight[] = [];

  // --- Victim Age Group Analysis ---
  const ageGroups: Record<string, { count: number; crimeTypes: Record<string, number> }> = {
    "0-17": { count: 0, crimeTypes: {} },
    "18-30": { count: 0, crimeTypes: {} },
    "31-45": { count: 0, crimeTypes: {} },
    "46-60": { count: 0, crimeTypes: {} },
    "60+": { count: 0, crimeTypes: {} },
  };

  for (const fir of data.firs) {
    const age = fir.victim.age;
    let group = "18-30";
    if (age !== null && age <= 17) group = "0-17";
    else if (age !== null && age <= 30) group = "18-30";
    else if (age !== null && age <= 45) group = "31-45";
    else if (age !== null && age <= 60) group = "46-60";
    else if (age !== null) group = "60+";
    ageGroups[group].count++;
    ageGroups[group].crimeTypes[fir.crime_type] = (ageGroups[group].crimeTypes[fir.crime_type] || 0) + 1;
  }

  const totalFirs = data.firs.length;
  const ageBreakdown = Object.entries(ageGroups).map(([label, d]) => ({
    label,
    count: d.count,
    percentage: totalFirs > 0 ? Math.round((d.count / totalFirs) * 100) : 0,
    crimeTypes: Object.entries(d.crimeTypes).sort(([, a], [, b]) => b - a).slice(0, 3).map(([t]) => t),
  }));

  const topAgeGroup = ageBreakdown.sort((a, b) => b.count - a.count)[0];
  insights.push({
    category: "Victim Age Distribution",
    breakdown: ageBreakdown,
    riskFactors: [
      { factor: "Elderly Vulnerability", description: `Victims aged 46+ account for ${ageGroups["46-60"].count + ageGroups["60+"].count} cases (${Math.round(((ageGroups["46-60"].count + ageGroups["60+"].count) / totalFirs) * 100)}%) — targeted for chain snatching and fraud`, severity: "high", supportingData: `Chain snatching and cyber fraud disproportionately affect older demographics` },
      { factor: "Youth Exposure", description: `Victims aged 18-30 represent the largest group (${ageGroups["18-30"].count} cases) — likely due to higher mobility and digital exposure`, severity: "medium", supportingData: `Young adults are primary targets for vehicle theft and cyber fraud` },
    ],
    socialCorrelations: [
      { indicator: "Urbanization", correlation: "positive", strength: "moderate", description: "Higher crime rates in urban districts correlate with larger young adult populations and higher digital transaction volumes" },
      { indicator: "Economic Stress", correlation: "positive", strength: "strong", description: `Districts with higher fraud cases show correlation with economic transaction density — suggesting financial stress as a driver` },
    ],
  });

  // --- Gender Analysis ---
  const genderGroups: Record<string, { count: number; crimeTypes: Record<string, number> }> = {};
  for (const fir of data.firs) {
    const g = fir.victim.gender || "Unknown";
    if (!genderGroups[g]) genderGroups[g] = { count: 0, crimeTypes: {} };
    genderGroups[g].count++;
    genderGroups[g].crimeTypes[fir.crime_type] = (genderGroups[g].crimeTypes[fir.crime_type] || 0) + 1;
  }

  const genderBreakdown = Object.entries(genderGroups).map(([label, d]) => ({
    label,
    count: d.count,
    percentage: totalFirs > 0 ? Math.round((d.count / totalFirs) * 100) : 0,
    crimeTypes: Object.entries(d.crimeTypes).sort(([, a], [, b]) => b - a).slice(0, 3).map(([t]) => t),
  }));

  const femaleCount = genderGroups["Female"]?.count || 0;
  const maleCount = genderGroups["Male"]?.count || 0;
  insights.push({
    category: "Victim Gender Analysis",
    breakdown: genderBreakdown,
    riskFactors: [
      { factor: "Gender-Based Crime Targeting", description: `Female victims account for ${Math.round((femaleCount / totalFirs) * 100)}% of cases — chain snatching and harassment are the primary crime types`, severity: "high", supportingData: `Female victims show higher incidence in public-space crimes (bus stands, markets, streets)` },
      { factor: "Male Victim Underreporting", description: `${maleCount} male victims recorded — actual numbers may be higher due to underreporting of certain crime categories`, severity: "medium", supportingData: `Male victims primarily in vehicle theft and physical crime categories` },
    ],
    socialCorrelations: [
      { indicator: "Women's Workforce Participation", correlation: "positive", strength: "moderate", description: "Districts with higher female workforce participation correlate with increased chain snatching near transit hubs" },
      { indicator: "Public Safety Infrastructure", correlation: "negative", strength: "moderate", description: "Areas with better street lighting and CCTV coverage show lower evening crime rates against women" },
    ],
  });

  // --- Occupation-Based Analysis ---
  const occupationGroups: Record<string, number> = {};
  const occupationCrimeTypes: Record<string, Record<string, number>> = {};
  for (const fir of data.firs) {
    const occ = fir.victim.occupation || "Unknown";
    occupationGroups[occ] = (occupationGroups[occ] || 0) + 1;
    if (!occupationCrimeTypes[occ]) occupationCrimeTypes[occ] = {};
    occupationCrimeTypes[occ][fir.crime_type] = (occupationCrimeTypes[occ][fir.crime_type] || 0) + 1;
  }

  const occupationBreakdown = Object.entries(occupationGroups)
    .sort(([, a], [, b]) => b - a)
    .map(([label, count]) => ({
      label,
      count,
      percentage: Math.round((count / totalFirs) * 100),
      crimeTypes: Object.entries(occupationCrimeTypes[label] || {}).sort(([, a], [, b]) => b - a).slice(0, 3).map(([t]) => t),
    }));

  insights.push({
    category: "Victim Occupation Profile",
    breakdown: occupationBreakdown,
    riskFactors: [
      { factor: "Occupational Targeting", description: `The most targeted occupation group is "${occupationBreakdown[0]?.label || "N/A"}" with ${occupationBreakdown[0]?.count || 0} cases — suggesting systematic targeting patterns`, severity: "medium", supportingData: `Certain occupations involve regular cash handling or predictable schedules, creating exploitation opportunities` },
    ],
    socialCorrelations: [
      { indicator: "Income Level", correlation: "positive", strength: "moderate", description: "Higher-value crimes (jewellery heist, cyber fraud) tend to target higher-income occupation groups" },
      { indicator: "Education Level", correlation: "negative", strength: "weak", description: "Cyber fraud victims span all education levels, suggesting social engineering effectiveness is independent of education" },
    ],
  });

  // --- Accused Age Analysis ---
  const accusedAgeGroups: Record<string, number> = { "18-25": 0, "26-35": 0, "36-45": 0, "46+": 0 };
  for (const acc of data.accused) {
    if (acc.age <= 25) accusedAgeGroups["18-25"]++;
    else if (acc.age <= 35) accusedAgeGroups["26-35"]++;
    else if (acc.age <= 45) accusedAgeGroups["36-45"]++;
    else accusedAgeGroups["46+"]++;
  }
  const totalAccused = data.accused.length;

  const accusedAgeBreakdown = Object.entries(accusedAgeGroups).map(([label, count]) => ({
    label,
    count,
    percentage: totalAccused > 0 ? Math.round((count / totalAccused) * 100) : 0,
    crimeTypes: [] as string[],
  }));

  const topAccusedAge = accusedAgeBreakdown.sort((a, b) => b.count - a.count)[0];
  insights.push({
    category: "Offender Age Demographics",
    breakdown: accusedAgeBreakdown,
    riskFactors: [
      { factor: "Youth Offender Concentration", description: `Offenders aged ${topAccusedAge?.label || "N/A"} comprise ${topAccusedAge?.percentage || 0}% of all accused — indicating youth involvement in criminal activity`, severity: "high", supportingData: `Young adult offenders show higher recidivism rates and gang affiliation` },
      { factor: "Age-Crime Relationship", description: "Peak offending age correlates with physical capability requirements of property crimes", severity: "medium", supportingData: "Cyber fraud shows wider age distribution compared to physical crimes" },
    ],
    socialCorrelations: [
      { indicator: "Unemployment Rate", correlation: "positive", strength: "strong", description: "Youth offender concentration correlates with district-level economic indicators and employment opportunities" },
      { indicator: "Education Access", correlation: "negative", strength: "moderate", description: "Districts with lower educational attainment show higher youth offender rates" },
    ],
  });

  // --- District Socio-Economic Profile ---
  const districtStats: Record<string, { crimes: number; types: Record<string, number>; severity: { critical: number; high: number; medium: number; low: number }; avgFinancial: number; financialCount: number }> = {};
  for (const fir of data.firs) {
    if (!districtStats[fir.district]) districtStats[fir.district] = { crimes: 0, types: {}, severity: { critical: 0, high: 0, medium: 0, low: 0 }, avgFinancial: 0, financialCount: 0 };
    const ds = districtStats[fir.district];
    ds.crimes++;
    ds.types[fir.crime_type] = (ds.types[fir.crime_type] || 0) + 1;
    ds.severity[fir.severity]++;
    if (fir.financial_transaction) {
      ds.avgFinancial += fir.financial_transaction.amount_inr;
      ds.financialCount++;
    }
  }

  const districtBreakdown = Object.entries(districtStats)
    .sort(([, a], [, b]) => b.crimes - a.crimes)
    .map(([label, ds]) => ({
      label,
      count: ds.crimes,
      percentage: Math.round((ds.crimes / totalFirs) * 100),
      crimeTypes: Object.entries(ds.types).sort(([, a], [, b]) => b - a).slice(0, 3).map(([t]) => t),
    }));

  const highCrimeDistricts = districtBreakdown.filter(d => d.percentage >= 15);
  insights.push({
    category: "District Socio-Economic Crime Profile",
    breakdown: districtBreakdown,
    riskFactors: [
      { factor: "Urban Crime Concentration", description: `${highCrimeDistricts.length > 0 ? highCrimeDistricts.map(d => d.label).join(", ") : "No district"} account for ${highCrimeDistricts.reduce((s, d) => s + d.count, 0)} cases — urban districts show disproportionate crime volume`, severity: "high", supportingData: "Urban districts combine higher population density, economic activity, and transient populations creating crime opportunities" },
      { factor: "Financial Crime Hotspots", description: `Districts with high financial crime rates indicate organized financial criminal infrastructure`, severity: "medium", supportingData: "Bank account density and digital payment adoption correlate with cyber fraud incidence" },
    ],
    socialCorrelations: [
      { indicator: "Population Density", correlation: "positive", strength: "strong", description: "Higher crime volumes in densely populated urban districts (Bengaluru, Mysuru) confirm population-crime correlation" },
      { indicator: "Economic Development", correlation: "complex", strength: "moderate", description: "Developed districts show more cyber fraud while developing districts show more property crimes" },
      { indicator: "Migration Patterns", correlation: "positive", strength: "moderate", description: "Districts with high migrant worker populations show elevated crime rates in specific categories" },
    ],
  });

  return insights;
}

// ═══════════════════════════════════════════════════════════════════
// 10. CRIME FORECASTING & EARLY WARNING
// ═══════════════════════════════════════════════════════════════════

export interface ForecastResult {
  metric: string;
  current: number;
  predicted: number;
  trend: "rising" | "stable" | "declining";
  changePercent: number;
  confidence: number;
  factors: string[];
  timeframe: string;
}

export interface EarlyWarningAlert {
  id: string;
  type: "repeat_crime" | "gang_activity" | "emerging_hotspot" | "escalation" | "financial_anomaly" | "pattern_shift";
  severity: "critical" | "high" | "medium" | "low";
  title: string;
  description: string;
  location: string;
  predictedImpact: string;
  recommendedActions: string[];
  supportingFIRs: string[];
  confidence: number;
  detectedAt: string;
}

export function generateForecasts(data: CrimeDataset): ForecastResult[] {
  const forecasts: ForecastResult[] = [];
  const firs = data.firs;

  // Monthly trend analysis
  const monthlyCounts: Record<string, number> = {};
  for (const fir of firs) {
    const d = new Date(fir.date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    monthlyCounts[key] = (monthlyCounts[key] || 0) + 1;
  }

  const months = Object.entries(monthlyCounts).sort(([a], [b]) => a.localeCompare(b));
  if (months.length >= 2) {
    const recent = months.slice(-3);
    const older = months.slice(-6, -3);
    const recentAvg = recent.reduce((s, [, c]) => s + c, 0) / recent.length;
    const olderAvg = older.length > 0 ? older.reduce((s, [, c]) => s + c, 0) / older.length : recentAvg;
    const change = olderAvg > 0 ? ((recentAvg - olderAvg) / olderAvg) * 100 : 0;

    forecasts.push({
      metric: "Overall Crime Rate",
      current: Math.round(recentAvg),
      predicted: Math.round(recentAvg * (1 + change / 200)),
      trend: change > 5 ? "rising" : change < -5 ? "declining" : "stable",
      changePercent: Math.round(change),
      confidence: 68,
      factors: change > 5 ? ["Increasing trend in last 3 months", "Multiple crime types showing growth", "Seasonal factors may contribute"] : change < -5 ? ["Declining trend indicates effective enforcement", "Reduced gang activity in key districts"] : ["Crime rate holding steady", "No significant seasonal deviation"],
      timeframe: "Next 30 days",
    });
  }

  // Crime type forecasts
  const crimeTypeByMonth: Record<string, Record<string, number>> = {};
  for (const fir of firs) {
    const d = new Date(fir.date);
    const month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (!crimeTypeByMonth[month]) crimeTypeByMonth[month] = {};
    crimeTypeByMonth[month][fir.crime_type] = (crimeTypeByMonth[month][fir.crime_type] || 0) + 1;
  }

  const allCrimeTypes = [...new Set(firs.map(f => f.crime_type))];
  for (const ct of allCrimeTypes) {
    const recentMonths = Object.entries(crimeTypeByMonth).sort(([a], [b]) => a.localeCompare(b)).slice(-3);
    const recentCounts = recentMonths.map(([, m]) => m[ct] || 0);
    const recentAvg = recentCounts.reduce((s, c) => s + c, 0) / recentCounts.length;
    const trend = recentCounts[2] > recentCounts[0] ? "rising" : recentCounts[2] < recentCounts[0] ? "declining" : "stable";
    const change = recentCounts[0] > 0 ? ((recentCounts[2] - recentCounts[0]) / recentCounts[0]) * 100 : 0;

    forecasts.push({
      metric: ct,
      current: Math.round(recentCounts[2] || 0),
      predicted: Math.round(recentAvg * (trend === "rising" ? 1.1 : trend === "declining" ? 0.9 : 1)),
      trend,
      changePercent: Math.round(change),
      confidence: 55 + Math.min(Math.round(recentCounts.reduce((s, c) => s + c, 0) * 2), 30),
      factors: trend === "rising" ? [`${ct} showing upward trend`, `Multiple incidents in recent period`] : trend === "declining" ? [`Enforcement measures showing effect on ${ct}`, `Reduced incident frequency`] : [`${ct} maintaining stable frequency`],
      timeframe: "Next 30 days",
    });
  }

  // District forecasts
  const districtByMonth: Record<string, Record<string, number>> = {};
  for (const fir of firs) {
    const d = new Date(fir.date);
    const month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (!districtByMonth[month]) districtByMonth[month] = {};
    districtByMonth[month][fir.district] = (districtByMonth[month][fir.district] || 0) + 1;
  }

  const allDistricts = [...new Set(firs.map(f => f.district))];
  for (const dist of allDistricts) {
    const recentMonths = Object.entries(districtByMonth).sort(([a], [b]) => a.localeCompare(b)).slice(-2);
    const counts = recentMonths.map(([, m]) => m[dist] || 0);
    if (counts.length >= 2 && counts[1] > counts[0]) {
      forecasts.push({
        metric: `${dist} District`,
        current: counts[1],
        predicted: Math.round(counts[1] * 1.15),
        trend: "rising",
        changePercent: counts[0] > 0 ? Math.round(((counts[1] - counts[0]) / counts[0]) * 100) : 0,
        confidence: 52 + Math.min(counts[1] * 3, 30),
        factors: [`Escalating crime in ${dist}`, "Resource reallocation recommended"],
        timeframe: "Next 30 days",
      });
    }
  }

  return forecasts;
}

export function generateEarlyWarnings(data: CrimeDataset): EarlyWarningAlert[] {
  const alerts: EarlyWarningAlert[] = [];
  const firs = data.firs;

  // 1. Repeat crime detection (same location, same crime type within 30 days)
  const locationCrimeMap: Record<string, { type: string; date: string; firId: string; district: string }[]> = {};
  for (const fir of firs) {
    const key = `${fir.district}-${fir.location.place}`;
    if (!locationCrimeMap[key]) locationCrimeMap[key] = [];
    locationCrimeMap[key].push({ type: fir.crime_type, date: fir.date, firId: fir.fir_id, district: fir.district });
  }

  for (const [location, incidents] of Object.entries(locationCrimeMap)) {
    if (incidents.length >= 2) {
      const sorted = [...incidents].sort((a, b) => a.date.localeCompare(b.date));
      for (let i = 1; i < sorted.length; i++) {
        const daysDiff = (new Date(sorted[i].date).getTime() - new Date(sorted[i - 1].date).getTime()) / (1000 * 60 * 60 * 24);
        if (daysDiff <= 30 && sorted[i].type === sorted[i - 1].type) {
          alerts.push({
            id: `EW-RC-${sorted[i].firId}`,
            type: "repeat_crime",
            severity: daysDiff <= 14 ? "critical" : "high",
            title: `Repeat ${sorted[i].type} at ${location}`,
            description: `Same crime type "${sorted[i].type}" occurred at ${location} within ${Math.round(daysDiff)} days. Pattern suggests systematic targeting of this location.`,
            location: location.split("-").slice(1).join(" - "),
            predictedImpact: "High probability of recurrence within next 14 days based on established pattern",
            recommendedActions: ["Increase patrol frequency at location", "Install temporary surveillance", "Alert local intelligence unit", "Check for CCTV coverage gaps"],
            supportingFIRs: [sorted[i - 1].firId, sorted[i].firId],
            confidence: Math.min(60 + Math.round((30 - daysDiff) * 1.5), 92),
            detectedAt: new Date().toISOString(),
          });
        }
      }
    }
  }

  // 2. Gang activity early warning
  for (const gang of data.gangs) {
    const gangFirs = firs.filter(f => f.gang_id === gang.id);
    const recentFirs = gangFirs.filter(f => {
      const daysSince = (Date.now() - new Date(f.date).getTime()) / (1000 * 60 * 60 * 24);
      return daysSince <= 30;
    });
    if (recentFirs.length >= 3) {
      alerts.push({
        id: `EW-GA-${gang.id}`,
        type: "gang_activity",
        severity: "critical",
        title: `Escalating ${gang.name} Activity`,
        description: `${gang.name} has ${recentFirs.length} FIRs in the last 30 days (total: ${gangFirs.length}). Operating across ${[...new Set(gangFirs.map(f => f.district))].length} districts. Pattern indicates coordinated campaign.`,
        location: gang.base,
        predictedImpact: "High likelihood of continued operations. Cross-district expansion possible.",
        recommendedActions: ["Initiate coordinated multi-district operation", "Freeze identified financial accounts", "Activate surveillance on all known members", "Issue internal alert to bordering districts"],
        supportingFIRs: recentFirs.map(f => f.fir_id),
        confidence: 78,
        detectedAt: new Date().toISOString(),
      });
    }
  }

  // 3. Emerging hotspot detection
  const districtMonthCounts: Record<string, Record<string, number>> = {};
  for (const fir of firs) {
    const d = new Date(fir.date);
    const month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (!districtMonthCounts[fir.district]) districtMonthCounts[fir.district] = {};
    districtMonthCounts[fir.district][month] = (districtMonthCounts[fir.district][month] || 0) + 1;
  }

  for (const [district, months] of Object.entries(districtMonthCounts)) {
    const sortedMonths = Object.entries(months).sort(([a], [b]) => a.localeCompare(b));
    if (sortedMonths.length >= 2) {
      const latest = sortedMonths[sortedMonths.length - 1][1];
      const previous = sortedMonths[sortedMonths.length - 2][1];
      if (latest > previous * 1.5 && latest >= 3) {
        alerts.push({
          id: `EW-EH-${district.replace(/\s+/g, "")}`,
          type: "emerging_hotspot",
          severity: "high",
          title: `Emerging Crime Hotspot: ${district}`,
          description: `${district} shows ${(Math.round(((latest - previous) / previous) * 100))}% increase in crime (from ${previous} to ${latest} cases in latest month). This exceeds the threshold for emerging hotspot classification.`,
          location: district,
          predictedImpact: "If trend continues, district will become top crime district within 60 days",
          recommendedActions: ["Deploy additional patrol units", "Establish temporary checkpoint", "Conduct community awareness campaign", "Analyze specific crime types driving the increase"],
          supportingFIRs: firs.filter(f => f.district === district).slice(-5).map(f => f.fir_id),
          confidence: 65,
          detectedAt: new Date().toISOString(),
        });
      }
    }
  }

  // 4. Crime escalation detection (severity increase)
  const districtSeverity: Record<string, { recent: number[]; older: number[] }> = {};
  for (const fir of firs) {
    const daysSince = (Date.now() - new Date(fir.date).getTime()) / (1000 * 60 * 60 * 24);
    const sevScore = fir.severity === "critical" ? 4 : fir.severity === "high" ? 3 : fir.severity === "medium" ? 2 : 1;
    if (!districtSeverity[fir.district]) districtSeverity[fir.district] = { recent: [], older: [] };
    if (daysSince <= 60) districtSeverity[fir.district].recent.push(sevScore);
    else districtSeverity[fir.district].older.push(sevScore);
  }

  for (const [district, { recent, older }] of Object.entries(districtSeverity)) {
    if (recent.length >= 3 && older.length >= 3) {
      const recentAvg = recent.reduce((s, v) => s + v, 0) / recent.length;
      const olderAvg = older.reduce((s, v) => s + v, 0) / older.length;
      if (recentAvg > olderAvg * 1.3) {
        alerts.push({
          id: `EW-ES-${district.replace(/\s+/g, "")}`,
          type: "escalation",
          severity: "high",
          title: `Crime Severity Escalation in ${district}`,
          description: `Average crime severity in ${district} has increased from ${olderAvg.toFixed(1)} to ${recentAvg.toFixed(1)} (scale 1-4). This indicates a shift toward more serious criminal activity.`,
          location: district,
          predictedImpact: "Escalation pattern may indicate organized crime expansion or emboldened offenders",
          recommendedActions: ["Review recent critical-severity cases for common factors", "Assess gang activity increase in the district", "Evaluate patrol and deterrence effectiveness"],
          supportingFIRs: firs.filter(f => f.district === district && f.severity === "critical").slice(0, 5).map(f => f.fir_id),
          confidence: 60,
          detectedAt: new Date().toISOString(),
        });
      }
    }
  }

  // 5. Financial anomaly alerts
  const highValueFirs = firs.filter(f => f.financial_transaction && f.financial_transaction.amount_inr > 200000);
  const highValueByDistrict: Record<string, number> = {};
  for (const fir of highValueFirs) {
    highValueByDistrict[fir.district] = (highValueByDistrict[fir.district] || 0) + 1;
  }
  for (const [district, count] of Object.entries(highValueByDistrict)) {
    if (count >= 2) {
      alerts.push({
        id: `EW-FA-${district.replace(/\s+/g, "")}`,
        type: "financial_anomaly",
        severity: "high",
        title: `High-Value Financial Crime Cluster in ${district}`,
        description: `${count} cases with transactions exceeding ₹2,00,000 detected in ${district}. Total value: ₹${highValueFirs.filter(f => f.district === district).reduce((s, f) => s + (f.financial_transaction?.amount_inr || 0), 0).toLocaleString("en-IN")}. Possible organized financial crime network.`,
        location: district,
        predictedImpact: "Additional high-value transactions likely if network is active",
        recommendedActions: ["Freeze identified bank accounts", "Coordinate with banking authorities", "Trace transaction chains", "Assess for money laundering patterns"],
        supportingFIRs: highValueFirs.filter(f => f.district === district).map(f => f.fir_id),
        confidence: 72,
        detectedAt: new Date().toISOString(),
      });
    }
  }

  return alerts.sort((a, b) => {
    const sev = { critical: 0, high: 1, medium: 2, low: 3 };
    return sev[a.severity] - sev[b.severity];
  });
}

// ═══════════════════════════════════════════════════════════════════
// 11. SEASONAL TREND ANALYSIS
// ═══════════════════════════════════════════════════════════════════

export interface SeasonalTrend {
  season: string;
  months: string[];
  totalCrimes: number;
  topCrimeTypes: { type: string; count: number }[];
  yearOverYear: { year: string; count: number }[];
  anomaly: boolean;
  anomalyDescription: string;
}

export function analyzeSeasonalTrends(data: CrimeDataset): SeasonalTrend[] {
  const seasonMap: Record<string, string> = {
    "01": "Winter", "02": "Winter", "12": "Winter",
    "03": "Summer", "04": "Summer", "05": "Summer",
    "06": "Monsoon", "07": "Monsoon", "08": "Monsoon", "09": "Monsoon",
    "10": "Post-Monsoon", "11": "Post-Monsoon",
  };

  const seasonData: Record<string, { months: string[]; firs: typeof data.firs }> = {};
  for (const fir of data.firs) {
    const m = new Date(fir.date).getMonth() + 1;
    const season = seasonMap[String(m).padStart(2, "0")] || "Other";
    if (!seasonData[season]) seasonData[season] = { months: [], firs: [] };
    const monthKey = `${new Date(fir.date).getFullYear()}-${String(m).padStart(2, "0")}`;
    if (!seasonData[season].months.includes(monthKey)) seasonData[season].months.push(monthKey);
    seasonData[season].firs.push(fir);
  }

  const seasonOrder = ["Winter", "Summer", "Monsoon", "Post-Monsoon"];
  const results: SeasonalTrend[] = [];

  for (const season of seasonOrder) {
    const sd = seasonData[season];
    if (!sd || sd.firs.length === 0) continue;

    const crimeTypes: Record<string, number> = {};
    const yearCounts: Record<string, number> = {};
    for (const fir of sd.firs) {
      crimeTypes[fir.crime_type] = (crimeTypes[fir.crime_type] || 0) + 1;
      const year = new Date(fir.date).getFullYear().toString();
      yearCounts[year] = (yearCounts[year] || 0) + 1;
    }

    const topTypes = Object.entries(crimeTypes).sort(([, a], [, b]) => b - a).slice(0, 4).map(([type, count]) => ({ type, count }));
    const yoy = Object.entries(yearCounts).sort(([a], [b]) => a.localeCompare(b)).map(([year, count]) => ({ year, count }));

    const avgPerMonth = sd.firs.length / Math.max(sd.months.length, 1);
    const overallAvg = data.firs.length / 12;
    const isAnomaly = Math.abs(avgPerMonth - overallAvg) / overallAvg > 0.25;

    results.push({
      season,
      months: [...new Set(sd.months)].sort(),
      totalCrimes: sd.firs.length,
      topCrimeTypes: topTypes,
      yearOverYear: yoy,
      anomaly: isAnomaly,
      anomalyDescription: isAnomaly
        ? avgPerMonth > overallAvg
          ? `${season} shows ${Math.round(((avgPerMonth - overallAvg) / overallAvg) * 100)}% above-average crime rate — possible seasonal crime spike requiring additional deployment`
          : `${season} shows ${Math.round(((overallAvg - avgPerMonth) / overallAvg) * 100)}% below-average crime rate — may indicate underreporting or effective seasonal enforcement`
        : `${season} crime rates are within normal range`,
    });
  }

  return results;
}

// ═══════════════════════════════════════════════════════════════════
// 12. FINANCIAL NETWORK ANALYSIS
// ═══════════════════════════════════════════════════════════════════

export interface FinancialNetworkNode {
  id: string;
  type: "account" | "accused" | "fir" | "gang";
  label: string;
  value: number;
  details: Record<string, string>;
}

export interface FinancialNetworkEdge {
  source: string;
  target: string;
  type: "transaction" | "account_holder" | "used_in" | "gang_member";
  amount?: number;
  label: string;
}

export function buildFinancialNetwork(data: CrimeDataset): { nodes: FinancialNetworkNode[]; edges: FinancialNetworkEdge[] } {
  const nodes: FinancialNetworkNode[] = [];
  const edges: FinancialNetworkEdge[] = [];
  const nodeIds = new Set<string>();

  const addNode = (id: string, type: FinancialNetworkNode["type"], label: string, value: number, details: Record<string, string>) => {
    if (!nodeIds.has(id)) {
      nodeIds.add(id);
      nodes.push({ id, type, label, value, details });
    }
  };

  // Bank account nodes
  for (const acc of data.bank_accounts) {
    addNode(`acc-${acc.id}`, "account", `${acc.bank}: ${acc.acc}`, 0, { bank: acc.bank, holder: acc.holder, account: acc.acc });
  }

  // FIR financial links
  for (const fir of data.firs) {
    if (fir.financial_transaction) {
      addNode(`fir-${fir.fir_id}`, "fir", fir.fir_id, fir.financial_transaction.amount_inr, { crime: fir.crime_type, district: fir.district, mode: fir.financial_transaction.mode });
      edges.push({ source: `acc-${fir.financial_transaction.account}`, target: `fir-${fir.fir_id}`, type: "transaction", amount: fir.financial_transaction.amount_inr, label: `₹${fir.financial_transaction.amount_inr.toLocaleString("en-IN")} via ${fir.financial_transaction.mode}` });

      // Link accused to FIR and account
      for (const aId of fir.accused) {
        const accused = data.accused.find(a => a.id === aId);
        if (accused) {
          addNode(`accused-${accused.id}`, "accused", accused.name, accused.risk, { age: String(accused.age), gang: accused.gang || "None", risk: String(accused.risk) });
          edges.push({ source: `accused-${accused.id}`, target: `fir-${fir.fir_id}`, type: "used_in", label: "Accused in" });
        }
      }
    }
  }

  // Gang links
  for (const gang of data.gangs) {
    const gangFirsWithFinancial = data.firs.filter(f => f.gang_id === gang.id && f.financial_transaction);
    if (gangFirsWithFinancial.length > 0) {
      addNode(`gang-${gang.id}`, "gang", gang.name, gangFirsWithFinancial.reduce((s, f) => s + (f.financial_transaction?.amount_inr || 0), 0), { type: gang.type, base: gang.base, members: String(gang.members.length) });
      for (const memberId of gang.members) {
        if (nodeIds.has(`accused-${memberId}`)) {
          edges.push({ source: `accused-${memberId}`, target: `gang-${gang.id}`, type: "gang_member", label: "Member of" });
        }
      }
    }
  }

  return { nodes, edges };
}