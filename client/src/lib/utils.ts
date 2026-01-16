import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: "$",
  PKR: "₨",
  EUR: "€",
  GBP: "£",
  INR: "₹",
  AED: "د.إ",
  SAR: "﷼",
  CAD: "C$",
  AUD: "A$",
  CNY: "¥",
};

export function getSavedCurrency(): { code: string; symbol: string } {
  const saved = localStorage.getItem("currency") || "USD";
  return {
    code: saved,
    symbol: CURRENCY_SYMBOLS[saved] || "$",
  };
}

export function formatCurrency(amount: string | number): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  const { symbol } = getSavedCurrency();
  return `${symbol}${num.toLocaleString()}`;
}

export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(d);
}

export function formatPhoneNumber(phone: string): string {
  // Simple phone number formatting for US numbers
  const cleaned = phone.replace(/\D/g, '');
  const match = cleaned.match(/^(\d{1})(\d{3})(\d{3})(\d{4})$/);
  if (match) {
    return `+${match[1]}-${match[2]}-${match[3]}-${match[4]}`;
  }
  return phone;
}

export function getStatusBadgeClass(status: string): string {
  switch (status.toLowerCase()) {
    case 'active':
      return 'status-active';
    case 'pending':
      return 'status-pending';
    case 'overdue':
      return 'status-overdue';
    default:
      return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';
  }
}

export function getPaymentStatusBadgeClass(isPaid: boolean): string {
  return isPaid ? 'status-active' : 'status-overdue';
}

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

export function generateInvoiceNumber(): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const timestamp = Date.now().toString(36).toUpperCase();
  return `INV-${year}${month}-${timestamp}`;
}

export function getMonthName(month: number): string {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  return months[month - 1] || 'Invalid Month';
}

export function getCurrentMonthYear(): { month: number; year: number } {
  const date = new Date();
  return {
    month: date.getMonth() + 1,
    year: date.getFullYear(),
  };
}

export function isOverdue(billing: { month: number; year: number; isPaid: boolean }): boolean {
  if (billing.isPaid) return false;
  
  const current = getCurrentMonthYear();
  const billingDate = new Date(billing.year, billing.month - 1);
  const currentDate = new Date(current.year, current.month - 1);
  
  return billingDate < currentDate;
}
