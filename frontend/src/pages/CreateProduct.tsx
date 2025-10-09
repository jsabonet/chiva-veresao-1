import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '@/components/layout/AdminLayout';
import { 
  Save, 
  ArrowLeft, 
  Upload,
  X,
  Eye,
  Plus,
  Loader2,
  AlertTriangle
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
import { useCreateProduct, useCategories, useColors, useSubcategoriesByCategory } from '@/hooks/useApi';
import { type ProductCreateUpdate, type Color, productImageApi } from '@/lib/api';

const CreateProduct = () => {
  const navigate = useNavigate();
  const { createProduct, loading: createLoading } = useCreateProduct();
  const { categories, loading: categoriesLoading } = useCategories();
  const { colors, loading: colorsLoading } = useColors();

  // Success/Error state
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Colors state
  const [selectedColors, setSelectedColors] = useState<number[]>([]);

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

  // Image upload state - main image + unlimited thumbnails
  const [mainImage, setMainImage] = useState<{ file: File; preview: string } | null>(null);
  const [thumbnails, setThumbnails] = useState<{ file: File; preview: string; alt_text: string }[]>([]);
  const [dragActive, setDragActive] = useState(false);

  // Specifications state
  const [specifications, setSpecifications] = useState<{key: string, value: string}[]>([
    { key: '', value: '' }
  ]);

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
      setMainImage({ file, preview });
    };
    reader.readAsDataURL(file);
  };

  const handleThumbnailsUpload = (files: File[]) => {
    files.forEach(file => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const preview = e.target?.result as string;
          setThumbnails(prev => [...prev, {
            file,
            preview,
            alt_text: ''
          }]);
        };
        reader.readAsDataURL(file);
      }
    });
  };

  // When category changes, clear subcategory
  useEffect(() => {
    setFormData(prev => ({ ...prev, subcategory: '' }));
  }, [formData.category]);

  const removeMainImage = () => {
    setMainImage(null);
  };

  const removeThumbnail = (index: number) => {
    setThumbnails(prev => prev.filter((_, i) => i !== index));
  };

  const updateThumbnailAltText = (index: number, alt_text: string) => {
    setThumbnails(prev => prev.map((img, i) => 
      i === index ? { ...img, alt_text } : img
    ));
  };

  // Drag and drop handlers for thumbnails
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    const files = Array.from(e.dataTransfer.files);
    handleThumbnailsUpload(files);
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

  // Color management functions
  const toggleColor = (colorId: number) => {
    setSelectedColors(prev => 
      prev.includes(colorId) 
        ? prev.filter(id => id !== colorId)
        : [...prev, colorId]
    );
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
        brand: formData.brand.trim(),
        price: formData.price,
        original_price: formData.original_price || undefined,
        stock_quantity: parseInt(formData.stock_quantity) || 0,
        min_stock_level: parseInt(formData.min_stock_level) || 5,
        status: formData.is_active ? 'active' : 'inactive',
        is_featured: formData.is_featured,
        is_bestseller: formData.is_bestseller,
        is_on_sale: formData.is_on_sale,
        weight: formData.weight ? formData.weight : undefined,
        length: formData.length ? formData.length : undefined,
        width: formData.width ? formData.width : undefined,
        height: formData.height ? formData.height : undefined,
        meta_title: formData.meta_title || formData.name.trim(),
        meta_description: formData.meta_description || formData.description.trim(),
        meta_keywords: formData.meta_keywords,
        specifications: specsObject,
        colors: selectedColors
      };

      // First create the product
      const createdProduct = await createProduct(productData);
      console.log('Product created:', createdProduct);
      
      // Then upload images if any exist
      if (mainImage || thumbnails.length > 0) {
        // Extract product ID from response - handle different response structures
        const productId = createdProduct?.id || (createdProduct as any)?.data?.id;
        
        console.log('Extracted product ID:', productId, 'from response:', createdProduct);
        
        if (!productId) {
          console.error('No product ID found in response:', createdProduct);
          setErrorMessage('Produto criado, mas houve erro ao obter ID para upload das imagens. Você pode adicioná-las depois na edição.');
          setSuccessMessage('Produto criado com sucesso!');
          setTimeout(() => navigate('/admin/products'), 2000);
          return;
        }
        
        try {
          // Upload images one by one to avoid bulk upload issues
          const uploadPromises = [];
          
          // Upload main image first
          if (mainImage) {
            const mainImageFormData = new FormData();
            mainImageFormData.append('product', productId.toString());
            mainImageFormData.append('image', mainImage.file);
            mainImageFormData.append('alt_text', 'Imagem principal');
            mainImageFormData.append('is_main', 'true');
            mainImageFormData.append('order', '1');
            
            console.log('Uploading main image with product ID:', productId);
            uploadPromises.push(productImageApi.uploadImage(mainImageFormData));
          }
          
          // Upload thumbnails
          thumbnails.forEach((thumbnail, index) => {
            const thumbnailFormData = new FormData();
            thumbnailFormData.append('product', productId.toString());
            thumbnailFormData.append('image', thumbnail.file);
            thumbnailFormData.append('alt_text', thumbnail.alt_text || 'Miniatura');
            thumbnailFormData.append('is_main', 'false');
            thumbnailFormData.append('order', (index + 2).toString());
            
            console.log(`Uploading thumbnail ${index + 1} with product ID:`, productId);
            uploadPromises.push(productImageApi.uploadImage(thumbnailFormData));
          });
          
          await Promise.all(uploadPromises);
          console.log('All images uploaded successfully');
        } catch (imageError) {
          console.error('Error uploading images:', imageError);
          setErrorMessage('Produto criado, mas houve erro no upload das imagens. Você pode adicioná-las depois na edição.');
        }
      }
      
      setSuccessMessage('Produto criado com sucesso!');
      
      setTimeout(() => {
        navigate('/admin/products');
      }, 2000);
    } catch (error) {
      console.error('Error creating product:', error);
      setErrorMessage('Erro ao criar produto. Tente novamente.');
    }
  };

  return (
    <AdminLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => navigate('/admin/products')}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Criar Novo Produto</h1>
              <p className="text-muted-foreground">
                Adicione um novo produto ao catálogo da loja
              </p>
            </div>
          </div>
          <div className="flex w-full sm:w-auto flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => navigate('/admin/products')} className="w-full sm:w-auto">
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={createLoading} className="w-full sm:w-auto">
              {createLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Criando...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Criar Produto
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
                <p className="text-sm text-muted-foreground">
                  Adicione uma imagem principal e quantas miniaturas desejar.
                </p>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Main Image Upload */}
                <div>
                  <Label className="text-base font-medium">Imagem Principal *</Label>
                  <div className="mt-2">
                    {mainImage ? (
                      <div className="relative w-full h-64 border-2 border-gray-200 rounded-lg overflow-hidden">
                        <img 
                          src={mainImage.preview} 
                          alt="Imagem Principal Preview" 
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute top-2 left-2">
                          <Badge variant="default" className="bg-blue-600 text-white">
                            Principal
                          </Badge>
                        </div>
                        <Button
                          variant="destructive"
                          size="icon"
                          className="absolute top-2 right-2"
                          onClick={removeMainImage}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <div 
                        className="w-full h-64 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center cursor-pointer hover:border-gray-400 transition-colors"
                        onClick={() => document.getElementById('main-image-input')?.click()}
                      >
                        <div className="text-center">
                          <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                          <p className="text-sm text-gray-600">Clique para adicionar imagem principal</p>
                          <p className="text-xs text-gray-400">PNG, JPG, WebP até 10MB</p>
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

                {/* Thumbnails Upload */}
                <div>
                  <Label className="text-base font-medium">Miniaturas (Ilimitadas)</Label>
                  <p className="text-sm text-muted-foreground mb-3">
                    Adicione quantas miniaturas desejar para showcasing do produto
                  </p>
                  
                  {/* Thumbnail Upload Area */}
                  <div 
                    className={`w-full border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                      dragActive 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                    onClick={() => document.getElementById('thumbnails-input')?.click()}
                  >
                    <Plus className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-600 mb-1">
                      Clique aqui ou arraste e solte miniaturas
                    </p>
                    <p className="text-xs text-gray-400">
                      PNG, JPG, WebP até 10MB cada - Sem limite de quantidade
                    </p>
                    <input
                      id="thumbnails-input"
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={(e) => {
                        const files = Array.from(e.target.files || []);
                        handleThumbnailsUpload(files);
                      }}
                    />
                  </div>

                  {/* Thumbnails Preview */}
                  {thumbnails.length > 0 && (
                    <div className="mt-4">
                      <Label className="text-sm font-medium">
                        Miniaturas ({thumbnails.length})
                      </Label>
                      <div className="mt-2 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {thumbnails.map((thumbnail, index) => (
                          <div key={index} className="relative group">
                            <div className="relative aspect-square border-2 border-gray-200 rounded-lg overflow-hidden">
                              <img 
                                src={thumbnail.preview} 
                                alt={`Miniatura ${index + 1}`} 
                                className="w-full h-full object-cover"
                              />
                              <Button
                                variant="destructive"
                                size="icon"
                                className="absolute top-1 right-1 h-6 w-6 opacity-80 hover:opacity-100"
                                onClick={() => removeThumbnail(index)}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                            {/* Alt text input */}
                            <Input
                              placeholder="Texto alternativo (opcional)"
                              value={thumbnail.alt_text}
                              onChange={(e) => updateThumbnailAltText(index, e.target.value)}
                              className="mt-2 text-xs"
                            />
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
                  <Label htmlFor="sku">SKU (Opcional)</Label>
                  <Input
                    id="sku"
                    value={formData.sku}
                    onChange={(e) => setFormData({...formData, sku: e.target.value})}
                    placeholder="Será gerado automaticamente se não preenchido"
                    className="mt-1"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Deixe vazio para gerar automaticamente baseado no nome
                  </p>
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

                {/* Colors Section */}
                <div>
                  <Label>Cores Disponíveis</Label>
                  {colorsLoading ? (
                    <div className="mt-2 text-sm text-muted-foreground">
                      Carregando cores...
                    </div>
                  ) : (
                    <div className="mt-2 grid grid-cols-3 gap-2">
                      {colors?.map((color) => (
                        <div
                          key={color.id}
                          className={`cursor-pointer border-2 rounded-lg p-2 transition-all hover:shadow-md ${
                            selectedColors.includes(color.id) 
                              ? 'border-blue-500 bg-blue-50' 
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                          onClick={() => toggleColor(color.id)}
                        >
                          <div className="flex items-center space-x-2">
                            <div 
                              className="w-5 h-5 rounded-full border border-gray-300 flex-shrink-0"
                              style={{ backgroundColor: color.hex_code }}
                            />
                            <span className="text-xs font-medium truncate">
                              {color.name}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    Selecione as cores disponíveis para este produto
                  </p>
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

export default CreateProduct;
