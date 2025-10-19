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




export type ReviewSortOption = 'recent' | 'highest' | 'lowest';

interface ReviewListProps {
  productId: number;
  initialReviews?: Review[];
  sort?: string;
  filter?: string;
}

const ReviewList: React.FC<ReviewListProps> = ({ 
  productId, 
  initialReviews = [],
  sort = 'recent',
  filter = 'all',
}) => {
  const { currentUser } = useAuth();
  const [reviews, setReviews] = React.useState<Review[]>(initialReviews);
  const [page, setPage] = React.useState(1);
  const [loading, setLoading] = React.useState(false);
  const [hasMore, setHasMore] = React.useState(true);
  const PAGE_SIZE = 5;
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
            className={`p-4 ${isPending ? 'bg-yellow-50' : ''} ${isRejected ? 'bg-red-50' : ''}`}
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
  );
};

export default ReviewList;