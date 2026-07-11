import { User, Post, Championship, Registration, StageScore, Club, Modality, Stage, Weapon } from '../types';

export const shootingImages = {
  ipsc_range: "https://images.unsplash.com/photo-1595590424283-b8f17842773f?w=800&auto=format&fit=crop&q=80",
  precision_rifle: "https://images.unsplash.com/photo-1599819811279-d5ad9cccf838?w=800&auto=format&fit=crop&q=80",
  paper_target: "https://images.unsplash.com/photo-1605330372990-281b504cc2c4?w=800&auto=format&fit=crop&q=80",
  pistol_grip: "https://images.unsplash.com/photo-1569584312214-362c37aed31c?w=800&auto=format&fit=crop&q=80",
  clay_trap: "https://images.unsplash.com/photo-1511919884226-fd3cad34687c?w=800&auto=format&fit=crop&q=80",
  trophies: "https://images.unsplash.com/photo-1578269174936-2709b5a5c0e5?w=800&auto=format&fit=crop&q=80",
  range_glasses: "https://images.unsplash.com/photo-1517466787929-bc90951d0974?w=800&auto=format&fit=crop&q=80"
};

export const defaultClubs: Club[] = [
  {
    id: "club_aranas",
    name: "Clube de Tiro Aranãs",
    logoUrl: "https://images.unsplash.com/photo-1578269174936-2709b5a5c0e5?w=150&auto=format&fit=crop&q=80",
    subDomain: "aranas",
    cnpj: "12.345.678/0001-90",
    phone: "(33) 98888-1111",
    isPremium: true,
    createdAt: "2024-01-01"
  },
  {
    id: "club_geg",
    name: "Clube de Tiro G&G",
    logoUrl: "https://images.unsplash.com/photo-1595590424283-b8f17842773f?w=150&auto=format&fit=crop&q=80",
    subDomain: "geg",
    cnpj: "98.765.432/0001-10",
    phone: "(61) 97777-2222",
    isPremium: true,
    createdAt: "2024-01-15"
  },
  {
    id: "club_standard",
    name: "Clube Standard de Brasília",
    cnpj: "45.678.901/0001-20",
    phone: "(61) 96666-3333",
    isPremium: false,
    createdAt: "2025-05-10"
  }
];

export const defaultModalities: Modality[] = [
  {
    id: "mod_ipsc",
    name: "IPSC Handgun (Standard)",
    discipline: "IPSC",
    targetPreview: "Alvo oficial IPSC. Pontuações: Alpha (5 pts), Charlie (3 pts), Delta (1 pt).",
    seriesCount: 1,
    shotsPerSeries: 20,
    timePerSeriesMinutes: 5,
    evaluationType: "pontuacao_tempo"
  },
  {
    id: "mod_idsc",
    name: "Tiro Defensivo IDSC",
    discipline: "IDSC",
    targetPreview: "Alvos silhueta defensivos. Pontuação baseada em tempo total mais penalidades (pontos perdidos x 0.5s).",
    seriesCount: 1,
    shotsPerSeries: 18,
    timePerSeriesMinutes: 5,
    evaluationType: "tempo"
  },
  {
    id: "mod_precisao",
    name: "Pistola Fogo Central 25m",
    discipline: "Tiro de Precisão",
    targetPreview: "Alvo de precisão com anéis concêntricos de 1 a 10 pontos. 10 tiros por etapa.",
    seriesCount: 1,
    shotsPerSeries: 10,
    timePerSeriesMinutes: 3,
    evaluationType: "pontuacao"
  },
  {
    id: "mod_trap",
    name: "Trap Americano",
    discipline: "Trap",
    targetPreview: "Prato de argila lançado em voo; acerto ou erro por disparo.",
    seriesCount: 4,
    shotsPerSeries: 25,
    timePerSeriesMinutes: 15,
    evaluationType: "pontuacao"
  }
];

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
    role: "master_admin",
    followers: ["user_ana", "user_roberto", "user_carla"],
    following: ["user_gabriel", "user_roberto"],
    hasPaidSignature: true,
    signatureExpiry: "2027-12-31",
    clubId: "club_aranas",
    isProfileComplete: true,
    cpf: "111.111.111-11",
    rg: "MG-11.111.111",
    phone: "(33) 91111-1111"
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
    role: "club_admin",
    followers: ["user_guilherme", "user_roberto", "user_carla"],
    following: ["user_guilherme", "user_ana"],
    hasPaidSignature: true,
    signatureExpiry: "2027-12-31",
    clubId: "club_geg",
    isProfileComplete: true,
    cpf: "222.222.222-22",
    rg: "DF-22.222.222",
    phone: "(61) 92222-2222"
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
    signatureExpiry: "2026-12-31",
    clubId: "club_geg",
    isProfileComplete: true,
    cpf: "333.333.333-33",
    rg: "DF-33.333.333",
    phone: "(61) 93333-3333"
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
    signatureExpiry: "2027-02-15",
    clubId: "club_geg",
    isProfileComplete: true,
    cpf: "444.444.444-44",
    rg: "DF-44.444.444",
    phone: "(61) 94444-4444"
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
    signatureExpiry: "2026-11-11",
    clubId: "club_aranas",
    isProfileComplete: true,
    cpf: "555.555.555-55",
    rg: "MG-55.555.555",
    phone: "(33) 95555-5555"
  }
];

