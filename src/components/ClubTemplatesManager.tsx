import React, { useState, useEffect } from 'react';
import { User, Club } from '../types';
import { FileUp, Save, RefreshCw, CheckCircle2, QrCode, FileText, CreditCard, Sparkles, Trophy, Target, Eye } from 'lucide-react';

interface ClubTemplateData {
  id?: string;
  club_id?: string;
  template_type: 'certificate' | 'club_card' | 'playoff_card' | 'shooter_card';
  background_url: string;
  body_template: string;
  layout_config?: Record<string, any>;
}

interface ClubTemplatesManagerProps {
  currentUser: User | null;
  clubs: Club[];
}

const DEFAULT_TEMPLATES: Record<string, { title: string; defaultBg: string; defaultBody: string }> = {
  certificate: {
    title: 'Certificado de Participação em Competições',
    defaultBg: '',
    defaultBody: `O {NOME_CLUBE}, através da Plataforma G&G Competições, no uso das suas atribuições, confere o presente CERTIFICADO para o Atleta de Tiro Desportivo,

{NOME_ATLETA}

{POSICAO_GERAL} geral com {PONTOS} pontos
Classificação {MEDALHA} {POSICAO_CATEGORIA}

{ETAPA}
{CAMPEONATO}
{MODALIDADE}
{EQUIPAMENTO_SIGMA}
Data de realização: {DATA_INICIO} A {DATA_FIM}
Local da prova: {LOCAL_PROVA} - {CIDADE} - {UF}
CNPJ nº {CNPJ_CLUBE} e CR nº {CR_CLUBE}

{CIDADE},{DATA_EMISSAO_EXTENSO}.

CONSULTE VIA LEITOR DE QR CODE
{QR_CODE}
CÓDIGO DE VALIDAÇÃO: {CODIGO_VALIDACAO}
CONSULTE AUTENTICIDADE DESTA DECLARAÇÃO EM {URL_AUTENTICIDADE}`
  },
  club_card: {
    title: 'Fundo Carteirinha Clube',
    defaultBg: '',
    defaultBody: `FILIADO PREMIUM - G&G CLUBE DE TIRO
Nome: {NOME_ATLETA}
CPF: {CPF_ATLETA} | RG: {RG_ATLETA} | CR: {CR_ATLETA}
Data de Filiação: {DATA_FILIACAO}
Clube: {NOME_CLUBE} - {CIDADE}/{UF}
REGISTRO Nº: {REGISTRO_ATLETA}`
  },
  playoff_card: {
    title: 'Fundo Carteirinha Playoff',
    defaultBg: '',
    defaultBody: `FILIADO PLAYOFF - FINAIS G&G
Nome: {NOME_ATLETA}
CPF: {CPF_ATLETA} | RG: {RG_ATLETA} | CR: {CR_ATLETA}
Data de Filiação: {DATA_FILIACAO}
Clube: {NOME_CLUBE} - {CIDADE}/{UF}`
  },
  shooter_card: {
    title: 'Fundo Carteirinha Atirador',
    defaultBg: '',
    defaultBody: `ATIRADOR DESPORTIVO PREMIUM
Nome: {NOME_ATLETA}
CPF: {CPF_ATLETA} | RG: {RG_ATLETA} | CR: {CR_ATLETA} | VALIDADE: {CR_VALIDADE}
Clube: {NOME_CLUBE} - {CIDADE}/{UF}`
  }
};

