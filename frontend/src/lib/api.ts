// API Configuration - respect Vite env var VITE_API_BASE_URL, otherwise default to same origin /api
const API_BASE_URL = typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_BASE_URL
  ? import.meta.env.VITE_API_BASE_URL
  : (typeof window !== 'undefined' ? `${window.location.protocol}//${window.location.hostname}${window.location.port ? ':'+window.location.port : ''}/api` : 'http://127.0.0.1:8000/api');

// Types for our API responses
export interface Category {
  id: number;
  name: string;
  description: string;
  image?: string;
  created_at: string;
  updated_at: string;
  product_count?: number; // Made optional since it's calculated on frontend
}

export interface Subcategory {
  id: number;
  name: string;
  description?: string;
  category: number; // parent category id
  category_name?: string;
  created_at: string;
  updated_at: string;
  product_count?: number;
}

export interface Color {
  id: number;
  name: string;
  hex_code: string;
  rgb_code?: string;
  is_active: boolean;
}

// Interface for products in list views (featured, bestsellers, etc.)
export interface ProductListItem {
  id: number;
  name: string;
  slug: string;
  short_description: string;
  price: string;
  original_price?: string;
  is_on_sale: boolean;
  stock_quantity: number;
  status: 'active' | 'inactive' | 'out_of_stock';
  is_featured: boolean;
  is_bestseller: boolean;
  category_name: string;
  subcategory_name?: string;
  brand: string;
  sku: string;
  main_image_url?: string;
  colors: Color[];
  is_in_stock: boolean;
  is_low_stock: boolean;
  discount_percentage: number;
  view_count: number;
  sales_count: number;
  created_at: string;
  updated_at: string;
}

// Interface for product images
export interface ProductImage {
  id: number;
  image: string;
  image_url: string;
  alt_text: string;
  is_main: boolean;
  order: number;
  created_at: string;
}

export interface Review {
  id: number;
  product: number;
  user?: number;
  user_name?: string;
  user_first_name?: string;
  user_last_name?: string;
  user_email?: string;
  rating: number;
  comment?: string;
  status: 'pending' | 'approved' | 'rejected';
  moderation_notes?: string;
  created_at: string;
  updated_at?: string;
  moderated_at?: string;
  moderated_by?: {
    id: number;
    username: string;
  };
  product_name?: string;  // Added for admin list view
}

interface ReviewModerationRequest {
  action: 'approve' | 'reject';
  notes?: string;
}

interface ReviewResponse {
  results: Review[];
  count: number;
  next: string | null;
  previous: string | null;
}
export interface Product {
  id: number;
  name: string;
  slug: string;
  sku: string;
  category: any; // keep flexible due to backend returning id; existing code expects possibly object
  subcategory?: number | null;
  subcategory_name?: string;
  brand: string;
  price: string;
  original_price?: string;
  description: string;
  short_description: string;
  main_image?: string;
  main_image_url?: string;
  image_2?: string;
  image_3?: string;
  image_4?: string;
  all_images?: string[];
  images: ProductImage[];
  colors: Color[];
  specifications: Record<string, any>;
  dimensions?: string;
  weight?: string;
  length?: string;
  width?: string;
  height?: string;
  stock_quantity: number;
  min_stock_level: number;
  status: 'active' | 'inactive' | 'out_of_stock';
  is_featured: boolean;
  is_bestseller: boolean;
  is_on_sale: boolean;
  featured_until?: string;
  sale_start_date?: string;
  sale_end_date?: string;
  view_count: number;
  sales_count: number;
  meta_title?: string;
  meta_description?: string;
  meta_keywords?: string;
  created_at: string;
  updated_at: string;
  // Reviews summary (optional - provided by backend when available)
  average_rating?: number;
  total_reviews?: number;
  reviews?: Review[];
  rating_distribution?: Record<number, number>; // key: stars (1-5), value: count
}

export interface ProductCreateUpdate {
  name?: string;
  sku?: string;
  category?: number;
  subcategory?: number | null;
  brand?: string;
  price?: string;
  original_price?: string;
  description?: string;
  short_description?: string;
  main_image?: string;
  image_2?: string;
  image_3?: string;
  image_4?: string;
  colors?: number[];
  specifications?: Record<string, any>;
  weight?: string;
  length?: string;
  width?: string;
  height?: string;
  stock_quantity?: number;
  min_stock_level?: number;
  status?: 'active' | 'inactive' | 'out_of_stock';
  is_featured?: boolean;
  is_bestseller?: boolean;
  is_on_sale?: boolean;
  featured_until?: string;
  sale_start_date?: string;
  sale_end_date?: string;
  meta_title?: string;
  meta_description?: string;
  meta_keywords?: string;
}

export interface ApiResponse<T> {
  count: number;
  next?: string;
  previous?: string;
  results: T[];
}

