export interface Depot {
  id: string;
  name: string;
  code: string;
  borough: string;
  operator: string;
  logoUrl?: string | null;
  openSwaps?: number;
}

export type SwapCategory = "work" | "daysoff" | "vacation";
export type SwapStatus = "open" | "pending" | "filled" | "expired";

export interface Swap {
  id: string;
  userId: string;
  depotId: string;
  category: SwapCategory;
  status: SwapStatus;
  posterName: string;
  details: string;
  contact?: string | null;
  date?: string | null;
  run?: string | null;
  route?: string | null;
  startTime?: string | null;
  clearTime?: string | null;
  swingStart?: string | null;
  swingEnd?: string | null;
  fromDay?: string | null;
  fromDate?: string | null;
  toDay?: string | null;
  toDate?: string | null;
  vacationHave?: string | null;
  vacationWant?: string | null;
  createdAt: string;
  updatedAt: string;
  reputation?: RepScore;
}

export interface RepScore {
  score: number;
  label: string;
  color: string;
  stars: number;
  reliability: number;
  total: number;
}

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  depotId?: string | null;
  depot?: Depot | null;
  language: string;
  avatarUrl?: string | null;
  reputation?: RepScore;
  inviteCodes?: { code: string; isValid: boolean }[];
}

export interface Message {
  id: string;
  swapId: string;
  fromUserId: string;
  toUserId: string;
  text: string;
  read: boolean;
  createdAt: string;
  fromUser?: { id: string; firstName: string; lastName: string };
  swap?: { id: string; details: string; category: string };
}