const VARIABLE_TOKENS = [
  { token: '{NOME_ATLETA}', label: 'Nome do Atleta' },
  { token: '{CPF_ATLETA}', label: 'CPF' },
  { token: '{RG_ATLETA}', label: 'RG' },
  { token: '{CR_ATLETA}', label: 'Nº CR Atleta' },
  { token: '{NOME_CLUBE}', label: 'Nome do Clube' },
  { token: '{CAMPEONATO}', label: 'Campeonato' },
  { token: '{ETAPA}', label: 'Etapa' },
  { token: '{MODALIDADE}', label: 'Modalidade' },
  { token: '{PONTOS}', label: 'Pontuação Total' },
  { token: '{POSICAO_GERAL}', label: 'Posição Geral' },
  { token: '{MEDALHA}', label: 'Classif. Medalha (Ouro/Prata/Bronze)' },
  { token: '{DATA_INICIO}', label: 'Data Início' },
  { token: '{DATA_FIM}', label: 'Data Fim' },
  { token: '{LOCAL_PROVA}', label: 'Local da Prova' },
  { token: '{CIDADE}', label: 'Cidade' },
  { token: '{UF}', label: 'Estado (UF)' },
  { token: '{DATA_EMISSAO_EXTENSO}', label: 'Data Atual (Extenso)' },
  { token: '{CODIGO_VALIDACAO}', label: 'Código Autenticidade' },
  { token: '{QR_CODE}', label: 'QR Code Autenticidade' }
];

