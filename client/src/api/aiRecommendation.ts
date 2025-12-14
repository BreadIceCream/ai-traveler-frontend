import request from './index';
import { AiRecommendationConversation, AiRecommendResponse, Message, Poi, NonPoiItem } from '@/types/api';

// 创建AI推荐会话
export const createConversation = async (queryText: string): Promise<AiRecommendationConversation> => {
    const response = await request.post<AiRecommendationConversation>('/recommendation/conversation/create', null, {
        params: { queryText }
    });
    // 响应拦截器已经返回 Result.data，所以 response 就是数据本身
    return response as unknown as AiRecommendationConversation;
};

// 处理用户对话 (设置5分钟超时，因为AI处理可能需要较长时间)
export const handleUserQuery = async (conversationId: string, queryText: string): Promise<AiRecommendResponse> => {
    const response = await request.post<AiRecommendResponse>('/recommendation/conversation/handle', null, {
        params: { conversationId, queryText },
        timeout: 300000  // 5分钟 = 300s
    });
    return response as unknown as AiRecommendResponse;
};

// 获取所有AI推荐会话
export const getAllConversations = async (): Promise<AiRecommendationConversation[]> => {
    const response = await request.get<AiRecommendationConversation[]>('/recommendation/conversation/all');
    return response as unknown as AiRecommendationConversation[];
};

// 获取AI推荐会话
export const getConversation = async (conversationId: string): Promise<AiRecommendationConversation> => {
    const response = await request.get<AiRecommendationConversation>(`/recommendation/conversation/${conversationId}`);
    return response as unknown as AiRecommendationConversation;
};

// 获取AI推荐会话历史
export const getConversationHistory = async (conversationId: string): Promise<Message[]> => {
    const response = await request.get<Message[]>(`/recommendation/conversation/history/${conversationId}`);
    return response as unknown as Message[];
};

// 重命名AI推荐会话
export const renameConversation = async (conversationId: string, newTitle: string): Promise<AiRecommendationConversation> => {
    const response = await request.put<AiRecommendationConversation>('/recommendation/conversation/rename', null, {
        params: { conversationId, newTitle }
    });
    return response as unknown as AiRecommendationConversation;
};

// 删除AI推荐会话
export const deleteConversation = async (conversationId: string): Promise<void> => {
    await request.delete<void>('/recommendation/conversation/delete', {
        params: { conversationId }
    });
};

// ==================== AI推荐项管理 ====================

// 获取会话推荐的 POIs
export const getRecommendationPois = async (
    conversationId: string,
    isManual?: boolean
): Promise<Poi[]> => {
    const response = await request.get<Poi[]>('/recommendation/items/pois', {
        params: { conversationId, isManual }
    });
    return response as unknown as Poi[];
};

// 获取会话推荐的 NonPois
export const getRecommendationNonPois = async (
    conversationId: string,
    isManual?: boolean
): Promise<NonPoiItem[]> => {
    const response = await request.get<NonPoiItem[]>('/recommendation/items/nonPois', {
        params: { conversationId, isManual }
    });
    return response as unknown as NonPoiItem[];
};

// 手动添加 POIs 到推荐项
export const addRecommendationPois = async (
    conversationId: string,
    poiIds: string[]
): Promise<void> => {
    await request.post<void>('/recommendation/items/pois', null, {
        params: { conversationId, poiIds }
    });
};

// 手动添加 NonPois 到推荐项
export const addRecommendationNonPois = async (
    conversationId: string,
    nonPoiItemIds: string[]
): Promise<void> => {
    await request.post<void>('/recommendation/items/nonPois', null, {
        params: { conversationId, nonPoiItemIds }
    });
};

// 删除推荐项中的 POIs
export const deleteRecommendationPois = async (
    conversationId: string,
    poiIds?: string[]
): Promise<void> => {
    await request.delete<void>('/recommendation/items/pois', {
        params: { conversationId, poiIds }
    });
};

// 删除推荐项中的 NonPois
export const deleteRecommendationNonPois = async (
    conversationId: string,
    nonPoiItemIds?: string[]
): Promise<void> => {
    await request.delete<void>('/recommendation/items/nonPois', {
        params: { conversationId, nonPoiItemIds }
    });
};
