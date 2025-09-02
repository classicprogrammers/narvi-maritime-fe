import api from './axios';

const groupsAPI = {
    // Get all groups
    getGroups: async () => {
        try {
            const response = await api.get('/api/groups');
            return response.data;
        } catch (error) {
            console.error('Error fetching groups:', error);
            throw error;
        }
    },

    // Get group by ID
    getGroupById: async (id) => {
        try {
            const response = await api.get(`/api/groups/${id}`);
            return response.data;
        } catch (error) {
            console.error('Error fetching group by ID:', error);
            throw error;
        }
    },

    // Create new group
    createGroup: async (groupData) => {
        try {
            const response = await api.post('/api/groups', groupData);
            return response.data;
        } catch (error) {
            console.error('Error creating group:', error);
            throw error;
        }
    },

    // Update group
    updateGroup: async (id, groupData) => {
        try {
            const response = await api.put(`/api/groups/${id}`, groupData);
            return response.data;
        } catch (error) {
            console.error('Error updating group:', error);
            throw error;
        }
    },

    // Delete group
    deleteGroup: async (id) => {
        try {
            const response = await api.delete(`/api/groups/${id}`);
            return response.data;
        } catch (error) {
            console.error('Error deleting group:', error);
            throw error;
        }
    }
};

export default groupsAPI;
