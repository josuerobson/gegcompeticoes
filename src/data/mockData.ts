import { User, Post, Championship, Registration, StageScore } from '../types';

export const shootingImages = {
  ipsc_range: "https://images.unsplash.com/photo-1595590424283-b8f17842773f?w=800&auto=format&fit=crop&q=80",
  precision_rifle: "https://images.unsplash.com/photo-1599819811279-d5ad9cccf838?w=800&auto=format&fit=crop&q=80",
  paper_target: "https://images.unsplash.com/photo-1605330372990-281b504cc2c4?w=800&auto=format&fit=crop&q=80",
  pistol_grip: "https://images.unsplash.com/photo-1569584312214-362c37aed31c?w=800&auto=format&fit=crop&q=80",
  clay_trap: "https://images.unsplash.com/photo-1511919884226-fd3cad34687c?w=800&auto=format&fit=crop&q=80",
  trophies: "https://images.unsplash.com/photo-1578269174936-2709b5a5c0e5?w=800&auto=format&fit=crop&q=80",
  range_glasses: "https://images.unsplash.com/photo-1517466787929-bc90951d0974?w=800&auto=format&fit=crop&q=80"
};

export const defaultUsers: User[] = [
  {
    id: "user_guilherme",
    email: "guilherme@gegpistol.com",
    username: "guilherme_gg",
    fullName: "Guilherme Guedes",
    avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
    bio: "Co-fundador G&G Competições 🎯 | Atirador de IPSC Handgun Classe M | Fã de tecnologia e precisão de disparo.",
    crNumber: "CR-998822-DF",
    isClubMember: true,
    memberSince: "2024-01-15",
    role: "admin",
    followers: ["user_ana", "user_roberto", "user_carla"],
    following: ["user_gabriel", "user_roberto"],
    hasPaidSignature: true,
    signatureExpiry: "2027-12-31"
  },
  {
    id: "user_gabriel",
    email: "gabriel@gegpistol.com",
    username: "gabriel_gg",
    fullName: "Gabriel G&G",
    avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
    bio: "Head Instructor G&G Competições 🔫 | Atleta de Tiro Defensivo (IDSC) e Colecionador | CR Ativo desde 2018.",
    crNumber: "CR-774431-DF",
    isClubMember: true,
    memberSince: "2024-02-10",
    role: "admin",
    followers: ["user_guilherme", "user_roberto", "user_carla"],
    following: ["user_guilherme", "user_ana"],
    hasPaidSignature: true,
    signatureExpiry: "2027-12-31"
  },
  {
    id: "user_ana",
    email: "ana.clara@sports.com",
    username: "ana_precision",
    fullName: "Ana Clara Lima",
    avatarUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80",
    bio: "Atleta Olímpica de Carabina de Ar 10m 🇧🇷 | Membro do clube G&G Competições | Concentração e Respiração.",
    crNumber: "CR-104928-DF",
    isClubMember: true,
    memberSince: "2024-06-05",
    role: "member",
    followers: ["user_guilherme", "user_gabriel"],
    following: ["user_guilherme", "user_gabriel", "user_carla"],
    hasPaidSignature: true,
    signatureExpiry: "2026-12-31"
  },
  {
    id: "user_roberto",
    email: "roberto.ipsc@gmail.com",
    username: "roberto_ipsc",
    fullName: "Roberto Silva",
    avatarUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80",
    bio: "IPSC Division Light | Sempre em busca do Double Alpha! Membro G&G de Brasília.",
    crNumber: "CR-448202-DF",
    isClubMember: true,
    memberSince: "2025-01-20",
    role: "member",
    followers: ["user_guilherme", "user_gabriel"],
    following: ["user_guilherme", "user_gabriel", "user_ana"],
    hasPaidSignature: true,
    signatureExpiry: "2027-02-15"
  },
  {
    id: "user_carla",
    email: "carla.dias@sports.com",
    username: "carla_trap",
    fullName: "Carla Dias",
    avatarUrl: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&auto=format&fit=crop&q=80",
    bio: "Trap Americano & Skeet Shooting 🥏 | Apaixonada por espingardas calibre 12 | Atleta G&G.",
    crNumber: "CR-339941-DF",
    isClubMember: true,
    memberSince: "2024-11-11",
    role: "member",
    followers: ["user_ana"],
    following: ["user_guilherme", "user_gabriel", "user_roberto"],
    hasPaidSignature: true,
    signatureExpiry: "2026-11-11"
  }
];

