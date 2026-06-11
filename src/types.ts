export interface User {
  id: string;
  email: string;
  username: string;
  fullName: string;
  avatarUrl: string;
  bio: string;
  crNumber?: string; // Army Command CR (Certificado de Registro) for Brazilian sport shooters
  isClubMember: boolean;
  memberSince?: string;
  role: 'admin' | 'member';
  followers: string[]; // user IDs
  following: string[]; // user IDs
  hasPaidSignature: boolean;
  signatureExpiry?: string;
}

export interface Comment {
  id: string;
  userId: string;
  username: string;
  userAvatar: string;
  content: string;
  createdAt: string;
}

export interface ShootingResult {
  hits: number;
  shots: number;
  score: number;
  distance: number; // in meters (e.g., 10m, 15m, 25m)
  gunModel: string;
  caliber: string;
  discipline: string; // e.g., IPSC, Trap Americano, Fogo Central, Carabina de Pressão
}

export interface Post {
  id: string;
  userId: string;
  username: string;
  userAvatar: string;
  content: string;
  imageUrl?: string;
  targetScore?: ShootingResult;
  likes: string[]; // list of user IDs
  comments: Comment[];
  createdAt: string;
}

export interface Modality {
  id: string;
  name: string; // e.g., "IPSC Handgun", "Trap Americano", "Carabina Mira Aberta 10m"
  category: string; // e.g., "Pistola", "Revolver", "Fuzil", "Carabina", "Espingarda"
}

export interface Championship {
  id: string;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  registrationFee: number;
  modalities: string[]; // lists of modality IDs or names
  stagesCount: number;
  currentStage: number;
  status: 'draft' | 'open' | 'completed';
  bannerUrl: string;
}

export interface Registration {
  id: string;
  championshipId: string;
  userId: string;
  modality: string;
  crNumber: string;
  paymentMethod: 'pix' | 'credit_card';
  paymentStatus: 'pending' | 'approved';
  registeredAt: string;
  approvedAt?: string;
  txId?: string; // transaction hash/ID representation
}

export interface StageScore {
  id: string;
  championshipId: string;
  registrationId: string;
  userId: string;
  shooterName: string;
  modality: string;
  stageNum: number;
  score: number; // point score (e.g. 150.45)
  timeSeconds?: number; // time format for dynamic/IPSC scoring (hit factor = points / time)
  hitFactor?: number;
  createdAt: string;
}

export interface RankingItem {
  userId: string;
  username: string;
  fullName: string;
  avatarUrl: string;
  modality: string;
  totalScore: number;
  stageScores: { [stageNum: number]: number };
}
