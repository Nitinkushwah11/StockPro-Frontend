import { paymentApi } from './api';

export const paymentService = {
    // Get all payments
    getAllPayments: async (config = {}) => {
        const response = await paymentApi.get('/payments', config);
        return response.data;
    },

    // Get a specific payment by ID
    getPaymentById: async (id) => {
        const response = await paymentApi.get(`/payments/${id}`);
        return response.data;
    },

    // Get payment by payment number
    getByPaymentNumber: async (paymentNumber) => {
        const response = await paymentApi.get(`/payments/number/${paymentNumber}`);
        return response.data;
    },

    // Get payments by purchase order
    getByPurchaseOrder: async (purchaseOrderId) => {
        const response = await paymentApi.get(`/payments/purchase-order/${purchaseOrderId}`);
        return response.data;
    },

    // Get payments by supplier
    getBySupplier: async (supplierId) => {
        const response = await paymentApi.get(`/payments/supplier/${supplierId}`);
        return response.data;
    },

    // Get payments by status
    getByStatus: async (status) => {
        const response = await paymentApi.get(`/payments/status/${status}`);
        return response.data;
    },

    // Get payments by date range
    getByDateRange: async (start, end) => {
        const response = await paymentApi.get('/payments/date-range', { params: { start, end } });
        return response.data;
    },

    // Create a new payment
    createPayment: async (paymentData) => {
        const response = await paymentApi.post('/payments', paymentData);
        return response.data;
    },

    // Update an existing payment
    updatePayment: async (id, paymentData) => {
        const response = await paymentApi.put(`/payments/${id}`, paymentData);
        return response.data;
    },

    // Update payment status
    updatePaymentStatus: async (id, status) => {
        const response = await paymentApi.patch(`/payments/${id}/status`, { status });
        return response.data;
    },

    // Delete a payment
    deletePayment: async (id) => {
        const response = await paymentApi.delete(`/payments/${id}`);
        return response.data;
    },

    // Get total paid for a purchase order
    getTotalForPurchaseOrder: async (purchaseOrderId) => {
        const response = await paymentApi.get(`/payments/total/purchase-order/${purchaseOrderId}`);
        return response.data;
    },

    // Get total paid to a supplier
    getTotalForSupplier: async (supplierId) => {
        const response = await paymentApi.get(`/payments/total/supplier/${supplierId}`);
        return response.data;
    },

    // Razorpay: Create Order
    createRazorpayOrder: async (orderData) => {
        const response = await paymentApi.post('/payments/razorpay/create-order', orderData);
        return response.data;
    },

    // Razorpay: Verify Payment
    verifyRazorpayPayment: async (verifyData) => {
        const response = await paymentApi.post('/payments/razorpay/verify', verifyData);
        return response.data;
    }
};
