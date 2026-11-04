/** Staff route login PIN: exactly four digits. */
export const ROUTE_PIN_LENGTH = 4;

export const ROUTE_PIN_REGEX = /^\d{4}$/;

export function sanitizeRoutePinDigits(raw: string): string {
  return raw.replace(/\D/g, "").slice(0, ROUTE_PIN_LENGTH);
}
