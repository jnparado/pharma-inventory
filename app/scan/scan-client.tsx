"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { quickScanStockOut } from "@/app/actions";
import { BarcodeScanner } from "@/components/barcode-scanner";
import {
  Badge,
  Card,
  FlashMessage,
  PageHeader,
  buttonClass,
  inputClass,
  labelClass,
} from "@/components/ui";
import { formatCurrency, formatDate } from "@/lib/utils";

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
  batches?: {
    batch_number: string;
    expiry_date: string;
    quantity_remaining: number;
  }[];
};

export function ScanClient() {
  const searchParams = useSearchParams();
  const [result, setResult] = useState<ScanResult | null>(null);
  const [lastCode, setLastCode] = useState("");

  function handleScan(code: string, data: ScanResult) {
    setLastCode(code);
    setResult(data);
  }

  return (
    <>
      <PageHeader
        title="Barcode / QR Scanner"
        description="Scan a barcode with your phone camera for instant product lookup, batch verification, and quick checkout."
      />
      <FlashMessage
        success={searchParams.get("success") ?? undefined}
        error={searchParams.get("error") ?? undefined}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Scan product">
          <BarcodeScanner onScan={handleScan} />
        </Card>

        <Card title="Scan result">
          {!result?.found ? (
            <p className="py-8 text-center text-sm text-slate-400">
              {lastCode
                ? `No product found for “${lastCode}”.`
                : "Scan a barcode or enter a SKU to begin."}
            </p>
          ) : (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-800">
                  {result.product!.product_name}
                </h3>
                <p className="text-sm text-slate-500">
                  SKU: {result.product!.sku} · Stock:{" "}
                  {result.product!.total_stock}{" "}
                  {result.product!.unit ?? "pcs"} ·{" "}
                  {formatCurrency(result.product!.selling_price)}
                </p>
              </div>

              {result.batches && result.batches.length > 0 && (
                <div>
                  <p className="mb-2 text-xs font-medium uppercase text-slate-400">
                    Batch verification (FIFO order)
                  </p>
                  <ul className="space-y-1 text-sm">
                    {result.batches.map((b) => (
                      <li
                        key={b.batch_number}
                        className="flex justify-between rounded-lg bg-slate-50 px-3 py-2"
                      >
                        <span className="font-mono text-xs">{b.batch_number}</span>
                        <span>
                          {b.quantity_remaining} · exp{" "}
                          {formatDate(b.expiry_date)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <form action={quickScanStockOut} className="flex items-end gap-3">
                <input type="hidden" name="code" value={lastCode} />
                <div className="flex-1">
                  <label className={labelClass} htmlFor="qty">
                    Quick checkout qty
                  </label>
                  <input
                    id="qty"
                    name="quantity"
                    type="number"
                    min={1}
                    defaultValue={1}
                    className={inputClass}
                  />
                </div>
                <button type="submit" className={buttonClass}>
                  Dispense (FIFO)
                </button>
              </form>

              {result.product!.total_stock === 0 && (
                <Badge tone="danger">Out of stock</Badge>
              )}
            </div>
          )}
        </Card>
      </div>
    </>
  );
}
