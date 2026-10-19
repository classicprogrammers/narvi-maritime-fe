import api from "./axios";

// Tracking / History Logs API
// Supported body params: search, user_id, date_from, date_to, models, fields,
// sort_order, page, page_size, group_by ("default" | "none" | "model" | "user" | "record")
export const fetchTrackingLogs = async (params = {}) => {
    const payload = {};
    Object.entries(params).forEach(([key, value]) => {
        if (value === undefined || value === null || value === "") return;
        if (Array.isArray(value) && value.length === 0) return;
        payload[key] = value;
    });

    const response = await api.post("/api/tracking/logs", payload);
    return response.data;
};

// Dropdown options: users who have logs (admin only) and models that have logs
export const fetchTrackingLogOptions = async () => {
    const response = await api.post("/api/tracking/logs/options", {});
    return response.data;
};

export default {
    fetchTrackingLogs,
    fetchTrackingLogOptions,
};
