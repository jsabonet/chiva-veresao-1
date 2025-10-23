import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import AdminLayout from '@/components/layout/AdminLayout';
import { 
  Save, 
  ArrowLeft, 
  Upload,
  X,
  Eye,
  Plus,
  AlertTriangle,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useUpdateProduct, useCategories, useSubcategoriesByCategory } from '@/hooks/useApi';
import { productApi, productImageApi, type Product, type ProductCreateUpdate, type ProductImage } from '@/lib/api';
import Loading from '@/components/ui/Loading';

const EditProduct = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { updateProduct, loading: updateLoading } = useUpdateProduct();
  const { categories, loading: categoriesLoading } = useCategories();

  // State
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    short_description: '',
  category: '',
  subcategory: '',
    sku: '',
    brand: '',
    price: '',
    original_price: '',
    stock_quantity: '0',
    min_stock_level: '5',
    is_active: true,
    is_featured: false,
    is_bestseller: false,
    is_on_sale: false,
    weight: '',
    length: '',
    width: '',
    height: '',
    meta_title: '',
    meta_description: '',
    meta_keywords: '',
    specifications: {}
  });

  const selectedCategoryId = formData.category ? parseInt(formData.category) : undefined;
  const { subcategories } = useSubcategoriesByCategory(selectedCategoryId);

  // Image upload state
  const [mainImage, setMainImage] = useState<File | null>(null);
  const [thumbnails, setThumbnails] = useState<File[]>([]);
  const [mainImagePreview, setMainImagePreview] = useState<string>('');
  const [thumbnailPreviews, setThumbnailPreviews] = useState<string[]>([]);
  const [existingImages, setExistingImages] = useState<ProductImage[]>([]);

  // Specifications state
  const [specifications, setSpecifications] = useState<{key: string, value: string}[]>([]);

  // Load product data
  useEffect(() => {
    if (id) {
      loadProduct();
    }
  }, [id]);

  const loadProduct = async () => {
    try {
      setLoading(true);
      const productData = await productApi.getProduct(parseInt(id!));
      setProduct(productData);
      
      // Populate form
      setFormData({
        name: productData.name || '',
        description: productData.description || '',
        short_description: productData.short_description || '',
  category: productData.category?.id?.toString() || '',
  subcategory: (productData as any).subcategory ? String((productData as any).subcategory) : '',
        sku: productData.sku || '',
        brand: productData.brand || '',
        price: productData.price?.toString() || '',
        original_price: productData.original_price?.toString() || '',
        stock_quantity: productData.stock_quantity?.toString() || '0',
        min_stock_level: productData.min_stock_level?.toString() || '5',
        is_active: productData.status === 'active',
        is_featured: productData.is_featured || false,
        is_bestseller: productData.is_bestseller || false,
        is_on_sale: productData.is_on_sale || false,
        weight: productData.weight?.toString() || '',
        length: '',
        width: '',
        height: '',
        meta_title: productData.meta_title || '',
        meta_description: productData.meta_description || '',
        meta_keywords: productData.meta_keywords || '',
        specifications: productData.specifications || {}
      });

      // Convert specifications object to array
      if (productData.specifications) {
        const specsArray = Object.entries(productData.specifications).map(([key, value]) => ({
          key,
          value: String(value)
        }));
        setSpecifications(specsArray.length > 0 ? specsArray : [{ key: '', value: '' }]);
      } else {
        setSpecifications([{ key: '', value: '' }]);
      }

      // Load existing images
      const imagesResponse = await productImageApi.getProductImages(parseInt(id!));
      const images = imagesResponse.results || [];
      setExistingImages(images);
      
      // Set image previews
      const mainImg = images.find(img => img.is_main);
      const thumbnailImgs = images.filter(img => !img.is_main);
      
      if (mainImg) {
        setMainImagePreview(mainImg.image);
      }
      
      if (thumbnailImgs.length > 0) {
        setThumbnailPreviews(thumbnailImgs.map(img => img.image));
      }

    } catch (error) {
      setErrorMessage('Erro ao carregar dados do produto');
    } finally {
      setLoading(false);
    }
  };

  // When category changes, reset subcategory
  useEffect(() => {
    setFormData(prev => ({ ...prev, subcategory: '' }));
  }, [formData.category]);

  // Clear messages after 5 seconds
  useEffect(() => {
    if (successMessage || errorMessage) {
      const timer = setTimeout(() => {
        setSuccessMessage('');
        setErrorMessage('');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage, errorMessage]);

  const handleMainImageUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const preview = e.target?.result as string;
      setMainImage(file);
      setMainImagePreview(preview);
    };
    reader.readAsDataURL(file);
  };

  const handleThumbnailsUpload = (files: FileList) => {
    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const preview = e.target?.result as string;
        setThumbnails(prev => [...prev, file]);
        setThumbnailPreviews(prev => [...prev, preview]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeThumbnail = (index: number) => {
    setThumbnails(prev => prev.filter((_, i) => i !== index));
    setThumbnailPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const removeExistingImage = async (imageId: number, isMain: boolean) => {
    try {
      await productImageApi.deleteImage(imageId);
      setExistingImages(prev => prev.filter(img => img.id !== imageId));
      
      if (isMain) {
        setMainImagePreview('');
      } else {
        // Remove from thumbnail previews
        const imageToRemove = existingImages.find(img => img.id === imageId);
        if (imageToRemove) {
          const indexToRemove = thumbnailPreviews.findIndex(preview => 
            preview === imageToRemove.image
          );
          if (indexToRemove !== -1) {
            setThumbnailPreviews(prev => prev.filter((_, i) => i !== indexToRemove));
          }
        }
      }
    } catch (error) {
      console.error('Error removing image:', error);
      setErrorMessage('Erro ao remover imagem');
    }
  };

  const addSpecification = () => {
    setSpecifications(prev => [...prev, { key: '', value: '' }]);
  };

  const updateSpecification = (index: number, field: 'key' | 'value', value: string) => {
    setSpecifications(prev => 
      prev.map((spec, i) => 
        i === index ? { ...spec, [field]: value } : spec
      )
    );
  };

  const removeSpecification = (index: number) => {
    setSpecifications(prev => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    try {
      // Validation
      if (!formData.name.trim()) {
        setErrorMessage('Nome do produto é obrigatório');
        return;
      }
      if (!formData.description.trim()) {
        setErrorMessage('Descrição do produto é obrigatória');
        return;
      }
      if (!formData.sku.trim()) {
        setErrorMessage('SKU é obrigatório');
        return;
      }
      if (!formData.category) {
        setErrorMessage('Categoria é obrigatória');
        return;
      }
      if (!formData.subcategory) {
        setErrorMessage('Subcategoria é obrigatória');
        return;
      }
      if (!formData.price || parseFloat(formData.price) <= 0) {
        setErrorMessage('Preço deve ser maior que zero');
        return;
      }

      // Prepare specifications object
      const specsObject = specifications
        .filter(spec => spec.key.trim() && spec.value.trim())
        .reduce((acc, spec) => {
          acc[spec.key.trim()] = spec.value.trim();
          return acc;
        }, {} as Record<string, any>);

      const productData: ProductCreateUpdate = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        short_description: formData.short_description.trim() || formData.description.substring(0, 300),
  category: parseInt(formData.category),
  subcategory: formData.subcategory ? parseInt(formData.subcategory) : null,
        sku: formData.sku.trim(),
        brand: formData.brand.trim(),
        price: formData.price,
        original_price: formData.original_price || undefined,
        stock_quantity: parseInt(formData.stock_quantity) || 0,
        min_stock_level: parseInt(formData.min_stock_level) || 5,
        status: formData.is_active ? 'active' : 'inactive',
        is_featured: formData.is_featured,
        is_bestseller: formData.is_bestseller,
        is_on_sale: formData.is_on_sale,
        weight: formData.weight || undefined,
        length: formData.length || undefined,
        width: formData.width || undefined,
        height: formData.height || undefined,
        meta_title: formData.meta_title || formData.name.trim(),
        meta_description: formData.meta_description || formData.description.trim(),
        meta_keywords: formData.meta_keywords || undefined,
        specifications: specsObject
      };

      await updateProduct(parseInt(id!), productData);

      // Upload new images if any
      if (mainImage || thumbnails.length > 0) {
        const formData = new FormData();
        formData.append('product_id', id!);
        
        if (mainImage) {
          formData.append('images', mainImage);
          formData.append('is_main', 'true');
          formData.append('order', '1');
        }
        
        thumbnails.forEach((file, index) => {
          formData.append('images', file);
          formData.append('is_main', 'false');
          formData.append('order', (index + 2).toString());
        });
        
        await productImageApi.bulkUpload(formData);
      }

      setSuccessMessage('Produto atualizado com sucesso!');
      
      setTimeout(() => {
        navigate('/admin/products');
      }, 2000);
    } catch (error) {
      console.error('Error updating product:', error);
      setErrorMessage('Erro ao atualizar produto. Tente novamente.');
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <Loading label="Carregando produto..." />
      </AdminLayout>
    );
  }

  if (!product) {
    return (
      <AdminLayout>
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold text-red-600">Produto não encontrado</h1>
          <Button onClick={() => navigate('/admin/products')} className="mt-4">
            Voltar aos Produtos
          </Button>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center space-x-4">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => navigate('/admin/products')}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Editar Produto</h1>
              <p className="text-muted-foreground">
                Atualize as informações do produto: {product.name}
              </p>
            </div>
          </div>
          <div className="flex w-full sm:w-auto flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => navigate('/admin/products')}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={updateLoading}>
              {updateLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Salvar Alterações
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Success/Error Messages */}
        {successMessage && (
          <Alert className="border-green-200 bg-green-50">
            <AlertTriangle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              {successMessage}
            </AlertDescription>
          </Alert>
        )}

        {errorMessage && (
          <Alert className="border-red-200 bg-red-50">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              {errorMessage}
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle>Informações Básicas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="name">Nome do Produto *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    placeholder="Ex: Laptop Dell Inspiron 15"
                    className="mt-1"
                  />
                </div>
                
                <div>
                  <Label htmlFor="description">Descrição *</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    placeholder="Descrição completa do produto..."
                    rows={4}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="short_description">Descrição Curta</Label>
                  <Textarea
                    id="short_description"
                    value={formData.short_description}
                    onChange={(e) => setFormData({...formData, short_description: e.target.value})}
                    placeholder="Descrição resumida para listagens..."
                    rows={2}
                    className="mt-1"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Máximo 300 caracteres. Se não preenchido, será gerado automaticamente.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Media Upload */}
            <Card>
              <CardHeader>
                <CardTitle>Imagens do Produto</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Main Image */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <Label className="text-base font-medium">Imagem Principal *</Label>
                    <Badge variant="outline">Obrigatório</Badge>
                  </div>
                  <div className="space-y-2">
                    {mainImagePreview ? (
                      <div className="relative w-full h-64 border-2 border-dashed border-green-300 bg-green-50 rounded-lg overflow-hidden">
                        <img 
                          src={mainImagePreview} 
                          alt="Imagem Principal" 
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute top-2 left-2">
                          <Badge className="bg-green-600 hover:bg-green-700">
                            Principal
                          </Badge>
                        </div>
                        <Button
                          variant="destructive"
                          size="icon"
                          className="absolute top-2 right-2"
                          onClick={() => {
                            const existingMainImage = existingImages.find(img => img.is_main);
                            if (existingMainImage) {
                              removeExistingImage(existingMainImage.id, true);
                            } else {
                              setMainImage(null);
                              setMainImagePreview('');
                            }
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <div 
                        className="w-full h-64 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center cursor-pointer hover:border-gray-400 hover:bg-gray-50 transition-colors"
                        onClick={() => document.getElementById('main-image-input')?.click()}
                      >
                        <div className="text-center">
                          <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                          <p className="text-lg font-medium text-gray-700 mb-2">Carregar Imagem Principal</p>
                          <p className="text-sm text-gray-500">PNG, JPG, WEBP até 10MB</p>
                          <p className="text-xs text-gray-400 mt-1">Esta será a imagem destacada do produto</p>
                        </div>
                      </div>
                    )}
                    <input
                      id="main-image-input"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleMainImageUpload(file);
                      }}
                    />
                  </div>
                </div>

                <Separator />

                {/* Thumbnails */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <Label className="text-base font-medium">Miniaturas</Label>
                    <Badge variant="secondary">Ilimitado</Badge>
                  </div>
                  
                  {/* Upload Area */}
                  <div 
                    className="w-full p-8 border-2 border-dashed border-blue-300 bg-blue-50 rounded-lg flex items-center justify-center cursor-pointer hover:border-blue-400 hover:bg-blue-100 transition-colors mb-4"
                    onClick={() => document.getElementById('thumbnails-input')?.click()}
                    onDrop={(e) => {
                      e.preventDefault();
                      const files = e.dataTransfer.files;
                      if (files.length > 0) {
                        handleThumbnailsUpload(files);
                      }
                    }}
                    onDragOver={(e) => e.preventDefault()}
                    onDragEnter={(e) => e.preventDefault()}
                  >
                    <div className="text-center">
                      <Upload className="h-10 w-10 text-blue-500 mx-auto mb-3" />
                      <p className="text-lg font-medium text-blue-700 mb-2">Carregar Miniaturas</p>
                      <p className="text-sm text-blue-600">Clique ou arraste múltiplas imagens aqui</p>
                      <p className="text-xs text-blue-500 mt-1">Pode carregar quantas imagens quiser</p>
                    </div>
                  </div>
                  
                  <input
                    id="thumbnails-input"
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files) {
                        handleThumbnailsUpload(e.target.files);
                      }
                    }}
                  />

                  {/* Existing and New Thumbnails Preview */}
                  {(thumbnailPreviews.length > 0 || thumbnails.length > 0) && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-gray-700">
                        Miniaturas ({thumbnailPreviews.length + thumbnails.length})
                      </p>
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {/* Existing thumbnails from database */}
                        {existingImages
                          .filter(img => !img.is_main)
                          .map((image, index) => (
                            <div key={`existing-${image.id}`} className="relative aspect-square border-2 border-gray-200 rounded-lg overflow-hidden group">
                              <img 
                                src={image.image} 
                                alt={`Miniatura ${index + 1}`} 
                                className="w-full h-full object-cover"
                              />
                              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-opacity flex items-center justify-center">
                                <Button
                                  variant="destructive"
                                  size="icon"
                                  className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8"
                                  onClick={() => removeExistingImage(image.id, false)}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          ))
                        }
                        
                        {/* New thumbnails to be uploaded */}
                        {thumbnailPreviews.map((preview, index) => (
                          <div key={`new-${index}`} className="relative aspect-square border-2 border-blue-200 rounded-lg overflow-hidden group">
                            <img 
                              src={preview} 
                              alt={`Nova Miniatura ${index + 1}`} 
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute top-1 left-1">
                              <Badge variant="default" className="text-xs bg-blue-600">
                                Nova
                              </Badge>
                            </div>
                            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-opacity flex items-center justify-center">
                              <Button
                                variant="destructive"
                                size="icon"
                                className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8"
                                onClick={() => removeThumbnail(index)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Specifications */}
            <Card>
              <CardHeader>
                <CardTitle>Especificações Técnicas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {specifications.map((spec, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <Input
                      placeholder="Especificação (ex: Processador)"
                      value={spec.key}
                      onChange={(e) => updateSpecification(index, 'key', e.target.value)}
                      className="flex-1"
                    />
                    <Input
                      placeholder="Valor (ex: Intel Core i7)"
                      value={spec.value}
                      onChange={(e) => updateSpecification(index, 'value', e.target.value)}
                      className="flex-1"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => removeSpecification(index)}
                      disabled={specifications.length === 1}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button variant="outline" onClick={addSpecification} className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Especificação
                </Button>
              </CardContent>
            </Card>

            {/* SEO */}
            <Card>
              <CardHeader>
                <CardTitle>SEO e Meta Tags</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="meta_title">Meta Título</Label>
                  <Input
                    id="meta_title"
                    value={formData.meta_title}
                    onChange={(e) => setFormData({...formData, meta_title: e.target.value})}
                    placeholder="Título para motores de busca..."
                    className="mt-1"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Recomendado: 50-60 caracteres
                  </p>
                </div>

                <div>
                  <Label htmlFor="meta_description">Meta Descrição</Label>
                  <Textarea
                    id="meta_description"
                    value={formData.meta_description}
                    onChange={(e) => setFormData({...formData, meta_description: e.target.value})}
                    placeholder="Descrição para motores de busca..."
                    rows={3}
                    className="mt-1"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Recomendado: 150-160 caracteres
                  </p>
                </div>

                <div>
                  <Label htmlFor="meta_keywords">Palavras-chave</Label>
                  <Input
                    id="meta_keywords"
                    value={formData.meta_keywords}
                    onChange={(e) => setFormData({...formData, meta_keywords: e.target.value})}
                    placeholder="laptop, dell, computador, tecnologia..."
                    className="mt-1"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Separe as palavras-chave por vírgula
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Product Details */}
            <Card>
              <CardHeader>
                <CardTitle>Detalhes do Produto</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="category">Categoria *</Label>
                  <Select 
                    value={formData.category} 
                    onValueChange={(value) => setFormData({...formData, category: value})}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Selecione uma categoria" />
                    </SelectTrigger>
                    <SelectContent>
                      {categoriesLoading ? (
                        <SelectItem value="loading" disabled>
                          Carregando categorias...
                        </SelectItem>
                      ) : (
                        categories?.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id.toString()}>
                            {cat.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="subcategory">Subcategoria</Label>
                  <Select 
                    value={formData.subcategory}
                    onValueChange={(value) => setFormData({ ...formData, subcategory: value })}
                    disabled={!formData.category || (subcategories?.length ?? 0) === 0}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder={formData.category ? 'Selecione uma subcategoria' : 'Selecione uma categoria primeiro'} />
                    </SelectTrigger>
                    <SelectContent>
                      {subcategories && subcategories.length > 0 ? (
                        subcategories.map((sub) => (
                          <SelectItem key={sub.id} value={sub.id.toString()}>
                            {sub.name}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="none" disabled>
                          {formData.category ? 'Sem subcategorias disponíveis' : 'Selecione uma categoria primeiro'}
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="sku">SKU *</Label>
                  <Input
                    id="sku"
                    value={formData.sku}
                    onChange={(e) => setFormData({...formData, sku: e.target.value})}
                    placeholder="LAP-DELL-001"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="brand">Marca</Label>
                  <Input
                    id="brand"
                    value={formData.brand}
                    onChange={(e) => setFormData({...formData, brand: e.target.value})}
                    placeholder="Dell"
                    className="mt-1"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Pricing */}
            <Card>
              <CardHeader>
                <CardTitle>Preços</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="price">Preço (MZN) *</Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => setFormData({...formData, price: e.target.value})}
                    placeholder="0.00"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="original_price">Preço Original (MZN)</Label>
                  <Input
                    id="original_price"
                    type="number"
                    step="0.01"
                    value={formData.original_price}
                    onChange={(e) => setFormData({...formData, original_price: e.target.value})}
                    placeholder="0.00"
                    className="mt-1"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Para produtos em promoção
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Inventory */}
            <Card>
              <CardHeader>
                <CardTitle>Estoque</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="stock_quantity">Quantidade</Label>
                  <Input
                    id="stock_quantity"
                    type="number"
                    value={formData.stock_quantity}
                    onChange={(e) => setFormData({...formData, stock_quantity: e.target.value})}
                    placeholder="0"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="min_stock_level">Nível Mínimo</Label>
                  <Input
                    id="min_stock_level"
                    type="number"
                    value={formData.min_stock_level}
                    onChange={(e) => setFormData({...formData, min_stock_level: e.target.value})}
                    placeholder="5"
                    className="mt-1"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Alertar quando o estoque estiver baixo
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Dimensions */}
            <Card>
              <CardHeader>
                <CardTitle>Dimensões e Peso</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label htmlFor="length">Comprimento (cm)</Label>
                    <Input
                      id="length"
                      type="number"
                      step="0.1"
                      value={formData.length}
                      onChange={(e) => setFormData({...formData, length: e.target.value})}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="width">Largura (cm)</Label>
                    <Input
                      id="width"
                      type="number"
                      step="0.1"
                      value={formData.width}
                      onChange={(e) => setFormData({...formData, width: e.target.value})}
                      className="mt-1"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label htmlFor="height">Altura (cm)</Label>
                    <Input
                      id="height"
                      type="number"
                      step="0.1"
                      value={formData.height}
                      onChange={(e) => setFormData({...formData, height: e.target.value})}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="weight">Peso (kg)</Label>
                    <Input
                      id="weight"
                      type="number"
                      step="0.1"
                      value={formData.weight}
                      onChange={(e) => setFormData({...formData, weight: e.target.value})}
                      className="mt-1"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Status */}
            <Card>
              <CardHeader>
                <CardTitle>Status e Configurações</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
                  <div className="space-y-1">
                    <Label htmlFor="is_active" className="text-sm font-medium cursor-pointer">
                      Produto Ativo
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Define se o produto está disponível para venda
                    </p>
                  </div>
                  <Switch
                    id="is_active"
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData({...formData, is_active: checked})}
                    className="data-[state=checked]:bg-green-500 data-[state=unchecked]:bg-gray-300"
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
                  <div className="space-y-1">
                    <Label htmlFor="is_featured" className="text-sm font-medium cursor-pointer">
                      Produto em Destaque
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Exibir produto na seção de destaques
                    </p>
                  </div>
                  <Switch
                    id="is_featured"
                    checked={formData.is_featured}
                    onCheckedChange={(checked) => setFormData({...formData, is_featured: checked})}
                    className="data-[state=checked]:bg-blue-500 data-[state=unchecked]:bg-gray-300"
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
                  <div className="space-y-1">
                    <Label htmlFor="is_bestseller" className="text-sm font-medium cursor-pointer">
                      Mais Vendido
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Marcar produto como bestseller
                    </p>
                  </div>
                  <Switch
                    id="is_bestseller"
                    checked={formData.is_bestseller}
                    onCheckedChange={(checked) => setFormData({...formData, is_bestseller: checked})}
                    className="data-[state=checked]:bg-orange-500 data-[state=unchecked]:bg-gray-300"
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
                  <div className="space-y-1">
                    <Label htmlFor="is_on_sale" className="text-sm font-medium cursor-pointer">
                      Em Promoção
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Produto com desconto promocional
                    </p>
                  </div>
                  <Switch
                    id="is_on_sale"
                    checked={formData.is_on_sale}
                    onCheckedChange={(checked) => setFormData({...formData, is_on_sale: checked})}
                    className="data-[state=checked]:bg-red-500 data-[state=unchecked]:bg-gray-300"
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default EditProduct;
