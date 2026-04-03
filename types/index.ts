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
  saved?: boolean;
  posterLastActive?: string | null;
}

export interface RepScore {
  score: number;
  label: string;
  color: string;
  stars: number;
  reliability: number;
  total: number;
}

export type UserRole = "operator" | "depotRep" | "subAdmin" | "admin";
export type AgreementStatus = "pending" | "userA_confirmed" | "completed" | "cancelled";

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  depotId?: string | null;
  depot?: Depot | null;
  role: UserRole;
  language: string;
  avatarUrl?: string | null;
  flexibleMode: boolean;
  termsVersion?: string | null;
  reputation?: RepScore;
  inviteCodes?: { code: string; isValid: boolean }[];
}

export interface Announcement {
  id: string;
  depotId: string;
  authorId: string;
  body: string;
  pinned: boolean;
  expiresAt?: string | null;
  createdAt: string;
  updatedAt: string;
  author?: { id: string; firstName: string; lastName: string };
}

export interface FlexibleOperator {
  id: string;
  firstName: string;
  lastName: string;
  depotId: string;
  flexibleSince: string;
  reputation?: RepScore;
}

export interface SwapAgreement {
  id: string;
  swapId: string;
  userAId: string;
  userBId: string;
  status: AgreementStatus;
  userANote?: string | null;
  userBNote?: string | null;
  userAAt?: string | null;
  userBAt?: string | null;
  completedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  swap?: Pick<Swap, "id" | "details" | "category" | "posterName">;
  userA?: Pick<User, "id" | "firstName" | "lastName">;
  userB?: Pick<User, "id" | "firstName" | "lastName">;
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
