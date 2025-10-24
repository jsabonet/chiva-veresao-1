import { ApiResponse, CustomerProfile, PermissionChangeLog, AdminPermissionRequest } from './types';
import { apiClient } from '../api';

export const customersApi = {
  // Existing endpoints (use apiClient which injects Firebase token when available)
  // Accept optional query params for pagination and filtering
  listAdmin: async (params?: Record<string, string>): Promise<ApiResponse<CustomerProfile> | CustomerProfile[]> =>
    apiClient.get<ApiResponse<CustomerProfile>>('/admin/customers/', params),

  createAdmin: async (data: Partial<CustomerProfile>): Promise<CustomerProfile> =>
    apiClient.post<CustomerProfile>('/admin/customers/', data),

  updateAdmin: async (id: string, data: Partial<CustomerProfile>): Promise<CustomerProfile> =>
    apiClient.patch<CustomerProfile>(`/admin/customers/${id}/`, data),
  deleteAdmin: async (id: string): Promise<void> =>
    apiClient.delete<void>(`/admin/customers/${id}/delete/`),

  // Permission management endpoints - backend may expose different routes; keep these helpers
  grantAdmin: async (id: string, notes?: string): Promise<CustomerProfile> =>
    apiClient.post<CustomerProfile>(`/admin/customers/${id}/grant-admin/`, { notes }),

  revokeAdmin: async (id: string, notes?: string): Promise<CustomerProfile> =>
    apiClient.post<CustomerProfile>(`/admin/customers/${id}/revoke-admin/`, { notes }),

  getPermissionHistory: async (id: string): Promise<PermissionChangeLog[]> =>
    apiClient.get<PermissionChangeLog[]>(`/admin/customers/${id}/permission-history/`),

  syncFirebaseUser: async (id: string): Promise<CustomerProfile> =>
    apiClient.post<CustomerProfile>(`/admin/customers/${id}/sync-firebase/`, {}),

  // Current user profile endpoints (used by AccountProfile & Checkout)
  me: async (): Promise<CustomerProfile> =>
    apiClient.get<CustomerProfile>('/me/profile/'),

  updateMe: async (data: Partial<CustomerProfile> & { postal_code?: string }): Promise<CustomerProfile> =>
    apiClient.patch<CustomerProfile>('/me/profile/', data),
};