import React, { useState, useEffect } from 'react';
import { ShieldCheck, CheckCircle2, XCircle, AlertTriangle, Building2, User, Calendar, ShieldAlert, Award, ArrowLeft, Printer, RefreshCw } from 'lucide-react';
import logoGgCompeticoes from '@/assets/logo_gg_competicoes.png';

interface CardValidationViewProps {
  userId: string;
  onGoHome?: () => void;
}

interface ValidationData {
  valid: boolean;
  statusMessage: string;
  expirationDate: string;
  athlete?: {
    id: string;
    fullName: string;
    avatarUrl: string;
    crNumber: string;
    cpfMasked: string;
    city: string;
    state: string;
    memberSince: string;
    crValidity?: string;
    signatureExpiry?: string;
    role: string;
  };
  club?: {
    id?: string;
    name: string;
    cnpj?: string;
    crNumber?: string;
    city?: string;
    state?: string;
    logoUrl?: string;
  };
  validationHash?: string;
  validatedAt?: string;
  error?: string;
}

export default function CardValidationView({ userId, onGoHome }: CardValidationViewProps) {
  const [data, setData] = useState<ValidationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');

  const fetchValidation = () => {
    setLoading(true);
    setFetchError('');
    fetch(`/api/public/validar/carteirinha/${userId}`)
      .then((r) => {
        if (!r.ok && r.status !== 404) {
          throw new Error('Falha ao conectar com o servidor de verificação.');
        }
        return r.json();
      })
      .then((resData) => {
        setData(resData);
      })
      .catch((err) => {
        console.error('Error validating card:', err);
        setFetchError('Não foi possível verificar a carteirinha no momento.');
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchValidation();
  }, [userId]);

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
              PAINEL DE AUDITORIA DE AUTENTICIDADE
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
            <p className="text-sm font-bold text-slate-300">Verificando autenticidade no Registro Nacional G&G...</p>
            <p className="text-xs text-slate-500 font-mono">ID: {userId}</p>
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
                    <CheckCircle2 className="w-10 h-10 text-emerald-400" />
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
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                          : 'bg-red-500/20 text-red-300 border-red-500/30'
                      }`}
                    >
                      {data.valid ? 'VALIDAÇÃO OFICIAL CONCLUÍDA' : 'REGISTRO EXPIRADO OU INVÁLIDO'}
                    </span>
                    {data.validationHash && (
                      <span className="text-[10px] font-mono text-slate-400 bg-slate-900/80 px-2 py-0.5 rounded border border-slate-800">
                        {data.validationHash}
                      </span>
                    )}
                  </div>

                  <h2 className="text-xl sm:text-2xl font-display font-black tracking-wide text-white uppercase">
                    {data.statusMessage}
                  </h2>

                  <p className="text-xs text-slate-300 font-mono">
                    Validade da Filiação: <strong className={data.valid ? 'text-emerald-400' : 'text-red-400'}>{data.expirationDate}</strong>
                  </p>
                </div>
              </div>
            </div>

            {/* Athlete Details Card */}
            {data.athlete && (
              <div className="bg-slate-900/90 rounded-3xl border border-slate-800 p-6 sm:p-8 space-y-6 shadow-xl relative">
                <div className="flex justify-between items-center border-b border-slate-800 pb-4">
                  <h3 className="font-display font-bold text-white text-sm uppercase tracking-wider flex items-center gap-2">
                    <User className="w-4 h-4 text-cyan-400" />
                    Dados Cadastrais do Atleta de Tiro Desportivo
                  </h3>
                  <span className="text-[10px] font-mono text-slate-400 uppercase bg-slate-950 px-2.5 py-1 rounded-md border border-slate-800">
                    Selo Nacional G&G
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row gap-6 items-center sm:items-start">
                  {/* Photo 3x4 */}
                  <div className="w-[100px] h-[130px] rounded-2xl bg-slate-950 border-2 border-slate-700 shadow-md overflow-hidden shrink-0 flex items-center justify-center relative">
                    <img
                      src={data.athlete.avatarUrl}
                      alt={data.athlete.fullName}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80";
                      }}
                    />
                    <div className="absolute bottom-0 inset-x-0 bg-slate-950/80 backdrop-blur-xs py-0.5 text-center text-[7px] font-mono text-cyan-300 uppercase">
                      FOTO 3X4 ATLETA
                    </div>
                  </div>

                  {/* Info Grid */}
                  <div className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
                    <div className="col-span-1 sm:col-span-2 bg-slate-950/60 p-3 rounded-2xl border border-slate-800">
                      <span className="text-[9px] text-slate-400 uppercase tracking-widest block">Nome Completo do Atleta:</span>
                      <span className="text-sm font-bold text-white block uppercase mt-0.5">{data.athlete.fullName}</span>
                    </div>

                    <div className="bg-slate-950/60 p-3 rounded-2xl border border-slate-800">
                      <span className="text-[9px] text-slate-400 uppercase tracking-widest block">Número do CR (Exército):</span>
                      <span className="text-xs font-extrabold text-cyan-300 block mt-0.5">{data.athlete.crNumber}</span>
                    </div>

                    <div className="bg-slate-950/60 p-3 rounded-2xl border border-slate-800">
                      <span className="text-[9px] text-slate-400 uppercase tracking-widest block">CPF (Protegido por LGPD):</span>
                      <span className="text-xs font-bold text-slate-200 block mt-0.5">{data.athlete.cpfMasked}</span>
                    </div>

                    <div className="bg-slate-950/60 p-3 rounded-2xl border border-slate-800">
                      <span className="text-[9px] text-slate-400 uppercase tracking-widest block">Município / UF:</span>
                      <span className="text-xs font-bold text-slate-200 block mt-0.5">{data.athlete.city} - {data.athlete.state}</span>
                    </div>

                    <div className="bg-slate-950/60 p-3 rounded-2xl border border-slate-800">
                      <span className="text-[9px] text-slate-400 uppercase tracking-widest block">Status do Cadastro:</span>
                      <span className={`text-xs font-extrabold uppercase block mt-0.5 ${data.valid ? 'text-emerald-400' : 'text-red-400'}`}>
                        {data.valid ? 'Ativo & Regular' : 'Inativo / Pendente'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Club Info Card */}
            {data.club && (
              <div className="bg-slate-900/90 rounded-3xl border border-slate-800 p-6 sm:p-8 space-y-4 shadow-xl">
                <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                  <h3 className="font-display font-bold text-white text-sm uppercase tracking-wider flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-cyan-400" />
                    Unidade Filiada / Clube Registrado
                  </h3>
                  <span className="text-[10px] font-mono text-cyan-300 bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-800/40">
                    Clube Homologado
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
                  <div className="sm:col-span-2 bg-slate-950/60 p-3 rounded-2xl border border-slate-800">
                    <span className="text-[9px] text-slate-400 uppercase tracking-widest block">Razão Social / Nome Fantasia:</span>
                    <span className="text-xs font-bold text-white block uppercase mt-0.5">{data.club.name}</span>
                  </div>

                  <div className="bg-slate-950/60 p-3 rounded-2xl border border-slate-800">
                    <span className="text-[9px] text-slate-400 uppercase tracking-widest block">CNPJ do Clube:</span>
                    <span className="text-xs font-bold text-slate-300 block mt-0.5">{data.club.cnpj || 'Registrado'}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Audit Security Footer Card */}
            <div className="bg-slate-950 rounded-2xl border border-slate-800/80 p-4 text-[10px] font-mono text-slate-400 flex flex-col sm:flex-row justify-between items-center gap-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Consulta autenticada em <strong>{new Date().toLocaleString('pt-BR')}</strong></span>
              </div>

              <button
                onClick={handlePrint}
                className="bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white px-3 py-1.5 rounded-lg border border-slate-700 transition flex items-center gap-1.5 font-bold cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                Imprimir Comprovante de Auditoria
              </button>
            </div>
          </div>
        ) : null}
      </main>

      {/* Footer */}
      <footer className="max-w-3xl w-full mx-auto text-center pt-6 border-t border-slate-800 text-[10px] text-slate-500 font-mono relative z-10">
        Plataforma G&G Competições &copy; {new Date().getFullYear()} &bull; Todos os direitos reservados.
      </footer>
    </div>
  );
}
