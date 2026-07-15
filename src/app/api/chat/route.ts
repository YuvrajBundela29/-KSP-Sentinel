import { NextRequest, NextResponse } from "next/server";
import { execFile } from "child_process";
import { writeFileSync, readFileSync, unlinkSync, existsSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { randomUUID } from "crypto";
import type { CrimeDataset, ExplainableResponse, ReasoningStep } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

/** Call the z-ai CLI chat tool and return the AI response text */
async function callLocalLLM(systemPrompt: string, userPrompt: string): Promise<string | null> {
  const outPath = join(tmpdir(), `ksp-llm-${randomUUID().slice(0, 8)}.json`);
  try {
    await new Promise<void>((resolve, reject) => {
      const child = execFile(
        "z-ai",
        ["chat", "--prompt", userPrompt, "--system", systemPrompt, "--output", outPath],
        { timeout: 30000, env: { ...process.env, Z_AI_SKIP_BANNER: "1" } },
        (err) => (err ? reject(err) : resolve())
      );
      // Suppress CLI output
      child.stdout?.on("data", () => {});
      child.stderr?.on("data", () => {});
    });

    if (!existsSync(outPath)) return null;
    const raw = readFileSync(outPath, "utf-8");
    const parsed = JSON.parse(raw);
    return parsed?.choices?.[0]?.message?.content || null;
  } catch (e) {
    console.error("[LLM] z-ai chat error:", e);
    return null;
  } finally {
    try { unlinkSync(outPath); } catch {}
  }
}

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
5. Always end with: "Evidence sources: [list FIR IDs used]"
6. Never invent data not in the database.
7. If asked for a risk score, look up the accused profile risk field.
8. Be concise and analytical. Use bullet points for lists.
9. Format your responses with **bold** for key terms and proper line breaks.
10. For identity questions (who are you), introduce yourself as KSP Sentinel.
11. For questions about totals, sums, or financials, calculate exact numbers from the data.
12. Always provide specific, data-driven answers — never give vague or generic responses.

DATABASE:
${JSON.stringify(dataset, null, 2)}`;

    // Build a combined user prompt from history + current message
    let userPrompt = message;
    if (history && Array.isArray(history) && history.length > 0) {
      const recentHistory = history.slice(-6); // Keep last 6 messages for context
      const historyText = recentHistory
        .map((m: any) => `${m.role === "assistant" ? "KSP Sentinel" : "User"}: ${m.content}`)
        .join("\n");
      userPrompt = `Previous conversation:\n${historyText}\n\nCurrent question: ${message}`;
    }

    // ── Primary: Call local LLM via z-ai CLI ──────────────────────
    const aiText = await callLocalLLM(systemPrompt, userPrompt);
    if (aiText && aiText.trim().length > 10) {
      const explainable = buildExplainableResponse(aiText, dataset);
      return NextResponse.json({ response: aiText, explainable });
    }

    // ── Fallback: rule-based intelligence response ───────────────────
    console.warn("[Chat] LLM returned empty/short, using rule-based fallback");
    const fallbackText = generateFallbackResponse(message, dataset);
    const explainable = buildExplainableResponse(fallbackText, dataset);
    return NextResponse.json({ response: fallbackText, explainable });
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
  const lowerMsg = message.toLowerCase().trim();
  const firs = dataset.firs || [];
  const accused = dataset.accused || [];
  const gangs = dataset.gangs || [];
  const vehicles = dataset.vehicles || [];
  const bankAccounts = dataset.bank_accounts || [];

  // ── Helper: fuzzy match name against accused list ──────────────────
  function findAccusedByName(query: string) {
    const q = query.replace(/[?.!,'""]/g, "").trim().toLowerCase();
    if (q.length < 2) return [];
    // Exact substring match
    let matches = accused.filter((a: any) => a.name.toLowerCase().includes(q));
    // Also try matching individual words
    if (matches.length === 0) {
      const words = q.split(/\s+/).filter(w => w.length > 2);
      if (words.length > 0) {
        matches = accused.filter((a: any) => words.some(w => a.name.toLowerCase().includes(w)));
      }
    }
    return matches;
  }

  // ── Helper: extract FIR IDs from message ───────────────────────────
  function extractFirIds(msg: string): string[] {
    const pattern = /fir[-\s]?(\d{4})[-\s]?ka[-\s]?(\d{4})/gi;
    const found: string[] = [];
    let match;
    while ((match = pattern.exec(msg)) !== null) {
      const normalized = `FIR-${match[1]}-KA-${match[2]}`;
      if (firs.some((f: any) => f.fir_id === normalized)) {
        found.push(normalized);
      }
    }
    return found;
  }

  // ── 1. FIR-specific lookup ─────────────────────────────────────────
  const firIds = extractFirIds(message);
  if (firIds.length > 0) {
    let response = "";
    firIds.forEach((fid) => {
      const fir = firs.find((f: any) => f.fir_id === fid);
      if (!fir) return;
      response += `**${fir.fir_id}**\n\n`;
      response += `• **Crime Type:** ${fir.crime_type}\n`;
      response += `• **District:** ${fir.district}\n`;
      response += `• **Date:** ${fir.date} at ${fir.time}\n`;
      response += `• **Status:** ${fir.investigation_status}\n`;
      response += `• **Priority:** ${fir.priority}\n`;
      response += `• **Modus Operandi:** ${fir.modus_operandi}\n`;

      if (fir.accused && fir.accused.length > 0) {
        response += `\n**Accused (${fir.accused.length}):**\n`;
        fir.accused.forEach((aid: string) => {
          const acc = accused.find((a: any) => a.id === aid);
          if (acc) {
            const gang = gangs.find((g: any) => g.id === acc.gang);
            response += `• **${acc.name}** (${aid}) — Age: ${acc.age}, Risk: ${acc.risk}/100${gang ? `, Gang: ${gang.name}` : ""}\n`;
          } else {
            response += `• ${aid}\n`;
          }
        });
      }

      if (fir.vehicle_used) {
        const v = vehicles.find((ve: any) => ve.id === fir.vehicle_used);
        response += `\n**Vehicle:** ${v ? v.reg + " (" + v.make + ", " + v.color + ")" : fir.vehicle_used}\n`;
      }

      if (fir.gang_id) {
        const gang = gangs.find((g: any) => g.id === fir.gang_id);
        response += `**Gang Link:** ${gang ? gang.name + " (" + gang.type + ", Base: " + gang.base + ")" : fir.gang_id}\n`;
      }

      if (fir.items_stolen && fir.items_stolen.length > 0) {
        response += `**Items Stolen:** ${fir.items_stolen.join(", ")}\n`;
      }

      if (fir.financial_transaction) {
        const acc = bankAccounts.find((b: any) => b.id === fir.financial_transaction.account);
        response += `\n**Financial Trail:** ₹${fir.financial_transaction.amount_inr.toLocaleString("en-IN")} via ${fir.financial_transaction.mode}`;
        if (acc) response += ` → ${acc.bank} (${acc.holder})`;
        response += `\n`;
      }

      response += "\n";
    });
    response += `Evidence sources: [${firIds.join(", ")}]`;
    return response;
  }

  // ── 2. Identity / greeting queries (who are you, what can you do, help, hello, hi) ─
  if (/^(who are you|what are you|what can you do|how do you work|tell me about yourself|your name|introduce yourself|help|hello|hi |hey|good morning|good evening|good afternoon)\b/i.test(lowerMsg) || lowerMsg === "hi" || lowerMsg === "hey" || lowerMsg === "hello") {
    return `**KSP Sentinel — AI Crime Intelligence Copilot**

I am an AI-powered crime analysis assistant built for the **Karnataka State Police**. I analyze FIR records, accused profiles, gang networks, financial trails, and vehicle data to help investigators find patterns and connections.

**What I can do:**
• Look up any FIR by ID and show full details
• Find accused persons by name and show their criminal history
• Analyze crime patterns across districts and time periods
• Track gang networks and member connections
• Calculate total stolen amounts and financial trails
• Identify high-risk offenders and repeat offenders
• Show vehicle theft patterns and linked cases
• Provide statistical breakdowns by crime type, district, or status

**Database currently contains:**
• **${firs.length}** FIR records
• **${accused.length}** accused profiles
• **${gangs.length}** gang networks
• **${vehicles.length}** tracked vehicles
• **${bankAccounts.length}** monitored bank accounts

Just ask me anything about the crime data and I'll find the answers.`;
  }

  // ── 3. Name/person lookup ──────────────────────────────────────────
  if (lowerMsg.includes("who is") || lowerMsg.includes("who are") || lowerMsg.includes("tell me about") || lowerMsg.includes("details of") || lowerMsg.includes("profile of") || lowerMsg.includes("find ")) {
    const nameMatches = findAccusedByName(message);
    if (nameMatches.length > 0) {
      let response = "";
      nameMatches.slice(0, 3).forEach((acc: any) => {
        const gang = gangs.find((g: any) => g.id === acc.gang);
        const linkedFirs = firs.filter((f: any) => f.accused.includes(acc.id));
        response += `**${acc.name}** (${acc.id})\n\n`;
        response += `• **Age:** ${acc.age}\n`;
        response += `• **Gender:** ${acc.gender || "Unknown"}\n`;
        response += `• **Risk Score:** ${acc.risk}/100\n`;
        response += `• **Prior FIRs:** ${acc.prior_firs}\n`;
        response += `• **Gang:** ${gang ? gang.name + " (" + gang.type + ")" : "None / Unknown"}\n`;
        if (gang) response += `• **Gang Base:** ${gang.base}\n`;
        response += `• **Linked Cases:** ${linkedFirs.length}\n`;
        if (linkedFirs.length > 0) {
          response += `\n**Cases involved:**\n`;
          linkedFirs.forEach((f: any) => {
            response += `• ${f.fir_id} — ${f.crime_type}, ${f.district} (${f.date})\n`;
          });
        }
        response += "\n";
      });
      if (nameMatches.length > 3) {
        response += `*...and ${nameMatches.length - 3} more matches. Ask for more details.*\n\n`;
      }
      const allFirIds = nameMatches.flatMap((a: any) => firs.filter((f: any) => f.accused.includes(a.id)).map((f: any) => f.fir_id));
      response += `Evidence sources: [${[...new Set(allFirIds)].slice(0, 8).join(", ")}]`;
      return response;
    }
  }

  // ── 4. Financial aggregate queries (total cash, total stolen, how much) ─────
  if (/how much|total (cash|money|amount|stolen|loss|value)|sum of|calculate.*stolen|overall.*financial|all.*money/i.test(lowerMsg)) {
    // Calculate from financial_transaction field
    let totalFinancial = 0;
    const finFirs: any[] = [];
    firs.forEach((f: any) => {
      if (f.financial_transaction) {
        totalFinancial += f.financial_transaction.amount_inr;
        finFirs.push(f);
      }
    });

    // Extract cash amounts from items_stolen text
    let totalCashExtracted = 0;
    const cashFirs: any[] = [];
    firs.forEach((f: any) => {
      if (f.items_stolen) {
        f.items_stolen.forEach((item: string) => {
          const cashMatch = item.match(/Rs\.?\s*([\d,]+)/i);
          if (cashMatch) {
            const val = parseInt(cashMatch[1].replace(/,/g, ""), 10);
            if (!isNaN(val) && val > 0) {
              totalCashExtracted += val;
              if (!cashFirs.find((c: any) => c.fir_id === f.fir_id)) cashFirs.push(f);
            }
          }
        });
      }
    });

    // Estimate gold value from items_stolen
    let totalGoldEstimate = 0;
    const goldFirs: any[] = [];
    firs.forEach((f: any) => {
      if (f.items_stolen) {
        f.items_stolen.forEach((item: string) => {
          const goldMatch = item.match(/gold.*?(\d+(?:\.\d+)?)\s*(?:g|grams?|kg)/i);
          if (goldMatch) {
            let grams = parseFloat(goldMatch[1]);
            if (item.toLowerCase().includes("kg")) grams *= 1000;
            const estValue = Math.round(grams * 6500); // ~₹6,500/g estimated
            totalGoldEstimate += estValue;
            if (!goldFirs.find((g: any) => g.fir_id === f.fir_id)) goldFirs.push(f);
          }
        });
      }
    });

    // Vehicle theft value estimate
    let vehicleFirs = firs.filter((f: any) => f.crime_type === "Vehicle Theft");
    let vehicleEstimate = vehicleFirs.length * 800000; // ~₹8L average

    const grandTotal = totalFinancial + totalCashExtracted + totalGoldEstimate + vehicleEstimate;

    let response = `**Total Financial Impact Analysis:**

`;
    response += `• **Bank/Wire Fraud (traced):** ₹${totalFinancial.toLocaleString("en-IN")} across ${finFirs.length} cases
`;
    if (totalCashExtracted > 0) {
      response += `• **Cash stolen (from FIR descriptions):** ₹${totalCashExtracted.toLocaleString("en-IN")} across ${cashFirs.length} cases
`;
    }
    if (totalGoldEstimate > 0) {
      response += `• **Gold/jewellery (estimated at ~₹6,500/g):** ~₹${totalGoldEstimate.toLocaleString("en-IN")} across ${goldFirs.length} cases
`;
    }
    if (vehicleFirs.length > 0) {
      response += `• **Vehicle thefts (${vehicleFirs.length} cases, est. ~₹8L each):** ~₹${vehicleEstimate.toLocaleString("en-IN")}
`;
    }
    response += `
**Estimated Grand Total Loss: ₹${grandTotal.toLocaleString("en-IN")}**
`;

    if (finFirs.length > 0) {
      response += `
**Largest financial transactions:**
`;
      finFirs.sort((a: any, b: any) => (b.financial_transaction?.amount_inr || 0) - (a.financial_transaction?.amount_inr || 0)).slice(0, 5).forEach((f: any) => {
        response += `• ${f.fir_id} — ₹${f.financial_transaction.amount_inr.toLocaleString("en-IN")} via ${f.financial_transaction.mode} (${f.crime_type}, ${f.district})
`;
      });
    }

    const allCited = [...new Set([...finFirs, ...cashFirs, ...goldFirs, ...vehicleFirs].map((f: any) => f.fir_id))];
    response += `\nEvidence sources: [${allCited.join(", ")}]`;
    return response;
  }

  // ── 5. "How many" / counting queries ───────────────────────────────
  if (lowerMsg.includes("how many") || lowerMsg.includes("count") || lowerMsg.includes("total number") || lowerMsg.includes("number of")) {
    let response = `**Database Statistics:**\n\n`;
    response += `• **Total FIRs:** ${firs.length}\n`;
    response += `• **Total Accused:** ${accused.length}\n`;
    response += `• **Total Gangs:** ${gangs.length}\n`;
    response += `• **Total Vehicles tracked:** ${vehicles.length}\n`;
    response += `• **Bank Accounts monitored:** ${bankAccounts.length}\n`;

    const crimeTypes: Record<string, number> = {};
    firs.forEach((f: any) => { crimeTypes[f.crime_type] = (crimeTypes[f.crime_type] || 0) + 1; });
    response += `\n**By Crime Type:**\n`;
    Object.entries(crimeTypes).sort(([, a], [, b]) => (b as number) - (a as number)).forEach(([t, c]) => {
      response += `• ${t}: ${c}\n`;
    });

    // If asking about names/people specifically
    if (lowerMsg.includes("name") || lowerMsg.includes("people") || lowerMsg.includes("person") || lowerMsg.includes("accused") || lowerMsg.includes("involved")) {
      const allNames = new Set<string>();
      firs.forEach((f: any) => f.accused.forEach((a: string) => allNames.add(a)));
      response += `\n**Unique accused persons involved across all FIRs:** ${allNames.size}\n`;
      response += `\n**All accused names:**\n`;
      accused.forEach((a: any) => {
        const gang = gangs.find((g: any) => g.id === a.gang);
        response += `• ${a.name} (${a.id})${gang ? " — " + gang.name : ""}\n`;
      });
    }

    // If asking about a specific district
    const districts = ["mysuru", "bengaluru", "mangaluru", "shivamogga", "hubli", "dharwad", "belagavi", "kalaburagi"];
    const mentionedDistrict = districts.find(d => lowerMsg.includes(d));
    if (mentionedDistrict) {
      const dFirs = firs.filter((f: any) => f.district.toLowerCase().includes(mentionedDistrict));
      response += `\n**Cases in ${mentionedDistrict.charAt(0).toUpperCase() + mentionedDistrict.slice(1)}:** ${dFirs.length}\n`;
      if (dFirs.length > 0) {
        dFirs.forEach((f: any) => {
          response += `• ${f.fir_id} — ${f.crime_type} (${f.date})\n`;
        });
      }
    }

    response += `\nEvidence sources: [${firs.slice(0, 5).map((f: any) => f.fir_id).join(", ")}]`;
    return response;
  }

  // ── 6. District-specific queries ───────────────────────────────────
  const allDistricts = [...new Set(firs.map((f: any) => f.district))];
  const mentionedDistrict2 = allDistricts.find((d: string) => lowerMsg.includes(d.toLowerCase().split(" ")[0]));
  if (mentionedDistrict2 && !lowerMsg.includes("chain snatching") && !lowerMsg.includes("vehicle") && !lowerMsg.includes("theft")) {
    const dFirs = firs.filter((f: any) => f.district === mentionedDistrict2);
    const dAccused = new Set<string>();
    dFirs.forEach((f: any) => f.accused.forEach((a: string) => dAccused.add(a)));
    const dGangs = new Set(dFirs.map((f: any) => f.gang_id).filter(Boolean));

    let response = `**${mentionedDistrict2} — Crime Overview**\n\n`;
    response += `• **Total cases:** ${dFirs.length}\n`;
    response += `• **Unique accused:** ${dAccused.size}\n`;
    response += `• **Gangs active:** ${dGangs.size}\n`;

    const crimeTypes: Record<string, number> = {};
    dFirs.forEach((f: any) => { crimeTypes[f.crime_type] = (crimeTypes[f.crime_type] || 0) + 1; });
    response += `\n**Crime breakdown:**\n`;
    Object.entries(crimeTypes).sort(([, a], [, b]) => (b as number) - (a as number)).forEach(([t, c]) => {
      response += `• ${t}: ${c}\n`;
    });

    response += `\n**Recent cases:**\n`;
    dFirs.slice(0, 5).forEach((f: any) => {
      response += `• ${f.fir_id} — ${f.crime_type}, Status: ${f.investigation_status} (${f.date})\n`;
    });

    if (dGangs.size > 0) {
      response += `\n**Active gangs:**\n`;
      dGangs.forEach((gid) => {
        const gang = gangs.find((g: any) => g.id === gid);
        if (gang) response += `• ${gang.name} (${gang.type}, Members: ${gang.members.length})\n`;
      });
    }

    response += `\nEvidence sources: [${dFirs.map((f: any) => f.fir_id).join(", ")}]`;
    return response;
  }

  // ── 7. Gang queries ────────────────────────────────────────────────
  if (lowerMsg.includes("gang")) {
    // Try to find a specific gang by name
    const matchedGang = gangs.find((g: any) => lowerMsg.includes(g.name.toLowerCase().split(" ")[0].toLowerCase()));
    if (matchedGang) {
      const gangFirs = firs.filter((f: any) => f.gang_id === matchedGang.id);
      let response = `**${matchedGang.name}** (${matchedGang.id})\n\n`;
      response += `• **Type:** ${matchedGang.type}\n• **Base:** ${matchedGang.base}\n\n`;
      response += `**Members (${matchedGang.members.length}):**\n`;
      matchedGang.members.forEach((mid: string) => {
        const acc = accused.find((a: any) => a.id === mid);
        if (acc) response += `• **${acc.name}** (${mid}) — Age: ${acc.age}, Risk: ${acc.risk}/100\n`;
      });
      response += `\n**Linked FIRs (${gangFirs.length}):**\n`;
      gangFirs.forEach((f: any) => {
        response += `• ${f.fir_id} — ${f.crime_type}, ${f.district} (${f.date})\n`;
      });
      const totalStolen = gangFirs.reduce((sum: number, f: any) => sum + (f.financial_transaction?.amount_inr || 0), 0);
      if (totalStolen > 0) response += `\n**Total financial trail:** ₹${totalStolen.toLocaleString("en-IN")}\n`;
      response += `\nEvidence sources: [${gangFirs.map((f: any) => f.fir_id).join(", ")}]`;
      return response;
    }

    // List all gangs
    let response = "**All Gang Networks in Database:**\n\n";
    gangs.forEach((g: any) => {
      const gangFirs = firs.filter((f: any) => f.gang_id === g.id);
      response += `• **${g.name}** (${g.id}) — Type: ${g.type}, Base: ${g.base}, Members: ${g.members.length}, FIRs: ${gangFirs.length}\n`;
      response += `  Members: ${g.members.map((m: string) => { const a = accused.find((x: any) => x.id === m); return a ? a.name : m; }).join(", ")}\n`;
    });
    response += `\nEvidence sources: [${firs.map((f: any) => f.fir_id).slice(0, 5).join(", ")}]`;
    return response;
  }

  // ── 8. Chain snatching ─────────────────────────────────────────────
  if (lowerMsg.includes("chain snatching") || lowerMsg.includes("chain")) {
    const chainFirs = firs.filter((f: any) => f.crime_type === "Chain Snatching");
    let response = `Based on the database, there are **${chainFirs.length} chain snatching cases** recorded.\n\n`;
    const byDistrict: Record<string, number> = {};
    chainFirs.forEach((f: any) => { byDistrict[f.district] = (byDistrict[f.district] || 0) + 1; });
    response += "**District breakdown:**\n";
    Object.entries(byDistrict).sort(([, a], [, b]) => (b as number) - (a as number)).forEach(([d, c]) => {
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
    // If district mentioned, filter
    const districts2 = ["mysuru", "bengaluru", "mangaluru", "shivamogga"];
    const menDist = districts2.find(d => lowerMsg.includes(d));
    if (menDist) {
      const distFirs = chainFirs.filter((f: any) => f.district.toLowerCase().includes(menDist));
      response = `**Chain Snatching in ${menDist.charAt(0).toUpperCase() + menDist.slice(1)}:** ${distFirs.length} cases\n\n`;
      distFirs.forEach((f: any) => {
        response += `• ${f.fir_id} — ${f.date}, Status: ${f.investigation_status}\n`;
        response += `  Accused: ${f.accused.map((a: string) => { const x = accused.find((y: any) => y.id === a); return x ? x.name : a; }).join(", ")}\n`;
      });
      response += `\nEvidence sources: [${distFirs.map((f: any) => f.fir_id).join(", ")}]`;
      return response;
    }
    response += `\n\nEvidence sources: [${chainFirs.map((f: any) => f.fir_id).join(", ")}]`;
    return response;
  }

  // ── 9. Risk / dangerous offenders ──────────────────────────────────
  if (lowerMsg.includes("risk") || lowerMsg.includes("dangerous") || lowerMsg.includes("most wanted") || lowerMsg.includes("top offender") || lowerMsg.includes("highest")) {
    const sorted = [...accused].sort((a: any, b: any) => b.risk - a.risk);
    let response = `**Top Risk Offenders:**\n\n`;
    sorted.slice(0, 5).forEach((a: any, i: number) => {
      const gang = gangs.find((g: any) => g.id === a.gang);
      const linkedFirs = firs.filter((f: any) => f.accused.includes(a.id));
      response += `${i + 1}. **${a.name}** (${a.id}) — Risk: ${a.risk}/100, Prior FIRs: ${a.prior_firs}, Gang: ${gang ? gang.name : "None"}, Active cases: ${linkedFirs.length}\n`;
    });
    response += `\nEvidence sources: [${firs.map((f: any) => f.fir_id).slice(0, 5).join(", ")}]`;
    return response;
  }

  // ── 10. Vehicle / theft ─────────────────────────────────────────────
  if (lowerMsg.includes("vehicle") || lowerMsg.includes("theft")) {
    const vFirs = firs.filter((f: any) => f.crime_type === "Vehicle Theft");
    let response = `There are **${vFirs.length} vehicle theft cases** in the database.\n\n`;
    response += "**Vehicles used in thefts:**\n";
    vFirs.forEach((f: any) => {
      if (f.vehicle_used) {
        const v = vehicles.find((ve: any) => ve.id === f.vehicle_used);
        response += `• ${v ? v.reg + " (" + v.make + ", " + v.color + ")" : f.vehicle_used} — [${f.fir_id}]\n`;
      }
    });
    response += `\n**Modus Operandi patterns:**\n`;
    const modiSet = new Set(vFirs.map((f: any) => f.modus_operandi));
    [...modiSet].forEach((m) => { response += `• ${m}\n`; });
    response += `\nEvidence sources: [${vFirs.map((f: any) => f.fir_id).join(", ")}]`;
    return response;
  }

  // ── 11. Financial / jewellery / heist / cyber fraud ─────────────────
  if (lowerMsg.includes("financial") || lowerMsg.includes("bank") || lowerMsg.includes("money") || lowerMsg.includes("transaction") || lowerMsg.includes("jewellery") || lowerMsg.includes("heist") || lowerMsg.includes("cyber") || lowerMsg.includes("fraud")) {
    const crimeKeywords = lowerMsg.includes("cyber") || lowerMsg.includes("fraud") ? "Cyber Fraud" : lowerMsg.includes("jewellery") || lowerMsg.includes("heist") ? "Jewellery Heist" : null;
    const relevantFirs = crimeKeywords ? firs.filter((f: any) => f.crime_type === crimeKeywords) : firs.filter((f: any) => f.financial_transaction || f.crime_type === "Jewellery Heist");
    let response = `There are **${relevantFirs.length} ${crimeKeywords || "financial-related"} cases** recorded.\n\n`;
    relevantFirs.forEach((f: any) => {
      response += `**${f.fir_id}** — ${f.crime_type}, ${f.district} (${f.date})\n`;
      response += `  Status: ${f.investigation_status}\n`;
      response += `  Accused: ${f.accused.map((a: string) => { const x = accused.find((y: any) => y.id === a); return x ? x.name : a; }).join(", ")}\n`;
      if (f.financial_transaction) {
        const acc = bankAccounts.find((b: any) => b.id === f.financial_transaction.account);
        response += `  **Financial:** ₹${f.financial_transaction.amount_inr.toLocaleString("en-IN")} via ${f.financial_transaction.mode}`;
        if (acc) response += ` → ${acc.bank} (${acc.holder})`;
        response += `\n`;
      }
      if (f.items_stolen && f.items_stolen.length > 0) response += `  Items: ${f.items_stolen.join(", ")}\n`;
      response += "\n";
    });
    response += `Evidence sources: [${relevantFirs.map((f: any) => f.fir_id).join(", ")}]`;
    return response;
  }

  // ── 12. Pattern / analysis / summary / statistics ──────────────────
  if (lowerMsg.includes("pattern") || lowerMsg.includes("analysis") || lowerMsg.includes("summary") || lowerMsg.includes("statistics") || lowerMsg.includes("overview") || lowerMsg.includes("trend")) {
    let response = `**Crime Pattern Analysis Summary:**\n\n`;
    const crimeTypes: Record<string, number> = {};
    firs.forEach((f: any) => { crimeTypes[f.crime_type] = (crimeTypes[f.crime_type] || 0) + 1; });
    response += `**Crime Type Distribution:**\n`;
    Object.entries(crimeTypes).sort(([, a], [, b]) => (b as number) - (a as number)).forEach(([t, c]) => {
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
    Object.entries(times).forEach(([t, c]) => { response += `• ${t}: ${c} cases\n`; });
    response += `\n**District Heatmap:**\n`;
    const byDist: Record<string, number> = {};
    firs.forEach((f: any) => { byDist[f.district] = (byDist[f.district] || 0) + 1; });
    Object.entries(byDist).sort(([, a], [, b]) => (b as number) - (a as number)).forEach(([d, c]) => {
      response += `• ${d}: ${c} cases\n`;
    });
    response += `\n**Gang Activity:**\n`;
    gangs.forEach((g: any) => {
      const count = firs.filter((f: any) => f.gang_id === g.id).length;
      response += `• ${g.name}: ${count} FIRs, ${g.members.length} members\n`;
    });
    const active = firs.filter((f: any) => f.investigation_status === "Under Investigation").length;
    const arrested = firs.filter((f: any) => f.investigation_status === "Arrested").length;
    const closed = firs.filter((f: any) => f.investigation_status === "Closed").length;
    response += `\n**Case Status:**\n• Under Investigation: ${active}\n• Arrested: ${arrested}\n• Closed: ${closed}\n`;
    response += `\nEvidence sources: [${firs.map((f: any) => f.fir_id).join(", ")}]`;
    return response;
  }

  // ── 13. Status queries (open, closed, arrested, pending) ───────────
  if (lowerMsg.includes("open") || lowerMsg.includes("closed") || lowerMsg.includes("arrested") || lowerMsg.includes("pending") || lowerMsg.includes("under investigation") || lowerMsg.includes("unsolved") || lowerMsg.includes("solved")) {
    const statusMap: Record<string, string> = {
      "open": "Under Investigation", "under investigation": "Under Investigation",
      "pending": "Under Investigation", "unsolved": "Under Investigation",
      "arrested": "Arrested", "solved": "Arrested",
      "closed": "Closed",
    };
    let matchedStatus: string | null = null;
    for (const [key, val] of Object.entries(statusMap)) {
      if (lowerMsg.includes(key)) { matchedStatus = val; break; }
    }
    if (matchedStatus) {
      const sfirs = firs.filter((f: any) => f.investigation_status === matchedStatus);
      let response = `**${matchedStatus} Cases (${sfirs.length}):**\n\n`;
      sfirs.forEach((f: any) => {
        response += `• ${f.fir_id} — ${f.crime_type}, ${f.district} (${f.date})\n`;
      });
      response += `\nEvidence sources: [${sfirs.map((f: any) => f.fir_id).join(", ")}]`;
      return response;
    }
  }

  // ── 14. Smart fuzzy fallback — try to match anything useful ────────
  // Try matching any accused name anywhere in the message
  const anyNameMatch = findAccusedByName(message);
  if (anyNameMatch.length > 0) {
    const acc = anyNameMatch[0];
    const gang = gangs.find((g: any) => g.id === acc.gang);
    const linkedFirs = firs.filter((f: any) => f.accused.includes(acc.id));
    let response = `**${acc.name}** (${acc.id})\n\n`;
    response += `• **Age:** ${acc.age}\n• **Risk Score:** ${acc.risk}/100\n• **Prior FIRs:** ${acc.prior_firs}\n`;
    response += `• **Gang:** ${gang ? gang.name + " (" + gang.type + ")" : "None"}\n`;
    response += `• **Linked Cases:** ${linkedFirs.length}\n`;
    if (linkedFirs.length > 0) {
      response += `\n**Cases:**\n`;
      linkedFirs.forEach((f: any) => { response += `• ${f.fir_id} — ${f.crime_type}, ${f.district}\n`; });
    }
    response += `\nEvidence sources: [${linkedFirs.map((f: any) => f.fir_id).join(", ")}]`;
    return response;
  }

  // ── 15. Final generic response ─────────────────────────────────────
  const active = firs.filter((f: any) => f.investigation_status === "Under Investigation").length;
  const arrested = firs.filter((f: any) => f.investigation_status === "Arrested").length;
  let response = `I found **${firs.length} FIR records**, **${accused.length} accused profiles**, and **${gangs.length} gang networks** in the database.\n\n`;
  response += `**Quick Summary:**\n`;
  response += `• Active investigations: ${active}\n• Arrested cases: ${arrested}\n• High-risk offenders (risk > 80): ${accused.filter((a: any) => a.risk > 80).length}\n\n`;
  response += `**You can ask me about:**\n`;
  response += `• Specific FIRs (e.g. "Tell me about FIR-2024-KA-0001")\n`;
  response += `• People (e.g. "Who is Vikram Singh?")\n`;
  response += `• Crime types (e.g. "Show chain snatching cases in Mysuru")\n`;
  response += `• Gang networks (e.g. "Tell me about Silk City Gang")\n`;
  response += `• Patterns (e.g. "Crime pattern analysis")\n`;
  response += `• Statistics (e.g. "How many cases in Bengaluru?")\n`;
  response += `• Risk scores (e.g. "Top risk offenders")\n`;
  response += `• Financial trails (e.g. "Show financial transactions")\n\n`;
  response += `Evidence sources: [${firs.slice(0, 5).map((f: any) => f.fir_id).join(", ")}]`;
  return response;
}

