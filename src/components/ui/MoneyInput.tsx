"use client";

import { useState } from "react";

const rupiah = (value: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);

export function MoneyInput({
  name,
  defaultValue,
  max,
  readOnly = false,
  required = true,
  placeholder = "Masukkan nominal",
  className = "",
}: {
  name: string;
  defaultValue?: number;
  max?: number;
  readOnly?: boolean;
  required?: boolean;
  placeholder?: string;
  className?: string;
}) {
  const [value, setValue] = useState(defaultValue ?? 0);
  const exceeds = max !== undefined && value > max;
  return (
    <div>
      <input
        name={name}
        type="number"
        min="1"
        max={max}
        value={value || ""}
        onChange={(event) => setValue(Number(event.target.value))}
        readOnly={readOnly}
        required={required}
        placeholder={placeholder}
        className={className}
      />
      <span
        aria-live="polite"
        className={`mt-2 block rounded-lg px-3 py-2 text-sm font-bold ${exceeds ? "bg-red-50 text-red-700" : "bg-blue-50 text-blue-700"}`}
      >
        {value > 0 ? rupiah(value) : "Rp 0"}
        {exceeds ? " · melebihi batas" : ""}
      </span>
    </div>
  );
}
