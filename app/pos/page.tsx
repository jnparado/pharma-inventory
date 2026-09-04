import { PosTerminal } from "@/components/pos-terminal";
import { PageHeader, SetupNotice } from "@/components/ui";
import { getProductsWithStock, isSupabaseConfigured } from "@/lib/data";



export default async function PosPage() {
  if (!isSupabaseConfigured()) {
    return (
      <>
        <PageHeader title="Point of Sale" />
        <SetupNotice />
      </>
    );
  }

  const products = await getProductsWithStock();

  return (
    <>
      <PageHeader
        title="Point of Sale"
        description="Quick checkout for walk-in customers. Stock is deducted automatically using FIFO."
      />
      <PosTerminal products={products} />
    </>
  );
}
