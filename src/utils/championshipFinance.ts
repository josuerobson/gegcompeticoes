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
    if (r.valorPago && r.valorPago > 0 && r.valorPago !== 120) return acc + r.valorPago;
    if (r.registrationType === 'reinscrição') {
      return acc + (champ?.valorReinscricao ?? champ?.registrationFee ?? 0);
    }
    const isClub = Boolean(r.registeredByUserId && r.registeredByUserId !== r.userId);
    if (isClub) {
      return acc + (champ?.valorInscricaoClube ?? champ?.registrationFee ?? 0);
    }
    return acc + (champ?.valorInscricaoIndividual ?? champ?.registrationFee ?? 0);
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
