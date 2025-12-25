import api from './axios';

const picAPI = {
    // Get all PICs
    getPICs: async () => {
        try {
            const response = await api.get('/api/person/incharge/list');
            return response.data;
        } catch (error) {
            console.error('Error fetching PICs:', error);
            throw error;
        }
    },

    // Create new PIC
    createPIC: async (picData) => {
        try {
            const response = await api.post('/api/person/incharge/create', picData);
            return response.data;
        } catch (error) {
            console.error('Error creating PIC:', error);
            throw error;
        }
    },

    // Update PIC
    updatePIC: async (id, picData) => {
        try {
            const response = await api.post('/api/person/incharge/update', { id, ...picData });
            return response.data;
        } catch (error) {
            console.error('Error updating PIC:', error);
            throw error;
        }
    },

    // Delete PIC
    deletePIC: async (id) => {
        try {
            const response = await api.post('/api/person/incharge/delete', { id });
            return response.data;
        } catch (error) {
            console.error('Error deleting PIC:', error);
            throw error;
        }
    }
};

export default picAPI;

