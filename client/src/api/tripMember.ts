import api from './index';
import { TripMember, TripPendingRequest } from '../types/api';

// 获取旅程成员列表
export const getTripMembers = async (tripId: string, isPass?: boolean): Promise<TripMember[]> => {
    return await api.get<unknown, TripMember[]>('/tripMembers/list', {
        params: { tripId, isPass }
    });
};

// 处理成员请求 (接受或拒绝)
export const handleMemberRequest = async (tripId: string, handleUserId: string, accept: boolean): Promise<void> => {
    await api.put<unknown, void>('/tripMembers/handleRequest', null, {
        params: { tripId, handleUserId, accept }
    });
};

// 邀请用户加入旅程
export const inviteUsers = async (tripId: string, inviteUserIds: string[]): Promise<void> => {
    await api.post<unknown, void>('/tripMembers/invite', null, {
        params: { tripId, inviteUserIds }
    });
};

// 删除成员
export const deleteMember = async (tripId: string, handleUserId: string): Promise<void> => {
    await api.delete<unknown, void>('/tripMembers/delete', {
        params: { tripId, handleUserId }
    });
};

// 获取待处理的成员请求数量 (按旅程分组)
export const getPendingRequests = async (): Promise<TripPendingRequest[]> => {
    return await api.get<unknown, TripPendingRequest[]>('/tripMembers/pending');
};
