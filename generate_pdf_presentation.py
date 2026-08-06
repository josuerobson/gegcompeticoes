import os
import subprocess
import sys

html_content = """<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Apresentação Sistema G&G Competições</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap');

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    @page {
      size: 1920px 1080px;
      margin: 0;
    }

    body {
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background-color: #0B0F19;
      color: #F1F5F9;
      -webkit-font-smoothing: antialiased;
    }

    .slide {
      width: 1920px;
      height: 1080px;
      position: relative;
      overflow: hidden;
      background: #0B0F19;
      background-image: 
        radial-gradient(circle at 10% 20%, rgba(56, 189, 248, 0.08) 0%, transparent 40%),
        radial-gradient(circle at 90% 80%, rgba(99, 102, 241, 0.08) 0%, transparent 40%);
      page-break-after: always;
      break-after: page;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      padding: 60px 80px;
    }

    /* Header */
    .slide-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      padding-bottom: 20px;
    }

    .brand-logo {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .brand-icon {
      width: 48px;
      height: 48px;
      background: linear-gradient(135deg, #0284C7, #6366F1);
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 800;
      font-size: 22px;
      color: #FFF;
      box-shadow: 0 4px 20px rgba(2, 132, 199, 0.4);
    }

    .brand-text {
      font-size: 24px;
      font-weight: 800;
      letter-spacing: -0.5px;
      background: linear-gradient(135deg, #FFFFFF, #94A3B8);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    .slide-tag {
      background: rgba(56, 189, 248, 0.1);
      border: 1px solid rgba(56, 189, 248, 0.3);
      color: #38BDF8;
      padding: 8px 18px;
      border-radius: 30px;
      font-size: 14px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 1px;
    }

    /* Title Block */
    .slide-title-block {
      margin-bottom: 30px;
    }

    .slide-title {
      font-size: 42px;
      font-weight: 800;
      line-height: 1.2;
      letter-spacing: -1px;
      margin-bottom: 10px;
      color: #F8FAFC;
    }

    .slide-title span {
      background: linear-gradient(135deg, #38BDF8, #818CF8);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    .slide-subtitle {
      font-size: 20px;
      color: #94A3B8;
      font-weight: 400;
      max-width: 1200px;
    }

    /* Content Layouts */
    .slide-body {
      flex: 1;
      display: flex;
      gap: 30px;
    }

    .grid-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 30px;
      width: 100%;
    }

    .grid-3 {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 30px;
      width: 100%;
    }

    .grid-4 {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr 1fr;
      gap: 24px;
      width: 100%;
    }

    /* Card Component */
    .card {
      background: rgba(15, 23, 42, 0.65);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 20px;
      padding: 32px;
      display: flex;
      flex-direction: column;
      justify-content: flex-start;
      position: relative;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
    }

    .card.highlight {
      border-color: rgba(56, 189, 248, 0.4);
      background: linear-gradient(135deg, rgba(15, 23, 42, 0.8), rgba(30, 41, 59, 0.6));
    }

    .card-icon {
      width: 56px;
      height: 56px;
      border-radius: 14px;
      background: rgba(56, 189, 248, 0.12);
      border: 1px solid rgba(56, 189, 248, 0.25);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 26px;
      color: #38BDF8;
      margin-bottom: 20px;
    }

    .card-title {
      font-size: 22px;
      font-weight: 700;
      color: #F8FAFC;
      margin-bottom: 12px;
    }

    .card-desc {
      font-size: 16px;
      color: #94A3B8;
      line-height: 1.6;
    }

    .card-list {
      list-style: none;
      margin-top: 16px;
    }

    .card-list li {
      position: relative;
      padding-left: 28px;
      margin-bottom: 12px;
      font-size: 15px;
      color: #CBD5E1;
      line-height: 1.5;
    }

    .card-list li::before {
      content: "✓";
      position: absolute;
      left: 0;
      top: 0;
      color: #38BDF8;
      font-weight: 800;
    }

    .badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      margin-bottom: 12px;
    }

    .badge-cyan { background: rgba(56, 189, 248, 0.15); color: #38BDF8; }
    .badge-green { background: rgba(16, 185, 129, 0.15); color: #10B981; }
    .badge-amber { background: rgba(245, 158, 11, 0.15); color: #F59E0B; }
    .badge-purple { background: rgba(139, 92, 246, 0.15); color: #A78BFA; }

    /* Footer */
    .slide-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-top: 20px;
      border-top: 1px solid rgba(255, 255, 255, 0.08);
      color: #64748B;
      font-size: 14px;
      font-weight: 500;
    }

    .slide-number {
      font-weight: 700;
      color: #38BDF8;
    }

    /* Cover Slide */
    .cover-slide {
      background: radial-gradient(circle at 50% 30%, rgba(14, 165, 233, 0.15) 0%, transparent 60%), #060911;
      justify-content: center;
      align-items: center;
      text-align: center;
      padding: 100px;
    }

    .cover-badge {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      background: rgba(56, 189, 248, 0.1);
      border: 1px solid rgba(56, 189, 248, 0.3);
      padding: 10px 24px;
      border-radius: 40px;
      color: #38BDF8;
      font-size: 16px;
      font-weight: 700;
      letter-spacing: 1px;
      margin-bottom: 30px;
    }

    .cover-title {
      font-size: 68px;
      font-weight: 800;
      line-height: 1.1;
      letter-spacing: -2px;
      margin-bottom: 24px;
      max-width: 1400px;
    }

    .cover-title span {
      background: linear-gradient(135deg, #38BDF8, #818CF8, #C084FC);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    .cover-subtitle {
      font-size: 24px;
      color: #94A3B8;
      max-width: 1000px;
      margin: 0 auto 60px auto;
      line-height: 1.6;
    }

    .cover-stats {
      display: flex;
      gap: 50px;
      justify-content: center;
    }

    .stat-item {
      background: rgba(15, 23, 42, 0.8);
      border: 1px solid rgba(255, 255, 255, 0.1);
      padding: 24px 40px;
      border-radius: 20px;
      min-width: 220px;
    }

    .stat-number {
      font-size: 38px;
      font-weight: 800;
      color: #38BDF8;
      margin-bottom: 6px;
    }

    .stat-label {
      font-size: 14px;
      color: #94A3B8;
      font-weight: 600;
      text-transform: uppercase;
    }

    /* Special UI Mockup Boxes */
    .ui-box {
      background: #0F172A;
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 16px;
      padding: 20px;
      font-family: monospace;
      font-size: 14px;
      color: #38BDF8;
      margin-top: 15px;
    }

    .pill-group {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      margin-top: 15px;
    }

    .pill {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      padding: 8px 16px;
      border-radius: 12px;
      font-size: 14px;
      color: #E2E8F0;
    }
  </style>
</head>
<body>

  <!-- SLIDE 1: CAPA -->
  <div class="slide cover-slide">
    <div>
      <div class="cover-badge">
        <span>🎯</span> SISTEMA DE GESTÃO PARA TIRO ESPORTIVO
      </div>
      <h1 class="cover-title">Plataforma <span>G&G Competições</span></h1>
      <p class="cover-subtitle">
        A solução definitiva e 100% integrada para Gestão de Clubes de Tiro, Campeonatos, Habitualidades, Controle de Munições e Compliance Legal com o Exército Brasileiro.
      </p>
      <div class="cover-stats">
        <div class="stat-item">
          <div class="stat-number">100%</div>
          <div class="stat-label">Web & Em Nuvem</div>
        </div>
        <div class="stat-item">
          <div class="stat-number">Anexo N</div>
          <div class="stat-label">Dec. 11.615/2023</div>
        </div>
        <div class="stat-item">
          <div class="stat-number">QR Code</div>
          <div class="stat-label">Auditoria Pública</div>
        </div>
        <div class="stat-item">
          <div class="stat-number">PIX Sicoob</div>
          <div class="stat-label">Baixa Automática</div>
        </div>
      </div>
    </div>
    <div style="color: #64748B; font-size: 15px; margin-top: 40px;">
      Apresentação Comercial & Técnica | G&G Competições
    </div>
  </div>

  <!-- SLIDE 2: VISÃO GERAL & PROPOSTA DE VALOR -->
  <div class="slide">
    <div class="slide-header">
      <div class="brand-logo">
        <div class="brand-icon">G&G</div>
        <div class="brand-text">G&G Competições</div>
      </div>
      <div class="slide-tag">Visão Geral</div>
    </div>
    
    <div class="slide-title-block">
      <h2 class="slide-title">Modernidade, Compliance e <span>Eficiência Operacional</span></h2>
      <p class="slide-subtitle">Uma plataforma desenvolvida sob medida para eliminar a burocracia, organizar provas e garantir total conformidade jurídica para clubes e atletas.</p>
    </div>

    <div class="slide-body">
      <div class="grid-3">
        <div class="card highlight">
          <div class="card-icon">🏛️</div>
          <span class="badge badge-cyan">Gestão de Estande & Clube</span>
          <h3 class="card-title">Administração Completa</h3>
          <p class="card-desc">Controle de filiados, carteirinhas oficiais de atirador, relatórios financeiros e gestão descentralizada multiclube com niveis de acesso personalizados.</p>
          <ul class="card-list">
            <li>Cadastro completo de clubes e diretores</li>
            <li>Status associativo e controle de anuidade</li>
            <li>Painel Diretor com métricas em tempo real</li>
          </ul>
        </div>

        <div class="card">
          <div class="card-icon">📜</div>
          <span class="badge badge-green">Legislação & Exército</span>
          <h3 class="card-title">Compliance Legal Rigoroso</h3>
          <p class="card-desc">Conformidade total com as portarias da COLOG e o Decreto 11.615/2023. Geração automatizada de documentos exigidos pela fiscalização.</p>
          <ul class="card-list">
            <li>Declaração de Habitualidade por período</li>
            <li>Termo de Cessão de Armas (Anexo N)</li>
            <li>Validação e controle de Guia de Trânsito</li>
          </ul>
        </div>

        <div class="card">
          <div class="card-icon">🏆</div>
          <span class="badge badge-amber">Campeonatos & Rankings</span>
          <h3 class="card-title">Provas & Resultados Automáticos</h3>
          <p class="card-desc">Motor completo para criação de campeonatos, gerenciamento de etapas, lançamento de alvos e cálculo automatizado de rankings com desempate.</p>
          <ul class="card-list">
            <li>Lançamento por zonas de alvo (X, 10, 9...0)</li>
            <li>Inscrições individuais e em lote pelo clube</li>
            <li>Filtros de premiação Ouro, Prata e Bronze</li>
          </ul>
        </div>
      </div>
    </div>

    <div class="slide-footer">
      <div>G&G Competições — Apresentação de Recursos</div>
      <div class="slide-number">Slide 02</div>
    </div>
  </div>

  <!-- SLIDE 3: GESTÃO DE CAMPEONATOS & PROVAS -->
  <div class="slide">
    <div class="slide-header">
      <div class="brand-logo">
        <div class="brand-icon">G&G</div>
        <div class="brand-text">G&G Competições</div>
      </div>
      <div class="slide-tag">Campeonatos</div>
    </div>

    <div class="slide-title-block">
      <h2 class="slide-title">Gestão Inteligente de <span>Campeonatos e Etapas</span></h2>
      <p class="slide-subtitle">Da configuração inicial da prova ao lançamento de resultados com suporte a múltiplos formatos de disputa e reinscrições.</p>
    </div>

    <div class="slide-body">
      <div class="grid-2">
        <div class="card">
          <div class="card-icon">🎯</div>
          <h3 class="card-title">Configuração de Campeonatos & Modalidades</h3>
          <p class="card-desc">Flexibilidade total para definir modalidades, quantidade de séries, tiros por série, tempo limite e tipos de avaliação técnica.</p>
          <ul class="card-list">
            <li><strong>Multicampeonatos:</strong> Inscrição em pacote de provas com tarifa única e rateio automático entre campeonatos.</li>
            <li><strong>Tarifas Diferenciadas:</strong> Preços específicos para inscrição individual de atleta, inscrição via clube e valor promocional de reinscrição.</li>
            <li><strong>Restrição por Gênero:</strong> Etapas configuráveis para disputas Masculinas, Femininas ou Mistas com validação automatizada no ato da inscrição.</li>
            <li><strong>Valor Customizável da Zona X:</strong> Suporte a peso diferenciado para a zona X do alvo (ex: 11 pontos) ou padrão 10 pontos.</li>
          </ul>
        </div>

        <div class="card highlight">
          <div class="card-icon">📊</div>
          <h3 class="card-title">Lançamento de Resultados & Desempate Oficial</h3>
          <p class="card-desc">Interface ágil para diretores de prova lançarem pontuações de cada atirador com cálculo em tempo real da melhor série.</p>
          <ul class="card-list">
            <li><strong>Grid por Zonas de Alvo:</strong> Entrada rápida de impactos nas faixas X, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1 e 0.</li>
            <li><strong>Melhor Série Automática:</strong> O sistema analisa todas as tentativas do atleta e seleciona a melhor performance para a súmula final.</li>
            <li><strong>Critérios de Desempate:</strong> Desempate rigoroso por total de pontos, tempo consumido, fator de impacto e contagem sequencial de centros de alvo (X e 10).</li>
            <li><strong>Ações de Pista:</strong> Registro transparente de faltas, penalidades, ausência (DNS) ou desqualificação (DQ).</li>
          </ul>
        </div>
      </div>
    </div>

    <div class="slide-footer">
      <div>G&G Competições — Apresentação de Recursos</div>
      <div class="slide-number">Slide 03</div>
    </div>
  </div>

  <!-- SLIDE 4: MOTOR FINANCEIRO & DIVISÃO DE ARRECADAÇÃO -->
  <div class="slide">
    <div class="slide-header">
      <div class="brand-logo">
        <div class="brand-icon">G&G</div>
        <div class="brand-text">G&G Competições</div>
      </div>
      <div class="slide-tag">Financeiro & Prêmios</div>
    </div>

    <div class="slide-title-block">
      <h2 class="slide-title">Motor Financeiro & <span>Regras de Premiação</span></h2>
      <p class="slide-subtitle">Distribuição automática dos valores arrecadados em cada competição com controle transparente para organização e clubes filiados.</p>
    </div>

    <div class="slide-body">
      <div class="grid-2">
        <div class="card">
          <div class="card-icon">💰</div>
          <h3 class="card-title">Cascata de Divisão da Arrecadação</h3>
          <p class="card-desc">Cada inscrição processada tem seu valor distribuído percentualmente conforme as regras cadastradas no campeonato:</p>
          <div class="pill-group">
            <div class="pill">🏛️ <strong>% Tributos:</strong> Reserva fiscal para impostos</div>
            <div class="pill">🏢 <strong>% Organização:</strong> Taxa do clube organizador</div>
            <div class="pill">🎯 <strong>% Clubes:</strong> Repasse para o clube do atleta</div>
            <div class="pill">🥇 <strong>% Premiação Atleta:</strong> Fundo de prêmios individuais</div>
            <div class="pill">🏆 <strong>% Premiação Clubes:</strong> Fundo de prêmios por equipe</div>
          </div>
          <div class="ui-box">
            Arrecadação Prevista calculada dinamicamente:<br>
            [Qtd Insc. Individuais × Valor] + [Qtd Insc. Clube × Valor] + [Reinscrições × Valor]
          </div>
        </div>

        <div class="card highlight">
          <div class="card-icon">🏅</div>
          <h3 class="card-title">Premiações Ouro, Prata, Bronze & Equipes</h3>
          <p class="card-desc">Estrutura completa de premiação acumulada do 1º ao 5º lugar para atletas e clubes parceiros.</p>
          <ul class="card-list">
            <li><strong>Divisão por Categorias de Medalha:</strong> Classificação e premiação dividida entre categorias Ouro, Prata e Bronze por faixas de pontuação.</li>
            <li><strong>Premiação Geral ("Todas as Etapas"):</strong> Ranking consolidado do campeonato completo com distribuição percentual do 1º ao 5º colocado.</li>
            <li><strong>Premiação por Equipe de Clubes:</strong> Apuração automática do clube campeão baseada no desempenho combinado dos seus atletas federados.</li>
            <li><strong>Pop-up de Detalhamento:</strong> Modal interativo para consulta instantânea de inscritos, arrecadação total e tabela de prêmios por modalidade.</li>
          </ul>
        </div>
      </div>
    </div>

    <div class="slide-footer">
      <div>G&G Competições — Apresentação de Recursos</div>
      <div class="slide-number">Slide 04</div>
    </div>
  </div>

  <!-- SLIDE 5: COMPLIANCE LEGAL, HABITUALIDADE E EXÉRCITO -->
  <div class="slide">
    <div class="slide-header">
      <div class="brand-logo">
        <div class="brand-icon">G&G</div>
        <div class="brand-text">G&G Competições</div>
      </div>
      <div class="slide-tag">Compliance Legal</div>
    </div>

    <div class="slide-title-block">
      <h2 class="slide-title">Habitualidade & Compliance com o <span>Exército Brasileiro</span></h2>
      <p class="slide-subtitle">Tranquilidade jurídica total com emissão automática de documentos legais nos padrões exigidos pela fiscalização da COLOG.</p>
    </div>

    <div class="slide-body">
      <div class="grid-3">
        <div class="card highlight">
          <div class="card-icon">📋</div>
          <span class="badge badge-cyan">Modelo Oficial COLOG</span>
          <h3 class="card-title">Declaração de Habitualidade</h3>
          <p class="card-desc">Gerador de habitualidade por intervalo de datas (Data Inicial / Data Final) pronto para apresentação ao Exército.</p>
          <ul class="card-list">
            <li>Consolidação de treinos e provas do período</li>
            <li>Detalhamento por arma, classe, calibre e SIGMA</li>
            <li>Origem da munição (própria ou do clube)</li>
            <li>Assinatura e dados cadastrais do clube</li>
          </ul>
        </div>

        <div class="card">
          <div class="card-icon">📑</div>
          <span class="badge badge-purple">Anexo N - Art. 34</span>
          <h3 class="card-title">Termo de Cessão de Armas</h3>
          <p class="card-desc">Emissão rápida de autorização de uso de arma do clube ou de terceiros conforme Decreto 11.615/2023.</p>
          <ul class="card-list">
            <li>Autocomplete inteligente de atletas por CPF</li>
            <li>Busca direta de armas registradas por SIGMA</li>
            <li>Definição de vigência do documento</li>
            <li>Geração imediata em PDF oficial</li>
          </ul>
        </div>

        <div class="card">
          <div class="card-icon">🎯</div>
          <span class="badge badge-green">Estande & Diário</span>
          <h3 class="card-title">Diário de Habitualidade Rápido</h3>
          <p class="card-desc">Lançamento simplificado de treinos de habitualidade no estande com abatimento automático de munições.</p>
          <ul class="card-list">
            <li>Pesquisa ágil de atiradores federados</li>
            <li>Seleção de armas do atleta ou do clube</li>
            <li>Cadastro instantâneo de novas armas na pista</li>
            <li>Registro imediato com data/hora e disparos</li>
          </ul>
        </div>
      </div>
    </div>

    <div class="slide-footer">
      <div>G&G Competições — Apresentação de Recursos</div>
      <div class="slide-number">Slide 05</div>
    </div>
  </div>

  <!-- SLIDE 6: GESTÃO DE MUNIÇÕES, ESTOQUE E RECARGA -->
  <div class="slide">
    <div class="slide-header">
      <div class="brand-logo">
        <div class="brand-icon">G&G</div>
        <div class="brand-text">G&G Competições</div>
      </div>
      <div class="slide-tag">Gestão de Munições</div>
    </div>

    <div class="slide-title-block">
      <h2 class="slide-title">Controle Completo de <span>Munições e Insumos</span></h2>
      <p class="slide-subtitle">Rastreabilidade ponta a ponta desde a entrada por Nota Fiscal até o consumo nos treinamentos e campeonatos.</p>
    </div>

    <div class="slide-body">
      <div class="grid-4">
        <div class="card">
          <div class="card-icon">📦</div>
          <h3 class="card-title">Entrada por NF</h3>
          <p class="card-desc">Registro de notas fiscais de compra com incremento automático no estoque de munições de fábrica.</p>
        </div>

        <div class="card">
          <div class="card-icon">⚙️</div>
          <h3 class="card-title">Estoque & Recarga</h3>
          <p class="card-desc">Controle de insumos de recarga do clube (pólvora, espoletas, pontas) e produção própria por calibre.</p>
        </div>

        <div class="card">
          <div class="card-icon">♻️</div>
          <h3 class="card-title">Ponta & Reciclado</h3>
          <p class="card-desc">Gestão de chumbo recolhido do estande e fundição/reciclagem de pontas com balanço por calibre.</p>
        </div>

        <div class="card highlight">
          <div class="card-icon">🎯</div>
          <h3 class="card-title">Alocação por Atleta</h3>
          <p class="card-desc">Transferência de lote para o saldo do atleta com <strong>abate automático</strong> a cada treino ou prova efetuada no estande.</p>
        </div>
      </div>
    </div>

    <div class="slide-footer">
      <div>G&G Competições — Apresentação de Recursos</div>
      <div class="slide-number">Slide 06</div>
    </div>
  </div>

  <!-- SLIDE 7: CARTEIRINHAS E CERTIFICADOS COM QR CODE -->
  <div class="slide">
    <div class="slide-header">
      <div class="brand-logo">
        <div class="brand-icon">G&G</div>
        <div class="brand-text">G&G Competições</div>
      </div>
      <div class="slide-tag">Auditoria Digital</div>
    </div>

    <div class="slide-title-block">
      <h2 class="slide-title">Carteirinhas & Certificados com <span>Validação via QR Code</span></h2>
      <p class="slide-subtitle">Documentos elegantes com autenticidade verificável publicamente por qualquer câmera de smartphone.</p>
    </div>

    <div class="slide-body">
      <div class="grid-2">
        <div class="card highlight">
          <div class="card-icon">🪪</div>
          <h3 class="card-title">Carteirinha Oficial do Atleta</h3>
          <p class="card-desc">Design moderno em padrão aço/azul metalizado com impressão de altíssima qualidade (frente e verso).</p>
          <ul class="card-list">
            <li><strong>Frente:</strong> Moldura para foto 3x4 do atleta, badge de Atirador Desportivo, Número de Cadastro, Nome, CPF, RG, CR e Validade.</li>
            <li><strong>Verso:</strong> Padrão de marca d'água oficial G&G, dados do clube filiado e QR Code centralizado para auditoria.</li>
            <li><strong>Impressão Perfeita:</strong> Suporte a impressão via navegador preservando fundos coloridos e marcas d'água (`print-color-adjust`).</li>
            <li><strong>Redimensionamento de QR Code:</strong> Slider dinâmico no editor do clube para ajuste do tamanho do QR Code (40px a 200px).</li>
          </ul>
        </div>

        <div class="card">
          <div class="card-icon">🔍</div>
          <h3 class="card-title">Auditoria Pública Sem Autenticação</h3>
          <p class="card-desc">Ao escanear o QR Code (`ISO 18004`), a fiscalização ou autoridade é direcionada para a página de validação em tempo real.</p>
          <ul class="card-list">
            <li><strong>Validação de Carteirinha (`/validar/carteirinha/:userId`):</strong> Exibe o selo de carteirinha <strong>VÁLIDA</strong> ou <strong>EXPIRADA</strong> com foto, CR, clube e CPF mascarado por LGPD (`123.***.***-00`).</li>
            <li><strong>Validação de Certificados (`/validar/certificado/:certId`):</strong> Exibe o comprovante oficial da prova, pontos conquistados, etapa e colocação (Ouro, Prata, Bronze).</li>
            <li><strong>Certificados A4 Elegantes:</strong> Emissão de diplomas de participação e medalhas com filtro por melhor pontuação do atleta.</li>
          </ul>
        </div>
      </div>
    </div>

    <div class="slide-footer">
      <div>G&G Competições — Apresentação de Recursos</div>
      <div class="slide-number">Slide 07</div>
    </div>
  </div>

  <!-- SLIDE 8: INTEGRAÇÃO FINANCEIRA PIX SICOOB -->
  <div class="slide">
    <div class="slide-header">
      <div class="brand-logo">
        <div class="brand-icon">G&G</div>
        <div class="brand-text">G&G Competições</div>
      </div>
      <div class="slide-tag">Integração Bancária</div>
    </div>

    <div class="slide-title-block">
      <h2 class="slide-title">Integração PIX <span>Banco Sicoob (OAuth 2.0 & mTLS)</span></h2>
      <p class="slide-subtitle">Automação financeira completa de recebimentos via PIX com baixa instantânea de inscrições e anuidades.</p>
    </div>

    <div class="slide-body">
      <div class="grid-3">
        <div class="card highlight">
          <div class="card-icon">🔐</div>
          <span class="badge badge-cyan">Segurança Máxima</span>
          <h3 class="card-title">Credenciais & mTLS</h3>
          <p class="card-desc">Conexão direta via API bancária oficial do Banco Sicoob utilizando certificados digitais mTLS (`.pem`).</p>
          <ul class="card-list">
            <li>Suporte a Client ID e Client Secret</li>
            <li>Upload seguro de chave privada e certificado</li>
            <li>Chave PIX cadastrada do clube</li>
            <li>Ambientes de Sandbox e Produção</li>
          </ul>
        </div>

        <div class="card">
          <div class="card-icon">⚡</div>
          <span class="badge badge-green">Cobrança Instantânea</span>
          <h3 class="card-title">PIX Dinâmico (`cob`/`txid`)</h3>
          <p class="card-desc">Geração automática do payload "PIX Copia e Cola" e imagem do QR Code para o atirador no momento da inscrição.</p>
          <ul class="card-list">
            <li>Identificador único por transação (`txid`)</li>
            <li>Expiracão configurável do QR Code</li>
            <li>Sem necessidade de envio de comprovantes</li>
          </ul>
        </div>

        <div class="card">
          <div class="card-icon">🔔</div>
          <span class="badge badge-purple">Baixa Automática</span>
          <h3 class="card-title">Notificação por Webhook</h3>
          <p class="card-desc">Recebimento de notificações em tempo real (`POST /api/webhooks/sicoob-pix`) para liquidação imediata.</p>
          <ul class="card-list">
            <li>Baixa instantânea da inscrição</li>
            <li>Liberação automática para a prova</li>
            <li>Histórico auditável de conciliação</li>
          </ul>
        </div>
      </div>
    </div>

    <div class="slide-footer">
      <div>G&G Competições — Apresentação de Recursos</div>
      <div class="slide-number">Slide 08</div>
    </div>
  </div>

  <!-- SLIDE 9: EXPERIÊNCIA DO ATLETA -->
  <div class="slide">
    <div class="slide-header">
      <div class="brand-logo">
        <div class="brand-icon">G&G</div>
        <div class="brand-text">G&G Competições</div>
      </div>
      <div class="slide-tag">Portal do Atleta</div>
    </div>

    <div class="slide-title-block">
      <h2 class="slide-title">Experiência Incrível para o <span>Atleta Federado</span></h2>
      <p class="slide-subtitle">Um portal moderno e intuitivo onde o atirador acompanha toda a sua vida esportiva e relacionamento com o clube.</p>
    </div>

    <div class="slide-body">
      <div class="grid-3">
        <div class="card">
          <div class="card-icon">👤</div>
          <h3 class="card-title">"Meu Cadastro" Progressivo</h3>
          <p class="card-desc">Preenchimento guiado por etapas dos dados pessoais, contato, endereço, documentos e upload do CR do Exército.</p>
          <ul class="card-list">
            <li>Edição direta de vencimento da Guia de Trânsito</li>
            <li>Visualização de anuidade e status de filiação</li>
            <li>Consulta ao saldo individual de munições</li>
          </ul>
        </div>

        <div class="card highlight">
          <div class="card-icon">📸</div>
          <h3 class="card-title">Feed Social da Comunidade</h3>
          <p class="card-desc">Rede social integrada estilo Instagram para os atletas compartilharem conquistas, fotos de treinos e momentos no estande.</p>
          <ul class="card-list">
            <li>Publicação de fotos com legenda</li>
            <li>Curtidas e comentários entre atiradores</li>
            <li>Carregamento progressivo (lazy loading)</li>
          </ul>
        </div>

        <div class="card">
          <div class="card-icon">🏆</div>
          <h3 class="card-title">Resultados & Conquistas</h3>
          <p class="card-desc">Acesso direto pelo perfil ao histórico de campeonatos disputados, colocações obtidas e download de certificados.</p>
          <ul class="card-list">
            <li>Visualizador universal de resultados (`CompetitionResultsViewer`)</li>
            <li>Filtros por medalhas Ouro, Prata e Bronze</li>
            <li>Download de certificados oficiais A4</li>
          </ul>
        </div>
      </div>
    </div>

    <div class="slide-footer">
      <div>G&G Competições — Apresentação de Recursos</div>
      <div class="slide-number">Slide 09</div>
    </div>
  </div>

  <!-- SLIDE 10: PAINEL DIRETO, RBAC & SITE -->
  <div class="slide">
    <div class="slide-header">
      <div class="brand-logo">
        <div class="brand-icon">G&G</div>
        <div class="brand-text">G&G Competições</div>
      </div>
      <div class="slide-tag">Painel Diretor</div>
    </div>

    <div class="slide-title-block">
      <h2 class="slide-title">Painel Diretor, Permissões & <span>Personalização do Site</span></h2>
      <p class="slide-subtitle">Controle total sobre as operações do clube e customização em tempo real da página inicial do portal.</p>
    </div>

    <div class="slide-body">
      <div class="grid-2">
        <div class="card">
          <div class="card-icon">🛡️</div>
          <h3 class="card-title">Controle de Acesso (RBAC) & Multiclube</h3>
          <p class="card-desc">Segurança rigorosa com perfis de permissão bem definidos para toda a estrutura organizacional.</p>
          <ul class="card-list">
            <li><strong>Master Admin:</strong> Gestão global de clubes filiados, homologações e controle da lista padrão de armas (lookup options).</li>
            <li><strong>Club Admin (Gestor de Clube):</strong> Controle completo do estande, membros filiados, habituabilidades, munições, carteirinhas e campeonatos do clube.</li>
            <li><strong>Membro (Atleta):</strong> Acesso restrito às suas inscrições, armas, habitualidades, certificados e perfil pessoal.</li>
          </ul>
        </div>

        <div class="card highlight">
          <div class="card-icon">🌐</div>
          <h3 class="card-title">Gerenciador de Conteúdo do Site</h3>
          <p class="card-desc">Altere os destaques da página inicial pública sem precisar de programador.</p>
          <ul class="card-list">
            <li><strong>Banner Home:</strong> Carrossel de banners principais com tag, título, subtítulo, botões e imagens customizáveis.</li>
            <li><strong>Texto Home:</strong> Editor de texto da capa com pré-visualização ao vivo (*Live Preview*), alterando título H2, mensagens e botões em tempo real.</li>
            <li><strong>Certificados e Carteirinhas:</strong> Editor gráfico para posicionar elementos e ajustar tamanho do QR Code.</li>
          </ul>
        </div>
      </div>
    </div>

    <div class="slide-footer">
      <div>G&G Competições — Apresentação de Recursos</div>
      <div class="slide-number">Slide 10</div>
    </div>
  </div>

  <!-- SLIDE 11: ARQUITETURA TÉCNICA E PERFORMANCE -->
  <div class="slide">
    <div class="slide-header">
      <div class="brand-logo">
        <div class="brand-icon">G&G</div>
        <div class="brand-text">G&G Competições</div>
      </div>
      <div class="slide-tag">Tecnologia & Infra</div>
    </div>

    <div class="slide-title-block">
      <h2 class="slide-title">Arquitetura de Alta Performance & <span>Segurança</span></h2>
      <p class="slide-subtitle">Engenharia moderna projetada para máxima velocidade, disponibilidade contínua e proteção de dados sensíveis.</p>
    </div>

    <div class="slide-body">
      <div class="grid-3">
        <div class="card">
          <div class="card-icon">⚡</div>
          <h3 class="card-title">Alta Velocidade & Carregamento</h3>
          <p class="card-desc">Sincronização otimizada em lote paralelo (`Promise.allSettled()`) reduzindo o tempo de inicialização do sistema para menos de 1 segundo.</p>
          <ul class="card-list">
            <li>Índices otimizados no PostgreSQL</li>
            <li>Feed com rolagem infinita e lazy loading de imagens</li>
            <li>Resposta instantânea da interface</li>
          </ul>
        </div>

        <div class="card highlight">
          <div class="card-icon">🔒</div>
          <h3 class="card-title">Segurança & LGPD</h3>
          <p class="card-desc">Proteção rigorosa das informações pessoais e cadastrais dos atiradores federados.</p>
          <ul class="card-list">
            <li>Autenticação por CPF com hashing scrypt</li>
            <li>Mascaramento de CPF em auditorias públicas (`123.***.***-00`)</li>
            <li>Armazenamento seguro de documentos</li>
          </ul>
        </div>

        <div class="card">
          <div class="card-icon">☁️</div>
          <h3 class="card-title">Infraestrutura em Nuvem</h3>
          <p class="card-desc">Deploy moderno em contêineres Docker com suporte a banco de dados relacional PostgreSQL e armazenamento de objetos MinIO.</p>
          <ul class="card-list">
            <li>Arquitetura resiliente sem ponto único de falha</li>
            <li>Backups automáticos e facilidade de escala</li>
            <li>Deploy simplificado via PaaS (EasyPanel)</li>
          </ul>
        </div>
      </div>
    </div>

    <div class="slide-footer">
      <div>G&G Competições — Apresentação de Recursos</div>
      <div class="slide-number">Slide 11</div>
    </div>
  </div>

  <!-- SLIDE 12: RESUMO E ENCERRAMENTO -->
  <div class="slide cover-slide" style="text-align: left; padding: 80px 100px;">
    <div style="width: 100%;">
      <div class="cover-badge">
        <span>🚀</span> O FUTURO DO SEU CLUBE DE TIRO
      </div>
      <h2 class="cover-title" style="font-size: 52px; margin-bottom: 20px;">
        Por que escolher o <span>G&G Competições</span>?
      </h2>

      <div class="grid-3" style="margin-top: 40px;">
        <div class="card highlight">
          <div class="card-icon">✨</div>
          <h3 class="card-title">100% Livre de Burocracia</h3>
          <p class="card-desc">Automatize a habitualidade, emissão de termos do Exército e inscrições em campeonatos em uma única plataforma.</p>
        </div>

        <div class="card highlight">
          <div class="card-icon">🛡️</div>
          <h3 class="card-title">Segurança Jurídica Total</h3>
          <p class="card-desc">Esteja sempre em dia com a fiscalização através de auditoria pública por QR Code e registros imutáveis.</p>
        </div>

        <div class="card highlight">
          <div class="card-icon">📈</div>
          <h3 class="card-title">Crescimento do Clube</h3>
          <p class="card-desc">Proporcione uma experiência de nível profissional aos seus atletas e aumente a arrecadação das suas provas.</p>
        </div>
      </div>

      <div style="margin-top: 60px; background: rgba(15, 23, 42, 0.8); border: 1px solid rgba(56, 189, 248, 0.4); border-radius: 20px; padding: 30px; display: flex; justify-content: space-between; align-items: center;">
        <div>
          <h3 style="font-size: 24px; font-weight: 800; color: #FFF; margin-bottom: 6px;">Pronto para transformar a gestão do seu clube?</h3>
          <p style="font-size: 16px; color: #94A3B8;">Agende uma demonstração ao vivo ou inicie o processo de migração do seu sistema atual.</p>
        </div>
        <div style="background: linear-gradient(135deg, #0284C7, #6366F1); color: #FFF; padding: 16px 36px; border-radius: 30px; font-weight: 800; font-size: 18px; box-shadow: 0 4px 20px rgba(2, 132, 199, 0.4);">
          G&G Competições
        </div>
      </div>
    </div>
  </div>

</body>
</html>
"""

html_path = os.path.abspath("apresentacao_gg_competicoes.html")
pdf_path = os.path.abspath("Apresentacao_Sistema_GG_Competicoes.pdf")

with open(html_path, "w", encoding="utf-8") as f:
    f.write(html_content)

print(f"HTML saved to {html_path}")

edge_path = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"

cmd = [
    edge_path,
    "--headless",
    "--disable-gpu",
    "--no-pdf-header-footer",
    f"--print-to-pdf={pdf_path}",
    html_path
]

print("Running Edge to generate PDF...")
res = subprocess.run(cmd, capture_output=True, text=True)
print("Exit code:", res.returncode)
if os.path.exists(pdf_path):
    print(f"SUCCESS: PDF generated at {pdf_path} (Size: {os.path.getsize(pdf_path)} bytes)")
else:
    print("FAILED: PDF not created", res.stderr)
