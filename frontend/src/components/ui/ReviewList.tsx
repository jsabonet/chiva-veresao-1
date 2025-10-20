import React from 'react';
import { Review } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import StarRating from './StarRating';
import { Card } from './card';
import { Button } from './button';
import { apiClient } from '@/lib/api';
import { formatReviewerName } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import ImageLightbox from '@/components/ui/ImageLightbox';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import ReviewFormModal from '@/components/ui/ReviewFormModal';




export type ReviewSortOption = 'recent' | 'highest' | 'lowest' | 'helpful';

interface ReviewListProps {
  productId: number;
  initialReviews?: Review[];
  sort?: string;
  filter?: string;
  pageSize?: number;
  withPhotos?: boolean;
}

const ReviewList: React.FC<ReviewListProps> = ({ 
  productId, 
  initialReviews = [],
  sort = 'recent',
  filter = 'all',
  pageSize = 5,
  withPhotos = false,
}) => {
  const { currentUser } = useAuth();
  const [reviews, setReviews] = React.useState<Review[]>(initialReviews);
  const [page, setPage] = React.useState(1);
  const [loading, setLoading] = React.useState(false);
  const [hasMore, setHasMore] = React.useState(true);
  const [lightbox, setLightbox] = React.useState<{ urls: string[]; index: number } | null>(null);
  const [editing, setEditing] = React.useState<Review | null>(null);
  const [deleting, setDeleting] = React.useState<Review | null>(null);
  const PAGE_SIZE = pageSize;
  const api = apiClient;

  const loadReviews = async (pageNum: number = 1) => {
    try {
      setLoading(true);
      const params: Record<string, string> = {
        page: String(pageNum),
        page_size: String(PAGE_SIZE),
        sort_by: sort
      };
      if (filter && filter !== 'all') {
        params.rating = filter;
      }
      if (withPhotos) {
        params.with_photos = '1';
      }
      const data = await api.get<any>(`/products/${productId}/reviews/`, params);
      // Expecting paginated results
      if (pageNum === 1) {
        setReviews(data.results || data);
      } else {
        setReviews(prev => [...prev, ...(data.results || data)]);
      }
      setHasMore(Boolean(data.next));
    } catch (error) {
      console.error('Error loading reviews:', error);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    setPage(1);
    loadReviews(1);
    // eslint-disable-next-line
  }, [productId, sort, filter]);

  const loadMore = () => {
    if (!loading && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      loadReviews(nextPage);
    }
  };

  const toggleHelpful = async (reviewId: number) => {
    try {
      const res = await api.post<any>(`/reviews/${reviewId}/helpful/`, {});
      setReviews(prev => prev.map(r => r.id === reviewId ? { ...r, helpful_count: res.helpful_count, user_has_voted_helpful: res.user_has_voted_helpful } as any : r));
    } catch (e) {
      console.error('Error toggling helpful:', e);
    }
  };

  const handleEdited = () => {
    // Reload from first page to reflect updated content and moderation reset
    setPage(1);
    loadReviews(1);
  };

  const confirmDelete = async (review: Review) => {
    try {
      await api.delete(`/reviews/${review.id}/`);
      // Optimistically remove from list
      setReviews(prev => prev.filter(r => r.id !== review.id));
    } catch (e) {
      console.error('Failed to delete review', e);
    } finally {
      setDeleting(null);
    }
  };

  if (loading && reviews.length === 0) {
    return (
      <div className="space-y-4">
        {Array.from({ length: PAGE_SIZE }).map((_, i) => (
          <div key={i} className="p-4 border rounded animate-pulse space-y-2">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-muted" />
              <div className="flex-1">
                <div className="h-4 w-32 bg-muted rounded" />
                <div className="h-3 w-24 bg-muted rounded mt-1" />
              </div>
            </div>
            <div className="h-3 w-full bg-muted rounded" />
            <div className="h-3 w-2/3 bg-muted rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (reviews.length === 0) {
    return (
      <Card className="p-6 text-center">
        <p className="text-muted-foreground">
          Ainda não há avaliações aprovadas para este produto.
          {currentUser && (
            <>
              <br />
              <span className="text-sm mt-2 block">
                Seja o primeiro a avaliar! Sua avaliação passará por moderação antes de ser exibida.
              </span>
            </>
          )}
        </p>
      </Card>
    );
  }

  return (
    <>
    <div className="space-y-4">
      {reviews.map((review) => {
        const isPending = review.status === 'pending';
        const isRejected = review.status === 'rejected';
        const isOwnReview = currentUser?.email === review.user_email;
        // Only show pending/rejected reviews to their authors
        if ((isPending || isRejected) && !isOwnReview) {
          return null;
        }
        return (
          <Card
            key={review.id}
            className={`p-4 border-0 shadow-none md:border md:shadow-sm ${isPending ? 'bg-yellow-50 md:bg-yellow-50' : ''} ${isRejected ? 'bg-red-50 md:bg-red-50' : ''}`}
          >
            <div className="flex items-start gap-3">
              <Avatar className="h-10 w-10">
                {/* No user avatar from API, fallback with initials */}
                <AvatarImage src={undefined} alt="" />
                <AvatarFallback>
                  {formatReviewerName(
                    review.user_first_name ? `${review.user_first_name} ${review.user_last_name || ''}` : review.user_name,
                    review.user_email
                  ).slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-medium truncate">
                      {formatReviewerName(
                        review.user_first_name ? `${review.user_first_name} ${review.user_last_name || ''}` : review.user_name,
                        review.user_email
                      )}
                      {review.verified_buyer && (
                        <span className="ml-2 inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200">
                          Comprador verificado
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(review.created_at), {
                        addSuffix: true,
                        locale: ptBR,
                      })}
                    </div>
                    {isOwnReview && (isPending || isRejected) && (
                      <div className="mt-1">
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded ${
                            isPending ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {isPending ? 'Aguardando aprovação' : 'Avaliação rejeitada'}
                        </span>
                      </div>
                    )}
                  </div>
                  <StarRating rating={review.rating} readOnly size="sm" />
                </div>
                {review.comment && (
                  <p className="text-sm mt-2 whitespace-pre-line">
                    {review.comment}
                  </p>
                )}
                {Array.isArray(review.images) && review.images.length > 0 && (
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    {review.images.map((url, idx) => (
                      <button key={idx} onClick={() => setLightbox({ urls: review.images!, index: idx })} className="block">
                        <img src={url} alt={`Imagem da avaliação ${idx + 1}`} className="h-24 w-full object-cover rounded border" />
                      </button>
                    ))}
                  </div>
                )}
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <button
                    onClick={() => toggleHelpful(review.id)}
                    className={`text-xs inline-flex items-center gap-1 px-2 py-1 rounded border ${review.user_has_voted_helpful ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-accent'}`}
                  >
                    <span>Útil</span>
                    <span className="text-muted-foreground">{(review as any).helpful_count ?? 0}</span>
                  </button>
                  {isOwnReview && (
                    <>
                      <button onClick={() => setEditing(review)} className="text-xs px-2 py-1 rounded border hover:bg-accent">Editar</button>
                      <button onClick={() => setDeleting(review)} className="text-xs px-2 py-1 rounded border hover:bg-accent text-red-600">Excluir</button>
                    </>
                  )}
                </div>
                {isOwnReview && isRejected && review.moderation_notes && (
                  <div className="mt-2 p-2 bg-red-100 rounded text-xs">
                    <strong>Motivo da rejeição:</strong> {review.moderation_notes}
                  </div>
                )}
              </div>
            </div>
          </Card>
        );
      })}
      {hasMore && (
        <div className="text-center mt-4">
          <Button
            variant="outline"
            onClick={loadMore}
            disabled={loading}
          >
            {loading ? "Carregando..." : "Carregar mais avaliações"}
          </Button>
        </div>
      )}
    </div>
    {lightbox && (
      <ImageLightbox urls={lightbox.urls} index={lightbox.index} open={!!lightbox} onOpenChange={(o) => !o && setLightbox(null)} />
    )}
    {editing && (
      <ReviewFormModal
        productId={productId}
        onSubmitted={() => { setEditing(null); handleEdited(); }}
        review={editing}
        mode="edit"
        open
        onOpenChange={(o: boolean) => !o && setEditing(null)}
      />
    )}
    <AlertDialog open={!!deleting} onOpenChange={(o)=>!o && setDeleting(null)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir avaliação?</AlertDialogTitle>
          <AlertDialogDescription>
            Esta ação não pode ser desfeita. A avaliação será removida permanentemente.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={() => deleting && confirmDelete(deleting)}>Excluir</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
};

export default ReviewList;