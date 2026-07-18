import { SuppliersWorkspace } from "@/components/suppliers-workspace";
import { PageHeader, SetupNotice } from "@/components/ui";
import {
  getSupplierById,
  getSuppliers,
  isSupabaseConfigured,
} from "@/lib/data";
import { canManageRecords } from "@/lib/permissions";
import { getActiveUser } from "@/lib/user-session";

export default async function SuppliersPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; error?: string; edit?: string }>;
}) {
  const { success, error, edit } = await searchParams;

  if (!isSupabaseConfigured()) {
    return (
      <>
        <PageHeader title="Suppliers" />
        <SetupNotice />
      </>
    );
  }

  const [suppliers, activeUser, editing] = await Promise.all([
    getSuppliers(),
    getActiveUser(),
    edit ? getSupplierById(edit) : Promise.resolve(null),
  ]);

  const isAdmin = canManageRecords(activeUser);

  return (
    <>
      <PageHeader
        title="Suppliers"
        description="Distributors and wholesalers you receive stock from."
      />
      <SuppliersWorkspace
        initialSuppliers={suppliers}
        isAdmin={isAdmin}
        initialEditing={editing}
        initialSuccess={success}
        initialError={error}
      />
    </>
  );
}
