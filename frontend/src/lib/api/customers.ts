import { ApiResponse, CustomerProfile, PermissionChangeLog, AdminPermissionRequest } from './types';
import { apiClient } from '../api';

export const customersApi = {
  // Existing endpoints (use apiClient which injects Firebase token when available)
  listAdmin: async (): Promise<ApiResponse<CustomerProfile> | CustomerProfile[]> =>
    apiClient.get<ApiResponse<CustomerProfile>>('/admin/customers/'),

  createAdmin: async (data: Partial<CustomerProfile>): Promise<CustomerProfile> =>
    apiClient.post<CustomerProfile>('/admin/customers/', data),

  updateAdmin: async (id: string, data: Partial<CustomerProfile>): Promise<CustomerProfile> =>
    apiClient.patch<CustomerProfile>(`/admin/customers/${id}/`, data),

  // Permission management endpoints - backend may expose different routes; keep these helpers
  grantAdmin: async (id: string, notes?: string): Promise<CustomerProfile> =>
    apiClient.post<CustomerProfile>(`/admin/customers/${id}/grant-admin/`, { notes }),

  revokeAdmin: async (id: string, notes?: string): Promise<CustomerProfile> =>
    apiClient.post<CustomerProfile>(`/admin/customers/${id}/revoke-admin/`, { notes }),

  getPermissionHistory: async (id: string): Promise<PermissionChangeLog[]> =>
    apiClient.get<PermissionChangeLog[]>(`/admin/customers/${id}/permission-history/`),

  syncFirebaseUser: async (id: string): Promise<CustomerProfile> =>
    apiClient.post<CustomerProfile>(`/admin/customers/${id}/sync-firebase/`, {}),
};