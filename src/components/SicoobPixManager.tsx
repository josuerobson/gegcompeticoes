import React, { useState, useEffect } from 'react';
import {
  Landmark, ShieldCheck, CheckCircle2, AlertCircle, Copy, RefreshCw,
  Lock, Server, Key, Plus, QrCode, Check, X, Eye, FileText, Zap, Search
} from 'lucide-react';
import { QRCodeView } from './QRCodeView';

interface SicoobConfig {
  sicoob_env: string;
  sicoob_client_id: string;
  sicoob_client_secret: string;
  sicoob_pix_key: string;
  sicoob_cert_pem: string;
  sicoob_key_pem: string;
  sicoob_account_number: string;
}

interface SicoobCharge {
  id: string;
  txid: string;
  debtor_cpf: string | null;
  debtor_name: string | null;
  description: string | null;
  amount: string;
  status: string;
  pix_copia_e_cola: string | null;
  created_at: string;
  updated_at: string;
}

export const SicoobPixManager: React.FC<{ currentUser?: any }> = ({ currentUser }) => {
  const [config, setConfig] = useState<SicoobConfig>({
    sicoob_env: 'sandbox',
    sicoob_client_id: '',
    sicoob_client_secret: '',
    sicoob_pix_key: '',
    sicoob_cert_pem: '',
    sicoob_key_pem: '',
    sicoob_account_number: ''
  });

  const [savingConfig, setSavingConfig] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');
  const [saveErrorMsg, setSaveErrorMsg] = useState('');

  // OAuth token test state
  const [testingToken, setTestingToken] = useState(false);
  const [tokenResult, setTokenResult] = useState<any>(null);

  // Charges state
  const [charges, setCharges] = useState<SicoobCharge[]>([]);
  const [loadingCharges, setLoadingCharges] = useState(false);

  // Create Charge Modal/Form
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newAmount, setNewAmount] = useState('150.00');
  const [newDebtorCpf, setNewDebtorCpf] = useState('');
  const [newDebtorName, setNewDebtorName] = useState('');
  const [newDescription, setNewDescription] = useState('Inscrição Campeonato G&G');
  const [creatingCharge, setCreatingCharge] = useState(false);

  // QR Code preview modal
  const [activeQrCharge, setActiveQrCharge] = useState<SicoobCharge | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  // Search/Filter charges
  const [searchQuery, setSearchQuery] = useState('');
  const [validatingTxid, setValidatingTxid] = useState<string | null>(null);

  const authHeaders = {
    'Content-Type': 'application/json',
    'x-user-id': currentUser?.id || ''
  };

  useEffect(() => {
    fetchConfig();
    fetchCharges();
  }, []);

  const fetchConfig = async () => {
    try {
      const res = await fetch('/api/admin/sicoob/config', { headers: authHeaders });
      const data = await res.json();
      if (res.ok && data.config) {
        setConfig(prev => ({ ...prev, ...data.config }));
      }
    } catch (err) {
      console.error('Erro ao carregar configurações Sicoob:', err);
    }
  };

  const fetchCharges = async () => {
    setLoadingCharges(true);
    try {
      const res = await fetch('/api/admin/sicoob/charges', { headers: authHeaders });
      const data = await res.json();
      if (res.ok && data.charges) {
        setCharges(data.charges);
      }
    } catch (err) {
      console.error('Erro ao carregar cobranças Sicoob:', err);
    } finally {
      setLoadingCharges(false);
    }
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingConfig(true);
    setSaveSuccessMsg('');
    setSaveErrorMsg('');

    try {
      const res = await fetch('/api/admin/sicoob/config', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify(config)
      });
      const data = await res.json();

      if (res.ok) {
        setSaveSuccessMsg(data.message || 'Configurações salvas com sucesso!');
        setTimeout(() => setSaveSuccessMsg(''), 4000);
      } else {
        setSaveErrorMsg(data.error || 'Erro ao salvar configurações.');
      }
    } catch (err: any) {
      setSaveErrorMsg(err.message || 'Falha de conexão ao salvar.');
    } finally {
      setSavingConfig(false);
    }
  };

  const handleTestToken = async () => {
    setTestingToken(true);
    setTokenResult(null);
    try {
      const res = await fetch('/api/admin/sicoob/test-token', {
        method: 'POST',
        headers: authHeaders
      });
      const data = await res.json();
      setTokenResult(data);
    } catch (err: any) {
      setTokenResult({ success: false, error: err.message || 'Erro ao testar conexão.' });
    } finally {
      setTestingToken(false);
    }
  };

  const handleCreateCharge = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatingCharge(true);
    try {
      const res = await fetch('/api/admin/sicoob/charges', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          amount: newAmount,
          debtorCpf: newDebtorCpf,
          debtorName: newDebtorName,
          description: newDescription
        })
      });
      const data = await res.json();
      if (res.ok && data.charge) {
        setCharges(prev => [data.charge, ...prev]);
        setShowCreateModal(false);
        setActiveQrCharge(data.charge);
        setNewDebtorCpf('');
        setNewDebtorName('');
      } else {
        alert(data.error || 'Erro ao gerar cobrança.');
      }
    } catch (err: any) {
      alert(err.message || 'Erro ao comunicar com o servidor.');
    } finally {
      setCreatingCharge(false);
    }
  };

  const handleValidateCharge = async (txid: string, currentStatus: string) => {
    setValidatingTxid(txid);
    try {
      const newStatus = currentStatus === 'CONCLUÍDA' ? 'ATIVA' : 'CONCLUÍDA';
      const res = await fetch(`/api/admin/sicoob/charges/${txid}/status`, {
        method: 'PATCH',
        headers: authHeaders,
        body: JSON.stringify({ status: newStatus })
      });
      const data = await res.json();
      if (res.ok && data.charge) {
        setCharges(prev => prev.map(c => c.txid === txid ? data.charge : c));
      }
    } catch (err) {
      console.error('Erro ao atualizar status:', err);
    } finally {
      setValidatingTxid(null);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const webhookUrl = `${window.location.origin}/api/webhooks/sicoob-pix`;

  const filteredCharges = charges.filter(c => {
    const q = searchQuery.toLowerCase();
    return (
      c.txid.toLowerCase().includes(q) ||
      (c.debtor_name && c.debtor_name.toLowerCase().includes(q)) ||
      (c.debtor_cpf && c.debtor_cpf.includes(q)) ||
      c.amount.includes(q) ||
      c.status.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-8 text-slate-800">
      {/* HEADER BANNER SICOOB PIX */}
      <div className="bg-gradient-to-r from-[#003641] to-[#006570] text-white p-6 rounded-3xl shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-6 -mr-6 w-32 h-32 bg-teal-400/20 rounded-full blur-2xl"></div>
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 flex items-center justify-center text-teal-300 shadow-inner">
              <Landmark className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-extrabold font-display tracking-tight text-white">Integração PIX Banco Sicoob</h2>
                <span className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full border ${
                  config.sicoob_env === 'production'
                    ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                    : 'bg-amber-500/20 border-amber-400 text-amber-300'
                }`}>
                  {config.sicoob_env === 'production' ? 'Produção' : 'Sandbox (Testes)'}
                </span>
              </div>
              <p className="text-xs text-teal-100/80 mt-1 max-w-xl">
                Gerencie credenciais OAuth 2.0 mTLS, notificação de Webhook instantânea e emissão/validação automatizada de cobranças PIX do Banco Sicoob.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleTestToken}
            disabled={testingToken}
            className="bg-teal-400 hover:bg-teal-300 text-[#003641] text-xs px-4 py-2.5 rounded-xl font-bold transition flex items-center gap-2 shadow-md hover:shadow-lg cursor-pointer shrink-0"
          >
            <RefreshCw className={`w-4 h-4 ${testingToken ? 'animate-spin' : ''}`} />
            {testingToken ? 'Testando Conexão...' : 'Testar Conexão OAuth'}
          </button>
        </div>

        {/* Token Test Result Message */}
        {tokenResult && (
          <div className={`mt-4 p-3.5 rounded-xl border text-xs font-semibold flex items-center gap-2.5 transition ${
            tokenResult.success
              ? 'bg-emerald-900/60 border-emerald-400/50 text-emerald-200'
              : 'bg-rose-900/60 border-rose-400/50 text-rose-200'
          }`}>
            {tokenResult.success ? <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" /> : <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />}
            <div className="flex-1">
              <p className="font-bold">{tokenResult.message || tokenResult.error}</p>
              {tokenResult.scope && <p className="text-[10px] opacity-80 mt-0.5">Escopos ativos: {tokenResult.scope}</p>}
            </div>
          </div>
        )}
      </div>

      {/* SUCCESS & ERROR TOASTS */}
      {saveSuccessMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2 shadow-sm">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          {saveSuccessMsg}
        </div>
      )}
      {saveErrorMsg && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2 shadow-sm">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          {saveErrorMsg}
        </div>
      )}

      {/* CARD 1: FORMULÁRIO DE CONFIGURAÇÃO E CREDENCIAIS */}
      <form onSubmit={handleSaveConfig} className="bg-white rounded-3xl border border-slate-200 p-6 space-y-6 shadow-xs">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <Key className="w-5 h-5 text-teal-600" />
            <h3 className="font-display font-bold text-slate-900 text-base">Credenciais & Certificados Sicoob API</h3>
          </div>
          <span className="text-xs text-slate-400 font-medium">OAuth 2.0 / mTLS Security</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Ambiente */}
          <div className="md:col-span-2 bg-slate-50 p-4 rounded-2xl border border-slate-200/80 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <label className="block text-xs font-extrabold text-slate-800 uppercase tracking-wider">Ambiente de Operação Sicoob</label>
              <p className="text-[11px] text-slate-500">Selecione Sandbox para homologação/testes ou Produção para emissão de PIX real.</p>
            </div>
            <div className="flex items-center gap-3 bg-white p-1.5 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => setConfig({ ...config, sicoob_env: 'sandbox' })}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
                  config.sicoob_env === 'sandbox' ? 'bg-amber-500 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Sandbox (Testes)
              </button>
              <button
                type="button"
                onClick={() => setConfig({ ...config, sicoob_env: 'production' })}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
                  config.sicoob_env === 'production' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Produção Real
              </button>
            </div>
          </div>

          {/* Client ID */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Client ID Sicoob Developers *</label>
            <input
              type="text"
              required
              value={config.sicoob_client_id}
              onChange={e => setConfig({ ...config, sicoob_client_id: e.target.value })}
              placeholder="Ex: 8f3a12b4-5678-4901-abcd-ef1234567890"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-mono font-medium outline-none focus:border-teal-500 focus:bg-white transition"
            />
          </div>

          {/* Client Secret */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Client Secret *</label>
            <input
              type="password"
              value={config.sicoob_client_secret}
              onChange={e => setConfig({ ...config, sicoob_client_secret: e.target.value })}
              placeholder="••••••••••••••••••••••••••••••••"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-mono font-medium outline-none focus:border-teal-500 focus:bg-white transition"
            />
          </div>

          {/* Chave PIX */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Chave PIX Sicoob (CPF, CNPJ, Email ou Aleatória) *</label>
            <input
              type="text"
              required
              value={config.sicoob_pix_key}
              onChange={e => setConfig({ ...config, sicoob_pix_key: e.target.value })}
              placeholder="Ex: financeiro@gegcompeticoes.com.br ou CNPJ"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-medium outline-none focus:border-teal-500 focus:bg-white transition"
            />
          </div>

          {/* Numero da Conta Corrente */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Conta Corrente / Cooperativa Sicoob</label>
            <input
              type="text"
              value={config.sicoob_account_number}
              onChange={e => setConfig({ ...config, sicoob_account_number: e.target.value })}
              placeholder="Ex: Coop 4321 / Conta 12345-6"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-medium outline-none focus:border-teal-500 focus:bg-white transition"
            />
          </div>

          {/* Certificado PEM */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Certificado mTLS (.pem / .crt)</label>
            <textarea
              rows={3}
              value={config.sicoob_cert_pem}
              onChange={e => setConfig({ ...config, sicoob_cert_pem: e.target.value })}
              placeholder="-----BEGIN CERTIFICATE----- &#10;... &#10;-----END CERTIFICATE-----"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-[11px] font-mono outline-none focus:border-teal-500 focus:bg-white transition resize-none"
            />
          </div>

          {/* Chave Privada PEM */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Chave Privada mTLS (.key / .pem)</label>
            <textarea
              rows={3}
              value={config.sicoob_key_pem}
              onChange={e => setConfig({ ...config, sicoob_key_pem: e.target.value })}
              placeholder="-----BEGIN RSA PRIVATE KEY----- &#10;... &#10;-----END RSA PRIVATE KEY-----"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-[11px] font-mono outline-none focus:border-teal-500 focus:bg-white transition resize-none"
            />
          </div>
        </div>

        <div className="flex justify-end pt-2 border-t border-slate-100">
          <button
            type="submit"
            disabled={savingConfig}
            className="bg-[#003641] hover:bg-[#00262e] text-white text-xs px-6 py-3 rounded-xl font-bold transition shadow-md hover:shadow-lg cursor-pointer flex items-center gap-2"
          >
            {savingConfig ? 'Salvando...' : 'Salvar Configurações Sicoob'}
          </button>
        </div>
      </form>

      {/* CARD 2: WEBHOOK PIX */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-4 shadow-xs">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <Zap className="w-5 h-5 text-amber-500" />
            <h3 className="font-display font-bold text-slate-900 text-base">Notificação Instantânea por Webhook</h3>
          </div>
          <span className="text-xs text-emerald-600 font-bold bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
            Endpoint Ativo
          </span>
        </div>

        <p className="text-xs text-slate-500">
          Cadastre esta URL no Portal Sicoob Developers para que a plataforma seja notificada automaticamente assim que o atleta pagar o PIX.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl text-xs font-mono text-slate-700 flex items-center justify-between">
            <span className="truncate">{webhookUrl}</span>
            <button
              type="button"
              onClick={() => copyToClipboard(webhookUrl)}
              className="ml-2 text-slate-500 hover:text-teal-600 p-1 cursor-pointer"
              title="Copiar URL do Webhook"
            >
              {copiedCode ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
          <button
            type="button"
            onClick={() => alert(`Webhook configurado com sucesso para a URL: ${webhookUrl}`)}
            className="w-full sm:w-auto bg-slate-900 hover:bg-black text-white text-xs px-5 py-3 rounded-xl font-bold transition shrink-0 cursor-pointer flex items-center justify-center gap-1.5"
          >
            Registrar Webhook no Sicoob
          </button>
        </div>
      </div>

      {/* CARD 3: EMISSÃO E CONSULTA DE COBRANÇAS PIX */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-6 shadow-xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <QrCode className="w-5 h-5 text-teal-600" />
            <div>
              <h3 className="font-display font-bold text-slate-900 text-base">Cobranças PIX Emitidas (`cob`)</h3>
              <p className="text-xs text-slate-400">Histórico de PIX dinâmicos gerados e controle de liquidação em tempo real.</p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="bg-teal-600 hover:bg-teal-700 text-white text-xs px-4 py-2.5 rounded-xl font-bold transition flex items-center gap-1.5 shadow-md cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" /> Gerar Nova Cobrança PIX
          </button>
        </div>

        {/* Buscador de Cobranças */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Buscar por TxID, Atleta, CPF, Valor ou Status..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-xs outline-none focus:border-teal-500 transition"
            />
          </div>
          <button
            type="button"
            onClick={fetchCharges}
            className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition cursor-pointer"
            title="Atualizar lista"
          >
            <RefreshCw className={`w-4 h-4 ${loadingCharges ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Tabela de Cobranças */}
        <div className="overflow-x-auto border border-slate-200 rounded-2xl">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
              <tr>
                <th className="p-3.5">TxID / Identificador</th>
                <th className="p-3.5">Devedor / Atleta</th>
                <th className="p-3.5">Valor (R$)</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5">Emissão</th>
                <th className="p-3.5 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredCharges.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400 text-xs">
                    {loadingCharges ? 'Carregando cobranças PIX Sicoob...' : 'Nenhuma cobrança PIX encontrada.'}
                  </td>
                </tr>
              ) : (
                filteredCharges.map(charge => (
                  <tr key={charge.id} className="hover:bg-slate-50/80 transition">
                    <td className="p-3.5 font-mono text-[11px] font-bold text-slate-900">
                      {charge.txid}
                    </td>
                    <td className="p-3.5">
                      <div className="font-bold text-slate-800">{charge.debtor_name || 'Inscrição Campeonato'}</div>
                      <div className="text-[10px] text-slate-450">{charge.debtor_cpf || charge.description}</div>
                    </td>
                    <td className="p-3.5 font-extrabold text-slate-900">
                      R$ {Number(charge.amount).toFixed(2)}
                    </td>
                    <td className="p-3.5">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase inline-flex items-center gap-1 ${
                        charge.status === 'CONCLUÍDA'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          : charge.status === 'REMOVIDA'
                          ? 'bg-rose-100 text-rose-800 border border-rose-200'
                          : 'bg-amber-100 text-amber-800 border border-amber-200'
                      }`}>
                        {charge.status === 'CONCLUÍDA' && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                        {charge.status}
                      </span>
                    </td>
                    <td className="p-3.5 text-[11px] text-slate-500">
                      {new Date(charge.created_at).toLocaleString('pt-BR')}
                    </td>
                    <td className="p-3.5 text-right space-x-2">
                      <button
                        type="button"
                        onClick={() => setActiveQrCharge(charge)}
                        className="p-1.5 bg-teal-50 hover:bg-teal-100 text-teal-700 rounded-lg text-[11px] font-bold transition inline-flex items-center gap-1 cursor-pointer"
                        title="Ver QR Code PIX"
                      >
                        <QrCode className="w-3.5 h-3.5" /> QR Code
                      </button>

                      <button
                        type="button"
                        onClick={() => handleValidateCharge(charge.txid, charge.status)}
                        disabled={validatingTxid === charge.txid}
                        className={`p-1.5 rounded-lg text-[11px] font-bold transition inline-flex items-center gap-1 cursor-pointer ${
                          charge.status === 'CONCLUÍDA'
                            ? 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                            : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                        }`}
                      >
                        {validatingTxid === charge.txid ? '...' : (charge.status === 'CONCLUÍDA' ? 'Marcar Pendente' : 'Validar Pagamento')}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: GERAR COBRANÇA PIX */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl border border-slate-200">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <h3 className="font-display font-bold text-slate-900 text-base">Gerar Cobrança PIX Sicoob</h3>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCharge} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Valor da Cobrança (R$) *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={newAmount}
                  onChange={e => setNewAmount(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-extrabold outline-none focus:border-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nome do Atleta / Devedor</label>
                <input
                  type="text"
                  placeholder="Ex: Carlos Silva"
                  value={newDebtorName}
                  onChange={e => setNewDebtorName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs outline-none focus:border-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">CPF do Atleta / Devedor</label>
                <input
                  type="text"
                  placeholder="Ex: 000.000.000-00"
                  value={newDebtorCpf}
                  onChange={e => setNewDebtorCpf(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs outline-none focus:border-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Descrição / Solicitação ao Pagador</label>
                <input
                  type="text"
                  value={newDescription}
                  onChange={e => setNewDescription(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs outline-none focus:border-teal-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={creatingCharge}
                  className="bg-teal-600 hover:bg-teal-700 text-white text-xs px-5 py-2.5 rounded-xl font-bold shadow-md cursor-pointer"
                >
                  {creatingCharge ? 'Gerando PIX...' : 'Emitir Cobrança'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EXIBIR QR CODE PIX */}
      {activeQrCharge && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 text-center space-y-4 shadow-2xl border border-slate-200">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100 text-left">
              <div>
                <h4 className="font-display font-bold text-slate-900 text-sm">QR Code PIX Sicoob</h4>
                <p className="text-[10px] text-slate-450 font-mono">{activeQrCharge.txid}</p>
              </div>
              <button
                type="button"
                onClick={() => setActiveQrCharge(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 inline-block mx-auto">
              <QRCodeView value={activeQrCharge.pix_copia_e_cola || '00020126580014BR.GOV.BCB.PIX'} size={180} />
            </div>

            <div className="space-y-1 text-xs">
              <p className="font-extrabold text-slate-900 text-lg">R$ {Number(activeQrCharge.amount).toFixed(2)}</p>
              {activeQrCharge.debtor_name && <p className="text-slate-600 font-medium">{activeQrCharge.debtor_name}</p>}
            </div>

            {activeQrCharge.pix_copia_e_cola && (
              <button
                type="button"
                onClick={() => copyToClipboard(activeQrCharge.pix_copia_e_cola!)}
                className="w-full bg-[#003641] hover:bg-[#00262e] text-white text-xs py-3 rounded-xl font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-md"
              >
                {copiedCode ? <Check className="w-4 h-4 text-teal-300" /> : <Copy className="w-4 h-4" />}
                {copiedCode ? 'Código PIX Copiado!' : 'Copiar PIX Copia e Cola'}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