export const defaultWeapons: Weapon[] = [
  {
    id: "weapon_glock",
    ownerId: "user_guilherme",
    manufacturer: "Glock",
    model: "17 Gen 5",
    caliber: "9mm",
    serialNumber: "G17-998822",
    weaponType: "Pistola"
  },
  {
    id: "weapon_taurus",
    ownerId: "user_roberto",
    manufacturer: "Taurus",
    model: "TS9",
    caliber: "9mm",
    serialNumber: "TS9-448202",
    weaponType: "Pistola"
  },
  {
    id: "weapon_imbel",
    ownerId: "user_ana",
    manufacturer: "Imbel",
    model: "MD2 LX",
    caliber: ".40 S&W",
    serialNumber: "MD2-104928",
    weaponType: "Pistola"
  },
  {
    id: "weapon_club_geg",
    ownerId: "club_geg",
    manufacturer: "Taurus",
    model: "1911 Officer",
    caliber: ".45 ACP",
    serialNumber: "TAU-1911-GEG",
    weaponType: "Pistola"
  },
  {
    id: "weapon_carla",
    ownerId: "user_carla",
    manufacturer: "Taurus",
    model: "TS9",
    caliber: "9mm",
    serialNumber: "SN-TEST-001",
    weaponType: "Pistola"
  }
];

export const defaultChampionships: Championship[] = [
  {
    id: "champ_ipsc_2026",
    title: "Campeonato Oficial IPSC - Copa Aranãs",
    description: "Campeonato oficial de IPSC Handgun. Pistas dinâmicas projetadas para testar velocidade, precisão e potência (DVC). Pontuação calculada via coeficiente (Hit Factor).",
    startDate: "2026-06-01",
    endDate: "2026-10-31",
    registrationFee: 150.00,
    modalities: ["mod_ipsc"],
    stagesCount: 2,
    status: "open",
    bannerUrl: shootingImages.ipsc_range,
    clubId: "club_aranas",
    type: "individual"
  },
  {
    id: "champ_idsc_2026",
    title: "Torneio Interno IDSC - G&G",
    description: "Competição de tiro defensivo IDSC voltada para capacitação e confraternização de atletas e membros credenciados.",
    startDate: "2026-07-01",
    endDate: "2026-09-30",
    registrationFee: 100.00,
    modalities: ["mod_idsc"],
    stagesCount: 1,
    status: "open",
    bannerUrl: shootingImages.pistol_grip,
    clubId: "club_geg",
    type: "individual"
  },
  {
    id: "champ_precisao_2026",
    title: "Torneio G&G de Precisão de Pistola",
    description: "Campeonato focado no tiro estático a 25m. Desafio de precisão extrema de 10 disparos por etapa. Perfeito para afiar os fundamentos essenciais e postura dos atiradores.",
    startDate: "2026-07-05",
    endDate: "2026-07-25",
    registrationFee: 90.00,
    modalities: ["mod_precisao"],
    stagesCount: 2,
    status: "open",
    bannerUrl: shootingImages.paper_target,
    clubId: "club_geg",
    type: "individual"
  },
  {
    id: "champ_trap_completed",
    title: "I Taça G&G Trap Americano e Prato 2026",
    description: "O maior campeonato de tiro ao prato de Brasília. 100 pratos por atleta em 4 stages. Uma verdadeira festa do esporte de caça e tiro G&G.",
    startDate: "2026-04-01",
    endDate: "2026-05-15",
    registrationFee: 180.00,
    modalities: ["mod_trap"],
    stagesCount: 4,
    status: "completed",
    bannerUrl: shootingImages.clay_trap,
    clubId: "club_aranas",
    type: "individual"
  }
];

