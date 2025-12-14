import request from './index';
import { TripDayItem, EntireTripDayItem } from '@/types/api';

// DTO for creating/updating trip day items
export interface TripDayItemDto {
    itemId?: string;
    startTime?: string;
    endTime?: string;
    transportNotes?: string;
    estimatedCost?: number;
    notes?: string;
}

// Get trip day items list
export const getTripDayItems = async (tripId: string, tripDayId: string): Promise<EntireTripDayItem[]> => {
    const response = await request.get<EntireTripDayItem[]>('/tripDayItems/list', {
        params: { tripId, tripDayId }
    });
    return response as unknown as EntireTripDayItem[];
};

// Add a trip day item
export const addTripDayItem = async (
    tripId: string,
    tripDayId: string,
    entityId: string,
    isPoi: boolean,
    dto: TripDayItemDto
): Promise<TripDayItem> => {
    const response = await request.post<TripDayItem>('/tripDayItems/add', dto, {
        params: { tripId, tripDayId, entityId, isPoi }
    });
    return response as unknown as TripDayItem;
};

// Update a trip day item
export const updateTripDayItem = async (tripId: string, dto: TripDayItemDto): Promise<TripDayItem> => {
    const response = await request.put<TripDayItem>('/tripDayItems/update', dto, {
        params: { tripId }
    });
    return response as unknown as TripDayItem;
};

// AI update transport notes for a trip day item
export const updateTripDayItemTransport = async (
    tripId: string,
    itemId: string,
    originAddress?: string
): Promise<TripDayItem> => {
    const response = await request.put<TripDayItem>('/tripDayItems/transport', null, {
        params: { tripId, itemId, originAddress },
        timeout: 300000  // 5分钟 = 300s
    });
    return response as unknown as TripDayItem;
};

// Move a trip day item (change order/day)
// prevId and nextId are required but can be null if no prev/next item exists
export const moveTripDayItem = async (
    tripId: string,
    currentId: string,
    tripDayId: string,
    prevId: string | null,
    nextId: string | null
): Promise<void> => {
    await request.put('/tripDayItems/move', null, {
        params: { tripId, currentId, tripDayId, prevId, nextId }
    });
};

// Delete trip day items
export const deleteTripDayItems = async (tripId: string, itemIds: string[]): Promise<void> => {
    await request.delete('/tripDayItems/delete', {
        params: { tripId, itemIds: itemIds.join(',') }
    });
};
