import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Star, 
  ShoppingCart, 
  Heart, 
  Share2, 
  ChevronLeft,
  ChevronRight,
  Shield,
  Truck,
  RotateCcw,
  Award,
  Minus,
  Plus
} from 'lucide-react';
import StarRating from '@/components/ui/StarRating';
import ReviewForm from '@/components/ui/ReviewForm';
import ReviewList from '@/components/ui/ReviewList';
import { useProductBySlug, useProduct } from '@/hooks/useApi';
import { formatPrice, getImageUrl, type Product } from '@/lib/api';
import { useCart } from '@/contexts/CartContext';
import { toast } from '@/hooks/use-toast';
import { FavoriteButton } from '@/components/ui/FavoriteButton';
import { ShareButton } from '@/components/ui/ShareButton';

const ProductDetails = () => {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const [quantity, setLocalQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState<string>('');
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [selectedColorId, setSelectedColorId] = useState<number | null>(null);
  // State for sorting/filtering reviews (moved here to ensure hooks run in same order)
  const [sort, setSort] = useState('recent');
  const [filter, setFilter] = useState('all');
  const { addItem, setQuantity, items } = useCart();

  // Try to fetch by slug first, then by ID if it's numeric
  const { product: productBySlug, loading: loadingBySlug, error: errorBySlug } = useProductBySlug(id);
  const { product: productById, loading: loadingById, error: errorById } = useProduct(
    !productBySlug && !loadingBySlug && !isNaN(parseInt(id || '')) ? parseInt(id!) : undefined
  );

  // Use the product that was successfully loaded
  const product = productBySlug || productById;
  const loading = loadingBySlug || loadingById;
  const error = productBySlug ? errorBySlug : (productById ? errorById : 'Produto não encontrado');

  // Preview mode from query string
  const searchParams = new URLSearchParams(location.search);
  const isPreview = ['1', 'true'].includes((searchParams.get('preview') || '').toLowerCase());

  // Navigation functions for image gallery
  const navigateImage = (direction: 'prev' | 'next') => {
    const images = [
      product?.main_image_url || product?.main_image,
      ...(product?.images?.map(img => img.image || img.image_url) || [])
    ].filter(Boolean);

    if (images.length === 0) return;

    let newIndex;
    if (direction === 'next') {
      newIndex = currentImageIndex === images.length - 1 ? 0 : currentImageIndex + 1;
    } else {
      newIndex = currentImageIndex === 0 ? images.length - 1 : currentImageIndex - 1;
    }

    setCurrentImageIndex(newIndex);
    setSelectedImage(images[newIndex]);
  };

  const selectImage = (image: string, index: number) => {
    setSelectedImage(image);
    setCurrentImageIndex(index);
  };

  // Update selected image when product loads
  useEffect(() => {
    if (product && !selectedImage) {
      const images = [
        product.main_image_url || product.main_image,
        ...(product.images?.map(img => img.image || img.image_url) || [])
      ].filter(Boolean);
      
      if (images.length > 0) {
        setSelectedImage(images[0]);
        setCurrentImageIndex(0);
      }
    }
  }, [product, selectedImage]);

  // Keyboard navigation for images
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        navigateImage('prev');
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        navigateImage('next');
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [currentImageIndex, product]);

  const handleQuantityChange = (change: number) => {
    const newQuantity = quantity + change;
    if (newQuantity >= 1 && newQuantity <= (product?.stock_quantity || 0)) {
      setLocalQuantity(newQuantity);
    }
  };

  const handleAddToCart = () => {
    if (!product) return;
    
    const unitPrice = typeof product.price === 'number' ? product.price : parseFloat(product.price as any);
    const original = product.original_price ? (typeof product.original_price === 'number' ? product.original_price : parseFloat(product.original_price as any)) : null;
    const selectedColor = product.colors?.find(c => c.id === selectedColorId);
    
    const imageUrl = product.main_image_url || product.main_image || (product.images?.[0]?.image || product.images?.[0]?.image_url) || undefined;
    
    addItem({
      id: product.id,
      name: product.name,
      slug: product.slug,
      price: unitPrice,
      original_price: original ?? undefined,
      quantity,
      image: imageUrl,
      category: product.category?.name || undefined,
      color_id: selectedColor ? selectedColor.id : undefined,
      color_name: selectedColor ? selectedColor.name : undefined,
      max_quantity: product.stock_quantity,
    });
    toast({
      title: 'Adicionado ao carrinho',
      description: `${quantity}x ${product.name}${selectedColor ? ` (${selectedColor.name})` : ''}`,
    });
  };

  const handleBuyNow = () => {
    if (!product) return;
    const unitPrice = typeof product.price === 'number' ? product.price : parseFloat(product.price as any);
    const original = product.original_price ? (typeof product.original_price === 'number' ? product.original_price : parseFloat(product.original_price as any)) : null;
    const selectedColor = product.colors?.find(c => c.id === selectedColorId);
    
    const cartItem = {
      id: product.id,
      name: product.name,
      slug: product.slug,
      price: unitPrice,
      original_price: original ?? undefined,
      image: product.main_image_url || product.main_image || (product.images?.[0]?.image || product.images?.[0]?.image_url) || undefined,
      category: product.category?.name || undefined,
      color_id: selectedColor ? selectedColor.id : undefined,
      color_name: selectedColor ? selectedColor.name : undefined,
      max_quantity: product.stock_quantity,
    };

    // Check if item already exists in cart
    const existingItem = items.find(i => 
      i.id === product.id && (i.color_id || null) === (selectedColor?.id || null)
    );

    if (existingItem) {
      // Update quantity to current selection
      setQuantity(product.id, quantity, selectedColor?.id || null);
    } else {
      // Add new item
      addItem({ ...cartItem, quantity });
    }

    // Navigate to cart
    navigate('/carrinho');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="animate-pulse">
            <div className="grid md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <div className="aspect-square bg-gray-200 rounded-lg"></div>
                <div className="grid grid-cols-4 gap-2">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="aspect-square bg-gray-200 rounded"></div>
                  ))}
                </div>
              </div>
              <div className="space-y-4">
                <div className="h-8 bg-gray-200 rounded w-3/4"></div>
                <div className="h-6 bg-gray-200 rounded w-1/2"></div>
                <div className="h-16 bg-gray-200 rounded"></div>
                <div className="h-10 bg-gray-200 rounded w-1/3"></div>
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Produto não encontrado</h1>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={() => navigate('/')}>
              <ChevronLeft className="w-4 h-4 mr-2" />
              Voltar à loja
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const images = [
    product.main_image_url || product.main_image,
    ...(product.images?.map(img => img.image || img.image_url) || [])
  ].filter(Boolean);

  // Prepare breadcrumb info
  const categoryObj: any = product.category;
  const categoryId: number | undefined = typeof categoryObj === 'object' ? categoryObj?.id : (product.category as unknown as number);
  const categoryName: string = typeof categoryObj === 'object' ? categoryObj?.name : '';
  const subcategoryId: number | null = typeof product.subcategory === 'number' ? product.subcategory : null;
  const subcategoryName: string | undefined = product.subcategory_name;

  // Merge named specification fields from `product.specifications` with
  // top-level dimension fields returned by the API (length, width, height, weight)
  const baseSpecs: Array<[string, any]> = product.specifications ?
    Object.entries(product.specifications).filter(([_, value]) => value) : [];

  // Track existing keys (normalized) to avoid duplicates
  const existingKeys = new Set(baseSpecs.map(([k]) => String(k).toLowerCase()));

  const extraSpecs: Array<[string, any]> = [];
  if (product.dimensions && !existingKeys.has('dimensions') && !existingKeys.has('dimensoes')) {
    extraSpecs.push(['Dimensões', product.dimensions]);
  }
  if (product.length && !existingKeys.has('length') && !existingKeys.has('comprimento')) {
    extraSpecs.push(['Comprimento (cm)', product.length]);
  }
  if (product.width && !existingKeys.has('width') && !existingKeys.has('largura')) {
    extraSpecs.push(['Largura (cm)', product.width]);
  }
  if (product.height && !existingKeys.has('height') && !existingKeys.has('altura')) {
    extraSpecs.push(['Altura (cm)', product.height]);
  }
  if (product.weight && !existingKeys.has('weight') && !existingKeys.has('peso')) {
    extraSpecs.push(['Peso (kg)', product.weight]);
  }

  // Format final specifications list: prefer friendly labels for base keys
  const specifications = [
    ...baseSpecs.map(([key, value]) => [key.replace(/_/g, ' '), value] as [string, any]),
    ...extraSpecs,
  ];


  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
        {isPreview && (
          <div className="mb-4 rounded-md border border-yellow-300 bg-yellow-50 px-4 py-2 text-sm text-yellow-800">
            Pré-visualização do produto (não incrementa visualizações). Alguns botões podem estar desativados.
          </div>
        )}
        {/* Breadcrumb */}
        <nav className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground mb-6">
          <Link to="/" className="hover:text-foreground">Início</Link>
          {categoryId ? (
            <Link to={`/products?category=${categoryId}`} className="hover:text-foreground">{categoryName}</Link>
          ) : (
            <span className="hover:text-foreground">{categoryName || 'Categoria'}</span>
          )}
          {subcategoryId && subcategoryName ? (
            <>
              <span>/</span>
              <Link
                to={`/products?category=${categoryId}&subcategory=${subcategoryId}`}
                className="hover:text-foreground"
              >
                {subcategoryName}
              </Link>
            </>
          ) : null}
          <span>/</span>
          <span className="text-foreground break-words">{product.name}</span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 mb-8 lg:mb-12">
          {/* Product Images Gallery */}
          <div className="space-y-3 lg:space-y-4">
            {/* Main Image with Navigation */}
            <div className="relative group">
              <div className="aspect-square rounded-lg overflow-hidden bg-gray-100 border border-gray-200">
                <img
                  src={getImageUrl(selectedImage)}
                  alt={product.name}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = "/placeholder.svg";
                  }}
                />
              </div>
              
              {/* Navigation Arrows */}
              {images.length > 1 && (
                <>
                  <Button
                    variant="secondary"
                    size="icon"
                    className="absolute left-2 top-1/2 transform -translate-y-1/2 opacity-70 hover:opacity-100 transition-opacity duration-300 bg-white/95 hover:bg-white shadow-lg z-10"
                    onClick={() => navigateImage('prev')}
                  >
                    <ChevronLeft className="h-4 w-4 text-gray-700" />
                  </Button>
                  <Button
                    variant="secondary"
                    size="icon"
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 opacity-70 hover:opacity-100 transition-opacity duration-300 bg-white/95 hover:bg-white shadow-lg z-10"
                    onClick={() => navigateImage('next')}
                  >
                    <ChevronRight className="h-4 w-4 text-gray-700" />
                  </Button>
                </>
              )}

              {/* Image Counter */}
              {images.length > 1 && (
                <div className="absolute bottom-2 right-2 bg-black/60 text-white px-2 py-1 rounded-md text-xs font-medium">
                  {currentImageIndex + 1} / {images.length}
                </div>
              )}

              {/* Navigation Dots */}
              {images.length > 1 && (
                <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex gap-1">
                  {images.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => selectImage(images[index], index)}
                      className={`w-2 h-2 rounded-full transition-all duration-200 ${
                        currentImageIndex === index 
                          ? 'bg-white scale-125' 
                          : 'bg-white/50 hover:bg-white/75'
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Thumbnail Gallery */}
            {images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                {images.map((image, index) => (
                  <button
                    key={index}
                    onClick={() => selectImage(image, index)}
                    className={`flex-shrink-0 w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 rounded-md border-2 overflow-hidden gallery-thumbnail ${
                      selectedImage === image 
                        ? 'border-primary ring-2 ring-primary/20 active' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <img
                      src={getImageUrl(image)}
                      alt={`${product.name} ${index + 1}`}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = "/placeholder.svg";
                      }}
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Information */}
          <div className="space-y-4 lg:space-y-6">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold mb-2 break-words leading-tight">{product.name}</h1>
              <p className="text-sm sm:text-base text-muted-foreground">SKU: {product.sku}</p>
            </div>

            {/* Badges */}
            <div className="flex flex-wrap gap-2">
              {/* <Badge variant="secondary" className="text-xs sm:text-sm">{categoryName || (typeof product.category === 'string' ? product.category : 'Categoria')}</Badge> */}
              {product.is_featured && <Badge variant="default" className="text-xs sm:text-sm">Destaque</Badge>}
              {product.is_bestseller && <Badge variant="default" className="text-xs sm:text-sm">Best Seller</Badge>}
              {product.is_on_sale && <Badge variant="destructive" className="text-xs sm:text-sm">Promoção</Badge>}
              {product.stock_quantity > 0 ? (
                <Badge variant="default" className="text-xs sm:text-sm">Em Estoque</Badge>
              ) : (
                <Badge variant="destructive" className="text-xs sm:text-sm">Fora de Estoque</Badge>
              )}
            </div>

            {/* Price */}
            <div className="space-y-2">
              <div className="flex flex-wrap items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-bold">{formatPrice(product.price)}</span>
                {product.original_price && parseFloat(product.original_price) > parseFloat(product.price) && (
                  <span className="text-lg sm:text-xl text-muted-foreground line-through">
                    {formatPrice(product.original_price)}
                  </span>
                )}
              </div>
              {product.original_price && parseFloat(product.original_price) > parseFloat(product.price) && (
                <p className="text-sm text-green-600">
                  Economize {formatPrice(parseFloat(product.original_price) - parseFloat(product.price))}
                </p>
              )}
            </div>

            {/* Description */}
            <div className="prose prose-sm max-w-none break-words">
              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">{product.description}</p>
            </div>

            {/* Color selection */}
            {product.colors && product.colors.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium">Cor:</span>
                  {(() => {
                    const selected = product.colors.find(c => c.id === selectedColorId);
                    return selected ? (
                      <Badge variant="outline" className="text-xs sm:text-sm">{selected.name}</Badge>
                    ) : null;
                  })()}
                </div>
                <div className="flex flex-wrap gap-2">
                  {product.colors.map((color) => {
                    const isSelected = selectedColorId === color.id;
                    const hasHex = !!color.hex_code;
                    return (
                      <button
                        key={color.id}
                        type="button"
                        onClick={() => setSelectedColorId(color.id)}
                        aria-label={color.name}
                        aria-pressed={isSelected}
                        title={color.name}
                        className={`h-8 w-8 sm:h-10 sm:w-10 rounded-full border-2 ring-offset-2 transition focus:outline-none focus:ring-2 focus:ring-primary/40 ${
                          isSelected ? 'border-primary ring-2 ring-primary/40' : 'border-gray-300 hover:border-gray-400'
                        } flex items-center justify-center overflow-hidden`}
                        style={hasHex ? { backgroundColor: color.hex_code } : undefined}
                      >
                        {!hasHex && (
                          <span className="text-[10px] px-1 text-foreground">{color.name[0]}</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Dimensions (show immediately after colors) */}
            {(product.length || product.width || product.height || product.weight) && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Dimensões</span>
                </div>
                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                  {product.length && (
                    <div className="min-w-[10rem]">Comprimento: <span className="text-foreground">{product.length} cm</span></div>
                  )}
                  {product.width && (
                    <div className="min-w-[10rem]">Largura: <span className="text-foreground">{product.width} cm</span></div>
                  )}
                  {product.height && (
                    <div className="min-w-[10rem]">Altura: <span className="text-foreground">{product.height} cm</span></div>
                  )}
                  {product.weight && (
                    <div className="min-w-[10rem]">Peso: <span className="text-foreground">{product.weight} kg</span></div>
                  )}
                </div>
              </div>
            )}

            {/* Quantity and Add to Cart */}
            {product.stock_quantity > 0 && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                  <span className="text-sm font-medium">Quantidade:</span>
                  <div className="flex items-center border rounded-md w-fit">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleQuantityChange(-1)}
                      disabled={quantity <= 1}
                      className="h-9 w-9 sm:h-10 sm:w-10"
                    >
                      <Minus className="w-4 h-4" />
                    </Button>
                    <span className="px-3 py-2 border-x text-center min-w-[3rem]">{quantity}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleQuantityChange(1)}
                      disabled={quantity >= product.stock_quantity}
                      className="h-9 w-9 sm:h-10 sm:w-10"
                      title={quantity >= product.stock_quantity ? 'Estoque máximo atingido' : 'Aumentar quantidade'}
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {product.stock_quantity} disponível
                  </span>
                </div>

                <div className="flex flex-col gap-3">
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button size="lg" className="w-full sm:flex-1 h-12 sm:h-11" onClick={handleAddToCart} disabled={isPreview}>
                      <ShoppingCart className="w-4 h-4 mr-2" />
                      Adicionar ao Carrinho
                    </Button>
                    <Button 
                      size="lg" 
                      variant="secondary" 
                      className="w-full sm:w-auto h-12 sm:h-11 px-8" 
                      onClick={handleBuyNow} 
                      disabled={isPreview}
                    >
                      Comprar Agora
                    </Button>
                  </div>
                  <div className="flex gap-3 sm:gap-2">
                    <div className="flex-1 sm:flex-none">
                      <FavoriteButton
                        productId={product.id}
                        variant="outline"
                        size="lg"
                        showText={true}
                        className="w-full sm:w-auto h-12 sm:h-11"
                      />
                    </div>
                    <div className="flex-1 sm:flex-none">
                      <ShareButton
                        productName={product.name}
                        productSlug={product.slug}
                        productImage={selectedImage || undefined}
                        variant="outline"
                        size="lg"
                        className="w-full sm:w-auto h-12 sm:h-11"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Features */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 flex-shrink-0" />
                <span className="text-sm">Garantia de 1 ano</span>
              </div>
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 flex-shrink-0" />
                <span className="text-sm">Entrega grátis</span>
              </div>
              <div className="flex items-center gap-2">
                <RotateCcw className="w-4 h-4 sm:w-5 sm:h-5 text-orange-600 flex-shrink-0" />
                <span className="text-sm">30 dias para troca</span>
              </div>
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600 flex-shrink-0" />
                <span className="text-sm">Produto original</span>
              </div>
            </div>
          </div>
        </div>

        {/* Product Details Tabs */}
        <Tabs defaultValue="specifications" className="w-full">
          <TabsList className="w-full h-auto flex sm:grid sm:grid-cols-3 gap-1 sm:gap-2 overflow-x-auto scrollbar-hide p-1">
            <TabsTrigger 
              value="specifications" 
              className="min-w-[120px] sm:min-w-0 text-xs sm:text-sm py-2 sm:py-2.5 px-3 sm:px-4 whitespace-nowrap"
            >
              Especificações
            </TabsTrigger>
            <TabsTrigger 
              value="description" 
              className="min-w-[120px] sm:min-w-0 text-xs sm:text-sm py-2 sm:py-2.5 px-3 sm:px-4 whitespace-nowrap"
            >
              Descrição Completa
            </TabsTrigger>
            <TabsTrigger 
              value="reviews" 
              className="min-w-[120px] sm:min-w-0 text-xs sm:text-sm py-2 sm:py-2.5 px-3 sm:px-4 whitespace-nowrap"
            >
              Avaliações
            </TabsTrigger>
          </TabsList>          <TabsContent value="specifications" className="mt-4 sm:mt-6">
            <Card>
              <CardContent className="pt-4 sm:pt-6 px-4 sm:px-6">
                {specifications.length > 0 ? (
                  <div className="space-y-3 sm:space-y-4">
                    {specifications.map(([key, value]) => (
                      <div key={key} className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-2 py-2 sm:py-3 border-b last:border-b-0">
                        <span className="font-medium text-sm sm:text-base capitalize">
                          {key.replace(/_/g, ' ')}:
                        </span>
                        <span className="text-muted-foreground text-sm sm:text-base break-words sm:text-right">{value}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-6 sm:py-8 text-sm sm:text-base">
                    Especificações não disponíveis para este produto.
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="description" className="mt-4 sm:mt-6">
            <Card>
              <CardContent className="pt-4 sm:pt-6 px-4 sm:px-6">
                <div className="prose prose-sm max-w-none">
                  <p className="text-sm sm:text-base leading-relaxed">{product.description}</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reviews" className="mt-4 sm:mt-6">
            <Card>
              <CardContent className="pt-4 sm:pt-6 px-4 sm:px-6">
                <div className="space-y-8">
                  {/* Review Summary */}
                  <div className="flex flex-col lg:flex-row gap-8 pb-6 border-b">
                    {/* Overall Rating */}
                    <div className="flex-1 flex flex-col items-center lg:items-start">
                      <div className="flex flex-col items-center lg:items-start gap-2">
                        <div className="text-4xl font-bold">
                          {(product?.average_rating ?? 0).toFixed(1)}
                          <span className="text-lg text-muted-foreground">/5</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <StarRating rating={Math.round(product?.average_rating ?? 0)} readOnly size="lg" />
                          <span className="text-sm text-muted-foreground">
                            {product?.total_reviews ?? 0} {(product?.total_reviews ?? 0) === 1 ? 'avaliação' : 'avaliações'}
                          </span>
                        </div>
                      </div>
                      {/* Verified Purchase Summary */}
                      <div className="mt-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          90% compras verificadas
                        </div>
                      </div>
                    </div>

                    {/* Rating Distribution (real data) */}
                    <div className="flex-1 flex flex-col gap-2">
                      {[5, 4, 3, 2, 1].map((stars) => {
                        const count = product?.rating_distribution?.[stars] || 0;
                        const total = product?.total_reviews || 1;
                        const percent = Math.round((count / total) * 100);
                        return (
                          <div key={stars} className="flex items-center gap-2">
                            <div className="w-12 text-sm whitespace-nowrap">{stars} estrelas</div>
                            <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-yellow-400 rounded-full"
                                style={{ width: `${percent}%` }}
                                aria-label={`Barra de ${stars} estrelas: ${percent}%`}
                              />
                            </div>
                            <div className="w-12 text-sm text-right text-muted-foreground">
                              {percent}%
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Review CTA */}
                    <div className="flex-1 flex flex-col items-center lg:items-start gap-4">
                      <div className="text-center lg:text-left">
                        <h4 className="font-semibold mb-2">Compartilhe sua opinião</h4>
                        <p className="text-sm text-muted-foreground mb-4">
                          Ajude outros compradores a fazer a melhor escolha
                        </p>
                      </div>
                      <Button onClick={() => document.getElementById('review-form')?.scrollIntoView({ behavior: 'smooth' })}>
                        Avaliar Produto
                      </Button>
                    </div>
                  </div>

                  {/* Reviews List Section */}
                  <div className="space-y-6">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                      <h3 className="text-lg font-semibold">Avaliações dos Clientes</h3>
                      <div className="flex items-center gap-4">
                        <label htmlFor="review-sort" className="sr-only">Ordenar avaliações</label>
                        <select
                          id="review-sort"
                          className="text-sm border rounded-md px-2 py-1"
                          value={sort}
                          onChange={e => setSort(e.target.value)}
                          aria-label="Ordenar avaliações"
                        >
                          <option value="recent">Mais recentes</option>
                          <option value="helpful">Mais úteis</option>
                          <option value="highest">Maior avaliação</option>
                          <option value="lowest">Menor avaliação</option>
                        </select>
                        <label htmlFor="review-filter" className="sr-only">Filtrar por estrelas</label>
                        <select
                          id="review-filter"
                          className="text-sm border rounded-md px-2 py-1"
                          value={filter}
                          onChange={e => setFilter(e.target.value)}
                          aria-label="Filtrar por estrelas"
                        >
                          <option value="all">Todas as estrelas</option>
                          <option value="5">5 estrelas</option>
                          <option value="4">4 estrelas</option>
                          <option value="3">3 estrelas</option>
                          <option value="2">2 estrelas</option>
                          <option value="1">1 estrela</option>
                        </select>
                      </div>
                    </div>

                    <ReviewList 
                      productId={product!.id}
                      initialReviews={product?.reviews || []}
                      sort={sort}
                      filter={filter}
                    />
                  </div>

                  {/* Review Form */}
                  <div id="review-form" className="pt-6 border-t">
                    <h3 className="text-lg font-semibold mb-4">Avaliar Produto</h3>
                    <ReviewForm productId={product.id} onReviewSubmitted={() => window.location.reload()} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
      <Footer />
    </div>
  );
};

export default ProductDetails;