export const defaultStages: Stage[] = [
  {
    id: "stage_ipsc_1",
    championshipId: "champ_ipsc_2026",
    stageNum: 1,
    title: "1ª Etapa - Abertura da Copa",
    date: "2026-06-15",
    regulationsFile: "/files/regulamento_ipsc_etapa1.pdf",
    scorecardFile: "/files/sumula_ipsc_etapa1.pdf"
  },
  {
    id: "stage_ipsc_2",
    championshipId: "champ_ipsc_2026",
    stageNum: 2,
    title: "2ª Etapa - Encerramento",
    date: "2026-08-20",
    regulationsFile: "/files/regulamento_ipsc_etapa2.pdf",
    scorecardFile: "/files/sumula_ipsc_etapa2.pdf"
  },
  {
    id: "stage_idsc_1",
    championshipId: "champ_idsc_2026",
    stageNum: 1,
    title: "Etapa Única G&G",
    date: "2026-07-20",
    regulationsFile: "/files/regulamento_idsc.pdf",
    scorecardFile: "/files/sumula_idsc.pdf"
  },
  {
    id: "stage_precisao_1",
    championshipId: "champ_precisao_2026",
    stageNum: 1,
    title: "1ª Etapa - Precisão 25m",
    date: "2026-07-10"
  },
  {
    id: "stage_precisao_2",
    championshipId: "champ_precisao_2026",
    stageNum: 2,
    title: "2ª Etapa - Precisão 25m",
    date: "2026-07-24"
  },
  {
    id: "stage_trap_1",
    championshipId: "champ_trap_completed",
    stageNum: 1,
    title: "1ª Etapa",
    date: "2026-04-05"
  },
  {
    id: "stage_trap_2",
    championshipId: "champ_trap_completed",
    stageNum: 2,
    title: "2ª Etapa",
    date: "2026-04-12"
  },
  {
    id: "stage_trap_3",
    championshipId: "champ_trap_completed",
    stageNum: 3,
    title: "3ª Etapa",
    date: "2026-04-19"
  },
  {
    id: "stage_trap_4",
    championshipId: "champ_trap_completed",
    stageNum: 4,
    title: "4ª Etapa - Final",
    date: "2026-04-26"
  }
];

export const defaultRegistrations: Registration[] = [
  {
    id: "reg_roberto_ipsc_s1",
    championshipId: "champ_ipsc_2026",
    userId: "user_roberto",
    clubId: "club_geg",
    modalityId: "mod_ipsc",
    stageId: "stage_ipsc_1",
    weaponId: "weapon_taurus",
    crNumber: "CR-448202-DF",
    paymentMethod: "pix",
    paymentStatus: "approved",
    completionStatus: "completed",
    registeredAt: "2026-06-05T10:00:00Z",
    approvedAt: "2026-06-05T10:05:00Z",
    txId: "tx_123456",
    scoreDetails: { rings: { x: 5, p8: 1, p9: 2, p10: 7 } },
    totalPoints: 176,
    disqualified: false,
    penalty: 0
  },
  {
    id: "reg_ana_ipsc_s1",
    championshipId: "champ_ipsc_2026",
    userId: "user_ana",
    clubId: "club_geg",
    modalityId: "mod_ipsc",
    stageId: "stage_ipsc_1",
    weaponId: "weapon_imbel",
    crNumber: "CR-104928-DF",
    paymentMethod: "credit_card",
    paymentStatus: "approved",
    completionStatus: "completed",
    registeredAt: "2026-06-06T14:30:00Z",
    approvedAt: "2026-06-06T14:32:00Z",
    txId: "tx_789101",
    scoreDetails: { rings: { x: 10, p9: 2, p10: 8 } },
    totalPoints: 211,
    disqualified: false,
    penalty: 0
  },
  {
    id: "reg_ana_precisao_s1",
    championshipId: "champ_precisao_2026",
    userId: "user_ana",
    clubId: "club_geg",
    modalityId: "mod_precisao",
    stageId: "stage_precisao_1",
    weaponId: "weapon_imbel",
    crNumber: "CR-104928-DF",
    paymentMethod: "pix",
    paymentStatus: "approved",
    completionStatus: "completed",
    registeredAt: "2026-06-03T09:00:00Z",
    approvedAt: "2026-06-03T09:05:00Z",
    txId: "tx_pix_228fhdh7364ffsks",
    totalPoints: 99,
    disqualified: false,
    penalty: 0
  },
  {
    id: "reg_carla_trap_s1",
    championshipId: "champ_trap_completed",
    userId: "user_carla",
    clubId: "club_aranas",
    modalityId: "mod_trap",
    stageId: "stage_trap_1",
    weaponId: "weapon_carla",
    crNumber: "CR-339941-DF",
    paymentMethod: "pix",
    paymentStatus: "approved",
    completionStatus: "completed",
    registeredAt: "2026-03-15T11:00:00Z",
    approvedAt: "2026-03-15T11:05:00Z",
    txId: "tx_pix_trap_finalized",
    disqualified: false,
    penalty: 0
  },
  {
    id: "reg_roberto_trap_s1",
    championshipId: "champ_trap_completed",
    userId: "user_roberto",
    clubId: "club_geg",
    modalityId: "mod_trap",
    stageId: "stage_trap_1",
    weaponId: "weapon_taurus",
    crNumber: "CR-448202-DF",
    paymentMethod: "credit_card",
    paymentStatus: "approved",
    completionStatus: "completed",
    registeredAt: "2026-03-16T12:00:00Z",
    approvedAt: "2026-03-16T12:00:05Z",
    txId: "tx_cc_trap_init",
    disqualified: false,
    penalty: 0
  }
];

