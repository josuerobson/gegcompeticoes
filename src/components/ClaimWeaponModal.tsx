import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { ShieldCheck, X, AlertCircle, Calendar, Crosshair } from 'lucide-react';
import { Weapon } from '../types';
import { resolveWeaponSerial } from '../utils/textSearch';

export interface ClaimWeaponModalProps {
  isOpen: boolean;
  weapon: Weapon | null;
  athlete: { id: string; fullName?: string; cpf?: string } | null;
  actingUserId?: string;
  searchedIdentifier: string;
  onClose: () => void;
  onClaimed: (claimedWeapon: Weapon) => void | Promise<void>;
}

export default function ClaimWeaponModal({
  isOpen,
  weapon,
  athlete,
  actingUserId,
  searchedIdentifier,
  onClose,
  onClaimed,
}: ClaimWeaponModalProps) {
  const [gtExpirationDate, setGtExpirationDate] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setGtExpirationDate(weapon?.gtExpirationDate || '');
      setError(null);
      setSubmitting(false);
    }
  }, [isOpen, weapon?.id]);

  if (!isOpen || !weapon || !athlete) return null;

  const cleanCpf = String(athlete.cpf || '').replace(/\D/g, '');
  const hasValidCpf = cleanCpf.length >= 11;
  const serial = resolveWeaponSerial(weapon);
  const sigma = (weapon.sigmaNumber || '').trim() || 'N/I';
  const weaponTitle = `${weapon.manufacturer || ''} ${weapon.model || ''}`.trim() || 'Arma sem modelo';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasValidCpf) {
      setError('É necessário possuir um CPF válido cadastrado no perfil do atleta para requerer a posse.');
      return;
    }
    if (!gtExpirationDate.trim()) {
      setError('Informe a data de vencimento da Guia de Trânsito.');
      return;
    }

    const effectiveIdentifier =
      searchedIdentifier.trim() ||
      (weapon.sigmaNumber || '').trim() ||
      (weapon.weaponNumber || '').trim() ||
      (weapon.serialNumber || '').trim();

    setSubmitting(true);
    setError(null);
    try {
      const token = localStorage.getItem('gg_token');
      const userIdHeader = actingUserId || athlete.id;
      const res = await fetch(`/api/weapons/${encodeURIComponent(weapon.id)}/claim`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(userIdHeader ? { 'x-user-id': userIdHeader } : {}),
        },
        body: JSON.stringify({
          identifier: effectiveIdentifier,
          gtExpirationDate: gtExpirationDate.trim(),
          targetUserId: athlete.id,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.weapon) {
        setError(data.error || 'Não foi possível requerer a posse desta arma.');
        setSubmitting(false);
        return;
      }
      await onClaimed(data.weapon as Weapon);
      onClose();
    } catch {
      setError('Erro de comunicação ao tentar requerer a posse da arma.');
    } finally {
      setSubmitting(false);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[10000] bg-slate-900/60 backdrop-blur-[2px] flex items-center justify-center p-4"
      onClick={() => !submitting && onClose()}
    >
      <div
        className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        onClick={e => e.stopPropagation()}
      >
        <div className="px-5 py-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-5 h-5 shrink-0" />
            <div>
              <h3 className="text-sm font-black leading-tight">Requerer Posse da Arma</h3>
              <p className="text-[11px] text-amber-50 font-medium">
                Vincular ao CPF e registrar Guia de Trânsito
              </p>
            </div>
          </div>
          <button
            type="button"
            disabled={submitting}
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-white/20 transition disabled:opacity-50"
            title="Fechar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-1">
            <div className="flex items-center gap-1.5 text-[11px] font-extrabold text-slate-700">
              <Crosshair className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span>{weaponTitle}</span>
              {weapon.caliber && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-200/70 text-slate-700">
                  {weapon.caliber}
                </span>
              )}
            </div>
            <div className="text-[11px] text-slate-600 font-semibold">
              Série: <span className="font-mono text-slate-800">{serial}</span> • SIGMA:{' '}
              <span className="font-mono text-slate-800">{sigma}</span>
            </div>
            {weapon.weaponClass && (
              <div className="text-[10px] text-slate-500 font-medium">
                Classe: {weapon.weaponClass}
              </div>
            )}
          </div>

          <div className="bg-blue-50/80 border border-blue-200 rounded-xl p-3">
            <div className="text-[10px] font-black uppercase tracking-wider text-blue-700 mb-1">
              Vínculo de CPF do Atleta
            </div>
            <div className="text-xs font-bold text-slate-800">
              {athlete.fullName || 'Atleta Selecionado'}
            </div>
            <div className="text-[11px] font-mono font-bold text-slate-700 mt-0.5">
              CPF: {athlete.cpf || 'Não cadastrado'}
            </div>
            {!hasValidCpf && (
              <p className="mt-1.5 text-[11px] text-red-700 font-bold flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                Cadastre um CPF válido no perfil do atleta antes de requerer esta arma.
              </p>
            )}
          </div>

          <div>
            <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700 mb-1.5 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-blue-600" />
              Vencimento da Guia de Trânsito (GT) *
            </label>
            <input
              type="date"
              required
              value={gtExpirationDate}
              onChange={e => setGtExpirationDate(e.target.value)}
              className="w-full px-3 py-2 text-xs font-bold bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-slate-800"
            />
            <p className="mt-1 text-[10px] text-slate-500 font-medium">
              Ao confirmar, esta arma ficará vinculada permanentemente ao seu CPF como arma própria.
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-3 py-2 text-[11px] font-bold flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              disabled={submitting}
              onClick={onClose}
              className="px-3.5 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting || !hasValidCpf || !gtExpirationDate}
              className="px-4 py-2 text-xs font-black text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-sm transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
            >
              <ShieldCheck className="w-4 h-4" />
              {submitting ? 'Vinculando...' : 'Requerer Posse'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
