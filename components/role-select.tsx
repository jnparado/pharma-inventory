import { USER_ROLES } from "@/lib/permissions";
import { inputClass } from "@/components/ui";

export function RoleSelect({
  name = "role",
  id = "role",
  defaultValue,
  required = true,
}: {
  name?: string;
  id?: string;
  defaultValue?: string;
  required?: boolean;
}) {
  const labels: Record<string, string> = {
    admin: "Admin",
    manager: "Manager",
    pharmacist: "Pharmacist",
    cashier: "Cashier",
  };

  return (
    <select
      id={id}
      name={name}
      required={required}
      defaultValue={defaultValue}
      className={inputClass}
    >
      {USER_ROLES.map((role) => (
        <option key={role} value={role}>
          {labels[role] ?? role}
        </option>
      ))}
    </select>
  );
}
