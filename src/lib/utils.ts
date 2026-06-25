import { type ClassValue, clsx } from "clsx";
import { formatDate, formatDistanceToNowStrict } from "date-fns";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatRelativeDate(from: Date | string) {
  const date = typeof from === "string" ? new Date(from) : from;
  const diffMs = Date.now() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) {
    return "now";
  }
  if (diffMins < 60) {
    return `${diffMins} min`;
  }
  if (diffHours < 24) {
    return `${diffHours} h`;
  }
  if (diffDays < 7) {
    return `${diffDays} d`;
  }

  const currentDate = new Date();
  if (currentDate.getFullYear() === date.getFullYear()) {
    return formatDate(date, "MMM d");
  } else {
    return formatDate(date, "MMM d, yyyy");
  }
}

export function formatNumber(n: number): string {
  return Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(n);
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/ /g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

export function toPlainObject<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return obj;
  }
  if (obj instanceof Date) {
    return new Date(obj.getTime()) as any;
  }
  if (Array.isArray(obj)) {
    return obj.map((item) => toPlainObject(item)) as any;
  }
  if (typeof obj === "object") {
    const plain: any = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        plain[key] = toPlainObject(obj[key]);
      }
    }
    return plain;
  }
  return obj;
}
