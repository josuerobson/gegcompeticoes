import React, { useState, useEffect } from 'react';
import {
  Wallet, CheckCircle2, AlertCircle, Copy, RefreshCw, Key, Check, Eye, EyeOff, Info,
} from 'lucide-react';

interface MercadoPagoConfig {
  mercadopago_access_token_masked: string;
  mercadopago_access_token_set: boolean;
  mercadopago_public_key: string;
  mercadopago_webhook_secret_set: boolean;
  env: 'test' | 'production' | 'unknown';
}

export const MercadoPagoManager: React.FC<{ currentUser?: any }> = ({ currentUser }) => {
  const [config, setConfig] = useState<MercadoPagoConfig>({
    mercadopago_access_token_masked: '',
    mercadopago_access_token_set: false,
    mercadopago_public_key: '',
    mercadopago_webhook_secret_set: false,
    env: 'unknown',
  });

  const [accessTokenInput, setAccessTokenInput] = useState('');
  const [publicKeyInput, setPublicKeyInput] = useState('');
  const [webhookSecretInput, setWebhookSecretInput] = useState('');
  const [showAccessToken, setShowAccessToken] = useState(false);
  const [showWebhookSecret, setShowWebhookSecret] = useState(false);

  const [loading, setLoading] = useState(true);
  const [savingConfig, setSavingConfig] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');
  const [saveErrorMsg, setSaveErrorMsg] = useState('');

  const [testingConnection, setTestingConnection] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);

  const [copiedWebhook, setCopiedWebhook] = useState(false);

  const authHeaders = {
    'Content-Type': 'application/json',
    'x-user-id': currentUser?.id || '',
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/mercadopago/config', { headers: authHeaders });
      const data = await res.json();
      if (res.ok && data.config) {
        setConfig(data.config);
        setPublicKeyInput(data.config.mercadopago_public_key || '');
      }
    } catch (err) {
      console.error('Erro ao carregar configurações do Mercado Pago:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingConfig(true);
    setSaveSuccessMsg('');
    setSaveErrorMsg('');
    setTestResult(null);

    try {
      const res = await fetch('/api/admin/mercadopago/config', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          mercadopago_access_token: accessTokenInput,
          mercadopago_public_key: publicKeyInput,
          mercadopago_webhook_secret: webhookSecretInput,
        }),
      });
      const data = await res.json();

      if (res.ok) {
        setSaveSuccessMsg(data.message || 'Configurações salvas com sucesso!');
        setAccessTokenInput('');
        setWebhookSecretInput('');
        await fetchConfig();
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

  const handleTestConnection = async () => {
    setTestingConnection(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/admin/mercadopago/test-connection', {
        method: 'POST',
        headers: authHeaders,
      });
      const data = await res.json();
      setTestResult(data);
    } catch (err: any) {
      setTestResult({ success: false, error: err.message || 'Erro ao testar conexão.' });
    } finally {
      setTestingConnection(false);
    }
  };

  const webhookUrl = `${window.location.origin}/api/webhooks/mercadopago`;

  const copyWebhookUrl = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopiedWebhook(true);
    setTimeout(() => setCopiedWebhook(false), 2000);
  };

  if (loading) {
    return <div className="text-center py-12 text-slate-400 text-xs">Carregando configurações...</div>;
  }

  return (
    <div className="space-y-8 text-slate-800">
      {/* HEADER BANNER MERCADO PAGO */}
      <div className="bg-gradient-to-r from-[#00293d] to-[#0090e3] text-white p-6 rounded-3xl shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-6 -mr-6 w-32 h-32 bg-sky-300/20 rounded-full blur-2xl"></div>
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 flex items-center justify-center text-sky-200 shadow-inner">
              <Wallet className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-extrabold font-display tracking-tight text-white">Integração Mercado Pago</h2>
                {config.mercadopago_access_token_set && (
                  <span className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full border ${
                    config.env === 'production'
                      ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                      : 'bg-amber-500/20 border-amber-400 text-amber-300'
                  }`}>
                    {config.env === 'production' ? 'Produção' : config.env === 'test' ? 'Teste' : 'Modo desconhecido'}
                  </span>
                )}
              </div>
              <p className="text-xs text-sky-100/80 mt-1 max-w-xl">
                Cobrança real de inscrições e reinscrições via Checkout Pro — o pagador é redirecionado
                para o checkout do Mercado Pago e a inscrição só é aprovada quando o pagamento é confirmado.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleTestConnection}
            disabled={testingConnection || !config.mercadopago_access_token_set}
            className="bg-sky-300 hover:bg-sky-200 disabled:opacity-50 disabled:cursor-not-allowed text-[#00293d] text-xs px-4 py-2.5 rounded-xl font-bold transition flex items-center gap-2 shadow-md hover:shadow-lg cursor-pointer shrink-0"
          >
            <RefreshCw className={`w-4 h-4 ${testingConnection ? 'animate-spin' : ''}`} />
            {testingConnection ? 'Testando Conexão...' : 'Testar Conexão'}
          </button>
        </div>

        {testResult && (
          <div className={`mt-4 p-3.5 rounded-xl border text-xs font-semibold flex items-center gap-2.5 transition ${
            testResult.success
              ? 'bg-emerald-900/60 border-emerald-400/50 text-emerald-200'
              : 'bg-rose-900/60 border-rose-400/50 text-rose-200'
          }`}>
            {testResult.success ? <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" /> : <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />}
            <div className="flex-1">
              <p className="font-bold">{testResult.message || testResult.error}</p>
            </div>
          </div>
        )}
      </div>

      {/* INFO: como funciona */}
      <div className="p-4 rounded-2xl bg-sky-50 border border-sky-200 text-sky-900 text-xs flex items-start gap-2.5">
        <Info className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-bold">O Mercado Pago não usa um seletor de Sandbox/Produção — é o próprio Access Token que define o modo.</p>
          <p className="text-sky-800/90">
            Gere um Access Token de <strong>teste</strong> (começa com <code className="bg-white/60 px-1 rounded">TEST-</code>) na sua
            conta de desenvolvedor do Mercado Pago para validar tudo antes de trocar pelo Access Token de <strong>produção</strong> (começa
            com <code className="bg-white/60 px-1 rounded">APP_USR-</code>).
          </p>
        </div>
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

      {/* CARD: FORMULÁRIO DE CONFIGURAÇÃO E CREDENCIAIS */}
      <form onSubmit={handleSaveConfig} className="bg-white rounded-3xl border border-slate-200 p-6 space-y-6 shadow-xs">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <Key className="w-5 h-5 text-sky-600" />
            <h3 className="font-display font-bold text-slate-900 text-base">Credenciais da API Mercado Pago</h3>
          </div>
          <span className="text-xs text-slate-400 font-medium">Checkout Pro</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Access Token */}
          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Access Token *</label>
            <div className="relative">
              <input
                type={showAccessToken ? 'text' : 'password'}
                value={accessTokenInput}
                onChange={e => setAccessTokenInput(e.target.value)}
                placeholder={config.mercadopago_access_token_set ? `Salvo: ${config.mercadopago_access_token_masked} — deixe em branco para manter` : 'TEST-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 pr-10 text-xs font-mono font-medium outline-none focus:border-sky-500 focus:bg-white transition"
              />
              <button
                type="button"
                onClick={() => setShowAccessToken(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                {showAccessToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-[10.5px] text-slate-400 mt-1">
              Encontrado em Mercado Pago Developers &gt; Suas integrações &gt; Credenciais de produção/teste.
              Nunca é reexibido por completo depois de salvo — só a forma mascarada.
            </p>
          </div>

          {/* Public Key */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Public Key</label>
            <input
              type="text"
              value={publicKeyInput}
              onChange={e => setPublicKeyInput(e.target.value)}
              placeholder="TEST-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-mono font-medium outline-none focus:border-sky-500 focus:bg-white transition"
            />
            <p className="text-[10.5px] text-slate-400 mt-1">Não é secreta — usada apenas para referência.</p>
          </div>

          {/* Webhook Secret */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Webhook Secret {config.mercadopago_webhook_secret_set && <span className="text-emerald-600 font-normal">(configurado)</span>}
            </label>
            <div className="relative">
              <input
                type={showWebhookSecret ? 'text' : 'password'}
                value={webhookSecretInput}
                onChange={e => setWebhookSecretInput(e.target.value)}
                placeholder={config.mercadopago_webhook_secret_set ? 'Deixe em branco para manter o salvo' : 'Chave secreta da notificação webhook'}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 pr-10 text-xs font-mono font-medium outline-none focus:border-sky-500 focus:bg-white transition"
              />
              <button
                type="button"
                onClick={() => setShowWebhookSecret(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                {showWebhookSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-[10.5px] text-slate-400 mt-1">
              Em Mercado Pago Developers &gt; Webhooks &gt; Configurar notificações — copie a "Assinatura secreta".
            </p>
          </div>
        </div>

        <div className="flex justify-end pt-2 border-t border-slate-100">
          <button
            type="submit"
            disabled={savingConfig}
            className="bg-[#00293d] hover:bg-[#001f2e] text-white text-xs px-6 py-3 rounded-xl font-bold transition shadow-md hover:shadow-lg cursor-pointer flex items-center gap-2"
          >
            {savingConfig ? 'Salvando...' : 'Salvar Configurações Mercado Pago'}
          </button>
        </div>
      </form>

      {/* CARD: URL DO WEBHOOK */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-3 shadow-xs">
        <h3 className="font-display font-bold text-slate-900 text-sm">URL de Notificação (Webhook)</h3>
        <p className="text-xs text-slate-500">
          Cole esta URL em Mercado Pago Developers &gt; Sua aplicação &gt; Webhooks &gt; Configurar notificações,
          selecionando o evento <strong>Pagamentos</strong>.
        </p>
        <div className="flex items-center gap-2">
          <code className="flex-1 bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-mono text-slate-700 overflow-x-auto whitespace-nowrap">
            {webhookUrl}
          </code>
          <button
            type="button"
            onClick={copyWebhookUrl}
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 p-3 rounded-xl transition cursor-pointer shrink-0"
            title="Copiar URL"
          >
            {copiedWebhook ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
};