export interface ProductStats {
  total_products: number;
  active_products: number;
  inactive_products: number;
  out_of_stock_products: number;
  low_stock_products: number;
  featured_products: number;
  bestsellers: number;
  products_on_sale: number;
  average_price: number;
  total_stock_value: number;
  categories_count: number;
}

// Generic API client
class ApiClient {
  private baseURL: string;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    
    // Get Firebase token if user is authenticated
    let authHeaders = {};
    try {
      // Import Firebase auth here to avoid circular imports
      const { auth } = await import('./firebase');
      const user = auth.currentUser;
      if (user) {
        const token = await user.getIdToken();
        authHeaders = {
          'Authorization': `Bearer ${token}`,
        };
      }
    } catch (error) {
      console.warn('Could not get Firebase token:', error);
    }
    
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        // Try to get error details from response
        let errorMessage = `HTTP error! status: ${response.status}`;
        try {
          const errorData = await response.json();
          console.error('API Error Details:', errorData);
          errorMessage += ` - ${JSON.stringify(errorData)}`;
        } catch (jsonError) {
          console.error('Failed to parse error response as JSON');
        }
        throw new Error(errorMessage);
      }
      
      // Check if response has content before trying to parse JSON
      const contentType = response.headers.get('content-type');
      if (response.status === 204 || !contentType?.includes('application/json')) {
        return null as T;
      }
      
      return await response.json();
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  async get<T>(endpoint: string, params?: Record<string, string>): Promise<T> {
    const queryString = params 
      ? '?' + new URLSearchParams(params).toString()
      : '';
    
    return this.request<T>(`${endpoint}${queryString}`, {
      method: 'GET',
    });
  }

  async post<T>(endpoint: string, data: any): Promise<T> {
    console.log('API POST to:', endpoint, 'with data:', data);
    return this.request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async put<T>(endpoint: string, data: any): Promise<T> {
    console.log('API PUT to:', endpoint, 'with data:', data);
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async patch<T>(endpoint: string, data: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'DELETE',
    });
  }

  // Special methods for file uploads
  async postFormData<T>(endpoint: string, formData: FormData): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    
    const config: RequestInit = {
      method: 'POST',
      body: formData,
      // Don't set Content-Type header, let browser set it with boundary
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        let errorMessage = `HTTP error! status: ${response.status}`;
        try {
          const errorData = await response.json();
          console.error('API Error Details:', errorData);
          errorMessage += ` - ${JSON.stringify(errorData)}`;
        } catch (jsonError) {
          console.error('Failed to parse error response as JSON');
        }
        throw new Error(errorMessage);
      }
      
      const contentType = response.headers.get('content-type');
      if (response.status === 204 || !contentType?.includes('application/json')) {
        return null as T;
      }
      
      return await response.json();
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  async putFormData<T>(endpoint: string, formData: FormData): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    
    const config: RequestInit = {
      method: 'PUT',
      body: formData,
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        let errorMessage = `HTTP error! status: ${response.status}`;
        try {
          const errorData = await response.json();
          console.error('API Error Details:', errorData);
          errorMessage += ` - ${JSON.stringify(errorData)}`;
        } catch (jsonError) {
          console.error('Failed to parse error response as JSON');
        }
        throw new Error(errorMessage);
      }
      
      const contentType = response.headers.get('content-type');
      if (response.status === 204 || !contentType?.includes('application/json')) {
        return null as T;
      }
      
      return await response.json();
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }
}

// Create API client instance
const apiClient = new ApiClient(API_BASE_URL);

// Product API functions
export const productApi = {
  // Get all products with optional filters
  getProducts: (params?: {
    page?: number;
    search?: string;
    category?: string;
    min_price?: string;
    max_price?: string;
    ordering?: string;
    in_stock?: string;
  }) => {
    const queryParams = params ? Object.fromEntries(
      Object.entries(params).map(([key, value]) => [key, String(value)])
    ) : undefined;
    
    return apiClient.get<ApiResponse<ProductListItem>>('/products/', queryParams);
  },

  // Get single product by ID
  getProduct: (id: number) => 
    apiClient.get<Product>(`/products/id/${id}/`),

  // Get single product by slug
  getProductBySlug: (slug: string) => 
    apiClient.get<Product>(`/products/${slug}/`),

  // Create new product
  createProduct: (data: ProductCreateUpdate) => 
    apiClient.post<Product>('/products/', data),

  // Update product
  updateProduct: (id: number, data: ProductCreateUpdate) => 
    apiClient.put<Product>(`/products/id/${id}/`, data),

  // Partial update product
  patchProduct: (id: number, data: ProductCreateUpdate) => 
    apiClient.patch<Product>(`/products/id/${id}/`, data),

  // Delete product
  deleteProduct: (id: number) => 
    apiClient.delete(`/products/id/${id}/`),

  // Duplicate product
  duplicateProduct: (id: number) =>
    apiClient.post<Product>(`/products/id/${id}/duplicate/`, {}),

  // Get featured products
  getFeaturedProducts: () => 
    apiClient.get<ProductListItem[]>('/products/featured/'),

  // Get bestseller products
  getBestsellerProducts: () => 
    apiClient.get<ProductListItem[]>('/products/bestsellers/'),

  // Get products on sale
  getSaleProducts: () => 
    apiClient.get<ProductListItem[]>('/products/sale/'),

  // Get products by category
  getProductsByCategory: (categoryId: number, params?: { ordering?: string }) => 
    apiClient.get<{ category: Category; products: Product[] }>(
      `/products/category/${categoryId}/`, 
      params
    ),

  // Search products
  searchProducts: (params: {
    q?: string;
    category?: string;
    min_price?: string;
    max_price?: string;
  }) => 
    apiClient.get<Product[]>('/products/search/', params),

  // Get product statistics
  getProductStats: () => 
    apiClient.get<ProductStats>('/products/stats/'),
};

