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
