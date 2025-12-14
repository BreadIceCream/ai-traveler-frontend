import request from './index';
import { EntireTripDay, TripDay } from '@/types/api';

// Update trip day note
export const updateTripDayNote = async (
    tripId: string,
    tripDayId: string,
    note: string
): Promise<void> => {
    await request.put('/tripDays/note', null, {
        params: { tripId, tripDayId, note }
    });
};

// Exchange order of two trip days
export const exchangeTripDayOrder = async (
    tripId: string,
    aTripDayId: string,
    bTripDayId: string
): Promise<void> => {
    await request.put('/tripDays/exchange', null, {
        params: { tripId, aTripDayId, bTripDayId }
    });
};

// Create a new trip day
export const createTripDay = async (
    tripId: string,
    date: string,  // format: YYYY-MM-DD
    note?: string
): Promise<TripDay> => {
    return request.post('/tripDays/create', null, {
        params: { tripId, date, note }
    });
};

// AI replan a trip day
export const aiReplanTripDay = async (
    tripId: string,
    tripDayId: string
): Promise<EntireTripDay> => {
    return request.post('/tripDays/aiReplan', null, {
        params: { tripId, tripDayId },
        timeout: 300000 // 5 minutes
    });
};

// Get all trip days for a trip
export const getTripDaysList = async (
    tripId: string
): Promise<EntireTripDay[]> => {
    return request.get('/tripDays/list', {
        params: { tripId }
    });
};

// Get detail of a specific trip day
export const getTripDayDetail = async (
    tripId: string,
    tripDayId: string
): Promise<EntireTripDay> => {
    return request.get('/tripDays/detail', {
        params: { tripId, tripDayId }
    });
};

// Delete trip days (cascading delete all items)
export const deleteTripDays = async (
    tripId: string,
    tripDayIds: string[]
): Promise<void> => {
    await request.delete('/tripDays/delete', {
        params: { tripId, tripDayIds }
    });
};
