export interface User {
  id: number;
  email: string;
  locale?: string;
  role: string;
  created_at: string;
}

export interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithToken: (token: string) => Promise<void>;
  logout: () => void;
  refreshToken: () => Promise<void>;
  isAdmin: () => boolean;
  hasRole: (role: string) => boolean;
}
