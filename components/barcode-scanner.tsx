"use client";

import { Html5Qrcode } from "html5-qrcode";
import { useEffect, useRef, useState } from "react";
import { buttonClass, inputClass, labelClass } from "@/components/ui";

type ScanResult = {
  found: boolean;
  product?: {
    id: string;
    product_name: string;
    sku: string;
    total_stock: number;
    unit: string | null;
    selling_price: number;
  };
  batches?: { batch_number: string; expiry_date: string; quantity_remaining: number }[];
  error?: string;
};

export function BarcodeScanner({
  onScan,
}: {
  onScan: (code: string, result: ScanResult) => void;
}) {
  const [scanning, setScanning] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const lastCode = useRef("");

  useEffect(() => {
    return () => {
      scannerRef.current?.stop().catch(() => {});
    };
  }, []);

  async function lookup(code: string) {
    const res = await fetch(`/api/scan?code=${encodeURIComponent(code)}`);
    const data = (await res.json()) as ScanResult & { error?: string };
    onScan(code, data);
    return data;
  }

  async function startScanner() {
    setScanning(true);
    const scanner = new Html5Qrcode("barcode-reader");
    scannerRef.current = scanner;
    try {
      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 150 } },
        async (decoded) => {
          if (decoded === lastCode.current) return;
          lastCode.current = decoded;
          await lookup(decoded);
          await scanner.stop();
          scannerRef.current = null;
          setScanning(false);
        },
        () => {}
      );
    } catch {
      setScanning(false);
    }
  }

  async function stopScanner() {
    await scannerRef.current?.stop().catch(() => {});
    scannerRef.current = null;
    setScanning(false);
  }

  return (
    <div className="space-y-4">
      <div
        id="barcode-reader"
        className={`overflow-hidden rounded-xl border border-slate-200 bg-black ${scanning ? "block" : "hidden"}`}
      />
      <div className="flex flex-wrap gap-2">
        {!scanning ? (
          <button type="button" onClick={startScanner} className={buttonClass}>
            Open camera scanner
          </button>
        ) : (
          <button
            type="button"
            onClick={stopScanner}
            className="rounded-lg bg-slate-600 px-4 py-2 text-sm font-medium text-white"
          >
            Stop scanner
          </button>
        )}
      </div>
      <div>
        <label className={labelClass} htmlFor="manual-code">
          Or enter barcode / SKU manually
        </label>
        <div className="flex gap-2">
          <input
            id="manual-code"
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value)}
            placeholder="Scan or type barcode…"
            className={inputClass}
          />
          <button
            type="button"
            className={buttonClass}
            onClick={() => manualCode && lookup(manualCode)}
          >
            Lookup
          </button>
        </div>
      </div>
    </div>
  );
}
