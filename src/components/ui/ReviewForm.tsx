import React from 'react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import StarRating from '@/components/ui/StarRating';
import { Card } from '@/components/ui/card';
import { apiClient } from '@/lib/api';

interface ReviewFormProps {
  productId: number;
  onReviewSubmitted?: () => void;
}

const ReviewForm: React.FC<ReviewFormProps> = ({ productId, onReviewSubmitted }) => {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const [rating, setRating] = React.useState(0);
  const [comment, setComment] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const api = apiClient;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentUser) {
      toast({
        title: "Erro",
        description: "Você precisa estar logado para enviar uma avaliação.",
        variant: "destructive"
      });
      return;
    }

    if (rating === 0) {
      toast({
        title: "Erro",
        description: "Por favor, selecione uma classificação.",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsSubmitting(true);
      // apiClient.post returns parsed JSON or throws on non-2xx
      const data = await api.post(`/products/${productId}/reviews/`, {
        rating,
        comment: comment.trim(),
        product: productId
      });

      // If API returned an error structure it would have thrown above
      toast({
        title: "Avaliação Enviada",
        description: "Sua avaliação foi enviada e está aguardando aprovação. Obrigado pelo feedback!",
      });
      setRating(0);
      setComment('');
      onReviewSubmitted?.();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Ocorreu um erro ao enviar sua avaliação.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!currentUser) {
    return (
      <Card className="p-4 text-center">
        <p className="text-muted-foreground mb-4">
          Faça login para avaliar este produto
        </p>
        <Button variant="outline" asChild>
          <a href="/login">Fazer Login</a>
        </Button>
      </Card>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium">Sua avaliação</label>
        <StarRating
          rating={rating}
          onChange={setRating}
          size="lg"
          className="justify-center sm:justify-start"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="comment" className="text-sm font-medium">
          Seu comentário (opcional)
        </label>
        <Textarea
          id="comment"
          placeholder="Conte-nos o que você achou do produto..."
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={4}
        />
      </div>

      <Button
        type="submit"
        className="w-full sm:w-auto"
        disabled={rating === 0 || isSubmitting}
      >
        {isSubmitting ? "Enviando..." : "Enviar Avaliação"}
      </Button>
    </form>
  );
};

export default ReviewForm;