import api from './index';
import { Poi, NonPoiItem } from '@/types/api';

// Wishlist item types
export interface WishlistItem {
    itemId: string;
    tripId: string;
    entityId: string;
    isPoi: boolean;
    createdAt: string;
}

export interface EntireWishlistItem {
    item: WishlistItem;
    entity: Poi | NonPoiItem;
}

/**
 * 获取某个行程下的心愿单item列表
 * GET /api/wishlistItems/list
 */
export const getWishlistItems = async (tripId: string): Promise<EntireWishlistItem[]> => {
    const data = await api.get<unknown, EntireWishlistItem[]>('/wishlistItems/list', {
        params: { tripId }
    });
    return data;
};

/**
 * 添加心愿单item
 * POST /api/wishlistItems/add
 */
export const addWishlistItem = async (
    tripId: string,
    entityId: string,
    isPoi: boolean
): Promise<void> => {
    await api.post('/wishlistItems/add', null, {
        params: { tripId, entityId, isPoi }
    });
};

/**
 * 删除心愿单item
 * DELETE /api/wishlistItems/delete
 */
export const deleteWishlistItems = async (itemIds: string[]): Promise<void> => {
    await api.delete('/wishlistItems/delete', {
        params: { itemIds }
    });
};
