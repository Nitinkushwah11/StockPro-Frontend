import { authApi } from './api';
import { normalizeRole } from '../utils/permissions';

const AUTH_SERVICE_URL = 'http://localhost:8081';

const decodeJwtPayload = (token) => {
    if (!token || token.split('.').length < 2) return null;
    try {
        const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
        const paddedPayload = payload.padEnd(payload.length + ((4 - payload.length % 4) % 4), '=');
        return JSON.parse(window.atob(paddedPayload));
    } catch (err) {
        console.error('Error decoding JWT payload', err);
        return null;
    }
};

const isTokenExpired = (token) => {
    const payload = decodeJwtPayload(token);
    if (!payload?.exp) return false;
    return payload.exp * 1000 <= Date.now();
};

const buildUserSession = (data, token) => {
    const tokenPayload = decodeJwtPayload(token) || {};
    return {
        userId: data.userId,
        fullName: data.fullName || tokenPayload.sub || data.email,
        email: data.email || tokenPayload.sub,
        role: normalizeRole(data.role || tokenPayload.role)
    };
};

export const authService = {
    login: async (email, password) => {
        const response = await authApi.post('/auth/login', { email, password });
        if (response.data.token) {
            localStorage.setItem('token', response.data.token);
            localStorage.setItem('user', JSON.stringify(buildUserSession(response.data, response.data.token)));
        }
        return response.data;
    },

    register: async (userData) => {
        const response = await authApi.post('/auth/register', userData);
        return response.data;
    },

    requestPasswordReset: async (email) => {
        const response = await authApi.post('/auth/forgot-password', { email });
        return response.data;
    },

    resetPassword: async (token, newPassword) => {
        const response = await authApi.post('/auth/reset-password', { token, newPassword });
        return response.data;
    },

    startGoogleLogin: () => {
        window.location.href = `${AUTH_SERVICE_URL}/oauth2/authorization/google`;
    },

    completeOAuthLogin: async (token) => {
        localStorage.setItem('token', token);
        const response = await authApi.get('/auth/me');
        localStorage.setItem('user', JSON.stringify(buildUserSession(response.data, token)));
        return response.data;
    },

    logout: () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
    },

    getCurrentUser: () => {
        try {
            const token = localStorage.getItem('token');
            if (!token || isTokenExpired(token)) {
                authService.logout();
                return null;
            }
            const user = localStorage.getItem('user');
            if (user) {
                const parsedUser = JSON.parse(user);
                return { ...parsedUser, role: normalizeRole(parsedUser.role) };
            }
            const tokenPayload = decodeJwtPayload(token);
            if (!tokenPayload?.role) return null;
            return {
                email: tokenPayload.sub,
                fullName: tokenPayload.sub,
                role: normalizeRole(tokenPayload.role)
            };
        } catch (err) {
            console.error("Error parsing user from localStorage", err);
            localStorage.removeItem('user'); // Clear corrupted data
            return null;
        }
    },

    isAuthenticated: () => {
        const token = localStorage.getItem('token');
        if (!token || isTokenExpired(token)) {
            authService.logout();
            return false;
        }
        return true;
    },

    // --- Admin / Settings methods ---

    getAllUsers: async () => {
        const response = await authApi.get('/auth/users');
        return response.data;
    },

    getUserIdsByRole: async (role) => {
        const response = await authApi.get(`/auth/ids-by-role/${encodeURIComponent(role)}`);
        return response.data;
    },

    updateProfile: async (userId, profileData) => {
        const response = await authApi.put(`/auth/profile/${userId}`, profileData);
        return response.data;
    },

    changePassword: async (userId, newPassword) => {
        const response = await authApi.put(`/auth/password/${userId}`, { password: newPassword });
        return response.data;
    },

    deactivateUser: async (userId) => {
        const response = await authApi.put(`/auth/deactivate/${userId}`);
        return response.data;
    },

    deleteUser: async (userId) => {
        const response = await authApi.delete(`/auth/users/${userId}`);
        return response.data;
    },

    updateRole: async (userId, newRole) => {
        const response = await authApi.put(`/auth/role/${userId}`, { role: newRole });
        return response.data;
    }
};
