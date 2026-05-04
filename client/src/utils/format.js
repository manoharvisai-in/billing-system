/**
 * Shared formatting utilities for currency, dates, and display values.
 */

/** Format a number as Indian Rupees */
export const formatCurrency = (amount) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);

/** Format a date as readable locale string */
export const formatDate = (date, opts = {}) =>
  new Date(date).toLocaleString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
    ...opts,
  });

/** Format just the time */
export const formatTime = (date) =>
  new Date(date).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

/** Human-readable time ago */
export const timeAgo = (date) => {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1)  return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
};

/** Status badge class mapping */
export const statusBadgeClass = (status) => ({
  pending:   'badge-warning',
  delivered: 'badge-success',
  cancelled: 'badge-danger',
}[status] ?? 'badge-info');

/** Payment method label */
export const paymentLabel = (method) => ({
  cash:  '💵 Cash',
  upi:   '📱 UPI',
  card:  '💳 Card',
  other: '🔄 Other',
}[method] ?? method);
