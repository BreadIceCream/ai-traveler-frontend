import api from './index';
import { UserDto, User } from '../types/api';

// User API services
// Note: Interceptor already unwraps Result and returns data directly

/**
 * Login with username and password
 * Returns JWT token on success
 */
export const login = async (credentials: Pick<UserDto, 'username' | 'password'>): Promise<string> => {
    const data = await api.post<unknown, string>('/users/login', credentials);
    return data;
};

/**
 * Register a new user
 */
export const register = async (userData: UserDto): Promise<void> => {
    await api.post<unknown, void>('/users/register', userData);
};

/**
 * Get current logged-in user info
 */
export const getCurrentUser = async (): Promise<User> => {
    const data = await api.get<unknown, User>('/users/me');
    return data;
};

/**
 * Update user preferences
 * PUT /api/users/preferences
 * @param preferencesText 偏好文本
 * @returns Updated user object
 */
export const updatePreferences = async (preferencesText: string): Promise<User> => {
    const data = await api.put<unknown, User>('/users/preferences', null, {
        params: { preferencesText }
    });
    return data;
};

/**
 * Get user by username
 * GET /api/users/username
 * @param username 用户名
 * @returns User object
 */
export const getUserByUsername = async (username: string): Promise<User> => {
    const data = await api.get<unknown, User>('/users/username', {
        params: { username }
    });
    return data;
};
