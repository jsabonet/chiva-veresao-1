import React, { useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import StarRating from '@/components/ui/StarRating';
import { Textarea } from '@/components/ui/textarea';
import { apiClient } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

interface ReviewFormModalProps {
  productId: number;
  onSubmitted?: () => void;
  trigger?: React.ReactNode;
  // Edit support
  mode?: 'create' | 'edit';
  review?: { id: number; rating: number; comment?: string } | null;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const ReviewFormModal: React.FC<ReviewFormModalProps> = ({ productId, onSubmitted, trigger, mode = 'create', review = null, open: controlledOpen, onOpenChange }) => {
  const { toast } = useToast();
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const open = controlledOpen !== undefined ? controlledOpen : uncontrolledOpen;
  const setOpen = (v: boolean) => {
    if (onOpenChange) onOpenChange(v);
    else setUncontrolledOpen(v);
  };
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [lastSubmitAt, setLastSubmitAt] = useState<number>(0);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Prefill when editing
  React.useEffect(() => {
    if (mode === 'edit' && review) {
      setRating(review.rating || 0);
      setComment(review.comment || '');
    } else if (mode === 'create') {
      setRating(0);
      setComment('');
    }
  }, [mode, review?.id]);

  const onSelectFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const selected = Array.from(e.target.files).filter(f => f.type.startsWith('image/'));
    const next = [...files, ...selected].slice(0, 4);
    setFiles(next);
  };

  const reset = () => {
    setRating(0);
    setComment('');
    setFiles([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const submit = async () => {
    const now = Date.now();
    if (now - lastSubmitAt < 4000) {
      // 4s throttle window to avoid double-submits
      return;
    }
    setLastSubmitAt(now);
    if (!rating) {
      toast({ title: 'Erro', description: 'Selecione uma classificação.', variant: 'destructive' });
      return;
    }
    try {
      setSubmitting(true);
      const fd = new FormData();
      fd.append('rating', String(rating));
      fd.append('comment', comment.trim());
      if (mode === 'create') {
        fd.append('product', String(productId));
      }
      files.forEach((f, i) => fd.append('images', f, f.name));
      if (mode === 'edit' && review) {
        await apiClient.putFormData(`/reviews/${review.id}/`, fd);
        toast({ title: 'Avaliação atualizada', description: 'Sua avaliação foi atualizada e aguarda nova moderação.' });
      } else {
        await apiClient.postFormData(`/products/${productId}/reviews/`, fd);
        toast({ title: 'Avaliação enviada', description: 'Sua avaliação foi enviada para moderação.' });
      }
      setOpen(false);
      reset();
      onSubmitted?.();
    } catch (e: any) {
      toast({ title: 'Erro ao enviar', description: e.message || 'Tente novamente mais tarde.', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger && controlledOpen === undefined && (
        <DialogTrigger asChild>
          {trigger}
        </DialogTrigger>
      )}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{mode === 'edit' ? 'Edite sua avaliação' : 'Deixe sua avaliação'}</DialogTitle>
          <DialogDescription>
            Avaliações ajudam outros clientes. {mode === 'edit' ? 'Alterações serão moderadas novamente.' : 'Sua avaliação será moderada antes de aparecer publicamente.'}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <span className="text-sm font-medium">Sua classificação</span>
            <div className="mt-2">
              <StarRating rating={rating} onChange={setRating} size="lg" />
            </div>
          </div>
          <div>
            <span className="text-sm font-medium">Comentário</span>
            <Textarea rows={4} placeholder="Conte sua experiência..." value={comment} onChange={e => setComment(e.target.value)} />
          </div>
          <div>
            <div className="flex items-center justify-between">
              <label htmlFor="review-images" className="text-sm font-medium">Imagens (opcional)</label>
              <span className="text-xs text-muted-foreground">Até 4 imagens • PNG, JPG, WEBP</span>
            </div>
            <input id="review-images" ref={fileInputRef} className="mt-2 block w-full text-sm" type="file" accept="image/*" multiple onChange={onSelectFiles} />
            {files.length > 0 && (
              <div className="mt-2 grid grid-cols-4 gap-2">
                {files.map((f, i) => (
                  <div key={i} className="relative">
                    <img
                      src={URL.createObjectURL(f)}
                      alt={f.name}
                      className="h-20 w-full object-cover rounded border"
                    />
                    <div className="mt-1 text-[10px] text-muted-foreground truncate" title={f.name}>{f.name}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancelar</Button>
          </DialogClose>
          <Button onClick={submit} disabled={submitting || !rating}>
            {submitting ? 'Enviando...' : 'Enviar avaliação'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ReviewFormModal;
