import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '@/components/layout/AdminLayout';
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Package,
  MoreHorizontal,
  AlertTriangle,
  Loader2,
  FolderOpen,
  Calendar
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import Loading from '@/components/ui/Loading';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useCategories, useProducts, useSubcategoriesByCategory, useSubcategories } from '@/hooks/useApi';
import { categoryApi, subcategoryApi, type Category, type Subcategory } from '@/lib/api';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

const CategoriesManagement = () => {
  const navigate = useNavigate();
  
  // State
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [isCreateSubDialogOpen, setIsCreateSubDialogOpen] = useState(false);
  const [isEditSubDialogOpen, setIsEditSubDialogOpen] = useState(false);
  const [editingSub, setEditingSub] = useState<any | null>(null);
  const [subForm, setSubForm] = useState({ name: '', description: '' });

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: ''
  });

  // API hooks
  const { categories, loading: categoriesLoading, refresh: refreshCategories } = useCategories();
  const { products, loading: productsLoading } = useProducts();
  const { subcategories, loading: subsLoading, refresh: refreshSubs } = useSubcategoriesByCategory(selectedCategoryId || undefined);
  const { subcategories: allSubcategories, loading: allSubsLoading, refresh: refreshAllSubs } = useSubcategories();

  // Get categories with product count calculated locally
  const categoriesWithCount: Category[] = categories.map(category => ({
    ...category,
    product_count: products.filter(product => product.category_name === category.name).length
  }));

  // Filter categories based on search
  const filteredCategories = categoriesWithCount.filter(category =>
    category.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (category.description && category.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

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

  // Reset form
  const resetForm = () => {
    setFormData({
      name: '',
      description: ''
    });
    setEditingCategory(null);
  };

  const resetSubForm = () => {
    setSubForm({ name: '', description: '' });
    setEditingSub(null);
  };

  // Handle create category
  const handleCreateCategory = async () => {
    if (!formData.name.trim()) {
      setErrorMessage('Nome da categoria é obrigatório');
      return;
    }

    setLoading(true);
    try {
      await categoryApi.create({
        name: formData.name.trim(),
        description: formData.description.trim()
      });
      
      setSuccessMessage('Categoria criada com sucesso!');
      setIsCreateDialogOpen(false);
      resetForm();
      refreshCategories();
    } catch (error: any) {
      setErrorMessage(error.message || 'Erro ao criar categoria');
    } finally {
      setLoading(false);
    }
  };

  // Handle update category
  const handleUpdateCategory = async () => {
    if (!editingCategory || !formData.name.trim()) {
      setErrorMessage('Nome da categoria é obrigatório');
      return;
    }

    setLoading(true);
    try {
      await categoryApi.update(editingCategory.id, {
        name: formData.name.trim(),
        description: formData.description.trim()
      });
      
      setSuccessMessage('Categoria atualizada com sucesso!');
      setIsEditDialogOpen(false);
      resetForm();
      refreshCategories();
    } catch (error: any) {
      setErrorMessage(error.message || 'Erro ao atualizar categoria');
    } finally {
      setLoading(false);
    }
  };

  // Handle delete category
  const handleDeleteCategory = async (category: Category) => {
    const productCount = category.product_count || 0;
    
    if (productCount > 0) {
      setErrorMessage(`Não é possível deletar a categoria "${category.name}" pois ela possui ${productCount} produto(s) vinculado(s).`);
      return;
    }

    if (!confirm(`Tem certeza que deseja deletar a categoria "${category.name}"?`)) {
      return;
    }

    setLoading(true);
    try {
      await categoryApi.delete(category.id);
      setSuccessMessage('Categoria deletada com sucesso!');
      refreshCategories();
    } catch (error: any) {
      setErrorMessage(error.message || 'Erro ao deletar categoria');
    } finally {
      setLoading(false);
    }
  };

  // Open edit dialog
  const openEditDialog = (category: Category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      description: category.description || ''
    });
    setIsEditDialogOpen(true);
    setSelectedCategoryId(category.id);
  };

  const openSubCreate = (categoryId: number) => {
    setSelectedCategoryId(categoryId);
    resetSubForm();
    setIsCreateSubDialogOpen(true);
  };

  const openSubEdit = (sub: any) => {
    setEditingSub(sub);
    setSubForm({ name: sub.name, description: sub.description || '' });
    setIsEditSubDialogOpen(true);
  };

  const handleCreateSub = async () => {
    if (!selectedCategoryId) { setErrorMessage('Selecione uma categoria'); return; }
    if (!subForm.name.trim()) { setErrorMessage('Nome da subcategoria é obrigatório'); return; }
    setLoading(true);
    try {
      await subcategoryApi.create({ name: subForm.name.trim(), description: subForm.description.trim(), category: selectedCategoryId });
  setSuccessMessage('Subcategoria criada com sucesso!');
  setIsCreateSubDialogOpen(false);
      resetSubForm();
  refreshSubs();
  refreshAllSubs();
    } catch (error: any) {
      setErrorMessage(error.message || 'Erro ao criar subcategoria');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateSub = async () => {
    if (!editingSub) return;
    if (!subForm.name.trim()) { setErrorMessage('Nome da subcategoria é obrigatório'); return; }
    setLoading(true);
    try {
      await subcategoryApi.update(editingSub.id, { name: subForm.name.trim(), description: subForm.description.trim() });
  setSuccessMessage('Subcategoria atualizada com sucesso!');
  setIsEditSubDialogOpen(false);
      resetSubForm();
  refreshSubs();
  refreshAllSubs();
    } catch (error: any) {
      setErrorMessage(error.message || 'Erro ao atualizar subcategoria');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSub = async (sub: any) => {
    if (!confirm(`Tem certeza que deseja deletar a subcategoria "${sub.name}"?`)) return;
    setLoading(true);
    try {
  await subcategoryApi.delete(sub.id);
  setSuccessMessage('Subcategoria deletada com sucesso!');
  refreshSubs();
  refreshAllSubs();
    } catch (error: any) {
      setErrorMessage(error.message || 'Erro ao deletar subcategoria');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Success Message */}
        {successMessage && (
          <Alert className="border-green-200 bg-green-50">
            <AlertDescription className="text-green-800">
              {successMessage}
            </AlertDescription>
          </Alert>
        )}

        {/* Error Message */}
        {errorMessage && (
          <Alert className="border-red-200 bg-red-50">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-red-800">
              {errorMessage}
            </AlertDescription>
          </Alert>
        )}

        {/* Header */}
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold">Gerenciamento de Categorias</h1>
            <p className="text-muted-foreground">
              Gerencie as categorias dos produtos da loja
            </p>
          </div>
          
          <div className="flex w-full sm:w-auto flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => navigate('/admin/products')} className="w-full sm:w-auto">
              <Package className="h-4 w-4 mr-2" />
              Voltar aos Produtos
            </Button>
            
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => resetForm()} className="w-full sm:w-auto">
                  <Plus className="h-4 w-4 mr-2" />
                  Nova Categoria
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Criar Nova Categoria</DialogTitle>
                  <DialogDescription>
                    Adicione uma nova categoria para organizar seus produtos.
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="name">Nome da Categoria *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Ex: Eletrônicos"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="description">Descrição</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Descrição opcional da categoria"
                      rows={3}
                    />
                  </div>
                  
                  <div className="flex justify-end gap-2">
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setIsCreateDialogOpen(false);
                        resetForm();
                      }}
                    >
                      Cancelar
                    </Button>
                    <Button 
                      onClick={handleCreateCategory}
                      disabled={loading}
                    >
                      {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      Criar Categoria
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center">
                <FolderOpen className="h-4 w-4 text-blue-600" />
                <div className="ml-2">
                  <p className="text-sm font-medium text-muted-foreground">
                    Total de Categorias
                  </p>
                  <p className="text-2xl font-bold">
                    {categoriesLoading ? '...' : categories.length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center">
                <Package className="h-4 w-4 text-green-600" />
                <div className="ml-2">
                  <p className="text-sm font-medium text-muted-foreground">
                    Categorias com Produtos
                  </p>
                  <p className="text-2xl font-bold">
                    {categoriesLoading ? '...' : categoriesWithCount.filter(c => (c.product_count || 0) > 0).length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center">
                <AlertTriangle className="h-4 w-4 text-orange-600" />
                <div className="ml-2">
                  <p className="text-sm font-medium text-muted-foreground">
                    Categorias Vazias
                  </p>
                  <p className="text-2xl font-bold">
                    {categoriesLoading ? '...' : categoriesWithCount.filter(c => (c.product_count || 0) === 0).length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <Card>
          <CardHeader>
            <CardTitle>Pesquisar Categorias</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Buscar por nome ou descrição..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex gap-2 w-full sm:w-auto">
                <Button variant="outline" className="w-full sm:w-auto" onClick={() => refreshCategories()}>Atualizar</Button>
                <Button className="w-full sm:w-auto" onClick={() => setIsCreateDialogOpen(true)}>Nova Categoria</Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Categories Tree (Accordion) */}
        <Card>
          <CardHeader>
            <CardTitle>Lista de Categorias</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Desktop: keep existing accordion */}
            <div className="hidden md:block">
              {categoriesLoading ? (
                <Loading label="Carregando categorias..." />
              ) : filteredCategories.length === 0 ? (
                <div className="text-center py-8">
                  <FolderOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    {searchTerm ? 'Nenhuma categoria encontrada para sua busca.' : 'Nenhuma categoria cadastrada ainda.'}
                  </p>
                </div>
              ) : (
                <Accordion type="multiple" className="w-full">
                  {filteredCategories.map((category) => {
                    const subs: Subcategory[] = (allSubcategories || []).filter(s => s.category === category.id);
                    return (
                      <AccordionItem key={category.id} value={`cat-${category.id}`}>
                        <div className="flex items-start justify-between gap-3 py-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2 min-w-0">
                                <AccordionTrigger className="py-0 px-0 hover:no-underline text-left">
                                  <div className="flex items-center gap-2">
                                    <h3 className="font-medium truncate">{category.name}</h3>
                                    <Badge variant={(category.product_count || 0) > 0 ? 'default' : 'secondary'}>
                                      {category.product_count || 0} produto(s)
                                    </Badge>
                                    <Badge variant="outline">{subs.length} sub</Badge>
                                  </div>
                                </AccordionTrigger>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <Button variant="outline" size="sm" onClick={() => openSubCreate(category.id)}>
                                  <Plus className="h-4 w-4" />
                                </Button>
                                <Button variant="outline" size="sm" onClick={() => openEditDialog(category)}>
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="outline" size="sm">
                                      <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent>
                                    <DropdownMenuItem onClick={() => openEditDialog(category)}>
                                      <Edit className="h-4 w-4 mr-2" />
                                      Editar Categoria
                                    </DropdownMenuItem>
                                    <DropdownMenuItem 
                                      onClick={() => handleDeleteCategory(category)}
                                      disabled={(category.product_count || 0) > 0}
                                      className="text-red-600"
                                    >
                                      <Trash2 className="h-4 w-4 mr-2" />
                                      Deletar Categoria
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </div>
                            {category.description && (
                              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{category.description}</p>
                            )}
                            <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                              <div className="flex items-center gap-1"><Calendar className="h-3 w-3"/>Criada em {formatDate(category.created_at)}</div>
                            </div>
                          </div>
                        </div>
                        <AccordionContent>
                          {allSubsLoading ? (
                            <Loading label="Carregando subcategorias..." size="sm" center={false} />
                          ) : subs.length === 0 ? (
                            <div className="flex items-center justify-between p-3 border rounded-md bg-muted/30">
                              <div className="text-sm text-muted-foreground">Sem subcategorias</div>
                              <Button size="sm" variant="outline" onClick={() => openSubCreate(category.id)}>
                                <Plus className="h-4 w-4 mr-1"/> Adicionar
                              </Button>
                            </div>
                          ) : (
                            <div className="space-y-2 border-l pl-4">
                              {subs.map((sub) => (
                                <div key={sub.id} className="flex items-center justify-between p-3 border rounded-md bg-background hover:bg-accent/40 transition-colors">
                                  <div className="min-w-0">
                                    <div className="font-medium truncate">{sub.name}</div>
                                    {sub.description && <div className="text-xs text-muted-foreground line-clamp-2">{sub.description}</div>}
                                  </div>
                                  <div className="flex gap-2">
                                    <Button variant="outline" size="sm" onClick={() => openSubEdit(sub)}>
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                    <Button variant="outline" size="sm" onClick={() => handleDeleteSub(sub)}>
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </AccordionContent>
                      </AccordionItem>
                    );
                  })}
                </Accordion>
              )}
            </div>

            {/* Mobile: show cards for each category */}
            <div className="md:hidden space-y-3 p-2">
              {categoriesLoading ? (
                <Loading label="Carregando categorias..." />
              ) : filteredCategories.length === 0 ? (
                <div className="text-center py-8">
                  <FolderOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-muted-foreground">{searchTerm ? 'Nenhuma categoria encontrada para sua busca.' : 'Nenhuma categoria cadastrada ainda.'}</p>
                </div>
              ) : (
                filteredCategories.map((category) => {
                  const subs: Subcategory[] = (allSubcategories || []).filter(s => s.category === category.id);
                  return (
                    <Card key={category.id}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h3 className="font-medium truncate">{category.name}</h3>
                              <Badge variant={(category.product_count || 0) > 0 ? 'default' : 'secondary'} className="ml-2">{category.product_count || 0} produto(s)</Badge>
                            </div>
                            {category.description && <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{category.description}</p>}
                            <div className="text-xs text-muted-foreground mt-2">{subs.length} sub · Criada em {formatDate(category.created_at)}</div>
                          </div>
                          <div className="ml-3 flex flex-col gap-2">
                            <Button size="sm" variant="outline" onClick={() => openSubCreate(category.id)}> <Plus className="h-4 w-4" /> </Button>
                            <Button size="sm" variant="outline" onClick={() => openEditDialog(category)}> <Edit className="h-4 w-4" /> </Button>
                            <Button size="sm" variant="ghost" className="text-red-600" onClick={() => handleDeleteCategory(category)} disabled={(category.product_count || 0) > 0}> <Trash2 className="h-4 w-4" /> </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar Categoria</DialogTitle>
              <DialogDescription>
                Modifique as informações da categoria.
              </DialogDescription>
            </DialogHeader>
            
              <div className="space-y-4">
              <div>
                <Label htmlFor="edit-name">Nome da Categoria *</Label>
                <Input
                  id="edit-name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Ex: Eletrônicos"
                />
              </div>
              
              <div>
                <Label htmlFor="edit-description">Descrição</Label>
                <Textarea
                  id="edit-description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Descrição opcional da categoria"
                  rows={3}
                />
              </div>
              
              <div className="flex justify-end gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setIsEditDialogOpen(false);
                    resetForm();
                  }}
                >
                  Cancelar
                </Button>
                <Button 
                  onClick={handleUpdateCategory}
                  disabled={loading}
                >
                  {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Salvar Alterações
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Subcategories Management Section */}
        {/* <Card>
          <CardHeader>
            <CardTitle>Subcategorias</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <Label>Selecione uma categoria</Label>
                <select
                  className="border rounded-md p-2 w-full"
                  value={selectedCategoryId ?? ''}
                  onChange={(e) => setSelectedCategoryId(e.target.value ? parseInt(e.target.value) : null)}
                >
                  <option value="">-- Escolha --</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>

                <div className="flex justify-between items-center mt-2">
                  <p className="text-sm text-muted-foreground">Gerencie subcategorias da categoria selecionada</p>
                  <Button size="sm" onClick={() => selectedCategoryId && openSubCreate(selectedCategoryId)} disabled={!selectedCategoryId}>
                    <Plus className="h-4 w-4 mr-1" /> Nova Subcategoria
                  </Button>
                </div>

                {subsLoading ? (
                  <Loading label="Carregando subcategorias..." size="sm" center={false} />
                ) : !selectedCategoryId ? (
                  <div className="text-sm text-muted-foreground py-4">Selecione uma categoria para ver as subcategorias.</div>
                ) : (subcategories?.length ?? 0) === 0 ? (
                  <div className="text-sm text-muted-foreground py-4">Nenhuma subcategoria cadastrada.</div>
                ) : (
                  <div className="space-y-2 mt-2">
                    {subcategories!.map((sub) => (
                      <div key={sub.id} className="flex items-center justify-between p-3 border rounded-md">
                        <div>
                          <div className="font-medium">{sub.name}</div>
                          {sub.description && <div className="text-xs text-muted-foreground">{sub.description}</div>}
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => openSubEdit(sub)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => handleDeleteSub(sub)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
 */}
        {/* Create Subcategory Dialog */}
        <Dialog open={isCreateSubDialogOpen} onOpenChange={setIsCreateSubDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Criar Subcategoria</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Nome *</Label>
                <Input value={subForm.name} onChange={(e) => setSubForm(prev => ({ ...prev, name: e.target.value }))} />
              </div>
              <div>
                <Label>Descrição</Label>
                <Textarea value={subForm.description} onChange={(e) => setSubForm(prev => ({ ...prev, description: e.target.value }))} rows={3} />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => { setIsCreateSubDialogOpen(false); resetSubForm(); }}>Cancelar</Button>
                <Button onClick={handleCreateSub} disabled={loading}>{loading && <Loader2 className="h-4 w-4 mr-2 animate-spin"/>} Criar</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Edit Subcategory Dialog */}
        <Dialog open={isEditSubDialogOpen} onOpenChange={setIsEditSubDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar Subcategoria</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Nome *</Label>
                <Input value={subForm.name} onChange={(e) => setSubForm(prev => ({ ...prev, name: e.target.value }))} />
              </div>
              <div>
                <Label>Descrição</Label>
                <Textarea value={subForm.description} onChange={(e) => setSubForm(prev => ({ ...prev, description: e.target.value }))} rows={3} />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => { setIsEditSubDialogOpen(false); resetSubForm(); }}>Cancelar</Button>
                <Button onClick={handleUpdateSub} disabled={loading}>{loading && <Loader2 className="h-4 w-4 mr-2 animate-spin"/>} Salvar</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
};

export default CategoriesManagement;
