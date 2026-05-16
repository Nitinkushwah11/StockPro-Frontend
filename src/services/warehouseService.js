import { warehouseApi } from './api';

export const warehouseService = {
    // ==================== Warehouse CRUD ====================

    // Get all active warehouses
    getAllWarehouses: async (config = {}) => {
        const response = await warehouseApi.get('/warehouse', config);
        return response.data;
    },

    // Get a warehouse by ID
    getWarehouseById: async (id) => {
        const response = await warehouseApi.get(`/warehouse/${id}`);
        return response.data;
    },

    // Create a new warehouse
    createWarehouse: async (warehouseData) => {
        const response = await warehouseApi.post('/warehouse', warehouseData);
        return response.data;
    },

    // Update a warehouse
    updateWarehouse: async (id, warehouseData) => {
        const response = await warehouseApi.put(`/warehouse/${id}`, warehouseData);
        return response.data;
    },

    // Delete (soft) a warehouse
    deleteWarehouse: async (id) => {
        const response = await warehouseApi.delete(`/warehouse/${id}`);
        return response.data;
    },

    // ==================== Stock Level Management ====================

    // Get stock level for a specific product in a warehouse
    getStockLevel: async (warehouseId, productId) => {
        const response = await warehouseApi.get(`/warehouse/${warehouseId}/stock/${productId}`);
        return response.data;
    },

    // Get all stock levels in a warehouse
    getStockByWarehouse: async (warehouseId, config = {}) => {
        const response = await warehouseApi.get(`/warehouse/${warehouseId}/stock`, config);
        return response.data;
    },

    // Get stock levels for a product across all warehouses
    getStockByProduct: async (productId) => {
        const response = await warehouseApi.get(`/warehouse/stock/product/${productId}`);
        return response.data;
    },

    // Add stock to a warehouse
    addStock: async (stockData) => {
        const response = await warehouseApi.post('/warehouse/stock/add', stockData);
        return response.data;
    },

    // Deduct stock from a warehouse
    deductStock: async (stockData) => {
        const response = await warehouseApi.post('/warehouse/stock/deduct', stockData);
        return response.data;
    },

    // Reserve stock (soft-hold for pending orders)
    reserveStock: async (stockData) => {
        const response = await warehouseApi.post('/warehouse/stock/reserve', stockData);
        return response.data;
    },

    // Release a previous stock reservation
    releaseReservation: async (stockData) => {
        const response = await warehouseApi.post('/warehouse/stock/release', stockData);
        return response.data;
    },

    // Transfer stock between warehouses
    transferStock: async (transferData) => {
        const response = await warehouseApi.post('/warehouse/stock/transfer', transferData);
        return response.data;
    },

    // Get all low stock items
    getLowStockItems: async (threshold = 10, config = {}) => {
        const response = await warehouseApi.get('/warehouse/stock/low-stock', {
            ...config,
            params: { ...config.params, threshold }
        });
        return response.data;
    }
};
