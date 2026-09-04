import { Suspense } from "react";
import { ProductsPageContent } from "@/components/products-page-content";
import { ProductsLoadingSkeleton } from "@/components/page-loading";
import { isSupabaseConfigured } from "@/lib/data";
import { PageHeader, SetupNotice } from "@/components/ui";


export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; error?: string; edit?: string }>;
}) {
  const { success, error, edit } = await searchParams;
  const today = new Date().toISOString().slice(0, 10);

  if (!isSupabaseConfigured()) {
    return (
      <>
        <PageHeader title="Product" />
        <SetupNotice />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Product"
        description="Inventory register — date, product, supplier, brand, lot, expiry, quantity, UOM, cost, and wholesale/retail prices."
      />
      <Suspense fallback={<ProductsLoadingSkeleton />}>
        <ProductsPageContent
          success={success}
          error={error}
          edit={edit}
          today={today}
        />
      </Suspense>
    </>
  );
}
