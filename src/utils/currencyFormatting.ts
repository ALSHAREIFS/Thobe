export type ShopCurrency = 'SAR' | 'YER';

export function getCurrencySymbol(currency?: string | ShopCurrency): string {
  if (currency === 'YER') return 'ر.ي';
  return 'ر.س'; // Default fallback to SAR
}

export function formatCurrency(amount: number | undefined | null, currency?: string | ShopCurrency): string {
  const safeAmount = typeof amount === 'number' && !isNaN(amount) ? amount : 0;
  // Format numbers nicely, optional: safeAmount.toLocaleString() but let's keep it simple to match existing style
  const numStr = safeAmount.toLocaleString('en-US', { minimumFractionDigits: Number.isInteger(safeAmount) ? 0 : 2, maximumFractionDigits: 2 });
  // Use LRM/RLM marks or just return formatted string. 
  // ‏ is Right-To-Left Mark, ‪ is Left-To-Right Embedding.
  // Using LRM (\u200E) ensures the number and currency are displayed left-to-right visually
  return `\u200E${numStr} ${getCurrencySymbol(currency)}\u200E`;
}
