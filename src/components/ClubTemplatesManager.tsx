import React, { useState, useEffect, useRef } from 'react';
import { User, Club } from '../types';
import { QRCodeView } from './QRCodeView';
import {
  FileUp, Save, RefreshCw, CheckCircle2, QrCode, FileText, CreditCard, Sparkles,
  Trophy, Target, Eye, Plus, Trash2, Bold, Italic, AlignLeft, AlignCenter, AlignRight,
  Move, Printer, Palette, Type, Camera
} from 'lucide-react';

export interface TextElement {
  id: string;
  text: string;
  x: number; // Percentage 0 - 100
  y: number; // Percentage 0 - 100
  fontSize: number; // px
  fontWeight: 'normal' | 'bold' | '900';
  fontStyle: 'normal' | 'italic';
  color: string;
  textAlign: 'left' | 'center' | 'right';
  width?: number; // Percentage width
}

interface ClubTemplateData {
  id?: string;
  club_id?: string;
  template_type: 'certificate' | 'club_card' | 'club_card_back' | 'playoff_card' | 'shooter_card';
  background_url: string;
  body_template: string;
  layout_config?: {
    elements?: TextElement[];
  };
}

interface ClubTemplatesManagerProps {
  currentUser: User | null;
  clubs: Club[];
}

