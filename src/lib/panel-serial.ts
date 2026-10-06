export function normalizePanelSerial(value: string): string {
  return value.trim().toUpperCase();
}

export function hasDuplicatePanelSerial(serial: string, existingSerials: readonly string[]): boolean {
  const normalized = normalizePanelSerial(serial);
  if (!normalized) return false;
  return existingSerials.some((existing) => normalizePanelSerial(existing) === normalized);
}
