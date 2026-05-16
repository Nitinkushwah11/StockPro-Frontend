import { movementApi } from './api';

export const movementService = {
    // Record a new stock movement
    recordMovement: async (movementData) => {
        const response = await movementApi.post('/movements', movementData);
        return response.data;
    },

    // Get all movements (backend returns a plain list, not paginated)
    getAllMovements: async (config = {}) => {
        const response = await movementApi.get('/movements', config);
        return response.data;
    },

    // Get movements for a specific product
    getProductMovements: async (productId) => {
        const response = await movementApi.get(`/movements/product/${productId}`);
        return response.data;
    },

    // Get movements for a specific warehouse
    getWarehouseMovements: async (warehouseId) => {
        const response = await movementApi.get(`/movements/warehouse/${warehouseId}`);
        return response.data;
    },

    // Get movements by type
    getMovementsByType: async (type) => {
        const response = await movementApi.get(`/movements/type/${type}`);
        return response.data;
    },

    // Get movements by date range (ISO date-time)
    getMovementsByDateRange: async (start, end) => {
        const response = await movementApi.get('/movements/dateRange', { params: { start, end } });
        return response.data;
    },

    // Get movements by reference ID
    getMovementsByReference: async (referenceId) => {
        const response = await movementApi.get(`/movements/reference/${referenceId}`);
        return response.data;
    },

    // Get movement history for a product in a warehouse
    getMovementHistory: async (productId, warehouseId) => {
        const response = await movementApi.get(`/movements/history/${productId}/${warehouseId}`);
        return response.data;
    },

    // Get total stock-in quantity for a product
    getStockIn: async (productId) => {
        const response = await movementApi.get(`/movements/stockIn/${productId}`);
        return response.data;
    },

    // Get total stock-out quantity for a product
    getStockOut: async (productId) => {
        const response = await movementApi.get(`/movements/stockOut/${productId}`);
        return response.data;
    }
};
