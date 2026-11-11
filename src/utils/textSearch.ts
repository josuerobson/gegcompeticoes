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

const INVALID_EXACT_WEAPON_CODES = new Set(['S/N', 'N/A', 'SN', '-', '--', '—']);

export interface WeaponTargetAthlete {
  id?: string | null;
  cpf?: string | null;
}

export interface SelectableWeaponFields {
  id?: string;
  ownerId?: string | null;
  ownerType?: string | null;
  cpf?: string | null;
  weaponNumber?: string | null;
  serialNumber?: string | null;
  sigmaNumber?: string | null;
  model?: string | null;
  manufacturer?: string | null;
  caliber?: string | null;
  weaponClass?: string | null;
}

/**
 * Indica se a arma está efetivamente vinculada ao atleta informado
 * (excluindo armas pendentes de atribuição e armas de acervo do clube/terceiros).
 */
export function isWeaponLinkedToAthlete(
  w: SelectableWeaponFields | null | undefined,
  athlete?: WeaponTargetAthlete | null
): boolean {
  if (!w || !athlete?.id) return false;
  if (w.ownerType === 'pendente' || w.ownerType === 'clube') return false;
  if (w.ownerId && w.ownerId === athlete.id) return true;
  const weaponCpf = (w.cpf || '').replace(/\D/g, '');
  const athleteCpf = (athlete.cpf || '').replace(/\D/g, '');
  return Boolean(weaponCpf && athleteCpf && weaponCpf === athleteCpf);
}

/**
 * Correspondência estrita por Nº de Série completo ou Nº SIGMA completo
 * para armas NÃO vinculadas ao atleta — impede listagem/seleção parcial.
 */
export function matchesExactWeaponIdentifier(
  w: SelectableWeaponFields | null | undefined,
  rawQuery: string | null | undefined
): boolean {
  if (!w) return false;
  const q = (rawQuery || '').trim().toUpperCase();
  if (!q || INVALID_EXACT_WEAPON_CODES.has(q)) return false;
  const candidates = [w.weaponNumber, w.serialNumber, w.sigmaNumber]
    .map(v => (v || '').trim().toUpperCase())
    .filter(v => Boolean(v) && !INVALID_EXACT_WEAPON_CODES.has(v));
  return candidates.includes(q);
}

/**
 * Filtro textual flexível permitido APENAS para armas já vinculadas ao atleta.
 */
export function matchesLinkedWeaponQuery(
  w: SelectableWeaponFields,
  rawQuery: string | null | undefined
): boolean {
  const q = normalizeSearchText((rawQuery || '').trim());
  if (!q) return true;
  const serial = resolveWeaponSerial({
    weaponNumber: w.weaponNumber || undefined,
    serialNumber: w.serialNumber || undefined,
    sigmaNumber: w.sigmaNumber || undefined,
  });
  const haystack = normalizeSearchText(
    `${w.manufacturer || ''} ${w.model || ''} ${w.caliber || ''} ${w.sigmaNumber || ''} ${w.weaponNumber || ''} ${w.serialNumber || ''} ${serial} ${w.weaponClass || ''}`
  );
  return haystack.includes(q);
}

/**
 * Retorna true se a arma não possui CPF/proprietário vinculado (e não pertence ao acervo do clube),
 * podendo ter sua posse requerida por um atleta via Série ou SIGMA exato.
 */
export function isWeaponClaimable(w: SelectableWeaponFields | null | undefined): boolean {
  if (!w) return false;
  const ownerType = String(w.ownerType || '').trim().toLowerCase();
  if (ownerType === 'clube') return false;
  if (ownerType === 'pendente') return true;
  const cleanCpf = String(w.cpf || '').replace(/\D/g, '');
  return !cleanCpf && !w.ownerId;
}

/**
 * Separa e filtra armas selecionáveis:
 * - linked: lista normal das armas vinculadas ao atleta (busca livre/listagem completa).
 * - exactUnlinked: armas não vinculadas encontradas SOMENTE por Nº de Série ou SIGMA exato completo.
 */
export function filterSelectableWeapons<T extends SelectableWeaponFields>(
  weaponsList: T[],
  athlete: WeaponTargetAthlete | null | undefined,
  rawQuery: string | null | undefined
): { linked: T[]; exactUnlinked: T[]; all: T[] } {
  const linked: T[] = [];
  const exactUnlinked: T[] = [];
  for (const w of weaponsList || []) {
    if (!w) continue;
    if (isWeaponLinkedToAthlete(w, athlete)) {
      if (matchesLinkedWeaponQuery(w, rawQuery)) linked.push(w);
    } else if (matchesExactWeaponIdentifier(w, rawQuery)) {
      exactUnlinked.push(w);
    }
  }
  return { linked, exactUnlinked, all: [...linked, ...exactUnlinked] };
}
