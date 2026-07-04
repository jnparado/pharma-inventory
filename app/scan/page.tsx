import { Suspense } from "react";
import { ScanClient } from "./scan-client";

export default function ScanPage() {
  return (
    <Suspense>
      <ScanClient />
    </Suspense>
  );
}
