import { Championship, Registration } from '../types';

export interface RevenueBreakdown {
  totalCount: number;
  totalInscricoes: number;
  totalReinscricoes: number;
  totalArrecadado: number;
  percentualTributos: number;
  percentualOrganizacao: number;
  percentualClubes: number;
  percentualPremiacaoAtleta: number;
  percentualPremiacaoClube: number;
  vTributos: number;
  vOrganizacao: number;
  vClubes: number;
  vPremiacaoAtleta: number;
  vPremiacaoEquipes: number;
}

// Divisão do valor arrecadado em inscrições (+ reinscrições) entre
// Tributos / Organização / Clubes / Premiação Atletas / Premiação Equipes.
// Mesma fórmula usada no modal "Dados da Premiação" (ChampionshipsView.tsx)
// e na bonificação "Todas as Etapas" do resultado consolidado
// (CompetitionResultsViewer.tsx) — centralizada aqui para não haver cálculos
// divergentes no sistema (ver "cascata de premiação" no CLAUDE.md).
export function computeRevenueBreakdown(champ: Championship | undefined | null, regs: Registration[]): RevenueBreakdown {
  const totalCount = regs.length;
  const totalReinscricoes = regs.filter(r => r.registrationType === 'reinscrição').length;
  const totalInscricoes = totalCount - totalReinscricoes;

  const totalArrecadado = regs.reduce((acc, r) => {
    const isReinscricao = r.registrationType === 'reinscrição';
    const isClub = Boolean(r.registeredByUserId && r.registeredByUserId !== r.userId);

    // Se o campeonato possui valores nominais configurados (individual, reinscrição, clube ou taxa padrão),
    // usa a tabela nominal oficial (mesma regra do legado, onde a arrecadação base não sofre deduções
    // operacionais de repasse de clube gravadas em valorPago).
    const nominalFee = isReinscricao
      ? (champ?.valorReinscricao ?? (champ?.registrationFee ? champ.registrationFee * 0.5 : 0))
      : isClub
        ? (champ?.valorInscricaoClube ?? champ?.valorInscricaoIndividual ?? champ?.registrationFee ?? 0)
        : (champ?.valorInscricaoIndividual ?? champ?.registrationFee ?? 0);

    if (nominalFee > 0) {
      return acc + nominalFee;
    }

    // Fallback caso não haja tarifas nominais cadastradas no campeonato
    if (r.valorPago && r.valorPago > 0 && r.valorPago !== 120) return acc + r.valorPago;
    return acc + (champ?.registrationFee ?? 0);
  }, 0);

  const percentualTributos = champ?.percentualTributos ?? 0;
  const percentualOrganizacao = champ?.percentualOrganizacao ?? 0;
  const percentualClubes = champ?.percentualClubes ?? champ?.percentualClube ?? 30;
  const percentualPremiacaoAtleta = champ?.percentualPremiacaoAtleta ?? 30;
  const percentualPremiacaoClube = champ?.percentualPremiacaoClube ?? 0;

  return {
    totalCount,
    totalInscricoes,
    totalReinscricoes,
    totalArrecadado,
    percentualTributos,
    percentualOrganizacao,
    percentualClubes,
    percentualPremiacaoAtleta,
    percentualPremiacaoClube,
    vTributos: totalArrecadado * (percentualTributos / 100),
    vOrganizacao: totalArrecadado * (percentualOrganizacao / 100),
    vClubes: totalArrecadado * (percentualClubes / 100),
    vPremiacaoAtleta: totalArrecadado * (percentualPremiacaoAtleta / 100),
    vPremiacaoEquipes: totalArrecadado * (percentualPremiacaoClube / 100),
  };
}

export interface TodasEtapasPrizeBreakdown {
  pTodasEtapasSlice: number;
  vAdicionalTodasEtapas: number;
  vPoolTodasEtapas: number;
  pPosTodas: number[];
  prizes: { position: number; percent: number; value: number }[];
}

// Premiação acumulada "Todas as Etapas" para atletas — fatia dentro do % Atletas
// mais premiação adicional e curva do 1º ao 5º lugar. Centralizada aqui para
// manter ChampionshipsView.tsx, CompetitionResultsViewer.tsx e
// ChampionshipFinanceReport.tsx rigorosamente alinhados.
export function computeTodasEtapasPrize(
  champ: Championship | undefined | null,
  vPremiacaoAtleta: number,
  additionalOverride?: number
): TodasEtapasPrizeBreakdown {
  const pTodasEtapasSlice = champ?.percentualPremiacaoTodasEtapas ?? 30;
  const vAdicionalTodasEtapas = additionalOverride !== undefined ? additionalOverride : (champ?.premiacaoAdicionalTodasEtapas ?? 0);
  const vPoolTodasEtapas = (vPremiacaoAtleta * (pTodasEtapasSlice / 100)) + vAdicionalTodasEtapas;
  const pPosTodas = [
    champ?.percentualPos1TodasEtapas ?? 40,
    champ?.percentualPos2TodasEtapas ?? 25,
    champ?.percentualPos3TodasEtapas ?? 15,
    champ?.percentualPos4TodasEtapas ?? 12,
    champ?.percentualPos5TodasEtapas ?? 8,
  ];
  const prizes = pPosTodas.map((percent, idx) => ({
    position: idx + 1,
    percent,
    value: vPoolTodasEtapas * (percent / 100),
  }));

  return {
    pTodasEtapasSlice,
    vAdicionalTodasEtapas,
    vPoolTodasEtapas,
    pPosTodas,
    prizes,
  };
}
