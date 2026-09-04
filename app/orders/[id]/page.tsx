import { redirect } from "next/navigation";

/** PO detail/print view removed — send old links back to the orders list. */
export default function PurchaseOrderDetailPage() {
  redirect("/orders");
}
