import { useState, useEffect } from 'react';
import { productApi, categoryApi, colorApi, subcategoryApi, type Product, type ProductListItem, type Category, type Color, type ApiResponse, type ProductStats, type ProductCreateUpdate, type Subcategory } from '@/lib/api';

// Utility to normalize API list responses into arrays
const normalizeList = <T,>(res: any): T[] => {
  if (!res) return [];
  if (Array.isArray(res)) return res as T[];
  if (res.results && Array.isArray(res.results)) return res.results as T[];
  if (res.products && Array.isArray(res.products)) return res.products as T[];
  return [];
};

// Hook for products
export const useProducts = (params?: {
  page?: number;
  search?: string;
  category?: string;
  status?: string;
  min_price?: string;
  max_price?: string;
  ordering?: string;
}) => {
  const [products, setProducts] = useState<ProductListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [nextPage, setNextPage] = useState<string | null>(null);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Filter out undefined values
        const cleanParams = params ? Object.fromEntries(
          Object.entries(params).filter(([_, value]) => value !== undefined && value !== '')
        ) : undefined;
        
  const response = await productApi.getProducts(cleanParams);
  const items = normalizeList<ProductListItem>(response);
  setProducts(items);
  setTotalCount((response as any)?.count ?? items.length ?? 0);
  setNextPage((response as any)?.next || null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch products');
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [JSON.stringify(params)]);

  const refresh = () => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Filter out undefined values
        const cleanParams = params ? Object.fromEntries(
          Object.entries(params).filter(([_, value]) => value !== undefined && value !== '')
        ) : undefined;
        
  const response = await productApi.getProducts(cleanParams);
  const items = normalizeList<ProductListItem>(response);
  setProducts(items);
  setTotalCount((response as any)?.count ?? items.length ?? 0);
  setNextPage((response as any)?.next || null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch products');
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  };

  return { products, loading, error, totalCount, nextPage, refresh };
};

// Hook for single product
export const useProduct = (id?: number) => {
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    const fetchProduct = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await productApi.getProduct(id);
        setProduct(response);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch product');
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [id]);

  return { product, loading, error };
};

// Hook for product by slug
export const useProductBySlug = (slug?: string) => {
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;

    const fetchProduct = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await productApi.getProductBySlug(slug);
        setProduct(response);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch product');
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [slug]);

  return { product, loading, error };
};

// Hook for featured products
export const useFeaturedProducts = () => {
  const [products, setProducts] = useState<ProductListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        setError(null);
  const response = await productApi.getFeaturedProducts();
  setProducts(normalizeList<ProductListItem>(response));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch featured products');
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  return { products, loading, error };
};

// Hook for bestseller products
export const useBestsellerProducts = () => {
  const [products, setProducts] = useState<ProductListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        setError(null);
  const response = await productApi.getBestsellerProducts();
  setProducts(normalizeList<ProductListItem>(response));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch bestseller products');
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  return { products, loading, error };
};

// Hook for categories
export const useCategories = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      setError(null);
  const response = await categoryApi.getAll();
  setCategories(normalizeList<Category>(response));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch categories');
      setCategories([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const refresh = () => {
    fetchCategories();
  };

  return { categories, loading, error, refresh };
};

// Hook for product statistics
export const useProductStats = () => {
  const [stats, setStats] = useState<ProductStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await productApi.getProductStats();
        setStats(response);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch product stats');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const refresh = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await productApi.getProductStats();
      setStats(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh stats');
    } finally {
      setLoading(false);
    }
  };

  return { stats, loading, error, refresh };
};

// Hook for products by category
export const useProductsByCategory = (categoryId?: number) => {
  const [data, setData] = useState<{ category: Category; products: Product[] } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!categoryId) return;

    const fetchProducts = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await productApi.getProductsByCategory(categoryId);
        setData(response);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch products by category');
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [categoryId]);

  return { data, loading, error };
};

// Hook for subcategories (all)
export const useSubcategories = () => {
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSubcategories = async () => {
    try {
      setLoading(true);
      setError(null);
  const response = await subcategoryApi.getAll();
  setSubcategories(normalizeList<Subcategory>(response));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch subcategories');
      setSubcategories([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubcategories();
  }, []);

  const refresh = () => fetchSubcategories();

  return { subcategories, loading, error, refresh };
};

// Hook for subcategories by category
export const useSubcategoriesByCategory = (categoryId?: number) => {
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSubs = async () => {
    if (!categoryId) { setSubcategories([]); return; }
    try {
      setLoading(true);
      setError(null);
      const response = await subcategoryApi.getByCategory(categoryId);
      setSubcategories(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch subcategories');
      setSubcategories([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchSubs(); }, [categoryId]);

  const refresh = () => { fetchSubs(); };

  return { subcategories, loading, error, refresh };
};

// Hook for search
export const useProductSearch = (searchParams: {
  q?: string;
  category?: string;
  min_price?: string;
  max_price?: string;
}) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const hasParams = Object.values(searchParams).some(value => value && value.trim() !== '');
    if (!hasParams) {
      setProducts([]);
      return;
    }

    const searchProducts = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await productApi.searchProducts(searchParams);
        setProducts(response);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to search products');
      } finally {
        setLoading(false);
      }
    };

    // Debounce search
    const timeoutId = setTimeout(searchProducts, 300);
    return () => clearTimeout(timeoutId);
  }, [JSON.stringify(searchParams)]);

  return { products, loading, error };
};

// Hook for creating a product
export const useCreateProduct = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createProduct = async (productData: ProductCreateUpdate) => {
    try {
      setLoading(true);
      setError(null);
      console.log('API: Creating product with data:', productData);
      const response = await productApi.createProduct(productData);
      console.log('API: Product created successfully:', response);
      return response;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create product';
      console.error('API: Error creating product:', err);
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return { createProduct, loading, error };
};

// Hook for updating a product
export const useUpdateProduct = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateProduct = async (id: number, productData: ProductCreateUpdate) => {
    try {
      setLoading(true);
      setError(null);
      const response = await productApi.updateProduct(id, productData);
      return response;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update product';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return { updateProduct, loading, error };
};

// Hook for deleting a product
export const useDeleteProduct = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const deleteProduct = async (id: number) => {
    try {
      setLoading(true);
      setError(null);
      await productApi.deleteProduct(id);
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete product';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return { deleteProduct, loading, error };
};

// Hook for colors
export const useColors = () => {
  const [colors, setColors] = useState<Color[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchColors = async () => {
      try {
        setLoading(true);
        setError(null);
    const response = await colorApi.getColors();
    setColors(normalizeList<Color>(response));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch colors');
      } finally {
        setLoading(false);
      }
    };

    fetchColors();
  }, []);

  const refresh = () => {
    setLoading(true);
    const fetchColors = async () => {
      try {
        setError(null);
  const response = await colorApi.getColors();
  setColors(normalizeList<Color>(response));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch colors');
      } finally {
        setLoading(false);
      }
    };
    fetchColors();
  };

  return { colors, loading, error, refresh };
};
