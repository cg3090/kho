import { MockDatabase } from '../db/mockDb';

/**
 * Generates sequential, date-based voucher codes for ERP (PN, PX, BG, PT, PC).
 * Format: [CONFIG_PREFIX]-[YYMMDD]-[SEQUENTIAL_NUM_CONFIG_DIGITS]
 * Example: PN-260626-0001
 */
export function generateVoucherCode(
  prefix: 'PN' | 'PX' | 'BG' | 'PT' | 'PC',
  dateStr: string,
  db: MockDatabase
): string {
  // Parse dateStr (expected format: YYYY-MM-DD)
  const parts = dateStr.split('-');
  if (parts.length !== 3) {
    return `${prefix}-260626-0001`; // Fallback
  }
  const year = parts[0].substring(2); // last 2 digits, e.g. "26"
  const month = parts[1]; // e.g. "06"
  const day = parts[2]; // e.g. "26"
  
  const yyMmDd = `${year}${month}${day}`;

  // Find sequence configuration from database
  const seqConf = db.sequenceConfig?.find((s) => s.type === prefix);
  const actualPrefix = seqConf?.prefix || prefix;
  const digits = seqConf?.digits || 4;
  
  // By default, we use the custom absolute auto-increment sequence number
  let seq = seqConf?.currentNumber || 1;

  const seqStr = String(seq).padStart(digits, '0');
  return `${actualPrefix}-${yyMmDd}-${seqStr}`;
}

