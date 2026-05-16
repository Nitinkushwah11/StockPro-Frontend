import { purchaseApi } from './api';

export const purchaseService = {
    // Get all POs
    getAllPOs: async (config = {}) => {
        const response = await purchaseApi.get('/purchase-orders', config);
        return response.data;
    },

    // Get PO by ID
    getPOById: async (id) => {
        const response = await purchaseApi.get(`/purchase-orders/${id}`);
        return response.data;
    },

    // Create a new PO
    createPO: async (poData) => {
        const response = await purchaseApi.post('/purchase-orders', poData);
        return response.data;
    },

    // Get POs by status
    getPOsByStatus: async (status, config = {}) => {
        const response = await purchaseApi.get(`/purchase-orders/status/${status}`, config);
        return response.data;
    },

    // Get POs by supplier
    getPOsBySupplier: async (supplierId) => {
        const response = await purchaseApi.get(`/purchase-orders/supplier/${supplierId}`);
        return response.data;
    },

    // Get POs by warehouse
    getPOsByWarehouse: async (warehouseId) => {
        const response = await purchaseApi.get(`/purchase-orders/warehouse/${warehouseId}`);
        return response.data;
    },

    // Get POs by date range (YYYY-MM-DD)
    getPOsByDateRange: async (startDate, endDate) => {
        const response = await purchaseApi.get('/purchase-orders/date-range', {
            params: { startDate, endDate }
        });
        return response.data;
    },

    // Get overdue POs for a date (YYYY-MM-DD)
    getOverduePOs: async (date) => {
        const response = await purchaseApi.get('/purchase-orders/overdue', { params: { date } });
        return response.data;
    },

    // Approve a PO
    approvePO: async (id) => {
        const response = await purchaseApi.put(`/purchase-orders/${id}/approve`);
        return response.data;
    },

    // Cancel a PO
    cancelPO: async (id) => {
        const response = await purchaseApi.put(`/purchase-orders/${id}/cancel`);
        return response.data;
    },

    // Update an existing PO
    updatePO: async (id, poData) => {
        const response = await purchaseApi.put(`/purchase-orders/${id}`, poData);
        return response.data;
    },

    // Full Receipt
    receiveGoods: async (id) => {
        const response = await purchaseApi.post(`/purchase-orders/${id}/receive`);
        return response.data;
    },

    // Partial Receipt
    // items should be array of { lineItemId, receivedQty }
    receiveGoodsPartially: async (id, items) => {
        const response = await purchaseApi.post(`/purchase-orders/${id}/receive/partial`, items);
        return response.data;
    }
};
