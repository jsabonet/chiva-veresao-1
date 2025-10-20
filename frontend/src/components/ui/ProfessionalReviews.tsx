import React from 'react';
import ReviewList from '@/components/ui/ReviewList';
import ReviewFormModal from '@/components/ui/ReviewFormModal';
import { Star } from 'lucide-react';
import { apiClient } from '@/lib/api';
import { Button } from '@/components/ui/button';

type Meta = {
  counts: Record<string | number, number>;
  total: number;
  average: number;
};

interface ProfessionalReviewsProps {
  productId: number;
}

const Bar: React.FC<{ value: number; max: number }> = ({ value, max }) => {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
      <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
    </div>
  );
};

const ProfessionalReviews: React.FC<ProfessionalReviewsProps> = ({ productId }) => {
  const [meta, setMeta] = React.useState<Meta | null>(null);
  const [sort, setSort] = React.useState<'recent'|'highest'|'lowest'|'helpful'>('recent');
  const [filter, setFilter] = React.useState<'all'|'5'|'4'|'3'|'2'|'1'>('all');
  const [withPhotos, setWithPhotos] = React.useState(false);
  const [refresh, setRefresh] = React.useState(0);
  const [collapsed, setCollapsed] = React.useState(true);

  const loadMeta = async () => {
    try {
      const data = await apiClient.get<any>(`/products/${productId}/reviews/`, { page: '1', page_size: '1', sort_by: 'recent' });
      // API now returns meta along with paginated response
      setMeta(data.meta || null);
    } catch {
      setMeta(null);
    }
  };

  React.useEffect(() => {
    loadMeta();
    // eslint-disable-next-line
  }, [productId, refresh]);

  const total = meta?.total || 0;
  const average = meta?.average || 0;
  const counts = meta?.counts || { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 } as any;

  return (
    <div className="space-y-6">
      {/* Summary header */}
      <div className="grid md:grid-cols-3 gap-6 items-center">
        <div>
          {meta ? (
            <>
              <div className="text-4xl font-bold flex items-center gap-2">
                {average.toFixed(1)} <Star className="h-7 w-7 text-yellow-500 fill-yellow-500" />
              </div>
              <div className="text-sm text-muted-foreground">Baseado em {total} {total === 1 ? 'avaliação' : 'avaliações'}</div>
            </>
          ) : (
            <div className="space-y-2">
              <div className="h-9 w-40 bg-muted animate-pulse rounded" />
              <div className="h-4 w-48 bg-muted animate-pulse rounded" />
            </div>
          )}
        </div>
        <div className="md:col-span-2 grid grid-cols-1 gap-2">
          {meta ? (
            [5,4,3,2,1].map((r) => (
              <div key={r} className="flex items-center gap-3">
                <div className="w-12 text-sm flex items-center gap-1"><span>{r}</span><Star className="h-3 w-3 fill-yellow-500 text-yellow-500" /></div>
                <Bar value={counts[r] || 0} max={total} />
                <div className="w-10 text-right text-xs text-muted-foreground">{counts[r] || 0}</div>
              </div>
            ))
          ) : (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-12 h-4 bg-muted animate-pulse rounded" />
                <div className="h-2 flex-1 bg-muted animate-pulse rounded" />
                <div className="w-10 h-3 bg-muted animate-pulse rounded" />
              </div>
            ))
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Filtros de avaliações">
          {(['all','5','4','3','2','1'] as const).map(key => {
            const active = filter === key;
            const label = key === 'all' ? 'Todas' : `${key} estrelas`;
            return (
              <button
                key={key}
                role="tab"
                aria-selected={active}
                aria-label={label}
                onClick={() => setFilter(key)}
                className={`px-3 py-1.5 rounded-full text-sm border transition inline-flex items-center gap-1 ${active ? 'bg-primary text-primary-foreground border-primary' : 'bg-background border-border hover:bg-accent'}`}
              >
                {key === 'all' ? (
                  <span>Todas</span>
                ) : (
                  <>
                    <span>{key}</span>
                    <Star className="h-3.5 w-3.5 fill-yellow-500 text-yellow-500" />
                  </>
                )}
              </button>
            );
          })}
          <button
            role="tab"
            aria-selected={withPhotos}
            aria-label="Com fotos"
            onClick={() => setWithPhotos(v => !v)}
            className={`px-3 py-1.5 rounded-full text-sm border transition ${withPhotos ? 'bg-primary text-primary-foreground border-primary' : 'bg-background border-border hover:bg-accent'}`}
          >
            Com fotos
          </button>
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="sort" className="text-sm text-muted-foreground">Ordenar:</label>
          <select id="sort" value={sort} onChange={e=>setSort(e.target.value as any)} className="text-sm border rounded px-2 py-1 bg-background">
            <option value="recent">Mais recentes</option>
            <option value="highest">Maiores notas</option>
            <option value="lowest">Menores notas</option>
            <option value="helpful">Mais úteis</option>
          </select>
          <ReviewFormModal productId={productId} onSubmitted={() => setRefresh(x=>x+1)} />
        </div>
      </div>

      {/* List */}
  <ReviewList productId={productId} sort={sort} filter={filter} withPhotos={withPhotos} pageSize={collapsed ? 3 : 5} />

      <div className="text-center">
        <button className="text-sm underline text-muted-foreground" onClick={() => setCollapsed(c => !c)}>
          {collapsed ? 'Ver mais avaliações' : 'Mostrar menos'}
        </button>
      </div>

      {/* CTA center for mobile */}
      <div className="md:hidden text-center">
        <ReviewFormModal productId={productId} onSubmitted={() => setRefresh(x=>x+1)} trigger={<Button variant="outline">Escrever avaliação</Button>} />
      </div>
    </div>
  );
};

export default ProfessionalReviews;
