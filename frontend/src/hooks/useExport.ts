/**
 * Hook personalizado para exportação de dados
 * Suporta Excel, CSV, PDF e outros formatos
 */
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { API_BASE_URL } from '@/lib/config';

export type ExportFormat = 'excel' | 'csv' | 'pdf';

export interface ExportOptions {
  endpoint: string;
  format: ExportFormat;
  filename: string;
  filters?: Record<string, any>;
}

export interface UseExportReturn {
  exportData: (options: ExportOptions) => Promise<void>;
  isExporting: boolean;
  error: string | null;
}

/**
 * Hook para exportar dados do sistema
 * 
 * @example
 * ```tsx
 * const { exportData, isExporting } = useExport();
 * 
 * const handleExport = () => {
 *   exportData({
 *     endpoint: '/api/cart/admin/export/orders',
 *     format: 'excel',
 *     filename: 'pedidos',
 *     filters: { status: 'confirmed' }
 *   });
 * };
 * ```
 */
export function useExport(): UseExportReturn {
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { currentUser } = useAuth();

  const exportData = async (options: ExportOptions) => {
    const { endpoint, format, filename, filters = {} } = options;

    setIsExporting(true);
    setError(null);

    try {
      // Validar usuário autenticado
      if (!currentUser) {
        throw new Error('Usuário não autenticado');
      }

      // Obter token de autenticação
      const token = await currentUser.getIdToken();

      // Garantir que endpoint termina com /
      const cleanEndpoint = endpoint.endsWith('/') ? endpoint : `${endpoint}/`;

      // Construir URL com parâmetros
      const params = new URLSearchParams({
        export_format: format,
        ...filters,
      });

      const url = `${API_BASE_URL}${cleanEndpoint}?${params.toString()}`;

      // Fazer requisição
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        // Tentar extrair mensagem de erro
        let errorMessage = 'Erro ao exportar dados';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          errorMessage = `Erro ${response.status}: ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      // Obter blob do arquivo
      const blob = await response.blob();

      // Determinar extensão do arquivo
      const extension = format === 'excel' ? 'xlsx' : format;
      const fullFilename = `${filename}.${extension}`;

      // Criar link temporário e fazer download
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = fullFilename;
      document.body.appendChild(link);
      link.click();

      // Limpar
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);

      // Notificar sucesso
      toast.success(`Arquivo ${fullFilename} baixado com sucesso!`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(errorMessage);
      toast.error(`Erro ao exportar: ${errorMessage}`);
      console.error('Export error:', err);
    } finally {
      setIsExporting(false);
    }
  };

  return {
    exportData,
    isExporting,
    error,
  };
}

/**
 * Função auxiliar para formatar filtros de data
 */
export function formatDateFilter(date: Date | string | null): string | undefined {
  if (!date) return undefined;
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toISOString().split('T')[0]; // YYYY-MM-DD
}

/**
 * Função auxiliar para gerar nome de arquivo com timestamp
 */
export function generateFilename(base: string): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  return `${base}_${timestamp}`;
}