export function ClubTemplatesManager({ currentUser, clubs }: ClubTemplatesManagerProps) {
  const [activeTab, setActiveTab] = useState<'certificate' | 'club_card' | 'playoff_card' | 'shooter_card'>('certificate');
  const [selectedClubId, setSelectedClubId] = useState<string>(currentUser?.clubId || clubs[0]?.id || 'c1');
  const [templates, setTemplates] = useState<Record<string, ClubTemplateData>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Current tab state
  const [bgUrl, setBgUrl] = useState('');
  const [bodyText, setBodyText] = useState('');

  useEffect(() => {
    fetchTemplates();
  }, [selectedClubId]);

  useEffect(() => {
    const currentTmpl = templates[activeTab];
    if (currentTmpl) {
      setBgUrl(currentTmpl.background_url || '');
      setBodyText(currentTmpl.body_template || DEFAULT_TEMPLATES[activeTab].defaultBody);
    } else {
      setBgUrl('');
      setBodyText(DEFAULT_TEMPLATES[activeTab].defaultBody);
    }
  }, [activeTab, templates]);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/club-templates?clubId=${selectedClubId}`, {
        headers: {
          'x-user-id': currentUser?.id || ''
        }
      }).then(r => r.json());

      if (res.templates && Array.isArray(res.templates)) {
        const map: Record<string, ClubTemplateData> = {};
        res.templates.forEach((t: ClubTemplateData) => {
          map[t.template_type] = t;
        });
        setTemplates(map);
      }
    } catch (err) {
      console.error('Error fetching templates:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUploadBg = (file: File) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg('A imagem deve ter no máximo 5MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setBgUrl(reader.result as string);
      setErrorMsg('');
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    setSaving(true);
    setSuccessMsg('');
    setErrorMsg('');
    try {
      const res = await fetch('/api/club-templates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser?.id || ''
        },
        body: JSON.stringify({
          clubId: selectedClubId,
          templateType: activeTab,
          backgroundUrl: bgUrl,
          bodyTemplate: bodyText,
          layoutConfig: {}
        })
      }).then(r => r.json());

      if (res.error) {
        setErrorMsg(res.error);
      } else {
        setSuccessMsg(`Template de ${DEFAULT_TEMPLATES[activeTab].title} salvo com sucesso!`);
        setTemplates(prev => ({
          ...prev,
          [activeTab]: res.template
        }));
        setTimeout(() => setSuccessMsg(''), 4000);
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Erro de conexão ao salvar template.');
    } finally {
      setSaving(false);
    }
  };

  const insertToken = (token: string) => {
    setBodyText(prev => prev + ` ${token} `);
  };

  // Preview replacement
  const renderPreviewText = () => {
    return bodyText
      .replace(/{NOME_ATLETA}/g, 'ADAILTON JOSÉ NEVES')
      .replace(/{CPF_ATLETA}/g, '123.456.789-00')
      .replace(/{RG_ATLETA}/g, 'MG-12.345.678')
      .replace(/{CR_ATLETA}/g, '572103')
      .replace(/{NOME_CLUBE}/g, 'Clube de Tiro & Caça Aranãs Ltda')
      .replace(/{CAMPEONATO}/g, '1ª Competição de Tiro de Precisão 2023')
      .replace(/{ETAPA}/g, 'Etapa Única')
      .replace(/{MODALIDADE}/g, 'Pistola - Revólver - Calibres - 38 - 380 - 9mm - .40 - .45 - 357')
      .replace(/{PONTOS}/g, '188')
      .replace(/{POSICAO_GERAL}/g, '5º Lugar')
      .replace(/{MEDALHA}/g, 'OURO')
      .replace(/{POSICAO_CATEGORIA}/g, '5º Lugar')
      .replace(/{EQUIPAMENTO_SIGMA}/g, 'S/C Sigma:')
      .replace(/{DATA_INICIO}/g, '09/02/2023')
      .replace(/{DATA_FIM}/g, '18/02/2023')
      .replace(/{LOCAL_PROVA}/g, 'Clube de Tiro & Caça Aranãs Ltda')
      .replace(/{CIDADE}/g, 'Capelinha')
      .replace(/{UF}/g, 'MG')
      .replace(/{CNPJ_CLUBE}/g, '37.138.741/0001-43')
      .replace(/{CR_CLUBE}/g, '572103')
      .replace(/{DATA_EMISSAO_EXTENSO}/g, '23 de Julho de 2026')
      .replace(/{CODIGO_VALIDACAO}/g, '1460A01398B11399C21011')
      .replace(/{URL_AUTENTICIDADE}/g, 'CLUBEDETIROARANAS.COM.BR/CERTIFICADO')
      .replace(/{DATA_FILIACAO}/g, '15/01/2022')
      .replace(/{REGISTRO_ATLETA}/g, 'GG-REG-9842')
      .replace(/{CR_VALIDADE}/g, '15/01/2028');
  };

  return (
    <div className="bg-white rounded-2xl smooth-shadow border border-slate-100 p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 pb-4 border-b border-slate-100">
        <div>
          <h3 className="font-display font-bold text-slate-900 text-lg flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-500" />
            Certificados e Carteirinhas Personalizadas (Multi-Tenancy)
          </h3>
          <p className="text-xs text-slate-400">
            Cadastre a imagem de fundo oficial e personalize os campos de texto do seu clube.
          </p>
        </div>

        {/* Club Selector if master admin */}
        {currentUser?.role === 'master_admin' && (
          <div className="flex items-center gap-2">
            <label className="text-xs font-bold text-slate-500">Clube:</label>
            <select
              value={selectedClubId}
              onChange={e => setSelectedClubId(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 outline-none font-bold"
            >
              {clubs.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {successMsg && (
        <div className="bg-emerald-50 text-emerald-800 p-3.5 rounded-xl text-xs font-semibold flex items-center gap-2 border border-emerald-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          {successMsg}
        </div>
      )}

      {errorMsg && (
        <div className="bg-red-50 text-red-700 p-3.5 rounded-xl text-xs font-semibold border border-red-200">
          {errorMsg}
        </div>
      )}

      {/* Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 border-b border-slate-100 pb-2">
        <button
          onClick={() => setActiveTab('certificate')}
          className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl font-bold text-xs transition cursor-pointer ${
            activeTab === 'certificate' ? 'bg-blue-600 text-white shadow-xs' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
          }`}
        >
          <FileText className="w-4 h-4" />
          1. Certificado
        </button>

        <button
          onClick={() => setActiveTab('club_card')}
          className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl font-bold text-xs transition cursor-pointer ${
            activeTab === 'club_card' ? 'bg-emerald-600 text-white shadow-xs' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          2. Carteirinha Clube
        </button>

        <button
          onClick={() => setActiveTab('playoff_card')}
          className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl font-bold text-xs transition cursor-pointer ${
            activeTab === 'playoff_card' ? 'bg-amber-600 text-white shadow-xs' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Trophy className="w-4 h-4" />
          3. Carteirinha Playoff
        </button>

        <button
          onClick={() => setActiveTab('shooter_card')}
          className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl font-bold text-xs transition cursor-pointer ${
            activeTab === 'shooter_card' ? 'bg-indigo-600 text-white shadow-xs' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Target className="w-4 h-4" />
          4. Carteirinha Atirador
        </button>
      </div>

      {/* Editor & Preview Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Form & Token Chips */}
        <div className="space-y-5">
          <div className="space-y-2">
            <h4 className="font-bold text-sm text-slate-800 uppercase flex items-center gap-1.5">
              <FileUp className="w-4 h-4 text-blue-600" />
              Upload da Imagem de Fundo Padrão
            </h4>
            <p className="text-[11px] text-slate-500">
              Selecione o arquivo de imagem (PNG ou JPG) de fundo oficial para este modelo.
            </p>
            <input
              type="file"
              accept="image/png,image/jpeg"
              onChange={e => e.target.files?.[0] && handleUploadBg(e.target.files[0])}
              className="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer bg-slate-50 border border-slate-200 p-2 rounded-xl"
            />
          </div>

          {/* Tokens Box */}
          <div className="space-y-2 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <label className="font-bold text-xs text-slate-700 uppercase block">
              Variáveis Dinâmicas (Clique para Inserir no Texto):
            </label>
            <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto">
              {VARIABLE_TOKENS.map(v => (
                <button
                  key={v.token}
                  type="button"
                  onClick={() => insertToken(v.token)}
                  className="bg-white hover:bg-blue-50 border border-slate-200 hover:border-blue-300 text-blue-800 text-[10px] font-mono px-2 py-1 rounded-lg transition cursor-pointer shadow-2xs"
                  title={v.label}
                >
                  {v.token}
                </button>
              ))}
            </div>
          </div>

          {/* Body Text Template */}
          <div className="space-y-2">
            <label className="font-bold text-xs text-slate-700 uppercase block">
              Texto Padrão do Documento:
            </label>
            <textarea
              rows={10}
              value={bodyText}
              onChange={e => setBodyText(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-mono text-slate-800 outline-none focus:ring-2 focus:ring-blue-500 leading-relaxed"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setBodyText(DEFAULT_TEMPLATES[activeTab].defaultBody)}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-4 py-2.5 rounded-xl transition text-xs flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              Restaurar Padrão
            </button>

            <button
              type="button"
              disabled={saving}
              onClick={handleSave}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-bold px-5 py-2.5 rounded-xl transition text-xs flex items-center justify-center gap-2 cursor-pointer shadow-sm"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Salvando...' : 'Salvar Template do Clube'}
            </button>
          </div>
        </div>

        {/* Right Column: Live Visual Canvas Preview */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <h4 className="font-bold text-sm text-slate-800 uppercase flex items-center gap-1.5">
              <Eye className="w-4 h-4 text-emerald-600" />
              Pré-visualização em Tempo Real (Canvas)
            </h4>
            <span className="text-[10px] text-slate-400 font-mono">Modelo Proporcional</span>
          </div>

          {/* Canvas Box */}
          <div className="relative border border-slate-300 rounded-2xl overflow-hidden bg-slate-100 min-h-[420px] shadow-inner flex flex-col justify-center items-center p-4">
            {bgUrl ? (
              <img
                src={bgUrl}
                alt="Fundo Personalizado"
                className="absolute inset-0 w-full h-full object-contain pointer-events-none opacity-90"
              />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-b from-blue-900 to-slate-900 opacity-90 flex items-center justify-center p-6 text-center text-white/50 text-xs font-mono">
                [Fundo Padrão da Plataforma G&G]
              </div>
            )}

            {/* Overlaid Rendered Text */}
            <div className="relative z-10 w-full max-w-md bg-white/85 backdrop-blur-xs p-5 rounded-xl border border-slate-200/80 shadow-lg text-slate-900 space-y-2 text-center text-xs font-sans leading-relaxed my-auto">
              <div className="whitespace-pre-line text-[11px] font-medium leading-relaxed">
                {renderPreviewText()}
              </div>

              {bodyText.includes('{QR_CODE}') && (
                <div className="pt-2 flex justify-center">
                  <div className="w-16 h-16 bg-white p-1 border border-slate-300 rounded shadow-xs flex items-center justify-center">
                    <QrCode className="w-full h-full text-slate-800" />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
