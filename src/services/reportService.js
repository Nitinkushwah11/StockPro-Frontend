import { reportApi } from './api';

const downloadBlobResponse = (response, fallbackFilename) => {
    const disposition = response.headers?.['content-disposition'] || '';
    const filenameMatch = disposition.match(/filename="?([^"]+)"?/i);
    const filename = filenameMatch?.[1] || fallbackFilename;
    const url = URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
};

export const reportService = {
    // Get inventory valuation report
    getValuation: async () => {
        const response = await reportApi.get('/reports/inventory/valuation');
        return response.data;
    },

    // Get stock turnover report
    getTurnover: async () => {
        const response = await reportApi.get('/reports/inventory/turnover');
        return response.data;
    },

    // Get movement velocity report
    getVelocity: async () => {
        const response = await reportApi.get('/reports/inventory/velocity');
        return response.data;
    },

    // Get warehouse utilization report
    getUtilization: async () => {
        const response = await reportApi.get('/reports/warehouse/utilization');
        return response.data;
    },

    // Take an inventory snapshot
    takeSnapshot: async ({ warehouseId, productId, quantity, unitCost }) => {
        const response = await reportApi.post('/reports/snapshot', null, {
            params: { warehouseId, productId, quantity, unitCost }
        });
        return response.data;
    },

    // Get total stock value, optionally for a YYYY-MM-DD date
    getTotalValue: async (date) => {
        const response = await reportApi.get('/reports/total-value', {
            params: date ? { date } : {}
        });
        return response.data;
    },

    // Get low stock report for a warehouse
    getLowStockReport: async (warehouseId, threshold = 10) => {
        const response = await reportApi.get('/reports/low-stock', {
            params: { warehouseId, threshold }
        });
        return response.data;
    },

    // Generate full inventory report for a warehouse
    generateInventoryReport: async (warehouseId) => {
        const response = await reportApi.get(`/reports/generate/${warehouseId}`);
        return response.data;
    },

    downloadMovementReportPdf: async (movementType = 'ALL') => {
        const response = await reportApi.get('/reports/movements/export/pdf', {
            params: movementType && movementType !== 'ALL' ? { movementType } : {},
            responseType: 'blob'
        });
        downloadBlobResponse(response, 'movement-report.pdf');
    },

    downloadMovementReportExcel: async (movementType = 'ALL') => {
        const response = await reportApi.get('/reports/movements/export/excel', {
            params: movementType && movementType !== 'ALL' ? { movementType } : {},
            responseType: 'blob'
        });
        downloadBlobResponse(response, 'movement-report.xlsx');
    }
};
