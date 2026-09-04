import { inputClass, labelClass } from "@/components/ui";
import { PRODUCT_UOM_OPTIONS, normalizeProductUom } from "@/lib/utils";

type UomSelectProps = {
  id: string;
  name?: string;
  label?: string;
  required?: boolean;
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
};

export function UomSelect({
  id,
  name = "unit",
  label = "UOM",
  required,
  value,
  defaultValue,
  onChange,
  placeholder = "Select UOM…",
}: UomSelectProps) {
  const normalized = normalizeProductUom(value ?? defaultValue) ?? "pcs";
  const isControlled = value !== undefined;

  return (
    <div>
      <label className={labelClass} htmlFor={id}>
        {label}{" "}
        {required ? <span className="text-red-500">*</span> : null}
      </label>
      <select
        id={id}
        name={name}
        required={required}
        {...(isControlled
          ? { value: normalized, onChange: (e) => onChange?.(e.target.value) }
          : { defaultValue: normalized })}
        className={inputClass}
      >
        {!required && !isControlled && !defaultValue ? (
          <option value="" disabled>
            {placeholder}
          </option>
        ) : null}
        {PRODUCT_UOM_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.value}
          </option>
        ))}
      </select>
    </div>
  );
}