// Category API functions
export const categoryApi = {
  // Get all categories
  getAll: () => 
    apiClient.get<ApiResponse<Category>>('/categories/'),

  // Get single category
  get: (id: number) => 
    apiClient.get<Category>(`/categories/${id}/`),

  // Create new category
  create: (data: Partial<Category>) => 
    apiClient.post<Category>('/categories/', data),

  // Update category
  update: (id: number, data: Partial<Category>) => 
    apiClient.put<Category>(`/categories/${id}/`, data),

  // Delete category
  delete: (id: number) => 
    apiClient.delete(`/categories/${id}/`),
};

// Subcategory API functions
export const subcategoryApi = {
  // Get all subcategories
  getAll: () => apiClient.get<ApiResponse<Subcategory>>('/subcategories/'),

  // Get subcategories by category
  getByCategory: (categoryId: number) => apiClient.get<Subcategory[]>(`/categories/${categoryId}/subcategories/`),

  // Get single subcategory
  get: (id: number) => apiClient.get<Subcategory>(`/subcategories/${id}/`),

  // Create new subcategory
  create: (data: Partial<Subcategory>) => apiClient.post<Subcategory>('/subcategories/', data),

  // Update subcategory
  update: (id: number, data: Partial<Subcategory>) => apiClient.put<Subcategory>(`/subcategories/${id}/`, data),

  // Delete subcategory
  delete: (id: number) => apiClient.delete(`/subcategories/${id}/`),
};

// Color API
export const colorApi = {
  // Get all colors
  getColors: () => 
    apiClient.get<ApiResponse<Color>>('/colors/'),

  // Get single color
  getColor: (id: number) => 
    apiClient.get<Color>(`/colors/${id}/`),

  // Create new color
  createColor: (data: Partial<Color>) => 
    apiClient.post<Color>('/colors/', data),

  // Update color
  updateColor: (id: number, data: Partial<Color>) => 
    apiClient.put<Color>(`/colors/${id}/`, data),

  // Delete color
  deleteColor: (id: number) => 
    apiClient.delete(`/colors/${id}/`),
};

// ProductImage API
export const productImageApi = {
  // Get all images for a product
  getProductImages: (productId: number) => 
    apiClient.get<ApiResponse<ProductImage>>(`/images/?product_id=${productId}`),

  // Get single image
  getImage: (id: number) => 
    apiClient.get<ProductImage>(`/images/${id}/`),

  // Upload single image
  uploadImage: (data: FormData) => 
    apiClient.postFormData<ProductImage>('/images/', data),

  // Bulk upload images
  bulkUpload: (data: FormData) => 
    apiClient.postFormData<{uploaded_images: ProductImage[], total_uploaded: number, errors: any[]}>('/images/bulk_upload/', data),

  // Update image
  updateImage: (id: number, data: FormData) => 
    apiClient.putFormData<ProductImage>(`/images/${id}/`, data),

  // Delete image
  deleteImage: (id: number) => 
    apiClient.delete(`/images/${id}/`),
};

// Export the API client for direct use if needed
export { apiClient };

// Utility functions
export const formatPrice = (price: string | number): string => {
  const numPrice = typeof price === 'string' ? parseFloat(price) : price;
  const formatted = new Intl.NumberFormat('pt-MZ', {
    style: 'currency',
    currency: 'MZN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(numPrice);
  
  // Force MZN display instead of MTn (old currency code)
  return formatted.replace('MTn', 'MZN').replace('MT', 'MZN');
};

export const getImageUrl = (imagePath?: string): string => {
  if (!imagePath) return '/placeholder.svg';
  if (imagePath.startsWith('http')) return imagePath;
  return `http://127.0.0.1:8000${imagePath}`;
};
