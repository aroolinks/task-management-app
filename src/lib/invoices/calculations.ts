import type { InvoiceDiscount, InvoiceLineItem, InvoiceTotals, MinorUnit } from '@/types/invoice';

const MINOR_UNITS_PER_MAJOR = 100;
const BASIS_POINTS_PER_PERCENT = 100;
const BASIS_POINTS_PER_WHOLE = 10_000;

function assertSafeInteger(value: number, field: string): void {
  if (!Number.isSafeInteger(value)) {
    throw new Error(`${field} must be a safe integer`);
  }
}

function assertNonNegativeInteger(value: number, field: string): void {
  assertSafeInteger(value, field);
  if (value < 0) throw new Error(`${field} must be non-negative`);
}

function sumSafe(values: number[], field: string): number {
  const total = values.reduce((sum, value) => sum + value, 0);
  assertSafeInteger(total, field);
  return total;
}

function roundedRatio(value: number, numerator: number, denominator: number): number {
  assertSafeInteger(value, 'value');
  assertSafeInteger(numerator, 'numerator');
  assertSafeInteger(denominator, 'denominator');
  if (denominator <= 0) throw new Error('denominator must be positive');

  const product = BigInt(value) * BigInt(numerator);
  const divisor = BigInt(denominator);
  return Number((product + divisor / BigInt(2)) / divisor);
}

/** Parses a user-entered GBP value exactly, without floating-point currency arithmetic. */
export function parseMajorToMinor(input: string): MinorUnit | null {
  const normalized = input.trim().replace(/[,£\s]/g, '');
  if (!normalized) return 0;
  const match = normalized.match(/^(-?)(\d+)(?:\.(\d{0,2}))?$/);
  if (!match) return null;

  const [, sign, whole, fraction = ''] = match;
  const minor = Number(whole) * MINOR_UNITS_PER_MAJOR + Number(fraction.padEnd(2, '0'));
  if (!Number.isSafeInteger(minor)) return null;
  return sign === '-' ? -minor : minor;
}

export function formatMinor(minor: MinorUnit, currency = 'GBP'): string {
  assertSafeInteger(minor, 'minor');
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(minor / MINOR_UNITS_PER_MAJOR);
}

export function formatBasisPoints(basisPoints: number): string {
  assertSafeInteger(basisPoints, 'basisPoints');
  const whole = Math.trunc(basisPoints / BASIS_POINTS_PER_PERCENT);
  const fraction = Math.abs(basisPoints % BASIS_POINTS_PER_PERCENT);
  return fraction === 0 ? `${whole}%` : `${whole}.${String(fraction).padStart(2, '0').replace(/0$/, '')}%`;
}

export function percentageToBasisPoints(input: string): number | null {
  const normalized = input.trim().replace('%', '');
  if (!normalized) return 0;
  const match = normalized.match(/^(\d+)(?:\.(\d{0,2}))?$/);
  if (!match) return null;
  const basisPoints = Number(match[1]) * BASIS_POINTS_PER_PERCENT + Number((match[2] || '').padEnd(2, '0'));
  return basisPoints <= BASIS_POINTS_PER_WHOLE ? basisPoints : null;
}

export function calculateInvoice(
  items: InvoiceLineItem[],
  discount: InvoiceDiscount,
  amountPaidMinor: MinorUnit,
): InvoiceTotals {
  assertNonNegativeInteger(amountPaidMinor, 'amountPaidMinor');
  assertNonNegativeInteger(discount.value, 'discount.value');
  if (discount.type === 'percentage' && discount.value > BASIS_POINTS_PER_WHOLE) {
    throw new Error('percentage discount cannot exceed 100%');
  }

  const baseLines = items.map((item) => {
    assertNonNegativeInteger(item.quantity, 'quantity');
    assertNonNegativeInteger(item.unitPriceMinor, 'unitPriceMinor');
    assertNonNegativeInteger(item.vatRateBasisPoints, 'vatRateBasisPoints');
    const baseNetMinor = item.quantity * item.unitPriceMinor;
    assertSafeInteger(baseNetMinor, 'line net amount');
    return { ...item, baseNetMinor };
  });
  const subtotalMinor = sumSafe(baseLines.map((line) => line.baseNetMinor), 'subtotalMinor');

  let discountMinor = 0;
  if (discount.type === 'fixed') {
    discountMinor = Math.min(discount.value, subtotalMinor);
  } else if (discount.type === 'percentage') {
    discountMinor = roundedRatio(subtotalMinor, discount.value, BASIS_POINTS_PER_WHOLE);
  }

  let remainingDiscount = discountMinor;
  const lines = baseLines.map((line, index) => {
    const isLast = index === baseLines.length - 1;
    const proposedDiscount = isLast
      ? remainingDiscount
      : subtotalMinor === 0
        ? 0
        : roundedRatio(discountMinor, line.baseNetMinor, subtotalMinor);
    const allocatedDiscount = Math.min(remainingDiscount, line.baseNetMinor, proposedDiscount);
    remainingDiscount -= allocatedDiscount;
    const netMinor = Math.max(0, line.baseNetMinor - allocatedDiscount);
    const vatMinor = roundedRatio(netMinor, line.vatRateBasisPoints, BASIS_POINTS_PER_WHOLE);
    return {
      id: line.id,
      description: line.description,
      quantity: line.quantity,
      unitPriceMinor: line.unitPriceMinor,
      vatRateBasisPoints: line.vatRateBasisPoints,
      netMinor,
      vatMinor,
      grossMinor: netMinor + vatMinor,
    };
  });

  const netMinor = sumSafe(lines.map((line) => line.netMinor), 'netMinor');
  const vatMinor = sumSafe(lines.map((line) => line.vatMinor), 'vatMinor');
  const totalMinor = netMinor + vatMinor;
  assertSafeInteger(totalMinor, 'totalMinor');

  return {
    lines,
    subtotalMinor,
    discountMinor,
    netMinor,
    vatMinor,
    totalMinor,
    amountPaidMinor,
    amountDueMinor: Math.max(0, totalMinor - amountPaidMinor),
  };
}
