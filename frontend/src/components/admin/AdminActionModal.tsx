import React from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Modal } from '../ui/modal';
import { Input } from '@/components/ui/input';
import { CustomerProfile } from '@/lib/api/types';

interface AdminActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  target: CustomerProfile | null;
  notes: string;
  onNotesChange: (notes: string) => void;
  loading: boolean;
  onConfirm: () => Promise<void>;
}

export const AdminActionModal: React.FC<AdminActionModalProps> = ({
  isOpen,
  onClose,
  target,
  notes,
  onNotesChange,
  loading,
  onConfirm,
}) => {
  if (!target) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      className="max-w-md"
    >
      <div className="p-6">
        <h3 className="text-lg font-medium mb-4">
          {target.isAdmin ? 'Remover Acesso Admin' : 'Conceder Acesso Admin'}
        </h3>
        <p className="text-sm text-muted-foreground mb-4">
          {target.isAdmin
            ? `Tem certeza que deseja remover os privilégios de administrador de ${target.name || target.email}?`
            : `Tem certeza que deseja conceder privilégios de administrador para ${target.name || target.email}?`}
        </p>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Observações (opcional)</Label>
            <Input
              value={notes}
              onChange={(e) => onNotesChange((e.target as HTMLInputElement).value)}
              placeholder="Motivo da alteração..."
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              onClick={onConfirm}
              disabled={loading}
            >
              {loading ? 'Processando...' : 'Confirmar'}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};