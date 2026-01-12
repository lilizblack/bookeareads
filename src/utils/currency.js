/**
 * Formats a number as a currency string.
 * @param {number} amount - The amount to format.
 * @param {string} [currency='USD'] - The currency code (e.g., 'USD', 'EUR').
 * @param {string} [locale='en-US'] - The locale for formatting.
 * @returns {string} The formatted currency string.
 */
export const formatCurrency = (amount, currency = 'USD', locale = 'en-US') => {
    return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: currency,
    }).format(amount || 0);
};

/**
 * Returns the currency symbol for a given currency code.
 * @param {string} [currency='USD'] - The currency code.
 * @param {string} [locale='en-US'] - The locale.
 * @returns {string} The currency symbol.
 */
export const getCurrencySymbol = (currency = 'USD', locale = 'en-US') => {
    return (0).toLocaleString(locale, {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).replace(/\d/g, '').trim();
};
