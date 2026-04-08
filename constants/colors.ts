export const C = {
  navy: "#000082",
  gold: "#D1AD38",
  blue: "#0249B5",
  white: "#FFF",
  bg: "#010028",
  s: "rgba(255,255,255,.035)",
  sh: "rgba(255,255,255,.06)",
  bd: "rgba(255,255,255,.06)",
  m: "rgba(255,255,255,.6)",
  gs: "rgba(209,173,56,.12)",
  gg: "rgba(209,173,56,.35)",
  red: "#FF4757",
} as const;

export const OC: Record<string, string> = {
  NYCT: "#0062FF",
  MaBSTOA: "#00A86B",
  "MTA Bus": "#E87722",
};

export const CM = {
  work: { c: C.blue, bg: C.blue + "18", bd2: C.blue + "33" },
  daysoff: { c: C.gold, bg: C.gs, bd2: C.gg },
  vacation: { c: "#00C9A7", bg: "rgba(0,201,167,.1)", bd2: "rgba(0,201,167,.25)" },
  open_work: { c: "#22D3EE", bg: "rgba(34,211,238,.1)", bd2: "rgba(34,211,238,.25)" },
} as const;

export const STC = {
  open: { bg: "rgba(46,213,115,.12)", bd: "rgba(46,213,115,.3)", c: "#2ED573" },
  pending: { bg: "rgba(209,173,56,.12)", bd: "rgba(209,173,56,.3)", c: C.gold },
  filled: { bg: "rgba(0,201,167,.12)", bd: "rgba(0,201,167,.3)", c: "#00C9A7" },
  expired: { bg: "rgba(128,128,128,.12)", bd: "rgba(128,128,128,.3)", c: "#888" },
} as const;

export const SWAP_TYPES = [
  { id: "work", l: "Swap Work", f: "Swap Work for the Day", ic: "swap" },
  { id: "daysoff", l: "Swap Days Off", f: "Swap Days Off", ic: "cal" },
  { id: "vacation", l: "Swap Vacation", f: "Swap Vacation Week", ic: "sun" },
] as const;
