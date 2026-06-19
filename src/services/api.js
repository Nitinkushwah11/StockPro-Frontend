import axios from 'axios';

// All requests go through the API Gateway (single entry point)
// The gateway routes by path: /products/** → product-service, /warehouse/** → warehouse-service, etc.
const API_GATEWAY = 'http://13.49.19.60:8080';


const apiClient = axios.create({
    baseURL: API_GATEWAY,
    headers: {
        'Content-Type': 'application/json'
    }
});

// Request interceptor for adding JWT token
apiClient.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers['Authorization'] = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
        const status = error.response?.status;
        const currentPath = window.location.pathname;
        const isAuthPage = ['/login', '/register', '/forgot-password', '/reset-password'].includes(currentPath);

        if (status === 401 && !isAuthPage) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.assign('/login');
        }

        if (status === 403 && !error.config?.suppressForbiddenRedirect && currentPath !== '/access-denied') {
            window.location.assign('/access-denied');
        }

        return Promise.reject(error);
    }
);

// All services use the same gateway instance — routing is handled by path prefix
export const authApi = apiClient;
export const purchaseApi = apiClient;
export const warehouseApi = apiClient;
export const productApi = apiClient;
export const movementApi = apiClient;
export const supplierApi = apiClient;
export const reportApi = apiClient;
export const alertApi = apiClient;
export const paymentApi = apiClient;
