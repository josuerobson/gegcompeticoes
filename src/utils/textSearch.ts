// Normaliza texto para comparação em filtros/buscas: minúsculas e sem
// acentos, para que "aranãs", "Aranãs" e "aranas" sejam todos equivalentes.
export function normalizeSearchText(value: string | null | undefined): string {
  if (!value) return '';
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}

// Atalho para o caso mais comum: haystack.includes(needle) já normalizado.
export function searchTextIncludes(haystack: string | null | undefined, needle: string | null | undefined): boolean {
  if (!needle) return true;
  return normalizeSearchText(haystack).includes(normalizeSearchText(needle));
}

// Extrai o Número de Série real da arma, priorizando weaponNumber/serialNumber
// quando não forem idênticos ao número SIGMA.
export function resolveWeaponSerial(w: { weaponNumber?: string; serialNumber?: string; sigmaNumber?: string } | null | undefined): string {
  if (!w) return 'S/N';
  const wn = (w.weaponNumber || '').trim();
  const sn = (w.serialNumber || '').trim();
  const sig = (w.sigmaNumber || '').trim();

  // Se weaponNumber existe e é diferente do sigma, este é o número da arma / série
  if (wn && wn !== sig) return wn;
  // Se serialNumber existe e é diferente do sigma, usa o serialNumber
  if (sn && sn !== sig) return sn;
  // Fallback: se houver weaponNumber ou serialNumber preenchido
  return wn || sn || sig || 'S/N';
}

// Formata o rótulo da arma colocando em evidência Nº DE SÉRIE e SIGMA, seguidos do MODELO
// Ex: "Série: AGL584781 • Sigma: 2002911378 — TAURUS PT 58 (380 Auto)"
export function formatWeaponLabel(w: {
  weaponNumber?: string;
  serialNumber?: string;
  sigmaNumber?: string;
  model?: string;
  manufacturer?: string;
  caliber?: string;
} | null | undefined): string {
  if (!w) return '';
  const serial = resolveWeaponSerial(w);
  const sigma = (w.sigmaNumber || '').trim() || 'N/A';
  const model = `${w.manufacturer || ''} ${w.model || ''}`.trim() || 'Modelo N/I';
  const caliber = w.caliber ? `(${w.caliber})` : '';
  return `Série: ${serial} • Sigma: ${sigma} — ${model} ${caliber}`.trim();
}
