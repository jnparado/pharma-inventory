import { ChatAssistant } from "@/components/chat-assistant";
import { isAiConfigured } from "@/lib/env";
import { isSupabaseConfigured } from "@/lib/data";
import { Card, PageHeader, SetupNotice } from "@/components/ui";

export default function AssistantPage() {
  const supabaseOk = isSupabaseConfigured();
  const aiOk = isAiConfigured();

  return (
    <>
      <PageHeader
        title="AI Assistant"
        description='Ask questions like "Which medicines expire next month?", "What is current stock of antibiotics?", or "Which supplier offers cheapest insulin?"'
      />

      {!supabaseOk ? (
        <SetupNotice />
      ) : !aiOk ? (
        <Card title="AI not configured">
          <p className="text-sm text-slate-600">
            Add <code className="rounded bg-slate-100 px-1">XAI_API_KEY</code> to
            your environment variables (local <code>.env.local</code> or Vercel
            dashboard) to enable the pharmacist chatbot powered by Grok.
          </p>
        </Card>
      ) : (
        <ChatAssistant />
      )}
    </>
  );
}
