import React from 'react';
import { Card, CardHeader, CardContent, CardDescription, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { apiClient, Review } from '@/lib/api';
import { formatReviewerName } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import StarRating from '@/components/ui/StarRating';

const ReviewManagement = () => {
  const [reviews, setReviews] = React.useState<(Review & { product_name?: string })[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [currentTab, setCurrentTab] = React.useState('pending');
  const { toast } = useToast();

  const loadReviews = async (status: string) => {
    try {
      setLoading(true);
      const response = await apiClient.get('/products/reviews/', {
        status
      });
      const data = response as { results?: (Review & { product_name?: string })[] };
      setReviews(data.results ?? (data as any[]));
    } catch (error) {
      console.error('Error loading reviews:', error);
      // If API returns 403, inform the user they need admin privileges
      const err = (error as any);
      const msg = err?.message || 'Não foi possível carregar as avaliações.';
      if (err?.response?.status === 403 || /403/.test(msg)) {
        toast({
          title: "Acesso Negado",
          description: "Você precisa ser administrador para visualizar esta página.",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Erro",
          description: "Não foi possível carregar as avaliações.",
          variant: "destructive"
        });
      }
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    loadReviews(currentTab);
  }, [currentTab]);

  const handleModeration = async (reviewId: number, action: 'approve' | 'reject', notes?: string) => {
    try {
      await apiClient.post(`/products/reviews/${reviewId}/moderate/`, {
        action,
        notes
      });
      
      toast({
        title: "Sucesso",
        description: action === 'approve' ? "Avaliação aprovada." : "Avaliação rejeitada.",
      });
      
      loadReviews(currentTab);
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao moderar avaliação.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="container mx-auto py-10">
      <Card>
        <CardHeader>
          <CardTitle>Gerenciamento de Avaliações</CardTitle>
          <CardDescription>
            Modere as avaliações dos produtos antes de serem publicadas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={currentTab} onValueChange={setCurrentTab}>
            <TabsList>
              <TabsTrigger value="pending">Pendentes</TabsTrigger>
              <TabsTrigger value="approved">Aprovadas</TabsTrigger>
              <TabsTrigger value="rejected">Rejeitadas</TabsTrigger>
            </TabsList>

            {['pending', 'approved', 'rejected'].map((status) => (
              <TabsContent key={status} value={status}>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data</TableHead>
                        <TableHead>Produto</TableHead>
                        <TableHead>Usuário</TableHead>
                        <TableHead>Avaliação</TableHead>
                        <TableHead>Comentário</TableHead>
                        <TableHead>Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loading ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-4">
                            Carregando...
                          </TableCell>
                        </TableRow>
                      ) : reviews.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-4">
                            Nenhuma avaliação {
                              status === 'pending' ? 'pendente' :
                              status === 'approved' ? 'aprovada' : 'rejeitada'
                            }
                          </TableCell>
                        </TableRow>
                      ) : (
                        reviews.map((review) => (
                          <TableRow key={review.id}>
                            <TableCell className="font-medium">
                              {formatDistanceToNow(new Date(review.created_at), {
                                addSuffix: true,
                                locale: ptBR
                              })}
                            </TableCell>
                            <TableCell>{review.product_name}</TableCell>
                            <TableCell>{formatReviewerName(review.user_first_name ? `${review.user_first_name} ${review.user_last_name || ''}` : review.user_name, review.user_email)}</TableCell>
                            <TableCell>
                              <StarRating rating={review.rating} readOnly size="sm" />
                            </TableCell>
                            <TableCell className="max-w-md truncate">
                              {review.comment || "Sem comentário"}
                            </TableCell>
                            <TableCell>
                              {status === 'pending' && (
                                <div className="flex space-x-2">
                                  <Button
                                    size="sm"
                                    onClick={() => handleModeration(review.id, 'approve')}
                                  >
                                    Aprovar
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => handleModeration(review.id, 'reject', '')}
                                  >
                                    Rejeitar
                                  </Button>
                                </div>
                              )}
                              {status === 'rejected' && review.moderation_notes && (
                                <span className="text-sm text-red-600">
                                  Motivo: {review.moderation_notes}
                                </span>
                              )}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default ReviewManagement;