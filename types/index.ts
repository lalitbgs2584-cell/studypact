export type User = {
  id: string;
  name: string;
  email: string;
  image?: string | null;
  role?: string | null;
  isBlocked?: boolean | null;
};

export type Group = {
  id: string;
  name: string;
  description: string;
  token: string;
  plan: string;
  depositAmount: number;
  createdAt: Date;
  creatorId: string;
};

export type CheckIn = {
  id: string;
  groupId: string;
  userId: string;
  photoUrl: string;
  reflection: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: Date;
};

export type Penalty = {
  id: string;
  groupId: string;
  userId: string;
  amount: number;
  reason: string;
  createdAt: Date;
};
