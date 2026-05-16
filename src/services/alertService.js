import { alertApi } from './api';

export const alertService = {
    // Send a new alert
    sendAlert: async (alertData) => {
        const response = await alertApi.post('/alerts', alertData);
        return response.data;
    },

    // Trigger a low stock alert
    sendLowStockAlert: async (productId, warehouseId) => {
        const response = await alertApi.post('/alerts/low-stock', null, {
            params: { productId, warehouseId }
        });
        return response.data;
    },

    // Send a bulk alert
    sendBulkAlert: async (recipientIds, title, message) => {
        const response = await alertApi.post('/alerts/bulk', null, {
            params: { recipientIds, title, message }
        });
        return response.data;
    },

    // Get all alerts
    getAllAlerts: async () => {
        const response = await alertApi.get('/alerts');
        return response.data;
    },

    // Get alerts by recipient ID
    getByRecipient: async (recipientId, config = {}) => {
        const response = await alertApi.get(`/alerts/recipient/${recipientId}`, config);
        return response.data;
    },

    // Mark an alert as read
    markAsRead: async (alertId) => {
        const response = await alertApi.put(`/alerts/${alertId}/read`);
        return response.data;
    },

    // Mark all alerts as read for a recipient
    markAllRead: async (recipientId) => {
        const response = await alertApi.put(`/alerts/recipient/${recipientId}/readAll`);
        return response.data;
    },

    // Acknowledge an alert
    acknowledge: async (alertId) => {
        const response = await alertApi.put(`/alerts/${alertId}/acknowledge`);
        return response.data;
    },

    // Get unread count for a recipient
    getUnreadCount: async (recipientId) => {
        const response = await alertApi.get(`/alerts/recipient/${recipientId}/unreadCount`);
        return response.data;
    },

    // Get unacknowledged alerts
    getUnacknowledged: async () => {
        const response = await alertApi.get('/alerts/unacknowledged');
        return response.data;
    },

    // Delete an alert
    deleteAlert: async (alertId) => {
        const response = await alertApi.delete(`/alerts/${alertId}`);
        return response.data;
    }
};
