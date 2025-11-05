import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  register: (data: { email: string; username: string; password: string }) =>
    api.post('/auth/register', data),

  login: (data: { email: string; password: string }) =>
    api.post('/auth/login', data),

  getCurrentUser: () => api.get('/auth/me'),
};

// Portfolio API
export const portfolioAPI = {
  getAll: () => api.get('/portfolios'),

  getById: (id: number) => api.get(`/portfolios/${id}`),

  create: (data: { name: string; description?: string }) =>
    api.post('/portfolios', data),

  update: (id: number, data: { name?: string; description?: string }) =>
    api.put(`/portfolios/${id}`, data),

  delete: (id: number) => api.delete(`/portfolios/${id}`),
};

// Transaction API
export const transactionAPI = {
  getByPortfolio: (portfolioId: number) =>
    api.get(`/transactions/portfolio/${portfolioId}`),

  create: (data: {
    portfolio_id: number;
    symbol: string;
    transaction_type: 'BUY' | 'SELL' | 'DIVIDEND';
    quantity: number;
    price: number;
    fees?: number;
    transaction_date: string;
    notes?: string;
  }) => api.post('/transactions', data),

  delete: (id: number) => api.delete(`/transactions/${id}`),
};

// Stock API
export const stockAPI = {
  getPrice: (symbol: string) => api.get(`/stocks/${symbol}`),

  getBatchPrices: (symbols: string[]) =>
    api.post('/stocks/batch', symbols),
};
