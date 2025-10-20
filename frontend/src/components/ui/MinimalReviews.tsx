import React from 'react';
import { Button } from '@/components/ui/button';
import ReviewList from '@/components/ui/ReviewList';
import ReviewFormModal from '@/components/ui/ReviewFormModal';
import { Star } from 'lucide-react';

interface MinimalReviewsProps {
  productId: number;
}

const MinimalReviews: React.FC<MinimalReviewsProps> = ({ productId }) => {
  const [sort, setSort] = React.useState<'recent'|'highest'|'lowest'>('recent');
  const [filter, setFilter] = React.useState<'all'|'5'|'4'|'3'|'2'|'1'>('all');
  const [showAll, setShowAll] = React.useState(false);
  const [refreshToggle, setRefreshToggle] = React.useState(0);

  // We will pass sort & filter to ReviewList; it already supports pagination.
  // To show only 3, we rely on CSS clamp on container and a 'showAll' state to toggle.

  return (
    <div className="space-y-4">
      {/* Filters/Tabs minimalistas */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Filtro por estrelas">
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
                    <Star className="h-3.5 w-3.5 fill-current" />
                  </>
                )}
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="sort" className="text-sm text-muted-foreground">Ordenar:</label>
          <select id="sort" value={sort} onChange={e=>setSort(e.target.value as any)} className="text-sm border rounded px-2 py-1 bg-background">
            <option value="recent">Mais recentes</option>
            <option value="highest">Maiores notas</option>
            <option value="lowest">Menores notas</option>
          </select>
        </div>
      </div>

      {/* Botão estratégico para comentar */}
      <div className="flex items-center justify-center">
        <ReviewFormModal
          productId={productId}
          onSubmitted={() => setRefreshToggle(x=>x+1)}
          trigger={<Button>Escrever avaliação</Button>}
        />
      </div>

      {/* Lista com colapso/expandir */}
      <div className={`${showAll ? '' : 'max-h-[900px]'} overflow-hidden transition-all`}>
        {/* ReviewList já busca e pagina pelo backend. Não tem limite de itens, mas vamos confiar no backend e mostrar os primeiros quando colapsado. */}
        <ReviewList productId={productId} sort={sort} filter={filter} />
      </div>

      <div className="flex items-center justify-center">
        {!showAll ? (
          <Button variant="outline" onClick={()=>setShowAll(true)}>Ver mais</Button>
        ) : (
          <Button variant="outline" onClick={()=>setShowAll(false)}>Ocultar</Button>
        )}
      </div>
    </div>
  );
};

export default MinimalReviews;
