"""
Serviço de Exportação de Dados
Suporta Excel, CSV e PDF para relatórios administrativos
"""
import csv
import io
from datetime import datetime
from decimal import Decimal
from typing import List, Dict, Any

from django.http import HttpResponse
from openpyxl import Workbook
from openpyxl.styles import Font, Alignment, PatternFill, Border, Side
from openpyxl.utils import get_column_letter
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter, A4, landscape
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, PageBreak
from reportlab.pdfgen import canvas


class ExportService:
    """
    Serviço centralizado para exportação de dados em múltiplos formatos
    """
    
    @staticmethod
    def _sanitize_value(value: Any) -> str:
        """Converte valor para string segura para exportação"""
        if value is None:
            return ''
        if isinstance(value, (int, float, Decimal)):
            return str(value)
        if isinstance(value, datetime):
            return value.strftime('%d/%m/%Y %H:%M')
        if isinstance(value, bool):
            return 'Sim' if value else 'Não'
        return str(value)
    
    # ========================================
    # EXPORTAÇÃO PARA EXCEL
    # ========================================
    
    @staticmethod
    def export_to_excel(
        data: List[Dict[str, Any]],
        headers: Dict[str, str],
        filename: str,
        title: str = None
    ) -> HttpResponse:
        """
        Exporta dados para Excel (.xlsx) com formatação profissional
        
        Args:
            data: Lista de dicionários com os dados
            headers: Dicionário {chave: nome_coluna}
            filename: Nome do arquivo sem extensão
            title: Título opcional da planilha
        """
        wb = Workbook()
        ws = wb.active
        ws.title = "Dados"
        
        # Estilos
        header_font = Font(bold=True, color="FFFFFF", size=12)
        header_fill = PatternFill(start_color="1F4788", end_color="1F4788", fill_type="solid")
        header_alignment = Alignment(horizontal="center", vertical="center")
        
        title_font = Font(bold=True, size=14, color="1F4788")
        title_alignment = Alignment(horizontal="center", vertical="center")
        
        border_style = Border(
            left=Side(style='thin'),
            right=Side(style='thin'),
            top=Side(style='thin'),
            bottom=Side(style='thin')
        )
        
        row_num = 1
        
        # Adicionar título se fornecido
        if title:
            ws.merge_cells(f'A1:{get_column_letter(len(headers))}1')
            title_cell = ws['A1']
            title_cell.value = title
            title_cell.font = title_font
            title_cell.alignment = title_alignment
            row_num = 2
            
            # Data de geração
            ws.merge_cells(f'A2:{get_column_letter(len(headers))}2')
            date_cell = ws['A2']
            date_cell.value = f"Gerado em: {datetime.now().strftime('%d/%m/%Y %H:%M')}"
            date_cell.alignment = Alignment(horizontal="center")
            row_num = 4
        
        # Cabeçalhos
        for col_num, (key, header) in enumerate(headers.items(), 1):
            cell = ws.cell(row=row_num, column=col_num)
            cell.value = header
            cell.font = header_font
            cell.fill = header_fill
            cell.alignment = header_alignment
            cell.border = border_style
        
        # Dados
        for row_data in data:
            row_num += 1
            for col_num, key in enumerate(headers.keys(), 1):
                cell = ws.cell(row=row_num, column=col_num)
                cell.value = ExportService._sanitize_value(row_data.get(key, ''))
                cell.border = border_style
                
                # Alinhamento baseado no tipo
                value = row_data.get(key)
                if isinstance(value, (int, float, Decimal)):
                    cell.alignment = Alignment(horizontal="right")
                else:
                    cell.alignment = Alignment(horizontal="left")
        
        # Auto-ajustar largura das colunas
        for col_num in range(1, len(headers) + 1):
            column_letter = get_column_letter(col_num)
            max_length = 0
            for cell in ws[column_letter]:
                try:
                    if len(str(cell.value)) > max_length:
                        max_length = len(str(cell.value))
                except:
                    pass
            adjusted_width = min(max_length + 2, 50)
            ws.column_dimensions[column_letter].width = adjusted_width
        
        # Gerar resposta HTTP
        response = HttpResponse(
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
        response['Content-Disposition'] = f'attachment; filename="{filename}.xlsx"'
        wb.save(response)
        return response
    
    # ========================================
    # EXPORTAÇÃO PARA CSV
    # ========================================
    
    @staticmethod
    def export_to_csv(
        data: List[Dict[str, Any]],
        headers: Dict[str, str],
        filename: str
    ) -> HttpResponse:
        """
        Exporta dados para CSV
        
        Args:
            data: Lista de dicionários com os dados
            headers: Dicionário {chave: nome_coluna}
            filename: Nome do arquivo sem extensão
        """
        response = HttpResponse(content_type='text/csv; charset=utf-8-sig')
        response['Content-Disposition'] = f'attachment; filename="{filename}.csv"'
        
        # BOM para Excel reconhecer UTF-8
        response.write('\ufeff')
        
        writer = csv.writer(response, delimiter=';')
        
        # Cabeçalhos
        writer.writerow(headers.values())
        
        # Dados
        for row_data in data:
            row = [ExportService._sanitize_value(row_data.get(key, '')) for key in headers.keys()]
            writer.writerow(row)
        
        return response
    
    # ========================================
    # EXPORTAÇÃO PARA PDF
    # ========================================
    
    @staticmethod
    def export_to_pdf(
        data: List[Dict[str, Any]],
        headers: Dict[str, str],
        filename: str,
        title: str = "Relatório",
        orientation: str = 'landscape'
    ) -> HttpResponse:
        """
        Exporta dados para PDF com tabela formatada
        
        Args:
            data: Lista de dicionários com os dados
            headers: Dicionário {chave: nome_coluna}
            filename: Nome do arquivo sem extensão
            title: Título do relatório
            orientation: 'portrait' ou 'landscape'
        """
        response = HttpResponse(content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="{filename}.pdf"'
        
        # Buffer
        buffer = io.BytesIO()
        
        # Configurar página
        pagesize = landscape(A4) if orientation == 'landscape' else A4
        doc = SimpleDocTemplate(
            buffer,
            pagesize=pagesize,
            rightMargin=30,
            leftMargin=30,
            topMargin=30,
            bottomMargin=30
        )
        
        # Container para elementos
        elements = []
        
        # Estilos
        styles = getSampleStyleSheet()
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=16,
            textColor=colors.HexColor('#1F4788'),
            spaceAfter=30,
            alignment=1  # Center
        )
        
        # Título
        elements.append(Paragraph(title, title_style))
        elements.append(Paragraph(
            f"Gerado em: {datetime.now().strftime('%d/%m/%Y às %H:%M')}",
            styles['Normal']
        ))
        elements.append(Spacer(1, 20))
        
        # Preparar dados da tabela
        table_data = [list(headers.values())]  # Cabeçalhos
        
        for row_data in data:
            row = [ExportService._sanitize_value(row_data.get(key, '')) for key in headers.keys()]
            # Limitar tamanho do texto para caber na página
            row = [str(cell)[:50] + '...' if len(str(cell)) > 50 else str(cell) for cell in row]
            table_data.append(row)
        
        # Criar tabela
        col_widths = [pagesize[0] / len(headers) * 0.9] * len(headers)
        table = Table(table_data, colWidths=col_widths, repeatRows=1)
        
        # Estilo da tabela
        table.setStyle(TableStyle([
            # Cabeçalho
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1F4788')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 10),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            
            # Dados
            ('BACKGROUND', (0, 1), (-1, -1), colors.white),
            ('TEXTCOLOR', (0, 1), (-1, -1), colors.black),
            ('ALIGN', (0, 1), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 1), (-1, -1), 8),
            ('TOPPADDING', (0, 1), (-1, -1), 6),
            ('BOTTOMPADDING', (0, 1), (-1, -1), 6),
            
            # Bordas
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ('LINEBELOW', (0, 0), (-1, 0), 2, colors.HexColor('#1F4788')),
            
            # Linhas alternadas
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#F0F0F0')])
        ]))
        
        elements.append(table)
        
        # Footer com número de registros
        elements.append(Spacer(1, 20))
        elements.append(Paragraph(
            f"Total de registros: {len(data)}",
            styles['Normal']
        ))
        
        # Gerar PDF
        doc.build(elements)
        
        # Retornar resposta
        pdf = buffer.getvalue()
        buffer.close()
        response.write(pdf)
        
        return response
    
    # ========================================
    # MÉTODOS DE CONVENIÊNCIA
    # ========================================
    
    @staticmethod
    def export_data(
        data: List[Dict[str, Any]],
        headers: Dict[str, str],
        format_type: str,
        filename: str,
        title: str = None
    ) -> HttpResponse:
        """
        Método unificado para exportar em qualquer formato
        
        Args:
            data: Dados a exportar
            headers: Cabeçalhos das colunas
            format_type: 'excel', 'csv', ou 'pdf'
            filename: Nome base do arquivo
            title: Título para Excel e PDF
        """
        if format_type == 'excel':
            return ExportService.export_to_excel(data, headers, filename, title)
        elif format_type == 'csv':
            return ExportService.export_to_csv(data, headers, filename)
        elif format_type == 'pdf':
            return ExportService.export_to_pdf(data, headers, filename, title or filename)
        else:
            raise ValueError(f"Formato não suportado: {format_type}")


def get_export_service() -> ExportService:
    """Retorna instância do serviço de exportação"""
    return ExportService()