const DEFAULT_ELEMENTS: Record<string, TextElement[]> = {
  certificate: [
    {
      id: 'c1',
      text: 'O {NOME_CLUBE}, através da Plataforma G&G Competições, no uso das suas atribuições, confere o presente CERTIFICADO para o Atleta de Tiro Desportivo,',
      x: 10,
      y: 22,
      fontSize: 13,
      fontWeight: 'normal',
      fontStyle: 'normal',
      color: '#334155',
      textAlign: 'center',
      width: 80
    },
    {
      id: 'c2',
      text: '{NOME_ATLETA}',
      x: 10,
      y: 38,
      fontSize: 26,
      fontWeight: '900',
      fontStyle: 'normal',
      color: '#0f172a',
      textAlign: 'center',
      width: 80
    },
    {
      id: 'c3',
      text: '{POSICAO_GERAL} geral com {PONTOS} pontos - Classificação {MEDALHA} {POSICAO_CATEGORIA}',
      x: 10,
      y: 48,
      fontSize: 16,
      fontWeight: 'bold',
      fontStyle: 'normal',
      color: '#b45309',
      textAlign: 'center',
      width: 80
    },
    {
      id: 'c4',
      text: '{ETAPA}\n{CAMPEONATO}\n{MODALIDADE}',
      x: 10,
      y: 58,
      fontSize: 13,
      fontWeight: 'bold',
      fontStyle: 'normal',
      color: '#1e293b',
      textAlign: 'center',
      width: 80
    },
    {
      id: 'c5',
      text: 'Data de realização: {DATA_INICIO} A {DATA_FIM}\nLocal da prova: {LOCAL_PROVA} - {CIDADE}/{UF}',
      x: 10,
      y: 70,
      fontSize: 11,
      fontWeight: 'normal',
      fontStyle: 'normal',
      color: '#475569',
      textAlign: 'center',
      width: 80
    },
    {
      id: 'c6',
      text: '{CIDADE}, {DATA_EMISSAO_EXTENSO}.',
      x: 10,
      y: 79,
      fontSize: 11,
      fontWeight: 'bold',
      fontStyle: 'normal',
      color: '#334155',
      textAlign: 'center',
      width: 80
    },
    {
      id: 'c7',
      text: '{QR_CODE}',
      x: 44,
      y: 84,
      fontSize: 12,
      fontWeight: 'normal',
      fontStyle: 'normal',
      color: '#000000',
      textAlign: 'center',
      width: 12
    },
    {
      id: 'c8',
      text: 'CÓDIGO DE VALIDAÇÃO: {CODIGO_VALIDACAO}',
      x: 10,
      y: 95,
      fontSize: 10,
      fontWeight: 'bold',
      fontStyle: 'normal',
      color: '#64748b',
      textAlign: 'center',
      width: 80
    }
  ],
  club_card: [
    {
      id: 'k0',
      text: '{FOTO_ATLETA}',
      x: 4.5,
      y: 7,
      fontSize: 12,
      fontWeight: 'bold',
      fontStyle: 'normal',
      color: '#000000',
      textAlign: 'center',
      width: 28
    },
    {
      id: 'k1',
      text: '{CADASTRO_NUMERO}',
      x: 35.5,
      y: 28,
      fontSize: 10,
      fontWeight: '900',
      fontStyle: 'normal',
      color: '#ffffff',
      textAlign: 'left',
      width: 30
    },
    {
      id: 'k2',
      text: '{NOME_ATLETA}',
      x: 36.5,
      y: 50.5,
      fontSize: 10,
      fontWeight: 'bold',
      fontStyle: 'normal',
      color: '#0f172a',
      textAlign: 'left',
      width: 55
    },
    {
      id: 'k3',
      text: '{CPF_ATLETA}',
      x: 5,
      y: 65,
      fontSize: 8.5,
      fontWeight: 'bold',
      fontStyle: 'normal',
      color: '#0f172a',
      textAlign: 'left',
      width: 21
    },
    {
      id: 'k4',
      text: '{RG_ATLETA}',
      x: 30.5,
      y: 65,
      fontSize: 8.5,
      fontWeight: 'bold',
      fontStyle: 'normal',
      color: '#0f172a',
      textAlign: 'left',
      width: 14
    },
    {
      id: 'k5',
      text: '{CR_ATLETA}',
      x: 49,
      y: 65,
      fontSize: 8.5,
      fontWeight: 'bold',
      fontStyle: 'normal',
      color: '#0f172a',
      textAlign: 'left',
      width: 20
    },
    {
      id: 'k6',
      text: '{DATA_VALIDADE}',
      x: 73.5,
      y: 65,
      fontSize: 8.5,
      fontWeight: 'bold',
      fontStyle: 'normal',
      color: '#0f172a',
      textAlign: 'left',
      width: 19
    },
    {
      id: 'k7',
      text: '{NOME_CLUBE}',
      x: 5,
      y: 81.5,
      fontSize: 8.5,
      fontWeight: 'bold',
      fontStyle: 'normal',
      color: '#0f172a',
      textAlign: 'left',
      width: 41
    },
    {
      id: 'k8',
      text: '{CIDADE}',
      x: 50.5,
      y: 81.5,
      fontSize: 8.5,
      fontWeight: 'bold',
      fontStyle: 'normal',
      color: '#0f172a',
      textAlign: 'left',
      width: 30
    },
    {
      id: 'k9',
      text: '{UF}',
      x: 85,
      y: 81.5,
      fontSize: 8.5,
      fontWeight: 'bold',
      fontStyle: 'normal',
      color: '#0f172a',
      textAlign: 'left',
      width: 8
    }
  ],
  club_card_back: [
    {
      id: 'kb1',
      text: '{QR_CODE}',
      x: 40,
      y: 20,
      fontSize: 12,
      fontWeight: 'normal',
      fontStyle: 'normal',
      color: '#000000',
      textAlign: 'center',
      width: 20
    },
    {
      id: 'kb2',
      text: 'VALIDAÇÃO CADASTRAL AUTÊNTICA G&G',
      x: 10,
      y: 72,
      fontSize: 9.5,
      fontWeight: 'bold',
      fontStyle: 'normal',
      color: '#334155',
      textAlign: 'center',
      width: 80
    }
  ],
  playoff_card: [
    {
      id: 'p1',
      text: 'FILIADO PLAYOFF',
      x: 35,
      y: 8,
      fontSize: 11,
      fontWeight: '900',
      fontStyle: 'normal',
      color: '#b45309',
      textAlign: 'left',
      width: 55
    },
    {
      id: 'p2',
      text: 'Nome: {NOME_ATLETA}',
      x: 35,
      y: 28,
      fontSize: 11,
      fontWeight: 'bold',
      fontStyle: 'normal',
      color: '#0f172a',
      textAlign: 'left',
      width: 60
    },
    {
      id: 'p3',
      text: 'CPF: {CPF_ATLETA} | RG: {RG_ATLETA} | CR: {CR_ATLETA}',
      x: 4,
      y: 62,
      fontSize: 8.5,
      fontWeight: 'bold',
      fontStyle: 'normal',
      color: '#1e293b',
      textAlign: 'left',
      width: 92
    },
    {
      id: 'p4',
      text: 'Clube: {NOME_CLUBE} - {CIDADE}/{UF}',
      x: 4,
      y: 82,
      fontSize: 8.5,
      fontWeight: 'normal',
      fontStyle: 'normal',
      color: '#334155',
      textAlign: 'left',
      width: 92
    }
  ],
  shooter_card: [
    {
      id: 's1',
      text: 'ATIRADOR DESPORTIVO PREMIUM',
      x: 35,
      y: 8,
      fontSize: 11,
      fontWeight: '900',
      fontStyle: 'normal',
      color: '#0369a1',
      textAlign: 'left',
      width: 55
    },
    {
      id: 's2',
      text: 'Nome: {NOME_ATLETA}',
      x: 35,
      y: 28,
      fontSize: 11,
      fontWeight: 'bold',
      fontStyle: 'normal',
      color: '#0f172a',
      textAlign: 'left',
      width: 60
    },
    {
      id: 's3',
      text: 'CPF: {CPF_ATLETA} | RG: {RG_ATLETA} | CR: {CR_ATLETA}',
      x: 4,
      y: 62,
      fontSize: 8.5,
      fontWeight: 'bold',
      fontStyle: 'normal',
      color: '#1e293b',
      textAlign: 'left',
      width: 92
    },
    {
      id: 's4',
      text: 'Clube: {NOME_CLUBE} - {CIDADE}/{UF}',
      x: 4,
      y: 82,
      fontSize: 8.5,
      fontWeight: 'normal',
      fontStyle: 'normal',
      color: '#334155',
      textAlign: 'left',
      width: 92
    }
  ]
};

