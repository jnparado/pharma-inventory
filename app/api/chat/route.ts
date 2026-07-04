import { NextResponse } from "next/server";
import { chatCompletion, isAiConfigured } from "@/lib/ai";
import { buildInventoryContext } from "@/lib/inventory-context";
import { isSupabaseConfigured } from "@/lib/env";

export async function POST(req: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "Supabase is not configured" },
      { status: 503 }
    );
  }
  if (!isAiConfigured()) {
    return NextResponse.json(
      { error: "Add XAI_API_KEY to enable the AI assistant" },
      { status: 503 }
    );
  }

  const { message, history = [] } = (await req.json()) as {
    message: string;
    history?: { role: "user" | "assistant"; content: string }[];
  };

  if (!message?.trim()) {
    return NextResponse.json({ error: "Message required" }, { status: 400 });
  }

  try {
    const context = await buildInventoryContext();
    const reply = await chatCompletion([
      {
        role: "system",
        content: `You are PharmaStock AI, a helpful assistant for pharmacists. Answer questions about inventory, expiry, stock levels, suppliers, and reorders using this live data:\n${context}\nBe concise and practical. Use PHP currency when mentioning prices.`,
      },
      ...history.slice(-6).map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
      { role: "user", content: message },
    ]);

    return NextResponse.json({ reply });
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message },
      { status: 500 }
    );
  }
}
