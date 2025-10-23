import React from 'react';
import AdminLayout from '@/components/layout/AdminLayout';
import Loading from '@/components/ui/Loading';
import { RefreshCw } from 'lucide-react';
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
    <AdminLayout>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold">Gerenciamento de Avaliações</h1>
          <p className="text-muted-foreground">Modere as avaliações dos produtos antes de serem publicadas</p>
        </div>
        <div>
          <Button variant="outline" onClick={() => loadReviews(currentTab)}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
        </div>
      </div>

      <Card>
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
            <div className="hidden md:block">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data</TableHead>
                        <TableHead>Produto</TableHead>
                        <TableHead>Usuário</TableHead>
                        <TableHead>Avaliação</TableHead>
                        <TableHead>Comentário</TableHead>
                        <TableHead>Imagens</TableHead>
                        <TableHead>Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loading ? (
                        <TableRow>
                          <TableCell colSpan={6}>
                            <Loading label="Carregando avaliações..." />
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
                              {Array.isArray((review as any).images) && (review as any).images.length > 0 ? (
                                <div className="grid grid-cols-3 gap-1 max-w-[160px]">
                                  {(review as any).images.slice(0,3).map((url: string, idx: number) => (
                                    <a key={idx} href={url} target="_blank" rel="noreferrer">
                                      <img src={url} alt="" className="h-12 w-full object-cover rounded border" />
                                    </a>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-xs text-muted-foreground">—</span>
                              )}
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

                  {/* Mobile - card list */}
                  <div className="md:hidden p-2 space-y-3">
                    {loading ? (
                      <div className="p-4">
                        <Loading label="Carregando avaliações..." />
                      </div>
                    ) : reviews.length === 0 ? (
                      <div className="p-4 text-center text-muted-foreground">Nenhuma avaliação {status === 'pending' ? 'pendente' : status === 'approved' ? 'aprovada' : 'rejeitada'}</div>
                    ) : (
                      reviews.map((review) => (
                        <Card key={review.id}>
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <p className="text-sm text-muted-foreground">{formatDistanceToNow(new Date(review.created_at), { addSuffix: true, locale: ptBR })}</p>
                                <p className="font-medium mt-1">{review.product_name}</p>
                                <p className="text-sm text-muted-foreground mt-1">{formatReviewerName(review.user_first_name ? `${review.user_first_name} ${review.user_last_name || ''}` : review.user_name, review.user_email)}</p>
                                <div className="mt-2"><StarRating rating={review.rating} readOnly size="sm" /></div>
                                <p className="text-sm mt-2">{review.comment || 'Sem comentário'}</p>
                                {Array.isArray((review as any).images) && (review as any).images.length > 0 && (
                                  <div className="mt-2 grid grid-cols-3 gap-1">
                                    {(review as any).images.slice(0,3).map((url: string, idx: number) => (
                                      <a key={idx} href={url} target="_blank" rel="noreferrer">
                                        <img src={url} alt="" className="h-16 w-full object-cover rounded border" />
                                      </a>
                                    ))}
                                  </div>
                                )}
                              </div>
                              <div className="ml-4">
                                {status === 'pending' && (
                                  <div className="flex flex-col space-y-2">
                                    <Button size="sm" onClick={() => handleModeration(review.id, 'approve')}>Aprovar</Button>
                                    <Button size="sm" variant="destructive" onClick={() => handleModeration(review.id, 'reject', '')}>Rejeitar</Button>
                                  </div>
                                )}
                                {status === 'rejected' && review.moderation_notes && (
                                  <span className="text-sm text-red-600">Motivo: {review.moderation_notes}</span>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))
                    )}
                  </div>
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>
    </AdminLayout>
  );
};

export default ReviewManagement;