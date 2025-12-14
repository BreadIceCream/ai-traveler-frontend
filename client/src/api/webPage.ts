import request from './index';
import { WebPage, ExtractResult, ExtractWebPageDto } from '@/types/api';

// 获取会话下的所有网页
export const getWebPagesByConversation = async (conversationId: string): Promise<WebPage[]> => {
    const response = await request.get<WebPage[]>('/webPage/list', {
        params: { conversationId }
    });
    return response as unknown as WebPage[];
};

// 删除网页
export const deleteWebPage = async (webPageId: string): Promise<void> => {
    await request.delete<void>('/webPage/delete', {
        params: { webPageId }
    });
};

// 从网页中提取信息 (设置5分钟超时，因为AI提取可能需要较长时间)
export const extractWebPages = async (dto: ExtractWebPageDto): Promise<ExtractResult[]> => {
    const response = await request.post<ExtractResult[]>('/webPage/extract', dto, {
        timeout: 300000  // 5分钟 = 300s
    });
    return response as unknown as ExtractResult[];
};
