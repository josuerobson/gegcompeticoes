import os
import sys
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.pdfgen import canvas
from reportlab.lib.units import inch

# Color Palette (Premium Blue & Gold theme)
PRIMARY_COLOR = colors.HexColor("#090d16")   # Dark Navy
SECONDARY_COLOR = colors.HexColor("#d97706") # Amber/Gold
TEXT_COLOR = colors.HexColor("#1e293b")      # Slate 800
LIGHT_BG = colors.HexColor("#f8fafc")        # Slate 50
BORDER_COLOR = colors.HexColor("#cbd5e1")    # Slate 300
WHITE = colors.HexColor("#ffffff")
GRAY_TEXT = colors.HexColor("#64748b")       # Slate 500

class NumberedCanvas(canvas.Canvas):
    """
    Custom canvas to calculate total page count and draw header/footer dynamically
    """
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super().showPage()
        super().save()

    def draw_page_decorations(self, page_count):
        self.saveState()
        
        # Suppress header and footer on cover page (Page 1)
        if self._pageNumber > 1:
            # Running Header
            self.setFont("Helvetica-Bold", 8)
            self.setFillColor(PRIMARY_COLOR)
            self.drawString(54, 750, "G&G COMPETEÇÕES")
            self.setFont("Helvetica", 8)
            self.setFillColor(GRAY_TEXT)
            self.drawString(150, 750, "|   Apresentação do Projeto & Proposta de Desenvolvimento")
            
            # Header Line
            self.setStrokeColor(SECONDARY_COLOR)
            self.setLineWidth(0.8)
            self.line(54, 742, 558, 742)
            
            # Running Footer
            self.setStrokeColor(colors.HexColor("#e2e8f0"))
            self.setLineWidth(0.5)
            self.line(54, 55, 558, 55)
            
            self.setFont("Helvetica", 8)
            self.setFillColor(GRAY_TEXT)
            self.drawString(54, 42, "Confidencial - G&G Tech Solutions")
            
            page_text = f"Página {self._pageNumber} de {page_count}"
            self.drawRightString(558, 42, page_text)
            
        self.restoreState()

