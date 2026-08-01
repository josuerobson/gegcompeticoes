import React, { useState, useEffect } from 'react';
import { Award, CheckCircle2, XCircle, AlertTriangle, Building2, User, Calendar, ShieldCheck, ArrowLeft, Printer, RefreshCw, Trophy, Target } from 'lucide-react';
import logoGgCompeticoes from '@/assets/logo_gg_competicoes.png';

interface CertificateValidationViewProps {
  certId: string;
  onGoHome?: () => void;
}

interface CertValidationData {
  valid: boolean;
  statusMessage: string;
  certificate?: {
    code: string;
    registrationId: string;
    athleteName: string;
    cpfMasked: string;
    crNumber: string;
    avatarUrl?: string;
    championshipTitle: string;
    modalityName: string;
    totalScore: number;
    position: string;
    medal: string;
    clubName: string;
    clubCity?: string;
    clubState?: string;
    clubLogoUrl?: string;
    registeredAt?: string;
    approvedAt?: string;
  };
  validationHash?: string;
  validatedAt?: string;
  error?: string;
}

export default function CertificateValidationView({ certId, onGoHome }: CertificateValidationViewProps) {
  const [data, setData] = useState<CertValidationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');

  const fetchValidation = () => {
    setLoading(true);
    setFetchError('');
    fetch(`/api/public/validar/certificado/${certId}`)
      .then((r) => {
        if (!r.ok && r.status !== 404) {
          throw new Error('Falha ao conectar com o servidor de verificação de certificado.');
        }
        return r.json();
      })
      .then((resData) => {
        setData(resData);
      })
      .catch((err) => {
        console.error('Error validating certificate:', err);
        setFetchError('Não foi possível verificar a autenticidade do certificado no momento.');
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchValidation();
  }, [certId]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between p-4 sm:p-8 font-sans selection:bg-cyan-500 selection:text-slate-950">
      {/* Background ambient glow */}
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(6,182,212,0.15),transparent_60%)] pointer-events-none" />

      {/* Top Header Navigation */}
      <header className="max-w-3xl w-full mx-auto flex justify-between items-center pb-6 border-b border-slate-800 relative z-10">
        <div className="flex items-center gap-3">
          <img src={logoGgCompeticoes} alt="G&G Competições" className="h-10 w-auto object-contain" />
          <div>
            <h1 className="font-display font-black text-lg text-white tracking-wider flex items-center gap-1.5 leading-none">
              G<span className="text-cyan-400">&</span>G COMPETIÇÕES
            </h1>
            <span className="text-[9px] font-mono text-cyan-300 tracking-widest block uppercase mt-0.5">
              AUDITORIA DE AUTENTICIDADE DE CERTIFICADOS
            </span>
          </div>
        </div>

        {onGoHome && (
          <button
            onClick={onGoHome}
            className="bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 text-xs px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 font-bold cursor-pointer shadow-xs"
          >
            <ArrowLeft className="w-4 h-4 text-cyan-400" />
            Ir para o Site
          </button>
        )}
      </header>

      {/* Main Content Area */}
      <main className="max-w-3xl w-full mx-auto my-auto py-8 relative z-10 space-y-6">
        {loading ? (
          <div className="bg-slate-900/80 backdrop-blur-md rounded-3xl border border-slate-800 p-12 text-center space-y-4 shadow-2xl">
            <RefreshCw className="w-10 h-10 text-cyan-400 animate-spin mx-auto" />
            <p className="text-sm font-bold text-slate-300">Verificando registro do certificado no banco oficial G&G...</p>
            <p className="text-xs text-slate-500 font-mono">CÓDIGO: {certId}</p>
          </div>
        ) : fetchError ? (
          <div className="bg-slate-900/80 backdrop-blur-md rounded-3xl border border-red-500/30 p-8 text-center space-y-4 shadow-2xl">
            <AlertTriangle className="w-12 h-12 text-red-500 mx-auto" />
            <h2 className="text-lg font-bold text-red-400">Erro na Consulta de Autenticidade</h2>
            <p className="text-xs text-slate-400">{fetchError}</p>
            <button
              onClick={fetchValidation}
              className="bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition cursor-pointer"
            >
              Tentar Novamente
            </button>
          </div>
        ) : data ? (
          <div className="space-y-6">
            {/* Status Banner */}
            <div
              className={`rounded-3xl p-6 sm:p-8 border shadow-2xl backdrop-blur-md relative overflow-hidden transition ${
                data.valid
                  ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-100'
                  : 'bg-red-950/40 border-red-500/50 text-red-100'
              }`}
            >
              <div className="flex flex-col sm:flex-row items-center gap-5 text-center sm:text-left relative z-10">
                {data.valid ? (
                  <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center shrink-0 shadow-[0_0_20px_rgba(16,185,129,0.3)]">
                    <Award className="w-10 h-10 text-emerald-400" />
                  </div>
                ) : (
                  <div className="w-16 h-16 rounded-2xl bg-red-500/20 border-2 border-red-400 flex items-center justify-center shrink-0 shadow-[0_0_20px_rgba(239,68,68,0.3)]">
                    <XCircle className="w-10 h-10 text-red-400" />
                  </div>
                )}

                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2 justify-center sm:justify-start flex-wrap">
                    <span
                      className={`text-[10px] font-black tracking-widest uppercase px-2.5 py-0.5 rounded-full border ${
                        data.valid
                          ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                          : 'bg-red-500/20 border-red-400 text-red-300'
                      }`}
                    >
                      {data.valid ? 'DOCUMENTO AUTÊNTICO' : 'INVÁLIDO / NÃO REGISTRADO'}
                    </span>
                    {data.validationHash && (
                      <span className="text-[10px] font-mono text-slate-400 bg-slate-900/80 px-2 py-0.5 rounded-full border border-slate-700">
                        {data.validationHash}
                      </span>
                    )}
                  </div>
                  <h2 className="font-display font-extrabold text-xl sm:text-2xl text-white tracking-wide">
                    {data.statusMessage}
                  </h2>
                  <p className="text-xs text-slate-300 font-medium">
                    {data.valid
                      ? 'Este certificado de participação foi emitido e homologado pela plataforma oficial G&G Competições.'
                      : data.error || 'O código informado não corresponde a nenhum certificado oficial registrado.'}
                  </p>
                </div>
              </div>
            </div>

            {/* Certificate Details Card */}
            {data.valid && data.certificate && (
              <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl backdrop-blur-md">
                {/* Athlete Header */}
                <div className="flex flex-col sm:flex-row items-center gap-4 pb-6 border-b border-slate-800 text-center sm:text-left">
                  {data.certificate.avatarUrl ? (
                    <img
                      src={data.certificate.avatarUrl}
                      alt={data.certificate.athleteName}
                      className="w-16 h-16 rounded-2xl object-cover border-2 border-cyan-500/50 shadow-md"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-2xl bg-slate-800 border-2 border-slate-700 flex items-center justify-center text-slate-400">
                      <User className="w-8 h-8" />
                    </div>
                  )}
                  <div className="space-y-1">
                    <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-wider block">
                      Atleta de Tiro Desportivo
                    </span>
                    <h3 className="text-lg font-bold text-white">{data.certificate.athleteName}</h3>
                    <div className="flex items-center gap-3 text-xs font-mono text-slate-400 flex-wrap justify-center sm:justify-start">
                      <span>CR nº <strong>{data.certificate.crNumber}</strong></span>
                      <span>•</span>
                      <span>CPF: <strong>{data.certificate.cpfMasked}</strong></span>
                    </div>
                  </div>
                </div>

                {/* Competition Details Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-slate-950/60 border border-slate-800 p-4 rounded-2xl space-y-1">
                    <span className="text-[10px] font-mono text-slate-400 uppercase block">Campeonato</span>
                    <p className="font-bold text-white text-sm">{data.certificate.championshipTitle}</p>
                    <p className="text-xs text-cyan-400 font-semibold">{data.certificate.modalityName}</p>
                  </div>

                  <div className="bg-slate-950/60 border border-slate-800 p-4 rounded-2xl space-y-1">
                    <span className="text-[10px] font-mono text-slate-400 uppercase block">Resultado / Classificação</span>
                    <p className="font-bold text-amber-400 text-sm">{data.certificate.position} ({data.certificate.medal})</p>
                    <p className="text-xs text-emerald-400 font-mono">Pontuação Total: {data.certificate.totalScore.toFixed(2)} pts</p>
                  </div>

                  <div className="bg-slate-950/60 border border-slate-800 p-4 rounded-2xl space-y-1 sm:col-span-2">
                    <span className="text-[10px] font-mono text-slate-400 uppercase block">Entidade / Clube Organizador</span>
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-cyan-400 shrink-0" />
                      <span className="font-bold text-white text-sm">{data.certificate.clubName}</span>
                      {data.certificate.clubCity && (
                        <span className="text-xs text-slate-400 font-mono">({data.certificate.clubCity}/{data.certificate.clubState})</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Validation Footer Stamp */}
                <div className="pt-4 border-t border-slate-800 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs font-mono text-slate-400">
                  <div className="flex items-center gap-2 text-emerald-400">
                    <ShieldCheck className="w-4 h-4" />
                    <span>Registro Oficial Homologado no Sistema G&G Competições</span>
                  </div>
                  {data.validatedAt && (
                    <span>Auditado em: {new Date(data.validatedAt).toLocaleString('pt-BR')}</span>
                  )}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 justify-center pt-2">
              <button
                onClick={handlePrint}
                className="bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 font-bold text-xs px-5 py-3 rounded-2xl transition flex items-center gap-2 cursor-pointer shadow-md"
              >
                <Printer className="w-4 h-4 text-cyan-400" />
                Imprimir Comprovante de Auditoria
              </button>
            </div>
          </div>
        ) : null}
      </main>

      {/* Footer */}
      <footer className="max-w-3xl w-full mx-auto text-center pt-6 border-t border-slate-800/80 text-[10px] text-slate-500 font-mono relative z-10 space-y-1">
        <p>© 2026 G&G Competições — Plataforma Oficial de Tiro Esportivo</p>
        <p className="text-slate-600">Sistema de verificação pública de autenticidade de documentos e certificados com proteção LGPD.</p>
      </footer>
    </div>
  );
}