const VARIABLE_TOKENS = [
  { token: '{FOTO_ATLETA}', label: 'Foto do Atleta (3x4)' },
  { token: '{NOME_ATLETA}', label: 'Nome do Atleta' },
  { token: '{CPF_ATLETA}', label: 'CPF Atleta' },
  { token: '{RG_ATLETA}', label: 'RG Atleta' },
  { token: '{CR_ATLETA}', label: 'CR Atleta' },
  { token: '{CADASTRO_NUMERO}', label: 'Número de Cadastro' },
  { token: '{DATA_VALIDADE}', label: 'Data de Validade/Filiação' },
  { token: '{NOME_CLUBE}', label: 'Nome do Clube' },
  { token: '{CAMPEONATO}', label: 'Campeonato' },
  { token: '{ETAPA}', label: 'Etapa' },
  { token: '{MODALIDADE}', label: 'Modalidade' },
  { token: '{PONTOS}', label: 'Pontos Total' },
  { token: '{POSICAO_GERAL}', label: 'Posição Geral' },
  { token: '{MEDALHA}', label: 'Medalha (Ouro/Prata/Bronze)' },
  { token: '{POSICAO_CATEGORIA}', label: 'Posição Categoria' },
  { token: '{DATA_INICIO}', label: 'Data Início' },
  { token: '{DATA_FIM}', label: 'Data Fim' },
  { token: '{LOCAL_PROVA}', label: 'Local da Prova' },
  { token: '{CIDADE}', label: 'Cidade' },
  { token: '{UF}', label: 'UF' },
  { token: '{DATA_EMISSAO_EXTENSO}', label: 'Data Extenso' },
  { token: '{CODIGO_VALIDACAO}', label: 'Código Validação' },
  { token: '{QR_CODE}', label: 'QR Code' }
];

