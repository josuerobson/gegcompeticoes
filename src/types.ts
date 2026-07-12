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
  role: 'admin' | 'master_admin' | 'club_admin' | 'member';
  followers: string[]; // user IDs
  following: string[]; // user IDs
  hasPaidSignature: boolean;
  signatureExpiry?: string;
  clubId?: string;
  isProfileComplete?: boolean;
  cpf?: string;
  rg?: string;
  phone?: string;
  birthDate?: string;
  sex?: string;
  rgIssuer?: string;
  rgIssueDate?: string;
  fatherName?: string;
  motherName?: string;
  crValidity?: string;
  militaryRegion?: string;
  nationality?: string;
  cep?: string;
  address?: string;
  addressNumber?: string;
  complement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
}

export interface Club {
  id: string;
  name: string;
  logoUrl?: string;
  subDomain?: string;
  cnpj?: string;
  phone?: string;
  isPremium: boolean;
  createdAt: string;
  crNumber?: string;
  responsibleName?: string;
  email?: string;
  cep?: string;
  address?: string;
  addressNumber?: string;
  complement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
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
  discipline: string; // e.g., "IPSC", "IDSC", "Tiro de Precisão"
  targetPreview?: string;
  seriesCount?: number;
  shotsPerSeries?: number;
  timePerSeriesMinutes?: number;
  evaluationType?: 'pontuacao' | 'pontuacao_tempo' | 'tempo';
}

export interface Stage {
  id: string;
  championshipId: string;
  stageNum: number;
  title: string;
  date: string;
  regulationsFile?: string;
  scorecardFile?: string;
}

export interface Weapon {
  id: string;
  ownerId: string; // user id or club id
  manufacturer: string;
  model: string;
  caliber: string;
  serialNumber: string;
  weaponType: string;
  weaponNumber?: string; // "Número da arma" from the club registry
  sigmaNumber?: string; // Exército "Número Sigma"
  weaponClass?: string; // "Classe"
  permissionStatus?: string; // "Status de permissão"
}

export interface Championship {
  id: string;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  registrationFee: number;
  modalities: string[]; // list of modality IDs
  stagesCount: number;
  currentStage?: number;
  status: 'draft' | 'open' | 'completed';
  bannerUrl: string;
  clubId?: string;
  type: 'individual' | 'clube';
}

export interface Registration {
  id: string;
  championshipId: string;
  userId: string;
  clubId?: string;
  modalityId: string;
  stageId: string;
  weaponId: string;
  crNumber: string;
  paymentMethod: 'pix' | 'credit_card';
  paymentStatus: 'pending' | 'approved';
  completionStatus: 'pending' | 'completed';
  registeredAt: string;
  approvedAt?: string;
  txId?: string; // transaction hash/ID representation
  scoreDetails?: Record<string, unknown>;
  totalPoints?: number;
  idscTotalSeconds?: number;
  disqualified: boolean;
  penalty: number;
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
