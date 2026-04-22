/**
 * Israeli ID (Teudat Zehut) Validation
 * Uses the Luhn algorithm variant specific to Israeli IDs
 * 
 * The algorithm:
 * 1. Pad the ID to 9 digits with leading zeros
 * 2. Multiply each digit by 1 or 2 alternately (starting with 1)
 * 3. If the result > 9, sum the digits (e.g., 12 -> 1+2=3)
 * 4. Sum all results
 * 5. Valid if the total is divisible by 10
 */

export function validateIsraeliId(id: string): boolean {
  // Remove any non-digit characters
  const cleanId = id.replace(/\D/g, '');
  
  // Must be between 5-9 digits
  if (cleanId.length < 5 || cleanId.length > 9) {
    return false;
  }
  
  // Pad to 9 digits with leading zeros
  const paddedId = cleanId.padStart(9, '0');
  
  let sum = 0;
  
  for (let i = 0; i < 9; i++) {
    const digit = parseInt(paddedId.charAt(i), 10);
    
    // Multiply by 1 for odd positions (0, 2, 4...), by 2 for even positions (1, 3, 5...)
    const multiplier = (i % 2) + 1;
    let product = digit * multiplier;
    
    // If product > 9, sum its digits (equivalent to product - 9 for products 10-18)
    if (product > 9) {
      product = product - 9;
    }
    
    sum += product;
  }
  
  // Valid if sum is divisible by 10
  return sum % 10 === 0;
}

/**
 * Format Israeli ID with leading zeros removed for display
 */
export function formatIsraeliId(id: string): string {
  const cleanId = id.replace(/\D/g, '');
  // Remove leading zeros but keep at least one digit
  return cleanId.replace(/^0+/, '') || '0';
}