export function ClubTemplatesManager({ currentUser, clubs }: ClubTemplatesManagerProps) {
  const [activeTab, setActiveTab] = useState<'certificate' | 'club_card' | 'playoff_card' | 'shooter_card'>('certificate');
  const [selectedClubId, setSelectedClubId] = useState<string>(currentUser?.clubId || clubs[0]?.id || 'c1');
  const [templates, setTemplates] = useState<Record<string, ClubTemplateData>>({});
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  
  // Mode: edit mode vs test data preview mode
  const [isPreviewWithTestData, setIsPreviewWithTestData] = useState(false);
  // Format mode: A4 sheet vs CR-80 PVC card (defaults to cr80 for cards)
  const [cardFormat, setCardFormat] = useState<'a4' | 'cr80'>('cr80');

  // Current tab state
  const [bgUrl, setBgUrl] = useState('');
  const [elements, setElements] = useState<TextElement[]>(DEFAULT_ELEMENTS.certificate);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);

  const canvasRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchTemplates();
  }, [selectedClubId]);

  useEffect(() => {
    const currentTmpl = templates[activeTab];
    if (currentTmpl) {
      setBgUrl(currentTmpl.background_url || '');
      if (currentTmpl.layout_config?.elements && currentTmpl.layout_config.elements.length > 0) {
        const hasOldConcatenated = currentTmpl.layout_config.elements.some(
          (e: any) => e.text.includes('|') || e.text.startsWith('Nome:') || e.text.startsWith('CPF:')
        );
        if (activeTab === 'club_card' && hasOldConcatenated) {
          setElements(DEFAULT_ELEMENTS.club_card);
        } else {
          setElements(currentTmpl.layout_config.elements);
        }
      } else {
        setElements(DEFAULT_ELEMENTS[activeTab] || []);
      }
    } else {
      setBgUrl('');
      setElements(DEFAULT_ELEMENTS[activeTab] || []);
    }
    setSelectedElementId(null);
  }, [activeTab, templates]);

  const fetchTemplates = async () => {
    try {
      const res = await fetch(`/api/club-templates?clubId=${selectedClubId}`, {
        headers: { 'x-user-id': currentUser?.id || '' }
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
          bodyTemplate: JSON.stringify(elements),
          layoutConfig: { elements }
        })
      }).then(r => r.json());

      if (res.error) {
        setErrorMsg(res.error);
      } else {
        setSuccessMsg(`Template salvo com sucesso!`);
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

  const handleAddTextElement = () => {
    const newId = `el_${Date.now()}`;
    const newElem: TextElement = {
      id: newId,
      text: 'Novo Texto ou {NOME_ATLETA}',
      x: 25,
      y: 40,
      fontSize: 14,
      fontWeight: 'bold',
      fontStyle: 'normal',
      color: '#0f172a',
      textAlign: 'center',
      width: 50
    };
    setElements([...elements, newElem]);
    setSelectedElementId(newId);
  };

  const handleDeleteElement = (id: string) => {
    setElements(elements.filter(el => el.id !== id));
    if (selectedElementId === id) {
      setSelectedElementId(null);
    }
  };

  const updateSelectedElement = (updates: Partial<TextElement>) => {
    if (!selectedElementId) return;
    setElements(elements.map(el => el.id === selectedElementId ? { ...el, ...updates } : el));
  };

  // Mouse Drag Logic
  const handleMouseDown = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setSelectedElementId(id);

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const startX = e.clientX;
    const startY = e.clientY;

    const targetEl = elements.find(el => el.id === id);
    if (!targetEl) return;

    const startXPercent = targetEl.x;
    const startYPercent = targetEl.y;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const deltaY = moveEvent.clientY - startY;

      const deltaXPercent = (deltaX / rect.width) * 100;
      const deltaYPercent = (deltaY / rect.height) * 100;

      let newX = Math.round((startXPercent + deltaXPercent) * 10) / 10;
      let newY = Math.round((startYPercent + deltaYPercent) * 10) / 10;

      newX = Math.max(0, Math.min(95, newX));
      newY = Math.max(0, Math.min(95, newY));

      setElements(prev => prev.map(el => el.id === id ? { ...el, x: newX, y: newY } : el));
    };

    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  // Variable token replacement for test mode
  const replaceTestData = (str: string) => {
    const selectedClub = clubs.find(c => c.id === selectedClubId);
    return str
      .replace(/{NOME_ATLETA}/g, 'ADAILTON JOSÉ NEVES')
      .replace(/{CPF_ATLETA}/g, '123.456.789-00')
      .replace(/{RG_ATLETA}/g, 'MG-12.345.678')
      .replace(/{CR_ATLETA}/g, '572103')
      .replace(/{DATA_VALIDADE}/g, '31/12/2026')
      .replace(/{CADASTRO_NUMERO}/g, '00123')
      .replace(/{NOME_CLUBE}/g, selectedClub?.name || 'Clube de Tiro & Caça Aranãs Ltda')
      .replace(/{CAMPEONATO}/g, '1ª Competição de Tiro de Precisão 2023')
      .replace(/{ETAPA}/g, 'Etapa Única')
      .replace(/{MODALIDADE}/g, 'Pistola - Revólver - Calibres 38/9mm/.40')
      .replace(/{PONTOS}/g, '188')
      .replace(/{POSICAO_GERAL}/g, '5º Lugar')
      .replace(/{MEDALHA}/g, 'OURO')
      .replace(/{POSICAO_CATEGORIA}/g, '5º Lugar')
      .replace(/{DATA_INICIO}/g, '09/02/2023')
      .replace(/{DATA_FIM}/g, '18/02/2023')
      .replace(/{LOCAL_PROVA}/g, selectedClub?.name || 'Clube de Tiro Aranãs')
      .replace(/{CIDADE}/g, selectedClub?.city || 'Capelinha')
      .replace(/{UF}/g, selectedClub?.state || 'MG')
      .replace(/{DATA_EMISSAO_EXTENSO}/g, '23 de Julho de 2026')
      .replace(/{CODIGO_VALIDACAO}/g, '1460A01398B11399C21011');
  };

  const activeElement = elements.find(el => el.id === selectedElementId);
  const isCardTab = activeTab.includes('card');
  const isA4Format = !isCardTab || cardFormat === 'a4';

  // Print Test PDF
  const handlePrintTest = () => {
    let styleElem = document.getElementById('editor-print-style');
    if (!styleElem) {
      styleElem = document.createElement('style');
      styleElem.id = 'editor-print-style';
      styleElem.innerHTML = `
        @media print {
          @page {
            size: ${isA4Format ? 'A4 portrait' : 'landscape'};
            margin: 0;
          }
          body * {
            visibility: hidden !important;
          }
          #editor-canvas-print-area, #editor-canvas-print-area * {
            visibility: visible !important;
          }
          #editor-canvas-print-area {
            position: fixed !important;
            left: 0 !important;
            top: 0 !important;
            width: ${isA4Format ? '210mm' : '85.6mm'} !important;
            height: ${isA4Format ? '297mm' : '54mm'} !important;
            max-width: none !important;
            max-height: none !important;
            box-shadow: none !important;
            border: none !important;
            border-radius: 0 !important;
            margin: 0 !important;
            z-index: 999999 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `;
      document.head.appendChild(styleElem);
    } else {
      styleElem.innerHTML = `
        @media print {
          @page {
            size: ${isA4Format ? 'A4 portrait' : 'landscape'};
            margin: 0;
          }
          body * {
            visibility: hidden !important;
          }
          #editor-canvas-print-area, #editor-canvas-print-area * {
            visibility: visible !important;
          }
          #editor-canvas-print-area {
            position: fixed !important;
            left: 0 !important;
            top: 0 !important;
            width: ${isA4Format ? '210mm' : '85.6mm'} !important;
            height: ${isA4Format ? '297mm' : '54mm'} !important;
            max-width: none !important;
            max-height: none !important;
            box-shadow: none !important;
            border: none !important;
            border-radius: 0 !important;
            margin: 0 !important;
            z-index: 999999 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `;
    }
    window.print();
  };

  return (
    <div className="bg-white rounded-2xl smooth-shadow border border-slate-100 p-6 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 pb-4 border-b border-slate-100">
        <div>
          <h3 className="font-display font-bold text-slate-900 text-lg flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-500" />
            Editor Visual Drag & Drop: Certificados e Carteirinhas
          </h3>
          <p className="text-xs text-slate-400">
            Arraste livremente os blocos de texto sobre a imagem de fundo A4 / Carteirinha.
          </p>
        </div>

        <div className="flex items-center gap-3">
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

          <button
            type="button"
            onClick={handlePrintTest}
            className="bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs px-4 py-2 rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Printer className="w-4 h-4" />
            Imprimir Teste PDF
          </button>
        </div>
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

      {/* Navigation Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 border-b border-slate-100 pb-2">
        <button
          onClick={() => setActiveTab('certificate')}
          className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl font-bold text-xs transition cursor-pointer ${
            activeTab === 'certificate' ? 'bg-blue-600 text-white shadow-xs' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
          }`}
        >
          <FileText className="w-4 h-4" />
          1. Certificado (A4)
        </button>

        <button
          onClick={() => setActiveTab(activeTab === 'club_card_back' ? 'club_card_back' : 'club_card')}
          className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl font-bold text-xs transition cursor-pointer ${
            activeTab === 'club_card' || activeTab === 'club_card_back' ? 'bg-emerald-600 text-white shadow-xs' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
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

      {/* Recommended Dimension Banner */}
      {isCardTab && (
        <div className="bg-blue-50/90 border border-blue-200 rounded-xl p-3 text-xs text-blue-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-4 h-4 text-blue-600 shrink-0" />
            <div>
              <span className="font-extrabold text-blue-950 block">Medidas Recomendadas para Imagem de Fundo (Frente e Verso):</span>
              <span className="text-[11px] text-blue-850">
                Resolução Ideal HD (300 DPI): <strong className="font-mono bg-white px-1 py-0.5 rounded border border-blue-200 text-blue-900">1012 x 638 px</strong> (ou <strong className="font-mono bg-white px-1 py-0.5 rounded border border-blue-200 text-blue-900">856 x 539 px</strong>) &bull; Tamanho Físico: <strong>85.6 mm x 53.9 mm</strong> (Formato CR-80)
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1 bg-white border border-blue-200 rounded-xl p-1 shrink-0 shadow-2xs">
            <button
              type="button"
              onClick={() => setActiveTab('club_card')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                activeTab === 'club_card' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              🖼️ Frente
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('club_card_back')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                activeTab === 'club_card_back' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              🔄 Verso
            </button>
          </div>
        </div>
      )}

      {/* Toolbar: Upload, Add Text, Page Format Toggle, Toggle Test View & Save */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
        <div className="flex flex-wrap items-center gap-2">
          {/* Background Upload Button */}
          <label className="bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs px-3.5 py-2 rounded-xl border border-slate-300 transition cursor-pointer flex items-center gap-1.5 shadow-2xs">
            <FileUp className="w-4 h-4 text-blue-600" />
            {bgUrl ? 'Alterar Fundo' : 'Carregar Fundo'}
            <input
              type="file"
              accept="image/png,image/jpeg"
              onChange={e => e.target.files?.[0] && handleUploadBg(e.target.files[0])}
              className="hidden"
            />
          </label>

          {/* Paper Format Selector Toggle */}
          {isCardTab && (
            <div className="flex items-center bg-white rounded-xl border border-slate-300 p-0.5 shadow-2xs">
              <button
                type="button"
                onClick={() => setCardFormat('a4')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  cardFormat === 'a4'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                📄 Papel A4 (Impressão)
              </button>
              <button
                type="button"
                onClick={() => setCardFormat('cr80')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  cardFormat === 'cr80'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                💳 Cartão PVC CR-80
              </button>
            </div>
          )}

          {/* Add Text Element Button */}
          <button
            type="button"
            onClick={handleAddTextElement}
            className="bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs px-3.5 py-2 rounded-xl border border-blue-200 transition cursor-pointer flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4 text-blue-600" />
            Adicionar Texto Libre
          </button>

          {/* Toggle Test Data View */}
          <button
            type="button"
            onClick={() => setIsPreviewWithTestData(!isPreviewWithTestData)}
            className={`font-bold text-xs px-3.5 py-2 rounded-xl border transition cursor-pointer flex items-center gap-1.5 ${
              isPreviewWithTestData
                ? 'bg-amber-500 border-amber-600 text-slate-950'
                : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'
            }`}
          >
            <Eye className="w-4 h-4" />
            {isPreviewWithTestData ? 'Modo Edição' : 'Ver com Dados de Teste'}
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setElements(DEFAULT_ELEMENTS[activeTab] || [])}
            className="bg-slate-100 hover:bg-slate-200 text-slate-650 font-bold text-xs px-3 py-2 rounded-xl transition flex items-center gap-1 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Redefinir Layout
          </button>

          <button
            type="button"
            disabled={saving}
            onClick={handleSave}
            className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-extrabold text-xs px-5 py-2 rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-sm"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Salvando...' : 'Salvar Layout'}
          </button>
        </div>
      </div>

      {/* MAIN WORKSPACE: CANVAS + ELEMENT FORMATTING SIDEBAR */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* CANVAS WORKSPACE (SIMULATING A4 OR CARD) */}
        <div className="lg:col-span-8 flex flex-col items-center justify-center bg-slate-200/80 p-4 sm:p-8 rounded-2xl border border-slate-300 min-h-[550px] shadow-inner overflow-x-auto">
          <div
            id="editor-canvas-print-area"
            ref={canvasRef}
            style={{
              width: '520px',
              height: isA4Format ? '735px' : '328px',
              position: 'relative',
              backgroundColor: '#ffffff',
              backgroundImage: bgUrl ? `url("${bgUrl}")` : undefined,
              backgroundSize: '100% 100%',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
              boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.2), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
              borderRadius: isA4Format ? '4px' : '16px',
              overflow: 'hidden',
              userSelect: 'none',
              WebkitPrintColorAdjust: 'exact',
              printColorAdjust: 'exact'
            }}
            className="transition-all duration-200"
          >
            {/* Background Image Layer */}
            {bgUrl ? (
              <img
                src={bgUrl}
                alt="Fundo Modelo"
                className="absolute inset-0 w-full h-full object-fill pointer-events-none"
              />
            ) : (
              <div className="absolute inset-0 bg-slate-900/90 text-slate-400 p-6 flex flex-col justify-center items-center text-center font-mono text-xs gap-2">
                <FileUp className="w-8 h-8 opacity-40" />
                <span>[ Nenhuma imagem de fundo carregada ]</span>
                <span className="text-[10px] text-slate-500">Clique em "Carregar Fundo" acima para selecionar o arquivo PNG/JPG</span>
              </div>
            )}

            {/* Draggable Movable Text Elements Layer */}
            {elements.map((el) => {
              const isSelected = selectedElementId === el.id;
              const displayText = isPreviewWithTestData ? replaceTestData(el.text) : el.text;
              const isQrToken = el.text.trim() === '{QR_CODE}';
              const isFotoToken = el.text.trim() === '{FOTO_ATLETA}';

              return (
                <div
                  key={el.id}
                  onMouseDown={(e) => handleMouseDown(e, el.id)}
                  style={{
                    position: 'absolute',
                    left: `${el.x}%`,
                    top: `${el.y}%`,
                    width: el.width ? `${el.width}%` : 'auto',
                    fontSize: `${el.fontSize}px`,
                    fontWeight: el.fontWeight,
                    fontStyle: el.fontStyle,
                    color: el.color,
                    textAlign: el.textAlign,
                    cursor: 'move',
                    lineHeight: '1.3',
                    whiteSpace: 'pre-line',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    border: isSelected ? '2px dashed #2563eb' : '1px transparent hover:border-slate-400/50',
                    backgroundColor: isSelected ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                    zIndex: isSelected ? 20 : 10
                  }}
                  className="group transition-shadow"
                >
                  {isQrToken ? (
                    <div className="flex flex-col items-center justify-center p-1 bg-white border border-slate-300 rounded shadow-xs">
                      <QRCodeView
                        value={`${window.location.origin}/validar/carteirinha/user_123456789`}
                        size={55}
                      />
                      <span className="text-[7px] font-mono text-slate-500 font-bold mt-0.5">[QR CODE OFICIAL]</span>
                    </div>
                  ) : isFotoToken ? (
                    <div className="flex flex-col items-center justify-center bg-slate-100/90 border-2 border-dashed border-slate-400 rounded-md p-1 shadow-xs aspect-[3/4] min-h-[90px]">
                      <Camera className="w-6 h-6 text-slate-600" />
                      <span className="text-[8px] font-mono font-black text-slate-700 mt-1">FOTO 3X4</span>
                    </div>
                  ) : (
                    <span>{displayText}</span>
                  )}

                  {/* Drag Handle Indicator */}
                  {isSelected && (
                    <div className="absolute -top-3 -right-3 bg-blue-600 text-white rounded-full p-1 shadow-md">
                      <Move className="w-3 h-3" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ELEMENT FORMATTING PANEL */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200 space-y-4 shadow-2xs">
            <h4 className="font-bold text-xs text-slate-800 uppercase tracking-wider flex items-center justify-between">
              <span>Formatação do Bloco</span>
              {activeElement && (
                <button
                  type="button"
                  onClick={() => handleDeleteElement(activeElement.id)}
                  className="text-red-500 hover:text-red-700 text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Excluir
                </button>
              )}
            </h4>

            {activeElement ? (
              <div className="space-y-4 text-xs">
                {/* Element Text Content */}
                <div className="space-y-1">
                  <label className="font-bold text-slate-600 uppercase text-[10px]">Texto ou Variáveis:</label>
                  <textarea
                    rows={4}
                    value={activeElement.text}
                    onChange={(e) => updateSelectedElement({ text: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-xl p-2.5 font-mono text-xs text-slate-800 outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Variable Token Quick Buttons */}
                <div className="space-y-1">
                  <label className="font-bold text-slate-500 uppercase text-[9px]">Inserir Variável no Bloco:</label>
                  <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
                    {VARIABLE_TOKENS.map(v => (
                      <button
                        key={v.token}
                        type="button"
                        onClick={() => updateSelectedElement({ text: activeElement.text + ` ${v.token} ` })}
                        className="bg-white hover:bg-blue-50 border border-slate-200 text-blue-700 text-[9px] font-mono px-1.5 py-0.5 rounded transition cursor-pointer"
                      >
                        {v.token}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Font Size & Color */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-600 uppercase text-[10px] flex items-center gap-1">
                      <Type className="w-3 h-3 text-slate-500" /> Tamanho:
                    </label>
                    <input
                      type="number"
                      min={8}
                      max={72}
                      value={activeElement.fontSize}
                      onChange={(e) => updateSelectedElement({ fontSize: Number(e.target.value) || 12 })}
                      className="w-full bg-white border border-slate-300 rounded-lg p-2 font-mono text-xs text-slate-800"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-600 uppercase text-[10px] flex items-center gap-1">
                      <Palette className="w-3 h-3 text-slate-500" /> Cor:
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={activeElement.color}
                        onChange={(e) => updateSelectedElement({ color: e.target.value })}
                        className="w-8 h-8 rounded border-0 cursor-pointer"
                      />
                      <span className="font-mono text-[10px] text-slate-600">{activeElement.color}</span>
                    </div>
                  </div>
                </div>

                {/* Weight, Style & Align Toolbar */}
                <div className="space-y-1">
                  <label className="font-bold text-slate-600 uppercase text-[10px]">Estilo e Alinhamento:</label>
                  <div className="flex items-center gap-1.5">
                    {/* Bold */}
                    <button
                      type="button"
                      onClick={() => updateSelectedElement({ fontWeight: activeElement.fontWeight === 'bold' ? 'normal' : 'bold' })}
                      className={`p-2 rounded-lg border transition ${
                        activeElement.fontWeight === 'bold' || activeElement.fontWeight === '900'
                          ? 'bg-blue-600 border-blue-600 text-white shadow-2xs'
                          : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <Bold className="w-3.5 h-3.5" />
                    </button>

                    {/* Italic */}
                    <button
                      type="button"
                      onClick={() => updateSelectedElement({ fontStyle: activeElement.fontStyle === 'italic' ? 'normal' : 'italic' })}
                      className={`p-2 rounded-lg border transition ${
                        activeElement.fontStyle === 'italic'
                          ? 'bg-blue-600 border-blue-600 text-white shadow-2xs'
                          : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <Italic className="w-3.5 h-3.5" />
                    </button>

                    <div className="h-5 w-px bg-slate-300 mx-1"></div>

                    {/* Align Left */}
                    <button
                      type="button"
                      onClick={() => updateSelectedElement({ textAlign: 'left' })}
                      className={`p-2 rounded-lg border transition ${
                        activeElement.textAlign === 'left'
                          ? 'bg-blue-600 border-blue-600 text-white shadow-2xs'
                          : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <AlignLeft className="w-3.5 h-3.5" />
                    </button>

                    {/* Align Center */}
                    <button
                      type="button"
                      onClick={() => updateSelectedElement({ textAlign: 'center' })}
                      className={`p-2 rounded-lg border transition ${
                        activeElement.textAlign === 'center'
                          ? 'bg-blue-600 border-blue-600 text-white shadow-2xs'
                          : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <AlignCenter className="w-3.5 h-3.5" />
                    </button>

                    {/* Align Right */}
                    <button
                      type="button"
                      onClick={() => updateSelectedElement({ textAlign: 'right' })}
                      className={`p-2 rounded-lg border transition ${
                        activeElement.textAlign === 'right'
                          ? 'bg-blue-600 border-blue-600 text-white shadow-2xs'
                          : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <AlignRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Width Slider */}
                <div className="space-y-1 pt-1">
                  <label className="font-bold text-slate-600 uppercase text-[10px]">
                    Largura do Bloco (%): {activeElement.width || 50}%
                  </label>
                  <input
                    type="range"
                    min={10}
                    max={100}
                    value={activeElement.width || 50}
                    onChange={(e) => updateSelectedElement({ width: Number(e.target.value) })}
                    className="w-full accent-blue-600 cursor-pointer"
                  />
                </div>
              </div>
            ) : (
              <div className="py-8 text-center text-slate-400 text-xs">
                <Move className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="font-semibold text-slate-600">Nenhum bloco selecionado</p>
                <p className="text-[10px] text-slate-400 mt-1">Clique em qualquer texto sobre o certificado para arrastar ou editar suas propriedades.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
