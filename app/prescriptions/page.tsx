"use client";

import { useState } from "react";
import type { PrescriptionMatch } from "@/lib/types";
import {
  Badge,
  Card,
  PageHeader,
  buttonClass,
  inputClass,
  labelClass,
} from "@/components/ui";

export default function PrescriptionsPage() {
  const [text, setText] = useState(
    "Amoxicillin 500mg — 1 capsule 3x daily for 7 days\nIbuprofen 200mg — as needed for pain"
  );
  const [doctor, setDoctor] = useState("");
  const [matches, setMatches] = useState<PrescriptionMatch[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState("");

  async function validate() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/prescription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMatches(data.matches);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Prescription Validation"
        description="Upload or paste a prescription. AI reads medicine names, checks inventory, and suggests alternatives if unavailable."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Prescription input">
          <div className="space-y-4">
            <div>
              <label className={labelClass} htmlFor="doctor">
                Doctor name
              </label>
              <input
                id="doctor"
                value={doctor}
                onChange={(e) => setDoctor(e.target.value)}
                placeholder="Dr. Santos"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="rx-text">
                Prescription text
              </label>
              <textarea
                id="rx-text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={8}
                className={inputClass}
                placeholder="Paste prescription medicines…"
              />
            </div>
            <button
              type="button"
              onClick={validate}
              disabled={loading}
              className={buttonClass}
            >
              {loading ? "Checking inventory…" : "Validate prescription"}
            </button>
            {error && <p className="text-sm text-red-600">{error}</p>}
            {success && (
              <p className="text-sm text-teal-700">{success}</p>
            )}

            <div className="border-t border-slate-100 pt-4">
              <button
                type="button"
                disabled={saving || !text.trim()}
                onClick={async () => {
                  setSaving(true);
                  setError(null);
                  setSuccess("");
                  try {
                    const res = await fetch("/api/prescriptions", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        prescription_text: text,
                        doctor_name: doctor,
                      }),
                    });
                    const data = (await res.json()) as {
                      error?: string;
                      message?: string;
                    };
                    if (!res.ok) throw new Error(data.error);
                    setSuccess(data.message ?? "Prescription saved");
                  } catch (e) {
                    setError((e as Error).message);
                  } finally {
                    setSaving(false);
                  }
                }}
                className="text-sm font-medium text-slate-600 hover:underline disabled:opacity-50"
              >
                {saving ? "Saving…" : "Save prescription record"}
              </button>
            </div>
          </div>
        </Card>

        <Card title="Inventory check & alternatives">
          {matches.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400">
              Run validation to check stock and generic alternatives.
            </p>
          ) : (
            <ul className="space-y-4">
              {matches.map((m) => (
                <li
                  key={m.medicine}
                  className="rounded-lg border border-slate-100 p-4"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium text-slate-800">{m.medicine}</p>
                    <Badge tone={m.in_stock ? "success" : "danger"}>
                      {m.in_stock ? `${m.available_qty} in stock` : "Unavailable"}
                    </Badge>
                  </div>
                  {m.product_name && (
                    <p className="mt-1 text-sm text-slate-600">
                      Matched: {m.product_name}
                    </p>
                  )}
                  {m.alternatives.length > 0 && (
                    <div className="mt-2">
                      <p className="text-xs font-medium text-slate-400">
                        Suggested alternatives
                      </p>
                      <ul className="mt-1 text-sm text-teal-700">
                        {m.alternatives.map((alt) => (
                          <li key={alt}>• {alt}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
