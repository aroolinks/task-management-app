'use client';

import { useEffect, useState } from 'react';
import { parseMajorToMinor } from '@/lib/invoices/calculations';
import type { MinorUnit } from '@/types/invoice';

interface InvoiceCurrencyInputProps {
  id: string;
  valueMinor: MinorUnit;
  onChange: (valueMinor: MinorUnit) => void;
  className: string;
  describedBy?: string;
}

function minorToInputValue(valueMinor: MinorUnit): string {
  const sign = valueMinor < 0 ? '-' : '';
  const absolute = Math.abs(valueMinor);
  return `${sign}${Math.trunc(absolute / 100)}.${String(absolute % 100).padStart(2, '0')}`;
}

export default function InvoiceCurrencyInput({ id, valueMinor, onChange, className, describedBy }: InvoiceCurrencyInputProps) {
  const [displayValue, setDisplayValue] = useState(() => minorToInputValue(valueMinor));

  useEffect(() => {
    setDisplayValue(minorToInputValue(valueMinor));
  }, [valueMinor]);

  return (
    <div className="relative">
      <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-slate-500" aria-hidden="true">£</span>
      <input
        id={id}
        inputMode="decimal"
        value={displayValue}
        onChange={(event) => setDisplayValue(event.target.value)}
        onBlur={() => {
          const parsed = parseMajorToMinor(displayValue);
          if (parsed !== null && parsed >= 0) {
            onChange(parsed);
            setDisplayValue(minorToInputValue(parsed));
          } else {
            setDisplayValue(minorToInputValue(valueMinor));
          }
        }}
        aria-describedby={describedBy}
        className={`${className} pl-7`}
      />
    </div>
  );
}
