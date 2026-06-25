import { NextRequest, NextResponse } from "next/server";
import type { CrimeDataset, ExplainableResponse, ReasoningStep } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, history } = body;

    // Read the crime dataset from public folder
    const fs = await import("fs");
    const path = await import("path");
    const filePath = path.join(process.cwd(), "public", "data", "ksp_crime_dataset.json");
    const fileContent = fs.readFileSync(filePath, "utf-8");
    const dataset = JSON.parse(fileContent);

    const systemPrompt = `You are KSP Sentinel, an AI Crime Intelligence Copilot for Karnataka State Police.
You have access to the crime database provided below.
Your job is to help investigators find patterns, connections, and intelligence.

Rules:
1. Always cite which FIR IDs support your answers. Format: [FIR-2024-KA-XXXX]
2. When you identify a gang connection, name the gang and list member accused IDs.
3. When asked about patterns, look for: same vehicle, same modus_operandi, same gang_id, same time patterns.
4. Answer in the same language the user writes in. If they write in Kannada, reply in Kannada.
5. Always end with: 'Evidence sources: [list FIR IDs used]'
6. Never invent data not in the database.
7. If asked for a risk score, look up the accused profile risk field.
8. Be concise and analytical. Use bullet points for lists.
9. Format your responses with **bold** for key terms and proper line breaks.

DATABASE:
${JSON.stringify(dataset, null, 2)}`;

    // Build messages array for Claude API format
    const messages: Array<{ role: "user" | "assistant" | "system"; content: string }> = [
      { role: "system", content: systemPrompt },
      { role: "assistant", content: "Understood. I am KSP Sentinel, ready to assist with crime intelligence analysis using the provided Karnataka crime database." },
    ];

    // Add conversation history
    if (history && Array.isArray(history)) {
      for (const msg of history) {
        messages.push({ role: msg.role === "assistant" ? "assistant" : "user", content: msg.content });
      }
    }

    // Add the current message
    messages.push({ role: "user", content: message });

    // Try to use z-ai-web-dev-sdk for the LLM call
    try {
      const ZAI = (await import("z-ai-web-dev-sdk")).default;
      const zai = await ZAI.create();
      const response = await zai.chat.completions.create({
        model: "claude-sonnet-4-6",
        messages,
      });

      const aiText = response?.choices?.[0]?.message?.content || "";

      const explainable = buildExplainableResponse(aiText, dataset);
      return NextResponse.json({ response: aiText, explainable });
    } catch (sdkError) {
      console.error("z-ai-web-dev-sdk error, using fallback:", sdkError);
      const fallbackText = generateFallbackResponse(message, dataset);
      const explainable = buildExplainableResponse(fallbackText, dataset);
      return NextResponse.json({ response: fallbackText, explainable });
    }
  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 }
    );
  }
}

