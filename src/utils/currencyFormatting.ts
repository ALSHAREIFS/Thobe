export type ShopCurrency = 'SAR' | 'YER';

export function getCurrencySymbol(currency?: string | ShopCurrency): string {
  if (currency === 'YER') return 'ر.ي';
  return 'ر.س'; // Default fallback to SAR
}

export function formatCurrency(amount: number | undefined | null, currency?: string | ShopCurrency): string {
  const safeAmount = typeof amount === 'number' && !isNaN(amount) ? amount : 0;
  // Format numbers nicely, optional: safeAmount.toLocaleString() but let's keep it simple to match existing style
  return `${safeAmount} ${getCurrencySymbol(currency)}`;
}
