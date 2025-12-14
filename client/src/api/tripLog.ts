import api from './index';
import { TripLog, TripLogsDto, TripLogCreateDto } from '../types/api';

// ========== 日志管理 API ==========

// 创建日志 (支持多张图片和文本)
// 返回String表示创建结果信息
export const createLog = async (tripId: string, data: TripLogCreateDto, imgFiles?: File[]): Promise<string> => {
    const formData = new FormData();
    // Add JSON data as a Blob with application/json content type
    formData.append('tripNoteLogCreateDto', new Blob([JSON.stringify(data)], { type: 'application/json' }));
    // Add image files if any
    if (imgFiles && imgFiles.length > 0) {
        imgFiles.forEach(file => {
            formData.append('imgFiles', file);
        });
    }
    // Don't manually set Content-Type - let axios/browser handle multipart boundary
    return await api.post<unknown, string>('/trip-logs/create', formData, {
        params: { tripId },
        headers: { 'Content-Type': 'multipart/form-data' }
    });
};

// 获取当前用户某个旅程所有日志
export const getTripLogs = async (tripId: string): Promise<TripLog[]> => {
    return await api.get<unknown, TripLog[]>('/trip-logs/trip', {
        params: { tripId }
    });
};

// 获取旅程公开日志 (返回包含username的DTO)
export const getPublicTripLogs = async (tripId: string): Promise<TripLogsDto[]> => {
    return await api.get<unknown, TripLogsDto[]>('/trip-logs/trip/public', {
        params: { tripId }
    });
};

// 修改日志可见性
export const updateLogVisibility = async (logId: string, isPublic: boolean): Promise<void> => {
    await api.put<unknown, void>('/trip-logs/visibility', null, {
        params: { logId, isPublic }
    });
};

// 删除日志
export const deleteLog = async (logId: string): Promise<void> => {
    await api.delete<unknown, void>('/trip-logs/delete', {
        params: { logId }
    });
};
