import api from "./axios";

// Tracking / History Logs API
export const fetchTrackingLogs = async ({ current_user, limit = 100, offset = 0 }) => {
    const payload = {
        current_user,
        limit,
        offset,
    };

    const response = await api.post("/api/tracking/logs", payload);
    return response.data;
};

export default {
    fetchTrackingLogs,
};

