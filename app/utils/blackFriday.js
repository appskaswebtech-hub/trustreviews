
// app/utils/blackFriday.js
// Black Friday sale configuration — active only during the specified sale period.

// Sale dates: November 23 to November 30, every year.
// To change the sale dates, simply update the values below.
const SALE_START_MONTH = 10; // November (0-indexed: Jan=0 ... Nov=10 ... Dec=11)
const SALE_START_DAY   = 23; // Sale starts on November 23
const SALE_END_MONTH   = 10; // November
const SALE_END_DAY     = 30; // Sale ends on November 30

export const BLACK_FRIDAY = {
  originalPrice: 9.99,
  salePrice: 4.99,
  label: "🖤 Black Friday Deal",
  badge: "BLACK FRIDAY — 50% OFF",
};

/**
 * Checks whether the Black Friday sale is currently active.
 * Works on both server-side and client-side environments.
 */
export function isBlackFridaySale() {
  const now = new Date();
  const year = now.getFullYear();

  const start = new Date(year, SALE_START_MONTH, SALE_START_DAY, 0, 0, 0);
  const end = new Date(year, SALE_END_MONTH, SALE_END_DAY, 23, 59, 59);

  return now >= start && now <= end;
}
