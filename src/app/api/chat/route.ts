import { NextRequest, NextResponse } from "next/server";

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
1. Always cite which FIR IDs support your answers. Format: [FIR-2024-KA-0023]
2. When you identify a gang connection, name the gang and list member accused IDs.
3. When asked about patterns, look for: same vehicle, same modus_operandi, same gang_id, same time patterns.
4. Answer in the same language the user writes in. If they write in Kannada, reply in Kannada.
5. Always end with: 'Evidence sources: [list FIR IDs used]'
6. Never invent data not in the database.
7. If asked for a risk score, look up the accused profile risk field.
8. Be concise and analytical. Use bullet points for lists.

DATABASE:
${JSON.stringify(dataset, null, 2)}`;

    // Build messages array for Claude API format
    const messages = [
      { role: "user", content: systemPrompt },
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
      const { createLlmChatCompletion } = await import("z-ai-web-dev-sdk");
      const response = await createLlmChatCompletion({
        messages: messages.map((m: { role: string; content: string }) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        })),
        model: "claude-sonnet-4-6",
      });

      const aiText =
        typeof response === "string"
          ? response
          : response?.choices?.[0]?.message?.content ||
            response?.content?.[0]?.text ||
            JSON.stringify(response);

      return NextResponse.json({ response: aiText });
    } catch (sdkError) {
      console.error("z-ai-web-dev-sdk error, using fallback:", sdkError);
      // Fallback: generate a response based on the dataset analysis
      return NextResponse.json({
        response: generateFallbackResponse(message, dataset),
      });
    }
  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 }
    );
  }
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

export const runtime = "nodejs";
export const maxDuration = 30;