export const defaultStageScores: StageScore[] = [
  // IPSC - Stage 1 (ongoing/recorded)
  {
    id: "score_1",
    championshipId: "champ_ipsc_2026",
    registrationId: "reg_roberto_ipsc_s1",
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
    registrationId: "reg_carla_trap_s1",
    userId: "user_carla",
    shooterName: "Carla Dias",
    modality: "Trap Americano",
    stageNum: 1,
    score: 24.00, // 24 hits out of 25
    createdAt: "2026-04-05T15:00:00Z"
  },
  {
    id: "score_trap_carla_s2",
    championshipId: "champ_trap_completed",
    registrationId: "reg_carla_trap_s1",
    userId: "user_carla",
    shooterName: "Carla Dias",
    modality: "Trap Americano",
    stageNum: 2,
    score: 25.00, // Perfect round!
    createdAt: "2026-04-12T14:30:00Z"
  },
  {
    id: "score_trap_carla_s3",
    championshipId: "champ_trap_completed",
    registrationId: "reg_carla_trap_s1",
    userId: "user_carla",
    shooterName: "Carla Dias",
    modality: "Trap Americano",
    stageNum: 3,
    score: 23.00,
    createdAt: "2026-04-19T16:00:00Z"
  },
  {
    id: "score_trap_carla_s4",
    championshipId: "champ_trap_completed",
    registrationId: "reg_carla_trap_s1",
    userId: "user_carla",
    shooterName: "Carla Dias",
    modality: "Trap Americano",
    stageNum: 4,
    score: 25.00, // Perfect round!
    createdAt: "2026-04-26T14:00:00Z"
  },
  {
    id: "score_trap_roberto_s1",
    championshipId: "champ_trap_completed",
    registrationId: "reg_roberto_trap_s1",
    userId: "user_roberto",
    shooterName: "Roberto Silva",
    modality: "Trap Americano",
    stageNum: 1,
    score: 18.00,
    createdAt: "2026-04-05T15:15:00Z"
  },
  {
    id: "score_trap_roberto_s2",
    championshipId: "champ_trap_completed",
    registrationId: "reg_roberto_trap_s1",
    userId: "user_roberto",
    shooterName: "Roberto Silva",
    modality: "Trap Americano",
    stageNum: 2,
    score: 19.00,
    createdAt: "2026-04-12T14:45:00Z"
  },
  {
    id: "score_trap_roberto_s3",
    championshipId: "champ_trap_completed",
    registrationId: "reg_roberto_trap_s1",
    userId: "user_roberto",
    shooterName: "Roberto Silva",
    modality: "Trap Americano",
    stageNum: 3,
    score: 21.00,
    createdAt: "2026-04-19T16:15:00Z"
  },
  {
    id: "score_trap_roberto_s4",
    championshipId: "champ_trap_completed",
    registrationId: "reg_roberto_trap_s1",
    userId: "user_roberto",
    shooterName: "Roberto Silva",
    modality: "Trap Americano",
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
