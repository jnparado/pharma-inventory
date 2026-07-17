import Link from "next/link";
import { notFound } from "next/navigation";
import { PurchaseOrderView } from "@/components/purchase-order-view";
import { FlashMessage, PageHeader, SetupNotice } from "@/components/ui";
import { getPurchaseOrderById, isSupabaseConfigured } from "@/lib/data";

export default async function PurchaseOrderPrintPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ success?: string; error?: string }>;
}) {
  const { id } = await params;
  const { success, error } = await searchParams;

  if (!isSupabaseConfigured()) {
    return (
      <>
        <PageHeader title="Purchase Order" />
        <SetupNotice />
      </>
    );
  }

  const order = await getPurchaseOrderById(id);
  if (!order) notFound();

  return (
    <>
      <PageHeader
        title={order.po_number}
        description="Review and print this purchase order for your supplier."
      />
      <FlashMessage success={success} error={error} />
      <PurchaseOrderView order={order} />
      <p className="mx-auto mt-4 max-w-2xl text-center text-sm text-slate-500 print:hidden">
        After printing, return to{" "}
        <Link href="/orders" className="font-medium text-teal-600 hover:underline">
          Purchase Orders
        </Link>{" "}
        to approve or mark delivered.
      </p>
    </>
  );
}