def generate_pdf(filename="G_and_G_Competicoes_Proposta_Comercial.pdf"):
    # Margins: 0.75 inch (54 points)
    doc = SimpleDocTemplate(
        filename,
        pagesize=letter,
        leftMargin=54,
        rightMargin=54,
        topMargin=80,  # leaves room for header
        bottomMargin=80 # leaves room for footer
    )
    
    styles = getSampleStyleSheet()
    
    # Custom styles
    title_style = ParagraphStyle(
        'CoverTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=26,
        leading=32,
        textColor=PRIMARY_COLOR,
        alignment=0, # Left aligned
        spaceAfter=15
    )
    
    subtitle_style = ParagraphStyle(
        'CoverSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=12,
        leading=16,
        textColor=GRAY_TEXT,
        alignment=0,
        spaceAfter=40
    )
    
    h1_style = ParagraphStyle(
        'Header1',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=18,
        leading=22,
        textColor=PRIMARY_COLOR,
        spaceBefore=15,
        spaceAfter=12,
        keepWithNext=True
    )

    h2_style = ParagraphStyle(
        'Header2',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=12,
        leading=16,
        textColor=SECONDARY_COLOR,
        spaceBefore=12,
        spaceAfter=8,
        keepWithNext=True
    )
    
    body_style = ParagraphStyle(
        'BodyTextCustom',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10,
        leading=14,
        textColor=TEXT_COLOR,
        spaceAfter=10
    )

    bullet_style = ParagraphStyle(
        'BulletCustom',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9.5,
        leading=13.5,
        textColor=TEXT_COLOR,
        leftIndent=15,
        firstLineIndent=-10,
        spaceAfter=6
    )

    table_header_style = ParagraphStyle(
        'TableHeader',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9,
        leading=11,
        textColor=WHITE,
        alignment=1 # Centered
    )

    table_cell_style = ParagraphStyle(
        'TableCell',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.5,
        leading=11,
        textColor=TEXT_COLOR
    )

    table_cell_bold = ParagraphStyle(
        'TableCellBold',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8.5,
        leading=11,
        textColor=PRIMARY_COLOR
    )

    story = []
    
    # ----------------------------------------------------
    # PAGE 1: COVER PAGE
    # ----------------------------------------------------
    story.append(Spacer(1, 120))
    # Elegant small gold bar decoration
    dec_data = [['']]
    dec_table = Table(dec_data, colWidths=[60], rowHeights=[4])
    dec_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), SECONDARY_COLOR),
        ('BOTTOMPADDING', (0,0), (-1,-1), 0),
        ('TOPPADDING', (0,0), (-1,-1), 0),
    ]))
    story.append(dec_table)
    story.append(Spacer(1, 15))
    
    story.append(Paragraph("G&G COMPETIÇÕES", title_style))
    story.append(Paragraph("Plataforma Integrada de Gestão Esportiva, Clubes de Tiro e Rankings Nacionais", ParagraphStyle('CoverPre', parent=styles['Normal'], fontName='Helvetica-Bold', fontSize=14, textColor=SECONDARY_COLOR, spaceAfter=8)))
    story.append(Paragraph("PROPOSTA DE DESENVOLVIMENTO & ESCOPO TÉCNICO", subtitle_style))
    
    story.append(Spacer(1, 150))
    
    # Meta information block at the bottom
    meta_text = """
    <b>Preparado para:</b> Guilherme Guedes e Gabriel G&G<br/>
    <b>Elaborado por:</b> G&G Tech Solutions<br/>
    <b>Data de Emissão:</b> 15 de Junho de 2026<br/>
    <b>Status do Projeto:</b> Protótipo de Alta Fidelidade Concluído (Pronto para Produção)<br/>
    <b>Versão:</b> 1.1
    """
    story.append(Paragraph(meta_text, ParagraphStyle('CoverMeta', parent=styles['Normal'], fontName='Helvetica', fontSize=10, leading=15, textColor=TEXT_COLOR)))
    story.append(PageBreak())
    
    # ----------------------------------------------------
    # PAGE 2: VISÃO GERAL & ARQUITETURA
    # ----------------------------------------------------
    story.append(Paragraph("1. Visão Geral do Sistema", h1_style))
    story.append(Paragraph(
        "A plataforma <b>G&G Competições</b> foi desenvolvida com o objetivo de revolucionar a gestão administrativa de estandes e clubes de tiro, unificando a experiência social dos atiradores com as obrigações desportivas e legais.",
        body_style
    ))
    story.append(Paragraph(
        "O sistema oferece aos atletas um <b>feed social interativo</b> para compartilhamento de resultados, controle de habitualidades e habitualidades homologadas em tempo real. Para os clubes e diretoria, atua como um ERP completo (SaaS), controlando desde o acervo de armas e munições até repasses de franquia (royalties), homologação de etapas e emissão automatizada de certificados, declarações legais e termos de cessão de uso de arma de fogo.",
        body_style
    ))
    
    story.append(Spacer(1, 10))
    story.append(Paragraph("Especificações de Arquitetura & Stack Tecnológica", h2_style))
    story.append(Paragraph(
        "A plataforma foi construída seguindo as melhores práticas de engenharia de software moderno, garantindo desempenho, responsividade e escalabilidade:",
        body_style
    ))
    
    story.append(Paragraph("• <b>Camada de Apresentação (Frontend):</b> Desenvolvida em React 18, Vite e TypeScript. Possui design responsivo otimizado para dispositivos móveis (com menu suspenso nativo no perfil), transições dinâmicas de alta fidelidade e suporte integrado a temas claro e escuro.", bullet_style))
    story.append(Paragraph("• <b>Camada de Serviços (Backend):</b> API REST assíncrona desenvolvida em Node.js e Express, garantindo alto rendimento de requisições, segurança nas rotas e controle de sessão robusto.", bullet_style))
    story.append(Paragraph("• <b>Persistência de Dados (Banco de Dados):</b> PostgreSQL com pool de conexões otimizado, suporte a transações ACID, DDL automatizado e rotinas inteligentes de seeding para inicialização instantânea.", bullet_style))
    story.append(Paragraph("• <b>Segurança & Performance:</b> Conversão dinâmica de mídia para Base64 no cliente para armazenamento eficiente de imagens de campeonatos e posts, validação rigorosa de chaves estrangeiras e controle de acesso baseado em papéis (Atleta vs. Diretor).", bullet_style))
    
    story.append(PageBreak())
    
    # ----------------------------------------------------
    # PAGE 3: ANÁLISE DE RECURSOS CONCLUÍDOS
    # ----------------------------------------------------
    story.append(Paragraph("2. Mapeamento de Recursos Implementados", h1_style))
    story.append(Paragraph(
        "Abaixo estão detalhados os módulos e recursos completamente desenvolvidos e testados no protótipo funcional de alta fidelidade:",
        body_style
    ))
    
    story.append(Paragraph("Painel de Serviços do Atleta", h2_style))
    story.append(Paragraph("• <b>Social Feed:</b> Compartilhamento de legendas e fotos (preset, upload de arquivo local ou link externo) integrado a um cartão de tiro virtual (disciplina, equipamento, calibre, distância, acertos, pontuação e hit factor). Suporte a curtidas e comentários.", bullet_style))
    story.append(Paragraph("• <b>Inscrições & Comprovantes:</b> Inscrição online em campeonatos em etapas e modalidades específicas com emissão e impressão de comprovantes contendo chaves de autenticação exclusivas.", bullet_style))
    story.append(Paragraph("• <b>Resultados & Rankings:</b> Acesso à performance técnica com gráfico de progresso de etapas e medalhas automáticas de premiação.", bullet_style))
    story.append(Paragraph("• <b>Documentos de Habitualidade:</b> Registro e emissão automática de comprovante de habitualidade (exigência do Exército Brasileiro / SFPC) e Termo de Cessão de Uso de Arma de Fogo oficial em tempo real.", bullet_style))
    story.append(Paragraph("• <b>Identidade Funcional:</b> Carteirinhas de Sócio do Clube e Federado Nacional com visual profissional pronto para impressão.", bullet_style))
    
    story.append(Spacer(1, 5))
    story.append(Paragraph("Central de Direção e Gestão (AdminPanel)", h2_style))
    story.append(Paragraph("• <b>Área Gerenciamento Clube:</b> Controle financeiro de arrecadação de inscrições e anuidades, painel de homologação de certificados de participação, e cadastro rápido de novos sócios desportivos.", bullet_style))
    story.append(Paragraph("• <b>Área Gerenciamento Plataforma (Master):</b> Controle de filiais e repasses de franquia (royalties fixados em 15%). Lançamento e edição de campeonatos com suporte a upload de banners.", bullet_style))
    story.append(Paragraph("• <b>Administração do Site:</b> Gestão de banners da Home, banners internos, patrocinadores, vídeos do YouTube em destaque e configuração global da <b>Imagem Padrão</b> da plataforma com pré-visualização ao vivo.", bullet_style))
    story.append(Paragraph("• <b>Arsenal & Logística:</b> Cadastro de acervo de armas da entidade, estoque físico de munições por calibre e fila de validação de treinos de habitualidade.", bullet_style))
    
    story.append(PageBreak())
    
    # ----------------------------------------------------
    # PAGE 4: PROPOSTA COMERCIAL & CRONOGRAMA
    # ----------------------------------------------------
    story.append(Paragraph("3. Proposta Comercial e Orçamento", h1_style))
    story.append(Paragraph(
        "Com base no escopo técnico desenvolvido e na maturidade atual do protótipo, apresenta-se a estimativa de custos para a fase final de deploy em produção, homologação legal e suporte pós-lançamento.",
        body_style
    ))
    
    # Estimativa de custos table
    # Columns: Componente / Descrição, Horas Est., Valor Estimado
    data = [
        [
            Paragraph("<b>Módulo / Etapa do Projeto</b>", table_header_style), 
            Paragraph("<b>Descrição Técnica e Atividades</b>", table_header_style), 
            Paragraph("<b>Investimento (R$)</b>", table_header_style)
        ],
        [
            Paragraph("<b>Infraestrutura & Cloud Setup</b>", table_cell_bold),
            Paragraph("Configuração do servidor de produção (Easypanel/Docker), Banco de Dados PostgreSQL gerenciado com backups automáticos, configuração de SSL e domínio próprio.", table_cell_style),
            Paragraph("<b>R$ 2.400,00</b>", table_cell_style)
        ],
        [
            Paragraph("<b>Integração de APIs de Pagamento</b>", table_cell_bold),
            Paragraph("Implementação real de recebimento de inscrições e assinaturas via Pix e Cartão de Crédito com conciliação automática com o banco de dados.", table_cell_style),
            Paragraph("<b>R$ 3.800,00</b>", table_cell_style)
        ],
        [
            Paragraph("<b>Segurança & LGPD</b>", table_cell_bold),
            Paragraph("Criptografia de senhas, controle de sessões via tokens JWT, tratamento de dados de atiradores e CRs em conformidade com as regras de proteção de dados e do Exército.", table_cell_style),
            Paragraph("<b>R$ 3.200,00</b>", table_cell_style)
        ],
        [
            Paragraph("<b>Homologação e Testes Finais</b>", table_cell_bold),
            Paragraph("Auditoria de segurança, testes de carga no feed social, validação de compatibilidade móvel total e refinamento de relatórios e carteirinhas.", table_cell_style),
            Paragraph("<b>R$ 2.600,00</b>", table_cell_style)
        ],
        [
            Paragraph("<b>Total do Desenvolvimento</b>", table_cell_bold),
            Paragraph("<b>Abertura e finalização de escopo com o deploy em produção.</b>", table_cell_bold),
            Paragraph("<b>R$ 12.000,00</b>", table_cell_bold)
        ]
    ]
    
    # Table styling
    col_widths = [110, 290, 100]
    t = Table(data, colWidths=col_widths)
    t.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), PRIMARY_COLOR),
        ('ALIGN', (0,0), (-1,-1), 'LEFT'),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 8),
        ('TOPPADDING', (0,0), (-1,-1), 8),
        ('LEFTPADDING', (0,0), (-1,-1), 8),
        ('RIGHTPADDING', (0,0), (-1,-1), 8),
        ('GRID', (0,0), (-1,-1), 0.5, BORDER_COLOR),
        ('ROWBACKGROUNDS', (0,1), (-1,-2), [WHITE, LIGHT_BG]),
        ('BACKGROUND', (0,-1), (-1,-1), colors.HexColor("#f1f5f9")), # slate 100 for total
    ]))
    
    story.append(t)
    story.append(Spacer(1, 15))
    
    story.append(Paragraph("Cronograma de Entrega das Próximas Fases", h2_style))
    story.append(Paragraph("• <b>Fase 1 (10 dias):</b> Ajustes finais do layout de carteirinhas de filiação e testes móveis.", bullet_style))
    story.append(Paragraph("• <b>Fase 2 (15 dias):</b> Integração real com gateways de pagamento (Pix/Cartão).", bullet_style))
    story.append(Paragraph("• <b>Fase 3 (10 dias):</b> Setup do servidor VPS em produção (Docker/PostgreSQL) e deploy.", bullet_style))
    story.append(Paragraph("• <b>Fase 4 (05 dias):</b> Lançamento assistido e homologação das cargas de habitualidade.", bullet_style))
    
    story.append(Spacer(1, 10))
    story.append(Paragraph("Condições Comerciais", h2_style))
    story.append(Paragraph("• <b>Forma de Pagamento:</b> 40% no sinal (início das integrações), 30% após homologação das APIs de pagamento e 30% na entrega e deploy em produção.", bullet_style))
    story.append(Paragraph("• <b>Garantia:</b> 90 dias de suporte gratuito para correção de bugs após o deploy final.", bullet_style))
    story.append(Paragraph("• <b>Manutenção Mensal Opcional:</b> R$ 650,00/mês para monitoramento de banco de dados, backups diários na nuvem e atualizações menores.", bullet_style))
    
    # Build document
    doc.build(story, canvasmaker=NumberedCanvas)
    print("PDF generated successfully.")

if __name__ == "__main__":
    generate_pdf()