export const defaultChampionships: Championship[] = [
  {
    id: "champ_ipsc_2026",
    title: "Campeonato G&G Competições IPSC Copa de Inverno",
    description: "Competição oficial de IPSC Handgun com 4 etapas eliminatórias. Pistas dinâmicas projetadas para testar velocidade, precisão e potência (DVC). Modalidades Open, Standard, Production e Light. Pontuação calculada via coeficiente (Hit Factor). Premiação exclusiva em dinheiro e medalhas personalizadas.",
    startDate: "2026-06-20",
    endDate: "2026-08-30",
    registrationFee: 150.00,
    modalities: ["IPSC Handgun Standard", "IPSC Handgun Production", "IPSC Handgun Light"],
    stagesCount: 4,
    currentStage: 1,
    status: "open",
    bannerUrl: shootingImages.ipsc_range
  },
  {
    id: "champ_precisao_2026",
    title: "Torneio G&G de Precisão de Carabina & Pistola",
    description: "Campeonato focado no tiro estático a 10m, 15m e 25m. Categorias de Carabina de Pressão Mira Aberta e Fogo Central. Desafio de precisão extrema de 20 e 40 disparos. Perfeito para afiar os fundamentos essenciais e postura dos atiradores.",
    startDate: "2026-07-05",
    endDate: "2026-07-25",
    registrationFee: 90.00,
    modalities: ["Carabina Mira Aberta 10m", "Pistola de Precisão Fogo Central 25m"],
    stagesCount: 2,
    currentStage: 1,
    status: "open",
    bannerUrl: shootingImages.paper_target
  },
  {
    id: "champ_trap_completed",
    title: "I Taça G&G Trap Americano e Prato 2026",
    description: "O maior campeonato de tiro ao prato de Brasília. 100 pratos por atleta em 4 stages. Uma verdadeira festa do esporte de caça e tiro G&G.",
    startDate: "2026-04-01",
    endDate: "2026-05-15",
    registrationFee: 180.00,
    modalities: ["Trap Americano Sênior", "Trap Americano Iniciante"],
    stagesCount: 4,
    currentStage: 4,
    status: "completed",
    bannerUrl: shootingImages.clay_trap
  }
];

export const defaultRegistrations: Registration[] = [
  {
    id: "reg_1",
    championshipId: "champ_ipsc_2026",
    userId: "user_roberto",
    modality: "IPSC Handgun Production",
    crNumber: "CR-448202-DF",
    paymentMethod: "pix",
    paymentStatus: "approved",
    registeredAt: "2026-06-01T10:30:00Z",
    approvedAt: "2026-06-01T10:35:00Z",
    txId: "tx_pix_99fhdh27364fhskd"
  },
  {
    id: "reg_2",
    championshipId: "champ_ipsc_2026",
    userId: "user_ana",
    modality: "IPSC Handgun Standard",
    crNumber: "CR-104928-DF",
    paymentMethod: "credit_card",
    paymentStatus: "approved",
    registeredAt: "2026-06-02T14:15:00Z",
    approvedAt: "2026-06-02T14:15:10Z",
    txId: "tx_cc_cc88192837ff29"
  },
  {
    id: "reg_3",
    championshipId: "champ_precisao_2026",
    userId: "user_ana",
    modality: "Carabina Mira Aberta 10m",
    crNumber: "CR-104928-DF",
    paymentMethod: "pix",
    paymentStatus: "approved",
    registeredAt: "2026-06-03T09:00:00Z",
    approvedAt: "2026-06-03T09:05:00Z",
    txId: "tx_pix_228fhdh7364ffsks"
  },
  {
    id: "reg_4",
    championshipId: "champ_trap_completed",
    userId: "user_carla",
    modality: "Trap Americano Sênior",
    crNumber: "CR-339941-DF",
    paymentMethod: "pix",
    paymentStatus: "approved",
    registeredAt: "2026-03-15T11:00:00Z",
    approvedAt: "2016-03-15T11:05:00Z",
    txId: "tx_pix_trap_finalized"
  },
  {
    id: "reg_5",
    championshipId: "champ_trap_completed",
    userId: "user_roberto",
    modality: "Trap Americano Iniciante",
    crNumber: "CR-448202-DF",
    paymentMethod: "credit_card",
    paymentStatus: "approved",
    registeredAt: "2026-03-16T12:00:00Z",
    approvedAt: "2026-03-16T12:00:05Z",
    txId: "tx_cc_trap_init"
  }
];

