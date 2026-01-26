import axios from 'axios';

const api = axios.create({
    baseURL: window.location.origin.includes('localhost')
        ? 'http://localhost:5000/api'
        : '/api',
});

// Add token to requests
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export default api;
