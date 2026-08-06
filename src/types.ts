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
  docRgCnhUploaded?: boolean;
  docCrUploaded?: boolean;
  docDeclaracaoUploaded?: boolean;
  guiaTransitoExpiry?: string;
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
  docCnpjUploaded?: boolean;
  docCrUploaded?: boolean;
  docAlvaraUploaded?: boolean;
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

export interface SharedPostInfo {
  originalPostId: string;
  originalUserId: string;
  originalUsername: string;
  originalUserAvatar?: string;
  originalContent: string;
  originalImageUrl?: string;
  originalImageUrls?: string[];
  originalTargetScore?: ShootingResult;
  originalCreatedAt: string;
}

export interface Post {
  id: string;
  userId: string;
  username: string;
  userAvatar: string;
  content: string;
  imageUrl?: string;
  imageUrls?: string[];
  targetScore?: ShootingResult;
  likes: string[]; // list of user IDs
  comments: Comment[];
  createdAt: string;
  sharedPost?: SharedPostInfo;
  sharesCount?: number;
  viewsCount?: number;
}

export interface Modality {
  id: string;
  name: string; // e.g., "IPSC Handgun", "Trap Americano", "Carabina Mira Aberta 10m"
  discipline?: string; // legacy/unused field, not part of the real Cadastrar Modalidades form
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
  description?: string;
  endDate?: string;
  sexo?: 'masculino' | 'feminino' | 'misto';
  homologarResultado?: 'sim' | 'nao';
  abertoParaResultados?: 'sim' | 'nao';
  gerarCertificados?: 'sim' | 'nao';
  fatorMultiplicacaoResultados?: number;
  exibirInscritosPaginaInicial?: 'sim' | 'nao';
  incluirNaSomaPaginaInicial?: 'sim' | 'nao';
}

export type StageInput = Pick<Stage, 'championshipId' | 'title' | 'date'> & Partial<Omit<Stage, 'id' | 'championshipId' | 'title' | 'date' | 'stageNum'>>;

export interface Weapon {
  id: string;
  ownerId: string; // user id or club id
  manufacturer: string;
  model: string;
  caliber: string;
  serialNumber: string;
  weaponType?: string; // legacy/unused field, not part of the real Cadastro de Armas form
  weaponNumber?: string; // "Número da arma" from the club registry
  sigmaNumber?: string; // Exército "Número Sigma"
  weaponClass?: string; // "Classe"
  permissionStatus?: string; // "Status de permissão" (Permitida/Restrita)
  registrySystem?: string; // "Arma é" (Sigma/Sinarm)
}

// Managed dropdown option for the weapon form's Classe/Modelo/Calibre/
// Fabricante/Arma é/Status de permissão selects — only master_admin can
// create/edit/remove these (see requireMasterAdmin on the server).
export interface WeaponLookupOption {
  id: string;
  kind: 'classe' | 'modelo' | 'calibre' | 'fabricante' | 'tipo_arma' | 'permissao_arma';
  label: string;
  createdAt: string;
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
  regulamentoUploaded?: boolean;
  sumulaUploaded?: boolean;
  valorX?: number;
  valorInscricaoClube?: number;
  valorInscricaoIndividual?: number;
  percentualClube?: number;
  valorReinscricao?: number;
  tipoPix?: string;
  chavePix?: string;
  nomeExibidoPix?: string;
  whatsappComprovante?: string;
  formatoPagamento?: 'campeonato' | 'etapa';
  limiteEquipesClube?: number;
  qtdAtletasPorEquipe?: number;
  formatoInsercao?: 'por_etapa' | 'todas_etapas';
  alcanceCampeonato?: 'local_distrital' | 'regional' | 'estadual' | 'nacional';
  nivelCampeonato?: number;
  percentualTributos?: number;
  percentualOrganizacao?: number;
  percentualClubes?: number;
  percentualPremiacaoAtleta?: number;
  percentualPremiacaoClube?: number;
  percentualPremiacaoTodasEtapas?: number;
  premiacaoAdicionalTodasEtapas?: number;
  qtdEtapasConsideradas?: number;
  qtdPioresDescartar?: number;
  qtdMelhoresDescartar?: number;
  percentualPos1TodasEtapas?: number;
  percentualPos2TodasEtapas?: number;
  percentualPos3TodasEtapas?: number;
  percentualPos4TodasEtapas?: number;
  percentualPos5TodasEtapas?: number;
  percentualOuro?: number;
  percentualPrata?: number;
  percentualBronze?: number;
  percentualPos1Medalha?: number;
  percentualPos2Medalha?: number;
  percentualPos3Medalha?: number;
  percentualPos4Medalha?: number;
  percentualPos5Medalha?: number;
  pontuacaoMinimaAtletaOuro?: number;
  pontuacaoMinimaAtletaPrata?: number;
  pontuacaoMinimaAtletaBronze?: number;
  pontuacaoMinimaEquipeOuro?: number;
  pontuacaoMinimaEquipePrata?: number;
  pontuacaoMinimaEquipeBronze?: number;
  ordemExibicao?: number;
  abertoOutrosClubes?: 'sim' | 'nao';
}

