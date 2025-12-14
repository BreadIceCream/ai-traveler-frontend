import api from './index';
import { Poi } from '../types/api';

// POI兴趣点搜索 API

/**
 * 数据库精确搜索 POI
 * GET /api/pois/search/exact/db
 */
export const searchPoisFromDb = async (params: {
    keywords: string;
    city?: string;
}): Promise<Poi[]> => {
    const data = await api.get<unknown, Poi[]>('/pois/search/exact/db', { params });
    return data;
};

/**
 * 第三方API搜索POI并保存
 * GET /api/pois/search/exact/api
 */
export const searchPoisFromApi = async (params: {
    keywords: string;
    city?: string;
}): Promise<Poi[]> => {
    const data = await api.get<unknown, Poi[]>('/pois/search/exact/api', { params });
    return data;
};
