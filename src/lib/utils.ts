
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Utility to normalize decimal input (accepts only comma)
export function normalizeDecimalInput(value: string): number {
  if (!value || value === '') return 0;
  
  // Replace comma with dot for calculation
  const normalizedValue = value.toString().replace(',', '.');
  const parsedValue = parseFloat(normalizedValue);
  
  return isNaN(parsedValue) ? 0 : parsedValue;
}

// Format number with comma as decimal separator
export function formatDecimal(value: number | string | undefined): string {
  const num = typeof value === 'number' ? value : parseFloat(String(value || '0'));
  return isNaN(num) ? '0,00' : num.toFixed(2).replace('.', ',');
}
