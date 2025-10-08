export interface ApiResponse<T> {
  results?: T[];
  count?: number;
  next?: string | null;
  previous?: string | null;
  detail?: string;
}

export interface CustomerProfile {
  id: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  city?: string;
  province?: string;
  status: 'active' | 'inactive' | 'blocked';
  notes?: string;
  totalOrders?: number;
  totalSpent?: number;
  registrationDate?: string;
  lastOrderDate?: string;
  avatar?: string;
  // Firebase related fields
  firebaseUid?: string;
  isFirebaseUser: boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  isProtectedAdmin?: boolean;  // Indica se o usuário está protegido no .env
  lastPermissionChange?: string;
  permissionChangeBy?: string;
}

export interface PermissionChangeLog {
  id: string;
  userId: string;
  changedBy: string;
  changeType: 'grant_admin' | 'revoke_admin' | 'grant_super_admin' | 'revoke_super_admin';
  timestamp: string;
  notes?: string;
}

export interface AdminPermissionRequest {
  notes?: string;
}