import { CustomersWorkspace } from "@/components/customers-workspace";
import { PageHeader, SetupNotice } from "@/components/ui";
import { customerTableHasAddressColumn } from "@/lib/customers-db";
import {
  getCustomerById,
  getCustomers,
  isSupabaseConfigured,
} from "@/lib/data";
import { createAdminClient } from "@/lib/supabase/admin";
import { canManageRecords } from "@/lib/permissions";
import { getActiveUser } from "@/lib/user-session";


export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; error?: string; edit?: string }>;
}) {
  const { success, error, edit } = await searchParams;

  if (!isSupabaseConfigured()) {
    return (
      <>
        <PageHeader title="Customers" />
        <SetupNotice />
      </>
    );
  }

  const supabase = createAdminClient();
  const [customers, activeUser, editing, hasAddressColumn] = await Promise.all([
    getCustomers(),
    getActiveUser(),
    edit ? getCustomerById(edit) : Promise.resolve(null),
    customerTableHasAddressColumn(supabase).catch(() => false),
  ]);

  const isAdmin = canManageRecords(activeUser);

  return (
    <>
      <PageHeader
        title="Customers"
        description="Manage customer records for sales and follow-up."
      />
      <CustomersWorkspace
        initialCustomers={customers}
        isAdmin={isAdmin}
        hasAddressColumn={hasAddressColumn}
        initialEditing={editing}
        initialSuccess={success}
        initialError={error}
      />
    </>
  );
}