export const defaultStageScores: StageScore[] = [
  // IPSC - Stage 1 (ongoing/recorded)
  {
    id: "score_1",
    championshipId: "champ_ipsc_2026",
    registrationId: "reg_1",
    userId: "user_roberto",
    shooterName: "Roberto Silva",
    modality: "IPSC Handgun Production",
    stageNum: 1,
    score: 95.50,
    timeSeconds: 15.40,
    hitFactor: 6.20,
    createdAt: "2026-06-08T18:30:00Z"
  },
  // Trap Completed Tournament (All stages populated)
  {
    id: "score_trap_carla_s1",
    championshipId: "champ_trap_completed",
    registrationId: "reg_4",
    userId: "user_carla",
    shooterName: "Carla Dias",
    modality: "Trap Americano Sênior",
    stageNum: 1,
    score: 24.00, // 24 hits out of 25
    createdAt: "2026-04-05T15:00:00Z"
  },
  {
    id: "score_trap_carla_s2",
    championshipId: "champ_trap_completed",
    registrationId: "reg_4",
    userId: "user_carla",
    shooterName: "Carla Dias",
    modality: "Trap Americano Sênior",
    stageNum: 2,
    score: 25.00, // Perfect round!
    createdAt: "2026-04-12T14:30:00Z"
  },
  {
    id: "score_trap_carla_s3",
    championshipId: "champ_trap_completed",
    registrationId: "reg_4",
    userId: "user_carla",
    shooterName: "Carla Dias",
    modality: "Trap Americano Sênior",
    stageNum: 3,
    score: 23.00,
    createdAt: "2026-04-19T16:00:00Z"
  },
  {
    id: "score_trap_carla_s4",
    championshipId: "champ_trap_completed",
    registrationId: "reg_4",
    userId: "user_carla",
    shooterName: "Carla Dias",
    modality: "Trap Americano Sênior",
    stageNum: 4,
    score: 25.00, // Perfect round!
    createdAt: "2026-04-26T14:00:00Z"
  },
  {
    id: "score_trap_roberto_s1",
    championshipId: "champ_trap_completed",
    registrationId: "reg_5",
    userId: "user_roberto",
    shooterName: "Roberto Silva",
    modality: "Trap Americano Iniciante",
    stageNum: 1,
    score: 18.00,
    createdAt: "2026-04-05T15:15:00Z"
  },
  {
    id: "score_trap_roberto_s2",
    championshipId: "champ_trap_completed",
    registrationId: "reg_5",
    userId: "user_roberto",
    shooterName: "Roberto Silva",
    modality: "Trap Americano Iniciante",
    stageNum: 2,
    score: 19.00,
    createdAt: "2026-04-12T14:45:00Z"
  },
  {
    id: "score_trap_roberto_s3",
    championshipId: "champ_trap_completed",
    registrationId: "reg_5",
    userId: "user_roberto",
    shooterName: "Roberto Silva",
    modality: "Trap Americano Iniciante",
    stageNum: 3,
    score: 21.00,
    createdAt: "2026-04-19T16:15:00Z"
  },
  {
    id: "score_trap_roberto_s4",
    championshipId: "champ_trap_completed",
    registrationId: "reg_5",
    userId: "user_roberto",
    shooterName: "Roberto Silva",
    modality: "Trap Americano Iniciante",
    stageNum: 4,
    score: 20.00,
    createdAt: "2026-04-26T14:15:00Z"
  }
];

