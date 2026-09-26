/**
 * Security helper for Admin PIN hashing and verification.
 * Uses the Web Crypto API (SHA-256) to ensure PINs are stored hashed, not in plain text.
 */

export async function hashPin(pin: string): Promise<string> {
  const cleanPin = pin.trim();
  if (!cleanPin) return "";
  
  if (typeof crypto !== "undefined" && crypto.subtle) {
    const encoder = new TextEncoder();
    const data = encoder.encode(`d2l_pin_salt_2026_${cleanPin}`);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  }
  
  // Fallback simple deterministic hash if crypto.subtle is unavailable
  let hash = 0;
  for (let i = 0; i < cleanPin.length; i++) {
    const char = cleanPin.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return `hash_${Math.abs(hash)}`;
}

export async function verifyPin(enteredPin: string, storedPinOrHash?: string): Promise<boolean> {
  if (!storedPinOrHash || !enteredPin) return false;
  const cleanEntered = enteredPin.trim();
  const cleanStored = storedPinOrHash.trim();

  // If already hashed
  const enteredHash = await hashPin(cleanEntered);
  if (enteredHash === cleanStored) return true;

  // If stored in plain text legacy format (e.g. '2026' or '1234')
  if (cleanEntered === cleanStored) return true;

  return false;
}
