import { getGrokBaseUrl, getXaiApiKey, isAiConfigured } from "@/lib/env";

export { isAiConfigured };

type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

export async function chatCompletion(
  messages: ChatMessage[],
  options?: { temperature?: number; maxTokens?: number }
): Promise<string> {
  const apiKey = getXaiApiKey();
  if (!apiKey) throw new Error("XAI_API_KEY is not configured");

  const res = await fetch(`${getGrokBaseUrl()}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "grok-3-mini",
      messages,
      temperature: options?.temperature ?? 0.3,
      max_tokens: options?.maxTokens ?? 1024,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`AI request failed: ${err.slice(0, 200)}`);
  }

  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  return data.choices?.[0]?.message?.content?.trim() ?? "No response from AI.";
}

export async function enhanceForecastSummary(
  forecasts: { product_name: string; status: string; reason: string }[]
): Promise<string> {
  if (!isAiConfigured() || forecasts.length === 0) {
    return "Configure XAI_API_KEY for AI-powered insights.";
  }

  const top = forecasts.slice(0, 8);
  return chatCompletion([
    {
      role: "system",
      content:
        "You are a pharmacy inventory analyst. Give a brief 3-4 sentence summary with actionable reorder advice for the pharmacist.",
    },
    {
      role: "user",
      content: `Summarize these demand forecasts:\n${JSON.stringify(top)}`,
    },
  ]);
}

export async function parsePrescriptionText(text: string): Promise<string[]> {
  if (!isAiConfigured()) {
    return text
      .split(/[\n,;]+/)
      .map((s) => s.trim())
      .filter(Boolean);
  }

  const raw = await chatCompletion([
    {
      role: "system",
      content:
        'Extract medicine names from prescription text. Return ONLY a JSON array of strings, e.g. ["Amoxicillin 500mg","Paracetamol"]. No markdown.',
    },
    { role: "user", content: text },
  ]);

  try {
    const parsed = JSON.parse(raw.replace(/```json|```/g, "").trim());
    if (Array.isArray(parsed)) return parsed.map(String);
  } catch {
    /* fall through */
  }
  return text
    .split(/[\n,;]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}
