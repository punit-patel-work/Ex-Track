export function formatCurrency(amount: number | string, currencyCode: string = 'USD'): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount
  if (isNaN(num)) return '$0.00'
  
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num)
  } catch (e) {
    // Fallback if currency code is invalid
    return '$' + num.toFixed(2)
  }
}

export function getCurrencySymbol(currencyCode: string = 'USD'): string {
  try {
    const formatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })
    const parts = formatter.formatToParts(0)
    const symbolPart = parts.find(part => part.type === 'currency')
    return symbolPart ? symbolPart.value : '$'
  } catch (e) {
    return '$'
  }
}