export interface HomeBanner {
  id: string;
  tag: string;
  subtitle: string;
  title: string;
  description: string;
  buttonText: string;
  imageUrl: string;
  linkUrl?: string;
  active: boolean;
  displayOrder: number;
  createdAt: string;
}

// Payload shape for creating/editing a championship — the required "quick create"
// fields plus every optional cadastro-completo field from Championship.
export type ChampionshipInput = Pick<Championship, 'title' | 'description' | 'startDate' | 'endDate' | 'registrationFee' | 'modalities' | 'stagesCount'> &
  Partial<Omit<Championship, 'id' | 'title' | 'description' | 'startDate' | 'endDate' | 'registrationFee' | 'modalities' | 'stagesCount' | 'status' | 'currentStage' | 'regulamentoUploaded' | 'sumulaUploaded'>>;

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
  completionStatus: 'pending' | 'completed' | 'absent';
  registeredAt: string;
  approvedAt?: string;
  txId?: string;
  scoreDetails?: Record<string, unknown>;
  totalPoints?: number;
  idscTotalSeconds?: number;
  disqualified: boolean;
  penalty: number;
  registeredByUserId?: string;
  registrationType?: 'normal' | 'reinscrição';
  valorPago?: number;
  dataPagamento?: string;
  scoreX?: number; scoreP10?: number; scoreP9?: number; scoreP8?: number;
  scoreP7?: number; scoreP6?: number; scoreP5?: number; scoreP4?: number;
  scoreP3?: number; scoreP2?: number; scoreP1?: number; scoreP0?: number;
  idsc0?: number; idsc2?: number; idsc5?: number;
  idscMisses?: number; idscNoshoot?: number;
  idscTempoPista?: number; idscTempoPistaExibe?: string; idscTotalSegundosExibe?: string;
  dataExecucao?: string; horaExecucao?: string;
  totalMinutos?: string; totalMilesegundos?: number;
  seriesPontos?: any[]; seriesTempos?: any[];
  codigoInscricao?: number;
  ownAmmoShots?: number;
  clubAmmoShots?: number;
  clubAmmoType?: 'nova' | 'recarga';
  multiChampionshipId?: string; // Presente quando a inscrição foi gerada por um multicampeonato
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
  clubAmmoType?: 'nova' | 'recarga';
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

export interface TrainingSession {
  id: string;
  userId: string;
  athleteName?: string;
  athleteCr?: string;
  clubId?: string;
  dateTime: string;
  weaponId?: string;
  weaponName: string;
  weaponCaliber?: string;
  weaponOwnerType: 'propria' | 'clube';
  totalShots: number;
  ownAmmoShots: number;
  clubAmmoShots: number;
  clubAmmoType?: 'nova' | 'recarga';
  modality?: string;
  score?: number;
  notes?: string;
  createdAt?: string;
}

// ─── Multi-campeonatos ────────────────────────────────────────────────────────
// Pacote de campeonatos agrupados com inscrição unificada (valor único).
export interface MultiChampionship {
  id: string;
  title: string;
  description?: string;
  championshipIds: string[];
  registrationFee: number;
  clubRegistrationFee?: number;
  pixKey?: string;
  pixType?: string;
  pixName?: string;
  whatsapp?: string;
  status: 'active' | 'inactive';
  createdAt: string;
}

// ─── Módulo de Munições ────────────────────────────────────────────────────────
export interface AmmoCaliberStock {
  id: string;
  clubId?: string;
  caliber: string;
  initialStock: number;
  hasInitialStockSet: boolean;
  currentStock: number;
  totalNfNewAmmo: number;
  totalProduction: number;
  totalAllocated: number;
  updatedAt?: string;
}

export interface AmmoInvoiceItem {
  id?: string;
  invoiceId?: string;
  productType: 'espoleta' | 'polvora' | 'ponta' | 'ponta_nova' | 'ponta_reciclada' | 'municao_nova';
  unitMeasure?: 'un' | 'kg' | 'g';
  caliber: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface AmmoInvoice {
  id: string;
  clubId?: string;
  invoiceNumber?: string;
  supplier?: string;
  date: string;
  totalAmount: number;
  createdAt?: string;
  items?: AmmoInvoiceItem[];
}

export interface AmmoProduction {
  id: string;
  clubId?: string;
  quantity: number;
  date: string;
  caliber: string;
  createdAt?: string;
}

export interface AmmoRecycled {
  id: string;
  clubId?: string;
  quantity: number;
  date: string;
  caliber: string;
  createdAt?: string;
}

export interface AmmoAthleteAllocationItem {
  id?: string;
  allocationId?: string;
  caliber: string;
  quantity: number;
}

export interface AmmoAthleteAllocation {
  id: string;
  clubId?: string;
  userId: string;
  athleteName?: string;
  athleteCpf?: string;
  date: string;
  notes?: string;
  createdAt?: string;
  items?: AmmoAthleteAllocationItem[];
}

export interface AmmoAthleteBalance {
  id: string;
  userId: string;
  clubId?: string;
  caliber: string;
  balance: number;
  updatedAt?: string;
}

