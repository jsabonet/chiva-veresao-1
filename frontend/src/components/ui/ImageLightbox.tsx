import React from 'react';
import { Dialog, DialogContent, DialogOverlay } from '@/components/ui/dialog';

interface ImageLightboxProps {
  urls: string[];
  index: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ImageLightbox: React.FC<ImageLightboxProps> = ({ urls, index, open, onOpenChange }) => {
  const [current, setCurrent] = React.useState(index);
  React.useEffect(() => setCurrent(index), [index]);

  const prev = () => setCurrent(c => (c === 0 ? urls.length - 1 : c - 1));
  const next = () => setCurrent(c => (c === urls.length - 1 ? 0 : c + 1));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogOverlay />
      <DialogContent className="md:max-w-3xl">
        <div className="relative">
          <img src={urls[current]} alt="Imagem da avaliação" className="w-full h-auto rounded" />
          {urls.length > 1 && (
            <div className="absolute inset-0 flex items-center justify-between p-2">
              <button onClick={prev} className="p-2 bg-black/50 text-white rounded">◀</button>
              <button onClick={next} className="p-2 bg-black/50 text-white rounded">▶</button>
            </div>
          )}
        </div>
        {urls.length > 1 && (
          <div className="mt-3 grid grid-cols-6 gap-2">
            {urls.map((u, i) => (
              <img key={i} src={u} className={`h-14 w-full object-cover rounded cursor-pointer border ${i===current ? 'ring-2 ring-primary' : ''}`} onClick={() => setCurrent(i)} />
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ImageLightbox;