function buildExplainableResponse(content: string, dataset: any): ExplainableResponse {
  const firIds = content.match(/FIR-\d{4}-KA-\d{4}/g) ?? [];
  const uniqueIds = [...new Set(firIds)];
  const firs = dataset.firs || [];

  // ── Evidence chain ────────────────────────────────────────────────
  const evidenceChain = uniqueIds.map(id => {
    const fir = firs.find((f: any) => f.fir_id === id);
    return { firId: id, relevance: fir ? `${fir.crime_type} in ${fir.district} (${fir.date})` : "Referenced in analysis" };
  });

  // ── Multi-factor confidence scoring ───────────────────────────────
  const totalFirsInDB = Math.max(firs.length, 1);

  // Factor 1: Evidence density — unique FIR IDs cited (0-30 pts, scaled by total FIRs)
  const evidenceDensityRaw = Math.min(uniqueIds.length / totalFirsInDB, 1);
  const evidenceDensity = Math.min(30, Math.round(evidenceDensityRaw * 300 + uniqueIds.length * 6));

  // Factor 2: Specificity — contains specific data vs vague (0-20 pts)
  const specificityPatterns = [
    /\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4}/g,           // dates
    /₹[\d,.]+/g,                                    // INR amounts
    /A\d{3,4}/g,                                    // accused IDs
    /[A-Z][a-z]+ [A-Z][a-z]+/g,                    // proper names (2+ words)
    /\d+%/g,                                        // percentages
    /\b\d{2}:\d{2}\b/g,                             // times
  ];
  let specificityHits = 0;
  for (const pat of specificityPatterns) {
    const matches = content.match(pat);
    if (matches) specificityHits += Math.min(matches.length, 3);
  }
  const specificity = Math.min(20, Math.round(specificityHits * 3.3));

  // Factor 3: Reasoning depth — analytical patterns (0-20 pts)
  const reasoningPatterns = [
    /\b(compared?|compares|versus|vs\.?)\b/gi,
    /\b(therefore|consequently|because|due to|as a result)\b/gi,
    /\b(suggests?|indicates?|implies?|points to|reveals?)\b/gi,
    /\b(correlat|associat|linked?|connect)\w*\b/gi,
    /\b(increas|decreas|declin|rising|falling|trend)\w*\b/gi,
    /\b(pattern|modus|method|approach)\w*\b/gi,
    /\b(likely|unlikely|probability|probability)\b/gi,
  ];
  let reasoningHits = 0;
  for (const pat of reasoningPatterns) {
    const matches = content.match(pat);
    if (matches) reasoningHits += Math.min(matches.length, 2);
  }
  const reasoningDepth = Math.min(20, Math.round(reasoningHits * 3));

  // Factor 4: Source coverage — diversity of cited FIRs (0-15 pts)
  const citedFirs = uniqueIds
    .map(id => firs.find((f: any) => f.fir_id === id))
    .filter(Boolean);
  const uniqueCrimeTypes = new Set(citedFirs.map((f: any) => f.crime_type));
  const uniqueDistricts = new Set(citedFirs.map((f: any) => f.district));
  const sourceCoverage = Math.min(15, Math.round((uniqueCrimeTypes.size * 3) + (uniqueDistricts.size * 2)));

  // Factor 5: Quantification — numbers, percentages, rankings (0-15 pts)
  const quantPatterns = [
    /\d+/g,              // any number
    /\d+%/g,             // percentages
    /\b(top|rank|score|rate|ratio|count|total|sum)\b/gi,
  ];
  let quantHits = 0;
  for (const pat of quantPatterns) {
    const matches = content.match(pat);
    if (matches) quantHits += Math.min(matches.length, 3);
  }
  const quantification = Math.min(15, Math.round(quantHits * 2));

  // Composite confidence (0-100), capped at 96
  let confidence = evidenceDensity + specificity + reasoningDepth + sourceCoverage + quantification;
  if (uniqueIds.length === 0) confidence = Math.min(confidence, 25);
  confidence = Math.min(Math.max(confidence, 15), 96);

  // ── Improved reasoningSummary ─────────────────────────────────────
  const lines = content.split("\n").filter((l: string) => l.trim().length > 0);
  const analyticalKeywords = /\b(indicates?|suggests?|correlates?|%\s|increase|decrease|pattern|linked|reveals?|implies?|trend|associat|compared?|therefore|consequently|due to)\b/i;
  const analyticalLines = lines.filter((l: string) => analyticalKeywords.test(l));
  let reasoningSummary: string;
  if (analyticalLines.length > 0) {
    // Pick the longest analytical line as it's likely the most substantive
    reasoningSummary = analyticalLines.reduce((best, line) => line.length > best.length ? line : best, analyticalLines[0]).trim().slice(0, 250);
  } else {
    reasoningSummary = lines.slice(0, 2).join(" ").trim().slice(0, 250);
  }

  // ── Extract reasoningSteps ────────────────────────────────────────
  const reasoningStepPatterns = [
    /\b(suggests?|indicates?|reveals?|shows?|demonstrat\w*)\b[^.]*\./gi,
    /\b(therefore|consequently|as a result|this means)\b[^.]*\./gi,
    /\b(correlat|link|associat|connect)\w*\b[^.]*\./gi,
    /\b(increase|decrease|declin|rising|falling|trend)\w*\b[^.]*\./gi,
    /\b(pattern|modus|consistent)\w*\b[^.]*\./gi,
  ];
  const stepSet = new Set<string>();
  for (const pat of reasoningStepPatterns) {
    const matches = content.match(pat);
    if (matches) {
      for (const m of matches) {
        const cleaned = m.replace(/^[-•*]\s*/, "").trim().slice(0, 200);
        if (cleaned.length > 15) stepSet.add(cleaned);
      }
    }
  }
  const uniqueSteps = [...stepSet].slice(0, 5);
  const reasoningSteps: ReasoningStep[] = uniqueSteps.map((finding, i) => ({
    step: i + 1,
    finding,
    evidence: uniqueIds.length > 0
      ? uniqueIds.filter((_, idx) => idx % Math.max(1, Math.floor(uniqueIds.length / uniqueSteps.length)) === i).slice(0, 2)
      : [],
  }));

  // ── Alternative explanations ──────────────────────────────────────
  const alternatives: string[] = [];
  if (confidence < 70) {
    alternatives.push("Data may be incomplete — additional FIR records could change the analysis.");
    alternatives.push("Temporal patterns might be skewed due to limited dataset window.");
  }
  if (uniqueIds.length < 3) {
    alternatives.push("Low evidence count — conclusions should be verified with additional intelligence sources.");
  }

  return {
    content,
    evidenceChain,
    confidenceScore: confidence,
    reasoningSummary,
    reasoningSteps: reasoningSteps.length > 0 ? reasoningSteps : undefined,
    alternativeExplanations: alternatives.length > 0 ? alternatives : undefined,
  };
}

