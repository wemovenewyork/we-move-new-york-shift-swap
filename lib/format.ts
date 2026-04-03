export function timeAgo(d: string): string {
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return Math.floor(s / 60) + "m ago";
  if (s < 86400) return Math.floor(s / 3600) + "h ago";
  return Math.floor(s / 86400) + "d ago";
}

export function fmtTime(t?: string | null): string {
  if (!t) return "—";
  const [h, m] = t.split(":");
  const hr = +h;
  return `${hr % 12 || 12}:${m} ${hr >= 12 ? "PM" : "AM"}`;
}
