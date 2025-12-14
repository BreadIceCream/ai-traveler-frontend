import api from './index';
import { User, Page, Trip, Poi, EntireTrip } from '../types/api';

// Explore module API services

/**
 * Get public trips with pagination and filters
 * GET /api/trips/public
 */
export const getPublicTrips = async (params?: {
    destinationCity?: string;
    startDate?: string;
    endDate?: string;
    pageNum?: number;
    pageSize?: number;
}): Promise<Page<Trip>> => {
    const data = await api.get<unknown, Page<Trip>>('/trips/public', { params });
    return data;
};

/**
 * Get trip detail information
 * GET /api/trips/detail
 * @param tripId Trip ID to get details for
 */
export const getTripDetail = async (tripId: string): Promise<EntireTrip> => {
    const data = await api.get<unknown, EntireTrip>('/trips/detail', {
        params: { tripId }
    });
    return data;
};

/**
 * Request to join a trip
 * POST /api/tripMembers/addRequest
 * @param tripId Trip ID to join
 */
export const addJoinRequest = async (tripId: string): Promise<void> => {
    await api.post<unknown, void>('/tripMembers/addRequest', null, {
        params: { tripId }
    });
};

/**
 * Find users with similar interests
 * GET /api/users/similar
 * @param limit Maximum number of results
 */
export const getSimilarUsers = async (limit?: number): Promise<User[]> => {
    const data = await api.get<unknown, User[]>('/users/similar', {
        params: { limit }
    });
    return data;
};

/**
 * Semantic search for POIs
 * GET /api/pois/search/semantic
 */
export const semanticSearchPois = async (params: {
    queryText: string;
    city?: string;
    topK?: number;
}): Promise<Poi[]> => {
    const data = await api.get<unknown, Poi[]>('/pois/search/semantic', { params });
    return data;
};
