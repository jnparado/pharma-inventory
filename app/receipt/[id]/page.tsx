import Link from "next/link";
import { ReceiptView } from "@/components/receipt-view";
import { FlashMessage, PageHeader, SetupNotice } from "@/components/ui";
import { getSaleById, isSupabaseConfigured } from "@/lib/data";

export default async function ReceiptPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ success?: string }>;
}) {
  const { id } = await params;
  const { success } = await searchParams;

  if (!isSupabaseConfigured()) {
    return (
      <>
        <PageHeader title="Receipt" />
        <SetupNotice />
      </>
    );
  }

  const sale = await getSaleById(id);

  if (!sale) {
    return (
      <>
        <PageHeader title="Receipt not found" />
        <p className="text-sm text-slate-600">
          This receipt does not exist.{" "}
          <Link href="/reports" className="text-blue-600 hover:underline">
            Back to reports
          </Link>
        </p>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Official Receipt"
        description="Sales invoice converted to receipt (OR)."
      />
      <FlashMessage success={success} />
      <ReceiptView sale={sale} showActions />
    </>
  );
}
