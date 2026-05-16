import { productApi } from './api';

export const productService = {
    // Get all products
    getAllProducts: async (config = {}) => {
        const response = await productApi.get('/products', config);
        return response.data;
    },

    // Get a specific product by ID
    getProductById: async (id) => {
        const response = await productApi.get(`/products/${id}`);
        return response.data;
    },

    // Get a specific product by SKU
    getProductBySku: async (sku) => {
        const response = await productApi.get(`/products/sku/${encodeURIComponent(sku)}`);
        return response.data;
    },

    // Get a specific product by barcode
    getProductByBarcode: async (barcode) => {
        const response = await productApi.get(`/products/barcode/${encodeURIComponent(barcode)}`);
        return response.data;
    },

    // Create a new product
    createProduct: async (productData) => {
        const response = await productApi.post('/products', productData);
        return response.data;
    },

    // Update an existing product
    updateProduct: async (id, productData) => {
        const response = await productApi.put(`/products/${id}`, productData);
        return response.data;
    },

    // Delete a product (hard delete)
    deleteProduct: async (id) => {
        const response = await productApi.delete(`/products/${id}`);
        return response.data;
    },

    // Deactivate a product (soft delete)
    deactivateProduct: async (id) => {
        const response = await productApi.put(`/products/${id}/deactivate`);
        return response.data;
    },

    // Search products by name
    searchProducts: async (name) => {
        const response = await productApi.get('/products/search', { params: { name } });
        return response.data;
    },

    // Get products by category
    getByCategory: async (category) => {
        const response = await productApi.get(`/products/category/${encodeURIComponent(category)}`);
        return response.data;
    },

    // Get products by brand
    getByBrand: async (brand) => {
        const response = await productApi.get(`/products/brand/${encodeURIComponent(brand)}`);
        return response.data;
    },

    // Get low stock products
    getLowStockProducts: async (config = {}) => {
        const response = await productApi.get('/products/lowStock', config);
        return response.data;
    }
};
