import api from './index';
import { TripWithMemberInfo, Trip, TripStatus, EntireTrip } from '../types/api';

// 获取用户所有旅程 (包括创建和加入的)
export const getUserTrips = async (): Promise<TripWithMemberInfo[]> => {
    return await api.get<unknown, TripWithMemberInfo[]>('/trips/user');
};

// 创建旅程
export const createTrip = async (data: {
    title: string;
    destinationCity: string;
    startDate: string;
    endDate: string;
    totalBudget?: number;
    description?: string;
}): Promise<Trip> => {
    return await api.post<unknown, Trip>('/trips/create', data);
};

// 更新旅程信息
export const updateTripInfo = async (data: {
    tripId: string;
    title?: string;
    description?: string;
    destinationCity?: string;
    startDate?: string;
    endDate?: string;
    totalBudget?: number;
}): Promise<Trip> => {
    const { tripId, ...tripDto } = data;
    return await api.put<unknown, Trip>('/trips/update', tripDto, {
        params: { tripId }
    });
};

// 更新旅程可见性
export const updateTripVisibility = async (tripId: string, isPrivate: boolean): Promise<Trip> => {
    return await api.put<unknown, Trip>('/trips/visibility', null, {
        params: { tripId, isPrivate }
    });
};

// 更新旅程状态
export const updateTripStatus = async (tripId: string, newStatus: TripStatus): Promise<Trip> => {
    return await api.put<unknown, Trip>('/trips/status', null, {
        params: { tripId, newStatus }
    });
};

// 删除旅程
export const deleteTrip = async (tripId: string): Promise<void> => {
    await api.delete<unknown, void>('/trips/delete', {
        params: { tripId }
    });
};

// AI智能生成完整旅程 (5分钟超时)
export const aiGenerateTrip = async (tripId: string): Promise<EntireTrip> => {
    return await api.post<unknown, EntireTrip>('/trips/ai-generate', null, {
        params: { tripId },
        timeout: 5 * 60 * 1000 // 5 minutes
    });
};
