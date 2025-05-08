
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Utility to normalize decimal input (accepts both comma and dot)
export function normalizeDecimalInput(value: string): number {
  // Replace comma with dot for calculation
  const normalizedValue = value.replace(',', '.');
  return parseFloat(normalizedValue) || 0;
}