function generateFallbackResponse(
  message: string,
  dataset: any
): string {
  const lowerMsg = message.toLowerCase();
  const firs = dataset.firs || [];
  const accused = dataset.accused || [];
  const gangs = dataset.gangs || [];

  // Search the dataset for relevant info
  let response = "";

  if (lowerMsg.includes("chain snatching") || lowerMsg.includes("chain")) {
    const chainFirs = firs.filter((f: any) => f.crime_type === "Chain Snatching");
    response = `Based on the database, there are **${chainFirs.length} chain snatching cases** recorded.\n\n`;
    const byDistrict: Record<string, number> = {};
    chainFirs.forEach((f: any) => {
      byDistrict[f.district] = (byDistrict[f.district] || 0) + 1;
    });
    response += "**District breakdown:**\n";
    Object.entries(byDistrict)
      .sort(([, a], [, b]) => (b as number) - (a as number))
      .forEach(([d, c]) => {
        response += `• ${d}: ${c} cases\n`;
      });

    const involvedAccused = new Set<string>();
    chainFirs.forEach((f: any) => f.accused.forEach((a: string) => involvedAccused.add(a)));
    response += `\n**${involvedAccused.size} unique accused** involved across these cases.\n`;

    const gangIds = new Set(chainFirs.map((f: any) => f.gang_id).filter(Boolean));
    if (gangIds.size > 0) {
      response += `\n**Gang connection identified:** `;
      gangIds.forEach((gid) => {
        const gang = gangs.find((g: any) => g.id === gid);
        if (gang) response += `${gang.name} (${gid}) — Members: ${gang.members.join(", ")}. `;
      });
    }

    response += `\n\nEvidence sources: [${chainFirs.map((f: any) => f.fir_id).join(", ")}]`;
  } else if (lowerMsg.includes("silk city") || lowerMsg.includes("gang member") || lowerMsg.includes("members")) {
    const gang = gangs.find((g: any) => g.name.toLowerCase().includes("silk") || lowerMsg.includes("gang"));
    if (gang) {
      response = `**${gang.name}** (${gang.id})\n\n`;
      response += `• Type: ${gang.type}\n• Base: ${gang.base}\n\n`;
      response += `**Members:**\n`;
      gang.members.forEach((mid: string) => {
        const acc = accused.find((a: any) => a.id === mid);
        if (acc) response += `• ${acc.name} (${mid}) — Age: ${acc.age}, Risk: ${acc.risk}/100\n`;
      });
      const gangFirs = firs.filter((f: any) => f.gang_id === gang.id);
      response += `\nTotal FIRs linked: ${gangFirs.length}`;
      response += `\n\nEvidence sources: [${gangFirs.map((f: any) => f.fir_id).join(", ")}]`;
    } else {
      // List all gangs
      response = "**All Gang Networks in Database:**\n\n";
      gangs.forEach((g: any) => {
        response += `• **${g.name}** (${g.id}) — Type: ${g.type}, Base: ${g.base}, Members: ${g.members.length}\n`;
      });
      response += `\nEvidence sources: [${firs.map((f: any) => f.fir_id).slice(0, 5).join(", ")}]`;
    }
  } else if (lowerMsg.includes("risk") || lowerMsg.includes("highest")) {
    const sorted = [...accused].sort((a: any, b: any) => b.risk - a.risk);
    response = `**Top Risk Offenders:**\n\n`;
    sorted.slice(0, 5).forEach((a: any, i: number) => {
      const gang = gangs.find((g: any) => g.id === a.gang);
      response += `${i + 1}. **${a.name}** (${a.id}) — Risk: ${a.risk}/100, Prior FIRs: ${a.prior_firs}, Gang: ${gang ? gang.name : "None"}\n`;
    });
    response += `\nEvidence sources: [${firs.map((f: any) => f.fir_id).slice(0, 5).join(", ")}]`;
  } else if (lowerMsg.includes("vehicle") || lowerMsg.includes("theft")) {
    const vFirs = firs.filter((f: any) => f.crime_type === "Vehicle Theft");
    response = `There are **${vFirs.length} vehicle theft cases** in the database.\n\n`;
    const vehicles = new Set(vFirs.map((f: any) => f.vehicle_used).filter(Boolean));
    const vehicleDetails = dataset.vehicles || [];
    response += "**Vehicles used in thefts:**\n";
    vFirs.forEach((f: any) => {
      if (f.vehicle_used) {
        const v = vehicleDetails.find((ve: any) => ve.id === f.vehicle_used);
        response += `• ${v ? v.reg + " (" + v.make + ", " + v.color + ")" : f.vehicle_used} — [${f.fir_id}]\n`;
      }
    });
    response += `\n**Modus Operandi patterns:**\n`;
    const modiSet = new Set(vFirs.map((f: any) => f.modus_operandi));
    [...modiSet].forEach((m) => {
      response += `• ${m}\n`;
    });
    response += `\nEvidence sources: [${vFirs.map((f: any) => f.fir_id).join(", ")}]`;
  } else if (lowerMsg.includes("financial") || lowerMsg.includes("bank") || lowerMsg.includes("jewellery") || lowerMsg.includes("heist")) {
    const jFirs = firs.filter((f: any) => f.crime_type === "Jewellery Heist");
    response = `There are **${jFirs.length} jewellery heist cases** recorded.\n\n`;
    jFirs.forEach((f: any) => {
      response += `**${f.fir_id}** — ${f.date}, ${f.district}\n`;
      response += `  Status: ${f.investigation_status}\n`;
      response += `  Accused: ${f.accused.join(", ")}\n`;
      if (f.financial_transaction) {
        const acc = (dataset.bank_accounts || []).find((b: any) => b.id === f.financial_transaction.account);
        response += `  **Financial:** ₹${f.financial_transaction.amount_inr.toLocaleString("en-IN")} via ${f.financial_transaction.mode}`;
        if (acc) response += ` (${acc.bank}, ${acc.holder})`;
        response += `\n`;
      }
      response += `  Items: ${f.items_stolen.join(", ")}\n\n`;
    });
    response += `Evidence sources: [${jFirs.map((f: any) => f.fir_id).join(", ")}]`;
  } else if (lowerMsg.includes("pattern") || lowerMsg.includes("analysis")) {
    response = `**Crime Pattern Analysis Summary:**\n\n`;
    const crimeTypes: Record<string, number> = {};
    firs.forEach((f: any) => {
      crimeTypes[f.crime_type] = (crimeTypes[f.crime_type] || 0) + 1;
    });
    response += `**Crime Type Distribution:**\n`;
    Object.entries(crimeTypes).forEach(([t, c]) => {
      response += `• ${t}: ${c} cases\n`;
    });
    response += `\n**Time Patterns:**\n`;
    const times = { morning: 0, afternoon: 0, evening: 0, night: 0 };
    firs.forEach((f: any) => {
      const h = parseInt(f.time.split(":")[0]);
      if (h >= 6 && h < 12) times.morning++;
      else if (h >= 12 && h < 17) times.afternoon++;
      else if (h >= 17 && h < 21) times.evening++;
      else times.night++;
    });
    Object.entries(times).forEach(([t, c]) => {
      response += `• ${t}: ${c} cases\n`;
    });
    response += `\n**Gang Activity:**\n`;
    gangs.forEach((g: any) => {
      const count = firs.filter((f: any) => f.gang_id === g.id).length;
      response += `• ${g.name}: ${count} FIRs\n`;
    });
    response += `\nEvidence sources: [${firs.map((f: any) => f.fir_id).join(", ")}]`;
  } else {
    // General response
    response = `I found **${firs.length} FIR records**, **${accused.length} accused profiles**, and **${gangs.length} gang networks** in the database.\n\n`;
    response += `**Quick Summary:**\n`;
    const active = firs.filter((f: any) => f.investigation_status === "Under Investigation").length;
    const arrested = firs.filter((f: any) => f.investigation_status === "Arrested").length;
    response += `• Active investigations: ${active}\n• Arrested cases: ${arrested}\n• High-risk offenders (risk > 80): ${accused.filter((a: any) => a.risk > 80).length}\n\n`;
    response += `Ask me about specific crime types, gang members, patterns, financial links, or individual accused profiles.\n\n`;
    response += `Evidence sources: [${firs.slice(0, 5).map((f: any) => f.fir_id).join(", ")}]`;
  }

  return response;
}

