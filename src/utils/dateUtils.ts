/**
 * Utilitários para sincronização estrita com o fuso horário oficial de Brasília / São Paulo (America/Sao_Paulo - UTC-3).
 *
 * Evita bugs onde o horário UTC (GMT+0) grava treinos e competições após as 22:00
 * (horário em que os estandes de tiro obrigatoriamente já estão fechados pela regulamentação do Exército / SFPC).
 */

export const SAO_PAULO_TZ = 'America/Sao_Paulo';

/**
 * Retorna string YYYY-MM-DDTHH:mm estritamente no fuso horário de São Paulo (UTC-3),
 * ideal para inputs do tipo datetime-local.
 */
export function getLocalSaoPauloDateTime(date?: Date | string | null): string {
  const d = date ? (typeof date === 'string' ? new Date(date) : date) : new Date();
  if (isNaN(d.getTime())) return '';

  const formatter = new Intl.DateTimeFormat('pt-BR', {
    timeZone: SAO_PAULO_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });

  const parts: Record<string, string> = {};
  formatter.formatToParts(d).forEach(p => { parts[p.type] = p.value; });
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}

/**
 * Retorna string YYYY-MM-DD estritamente no fuso horário de São Paulo.
 */
export function getLocalSaoPauloDate(date?: Date | string | null): string {
  const d = date ? (typeof date === 'string' ? new Date(date) : date) : new Date();
  if (isNaN(d.getTime())) return '';

  const formatter = new Intl.DateTimeFormat('pt-BR', {
    timeZone: SAO_PAULO_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });

  const parts: Record<string, string> = {};
  formatter.formatToParts(d).forEach(p => { parts[p.type] = p.value; });
  return `${parts.year}-${parts.month}-${parts.day}`;
}

/**
 * Retorna string HH:mm estritamente no fuso horário de São Paulo.
 */
export function getLocalSaoPauloTime(date?: Date | string | null): string {
  const d = date ? (typeof date === 'string' ? new Date(date) : date) : new Date();
  if (isNaN(d.getTime())) return '';

  const formatter = new Intl.DateTimeFormat('pt-BR', {
    timeZone: SAO_PAULO_TZ,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });

  return formatter.format(d);
}

/**
 * Formata qualquer data ou timestamp (mesmo que venha em UTC ISO do banco/backend)
 * para exibição em português no padrão DD/MM/AAAA às HH:mm no fuso de São Paulo.
 */
export function formatDisplayDateTime(val?: string | Date | null): string {
  if (!val) return 'Data não informada';
  if (val instanceof Date) {
    if (isNaN(val.getTime())) return 'Data não informada';
    return new Intl.DateTimeFormat('pt-BR', {
      timeZone: SAO_PAULO_TZ,
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).format(val).replace(',', ' às');
  }

  const str = String(val).trim();
  if (!str) return 'Data não informada';

  // Se for ISO completo com Z ou offset UTC ou horário UTC de banco
  if (str.includes('Z') || /[+-]\d{2}(?::?\d{2})?$/.test(str) || /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(str)) {
    const parsed = new Date(str);
    if (!isNaN(parsed.getTime())) {
      return new Intl.DateTimeFormat('pt-BR', {
        timeZone: SAO_PAULO_TZ,
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      }).format(parsed).replace(',', ' às');
    }
  }

  // Se já for DD/MM/YYYY [HH:mm]
  const brMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
  if (brMatch) {
    const [, d, m, y, hh, mm] = brMatch;
    const timePart = hh !== undefined ? ` às ${hh.padStart(2, '0')}:${mm.padStart(2, '0')}` : '';
    return `${d.padStart(2, '0')}/${m.padStart(2, '0')}/${y}${timePart}`;
  }

  // Se for YYYY-MM-DD ou YYYY-MM-DD HH:mm:ss sem timezone
  const isoMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T\s](\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
  if (isoMatch) {
    const [, y, m, d, hh, mm] = isoMatch;
    const timePart = hh !== undefined ? ` às ${hh.padStart(2, '0')}:${mm.padStart(2, '0')}` : '';
    return `${d}/${m}/${y}${timePart}`;
  }

  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    return new Intl.DateTimeFormat('pt-BR', {
      timeZone: SAO_PAULO_TZ,
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).format(parsed).replace(',', ' às');
  }

  return str;
}