export const defaultPosts: Post[] = [
  {
    id: "post_1",
    userId: "user_guilherme",
    username: "guilherme_gg",
    userAvatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
    content: "Dando início aos preparativos para a Copa de Inverno G&G IPSC 2026! A pista está montada e espetacular. Esperamos todos os atiradores do Centro-Oeste para esse grande confronto! DVC! 🎯🇧🇷",
    imageUrl: shootingImages.ipsc_range,
    likes: ["user_gabriel", "user_ana", "user_roberto"],
    comments: [
      {
        id: "post_1_com1",
        userId: "user_roberto",
        username: "roberto_ipsc",
        userAvatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80",
        content: "Inscrição já garantida! Vou correr na Production! Ansioso pelas pistas.",
        createdAt: "2026-06-10T12:00:00Z"
      },
      {
        id: "post_1_com2",
        userId: "user_gabriel",
        username: "gabriel_gg",
        userAvatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
        content: "Pista muito desafiadora mesmo! Fizemos o teste dos gongs e o tempo de reação vai ser o divisor de águas.",
        createdAt: "2026-06-10T12:15:00Z"
      }
    ],
    createdAt: "2026-06-10T11:30:00Z"
  },
  {
    id: "post_2",
    userId: "user_ana",
    username: "ana_precision",
    userAvatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80",
    content: "Treino de precisão de hoje concluído com minha Carabina 4.5mm a 10 metros. O agrupamento ficou fantástico! Foco na respiração e liberação suave do gatilho fazem toda a diferença. Como está o treino de vocês?",
    imageUrl: shootingImages.paper_target,
    targetScore: {
      hits: 10,
      shots: 10,
      score: 99.2,
      distance: 10,
      gunModel: "Feinwerkbau 800X",
      caliber: "4.5mm (.177)",
      discipline: "Carabina Mira Aberta 10m"
    },
    likes: ["user_guilherme", "user_carla"],
    comments: [
      {
        id: "post_2_com1",
        userId: "user_carla",
        username: "carla_trap",
        userAvatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&auto=format&fit=crop&q=80",
        content: "Impressionante esse agrupamento Ana! Perto disso o meu chumbo calibre 12 parece uma vassoura de fogo kkkk. Parabéns!",
        createdAt: "2026-06-09T18:10:00Z"
      }
    ],
    createdAt: "2026-06-09T17:45:00Z"
  },
  {
    id: "post_3",
    userId: "user_carla",
    username: "carla_trap",
    userAvatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&auto=format&fit=crop&q=80",
    content: "Fechando a primeira rodada na Taça G&G Trap Americano com um belo 25/25 na etapa final! Sensação indescritível de limpar a série ao prato. Obrigado a toda torcida e organização do G&G Competições! 🏆💨",
    imageUrl: shootingImages.clay_trap,
    likes: ["user_guilherme", "user_gabriel", "user_ana", "user_roberto"],
    comments: [
      {
        id: "post_3_com1",
        userId: "user_guilherme",
        username: "guilherme_gg",
        userAvatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
        content: "Disparos limpos e perfeita sintonia! O troféu de campeã sênior do Trap Americano é merecidíssimo 🥇",
        createdAt: "2026-05-16T10:00:00Z"
      }
    ],
    createdAt: "2026-05-15T19:20:00Z"
  }
];
