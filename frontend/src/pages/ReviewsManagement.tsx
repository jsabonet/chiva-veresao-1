import React from 'react';
import { useToast } from '@/hooks/use-toast';
import { Helmet } from 'react-helmet-async';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from '@/components/ui/checkbox';
import { Review, apiClient } from '@/lib/api';
import StarRating from '@/components/ui/StarRating';
import { formatReviewerName } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import AdminLayout from '@/components/layout/AdminLayout';

interface ReviewWithProduct extends Review {
  product_name?: string;
}

const ReviewsManagement = () => {
  const [reviews, setReviews] = React.useState<ReviewWithProduct[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [selectedReviews, setSelectedReviews] = React.useState<number[]>([]);
  const [filter, setFilter] = React.useState({
    status: '',
    search: '',
  });
  const { toast } = useToast();

  // Fetch reviews with product details
  const fetchReviews = async (): Promise<void> => {
    try {
      setLoading(true);
      const response = await apiClient.get<ReviewWithProduct[]>('/reviews/', {
        admin: 'true', // Flag to get all reviews including pending/rejected
        ...filter
      });
      setReviews(response || []);
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao carregar avaliações",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchReviews();
  }, [filter]);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedReviews(reviews.map(review => review.id));
    } else {
      setSelectedReviews([]);
    }
  };

  const handleSelectReview = (reviewId: number, checked: boolean) => {
    if (checked) {
      setSelectedReviews(prev => [...prev, reviewId]);
    } else {
      setSelectedReviews(prev => prev.filter(id => id !== reviewId));
    }
  };

  const handleBulkAction = async (action: 'approve' | 'reject') => {
    if (!selectedReviews.length) return;

    try {
      await apiClient.post(`/reviews/bulk-${action}/`, {
        review_ids: selectedReviews
      });

      toast({
        title: "Sucesso",
        description: selectedReviews.length + ' avaliações ' + (action === 'approve' ? 'aprovadas' : 'rejeitadas') + ' com sucesso',
      });

      // Refresh the list and clear selection
      fetchReviews();
      setSelectedReviews([]);
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao processar avaliações",
        variant: "destructive"
      });
    }
  };

  const handleStatusChange = async (reviewId: number, newStatus: string, notes?: string) => {
    try {
      await apiClient.patch(`/reviews/${reviewId}/`, {
        status: newStatus,
        moderation_notes: notes
      });

      toast({
        title: "Sucesso",
        description: "Status da avaliação atualizado",
      });

      fetchReviews();
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao atualizar status",
        variant: "destructive"
      });
    }
  };

  return (
    <AdminLayout>
      <Helmet>
        <title>Gerenciamento de Avaliações - Admin</title>
      </Helmet>

      <div className="container mx-auto py-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Gerenciamento de Avaliações</h1>
          <div className="space-x-2">
            <Button
              onClick={() => handleBulkAction('approve')}
              disabled={!selectedReviews.length}
              variant="default"
            >
              Aprovar Selecionadas
            </Button>
            <Button
              onClick={() => handleBulkAction('reject')}
              disabled={!selectedReviews.length}
              variant="destructive"
            >
              Rejeitar Selecionadas
            </Button>
          </div>
        </div>

        <Card className="p-4 mb-6">
          <div className="flex gap-4">
            <div className="flex-1">
              <Input
                placeholder="Buscar por produto ou usuário..."
                value={filter.search}
                onChange={(e) => setFilter(prev => ({ ...prev, search: e.target.value }))}
              />
            </div>
            <Select
              value={filter.status}
              onValueChange={(value) => setFilter(prev => ({ ...prev, status: value }))}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todos</SelectItem>
                <SelectItem value="pending">Pendentes</SelectItem>
                <SelectItem value="approved">Aprovadas</SelectItem>
                <SelectItem value="rejected">Rejeitadas</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </Card>

        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">
                  <Checkbox
                    checked={selectedReviews.length === reviews.length && reviews.length > 0}
                    onCheckedChange={handleSelectAll}
                  />
                </TableHead>
                <TableHead>Produto</TableHead>
                <TableHead>Usuário</TableHead>
                <TableHead>Avaliação</TableHead>
                <TableHead>Comentário</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    Carregando...
                  </TableCell>
                </TableRow>
              ) : reviews.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    Nenhuma avaliação encontrada
                  </TableCell>
                </TableRow>
              ) : (
                reviews.map((review) => (
                  <TableRow key={review.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedReviews.includes(review.id)}
                        onCheckedChange={(checked) => handleSelectReview(review.id, checked as boolean)}
                      />
                    </TableCell>
                    <TableCell>{review.product_name}</TableCell>
                    <TableCell>
                      <div>{formatReviewerName(review.user_first_name ? `${review.user_first_name} ${review.user_last_name || ''}` : review.user_name, review.user_email)}</div>
                      <div className="text-sm text-muted-foreground">{review.user_email}</div>
                    </TableCell>
                    <TableCell>
                      <StarRating rating={review.rating} readOnly size="sm" />
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {review.comment || "---"}
                    </TableCell>
                    <TableCell>
                      <div className={`inline-flex px-2 py-1 rounded-full text-sm
                        ${review.status === 'approved' ? 'bg-green-100 text-green-800' : ''}
                        ${review.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : ''}
                        ${review.status === 'rejected' ? 'bg-red-100 text-red-800' : ''}
                      `}>
                        {review.status === 'approved' ? 'Aprovada' :
                         review.status === 'pending' ? 'Pendente' : 'Rejeitada'}
                      </div>
                    </TableCell>
                    <TableCell>
                      {formatDistanceToNow(new Date(review.created_at), {
                        addSuffix: true,
                        locale: ptBR
                      })}
                    </TableCell>
                    <TableCell>
                      {review.status === 'pending' && (
                        <div className="space-x-2">
                          <Button
                            size="sm"
                            onClick={() => handleStatusChange(review.id, 'approved')}
                          >
                            Aprovar
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => {
                              const notes = window.prompt('Motivo da rejeição:');
                              if (notes !== null) {
                                handleStatusChange(review.id, 'rejected', notes);
                              }
                            }}
                          >
                            Rejeitar
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default ReviewsManagement;