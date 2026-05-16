import { supplierApi } from './api';

export const supplierService = {
    // Get all active suppliers
    getAllSuppliers: async (config = {}) => {
        const response = await supplierApi.get('/suppliers', config);
        return response.data;
    },

    // Get active suppliers
    getActiveSuppliers: async () => {
        const response = await supplierApi.get('/suppliers/active');
        return response.data;
    },

    // Get a specific supplier
    getSupplierById: async (id) => {
        const response = await supplierApi.get(`/suppliers/${id}`);
        return response.data;
    },

    // Create a new supplier
    createSupplier: async (supplierData) => {
        const response = await supplierApi.post('/suppliers', supplierData);
        return response.data;
    },

    // Search suppliers by name
    searchSuppliers: async (name) => {
        const response = await supplierApi.get('/suppliers/search', { params: { name } });
        return response.data;
    },

    // Get suppliers by city
    getByCity: async (city) => {
        const response = await supplierApi.get(`/suppliers/city/${encodeURIComponent(city)}`);
        return response.data;
    },

    // Get suppliers by country
    getByCountry: async (country) => {
        const response = await supplierApi.get(`/suppliers/country/${encodeURIComponent(country)}`);
        return response.data;
    },

    // Update a supplier
    updateSupplier: async (id, supplierData) => {
        const response = await supplierApi.put(`/suppliers/${id}`, supplierData);
        return response.data;
    },

    // Delete (soft) a supplier
    deleteSupplier: async (id) => {
        const response = await supplierApi.delete(`/suppliers/${id}`);
        return response.data;
    },

    // Deactivate a supplier
    deactivateSupplier: async (id) => {
        const response = await supplierApi.put(`/suppliers/${id}/deactivate`);
        return response.data;
    },

    // Update supplier rating
    updateRating: async (id, rating) => {
        const response = await supplierApi.put(`/suppliers/${id}/rating`, null, { params: { rating } });
        return response.data;
    }
};
