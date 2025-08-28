import axios from "axios";

const api = axios.create({
  baseURL: process.env.REACT_APP_BACKEND_URL || "http://13.61.187.51:8069", // apna backend URL
  headers: {
    "Content-Type": "application/json",
  },
});

export default api;
