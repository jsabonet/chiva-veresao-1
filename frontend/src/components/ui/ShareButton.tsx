import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Share2, 
  Copy, 
  MessageCircle, 
  Mail, 
  Facebook, 
  Twitter,
  Linkedin
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface ShareButtonProps {
  productName: string;
  productSlug: string;
  productImage?: string;
  className?: string;
  variant?: 'default' | 'outline' | 'ghost' | 'secondary';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

export const ShareButton: React.FC<ShareButtonProps> = ({
  productName,
  productSlug,
  productImage,
  className,
  variant = 'outline',
  size = 'default',
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const productUrl = `${window.location.origin}/produto/${productSlug}`;
  const shareText = `Confira este produto incrível: ${productName}`;

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(productUrl);
      toast({
        title: 'Link copiado!',
        description: 'O link do produto foi copiado para a área de transferência.',
      });
      setIsOpen(false);
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível copiar o link.',
        variant: 'destructive',
      });
    }
  };

  const shareViaWhatsApp = () => {
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(`${shareText} ${productUrl}`)}`;
    window.open(whatsappUrl, '_blank');
    setIsOpen(false);
  };

  const shareViaEmail = () => {
    const emailSubject = encodeURIComponent(`Confira este produto: ${productName}`);
    const emailBody = encodeURIComponent(`${shareText}\n\n${productUrl}`);
    const emailUrl = `mailto:?subject=${emailSubject}&body=${emailBody}`;
    window.open(emailUrl);
    setIsOpen(false);
  };

  const shareViaFacebook = () => {
    const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(productUrl)}`;
    window.open(facebookUrl, '_blank', 'width=600,height=400');
    setIsOpen(false);
  };

  const shareViaTwitter = () => {
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(productUrl)}`;
    window.open(twitterUrl, '_blank', 'width=600,height=400');
    setIsOpen(false);
  };

  const shareViaLinkedIn = () => {
    const linkedinUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(productUrl)}`;
    window.open(linkedinUrl, '_blank', 'width=600,height=400');
    setIsOpen(false);
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: productName,
          text: shareText,
          url: productUrl,
        });
        setIsOpen(false);
      } catch (error) {
        // User cancelled sharing or share failed
        console.log('Share cancelled or failed');
      }
    }
  };

  // Check if native sharing is supported
  const supportsNativeShare = typeof navigator !== 'undefined' && navigator.share;

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant={variant} size={size} className={className}>
          <Share2 className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {supportsNativeShare && (
          <DropdownMenuItem onClick={handleNativeShare}>
            <Share2 className="mr-2 h-4 w-4" />
            Compartilhar
          </DropdownMenuItem>
        )}
        
        <DropdownMenuItem onClick={copyToClipboard}>
          <Copy className="mr-2 h-4 w-4" />
          Copiar link
        </DropdownMenuItem>
        
        <DropdownMenuItem onClick={shareViaWhatsApp}>
          <MessageCircle className="mr-2 h-4 w-4" />
          WhatsApp
        </DropdownMenuItem>
        
        <DropdownMenuItem onClick={shareViaEmail}>
          <Mail className="mr-2 h-4 w-4" />
          Email
        </DropdownMenuItem>
        
        <DropdownMenuItem onClick={shareViaFacebook}>
          <Facebook className="mr-2 h-4 w-4" />
          Facebook
        </DropdownMenuItem>
        
        <DropdownMenuItem onClick={shareViaTwitter}>
          <Twitter className="mr-2 h-4 w-4" />
          Twitter
        </DropdownMenuItem>
        
        <DropdownMenuItem onClick={shareViaLinkedIn}>
          <Linkedin className="mr-2 h-4 w-4" />
          LinkedIn
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};