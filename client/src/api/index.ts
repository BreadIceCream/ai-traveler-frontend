import axios, { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { Result } from '@/types/api';
import { toast } from '@/utils/toast';

// Create axios instance with base configuration
const api = axios.create({
    baseURL: 'http://localhost:8080/api',
    timeout: 30000,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request interceptor - add auth token
api.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers['Authorization'] = `${token}`;
        }
        return config;
    },
    (error: AxiosError) => {
        return Promise.reject(error);
    }
);

// Response interceptor - validate status and Result.code, return data directly
api.interceptors.response.use(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (response: AxiosResponse<Result>): any => {
        const res = response.data;

        // If streaming response (download), return data directly (Blob)
        if (response.config.responseType === 'blob' || response.config.responseType === 'stream') {
            return response.data;
        }

        // Validate code - only 200 is success
        if (res.code === 200) {
            return res.data; // Return data field directly
        } else {
            // Show error message to user
            const errorMsg = res.message || '操作失败';
            console.error('业务错误:', errorMsg);

            // 401 Token expired handling
            if (res.code === 401) {
                localStorage.removeItem('token');
                toast.warning('登录已过期，请重新登录');
                setTimeout(() => {
                    window.location.href = '/#/login'; // HashRouter requires /#/ prefix
                }, 1500);
            } else {
                // Show error toast for other business errors
                toast.error(errorMsg);
            }
            return Promise.reject(new Error(errorMsg));
        }
    },
    (error: AxiosError<Result>) => {
        console.error('Request Error:', error);

        // Extract error message
        const errorMsg = error.response?.data?.message || error.message || '网络请求失败';
        const httpStatus = error.response?.status;

        // Handle different HTTP status codes
        if (httpStatus === 401) {
            localStorage.removeItem('token');
            toast.warning('登录已过期，请重新登录');
            setTimeout(() => {
                window.location.href = '/#/login'; // HashRouter requires /#/ prefix
            }, 1500);
        } else if (httpStatus === 403) {
            toast.error('无权限访问');
        } else if (httpStatus === 404) {
            toast.error('请求的资源不存在');
        } else if (httpStatus === 500) {
            toast.error(`服务器错误：${errorMsg}`);
        } else if (httpStatus) {
            toast.error(`请求失败：${errorMsg}`);
            console.error(error);
        } else {
            // Network error (no response)
            toast.error(`网络错误：${errorMsg}`);
        }

        return Promise.reject(new Error(errorMsg));
    }
);

export default api;
