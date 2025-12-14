import api from './index';
import { Page, NonPoiItem } from '../types/api';

// 分页获取用户的非POI项列表
export const getNonPoiItemsPage = async (
    pageNum: number = 1,
    pageSize: number = 10,
    type?: string
): Promise<Page<NonPoiItem>> => {
    const params: Record<string, string | number> = {
        pageNum,
        pageSize
    };

    if (type) {
        params.type = type;
    }

    return await api.get<unknown, Page<NonPoiItem>>('/nonPoiItem/page', { params });
};

// 创建非POI项
export const createNonPoiItem = async (data: {
    type: string;
    title: string;
    description?: string;
    city?: string;
    activityTime?: string;
    estimatedAddress?: string;
    extraInfo?: string;
    sourceUrl?: string;
}): Promise<NonPoiItem> => {
    return await api.post<unknown, NonPoiItem>('/nonPoiItem/create', data);
};

// 更新非POI项
export const updateNonPoiItem = async (data: {
    id: string;
    type: string;
    title: string;
    description?: string;
    city?: string;
    activityTime?: string;
    estimatedAddress?: string;
    extraInfo?: string;
    sourceUrl?: string;
}): Promise<NonPoiItem> => {
    return await api.put<unknown, NonPoiItem>('/nonPoiItem/update', data);
};

// 删除非POI项
export const deleteNonPoiItem = async (nonPoiItemId: string): Promise<void> => {
    await api.delete<unknown, void>('/nonPoiItem/delete', {
        params: { nonPoiItemId }
    });
};
