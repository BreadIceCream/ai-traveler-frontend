import api from './index';
import { TripExpense, TripExpenseCreateUpdateDto, DoubleSummaryStatistics, CategoryExpenseStats, ExpenseType } from '../types/api';

// ========== 支出管理 API ==========

// 添加单笔支出
export const addExpense = async (tripId: string, data: TripExpenseCreateUpdateDto): Promise<TripExpense> => {
    return await api.post<unknown, TripExpense>('/trip-expenses/add', data, {
        params: { tripId }
    });
};

// 批量添加支出记录
export const batchAddExpenses = async (tripId: string, data: TripExpenseCreateUpdateDto[]): Promise<void> => {
    await api.post<unknown, void>('/trip-expenses/batch-add', data, {
        params: { tripId }
    });
};

// 更新支出记录
export const updateExpense = async (expenseId: string, data: TripExpenseCreateUpdateDto): Promise<TripExpense> => {
    return await api.put<unknown, TripExpense>('/trip-expenses/update', data, {
        params: { expenseId }
    });
};

// 获取单笔支出详情
export const getExpenseDetail = async (expenseId: string): Promise<TripExpense> => {
    return await api.get<unknown, TripExpense>('/trip-expenses/detail', {
        params: { expenseId }
    });
};

// 获取指定旅程的所有支出记录（可按类型过滤）
export const getTripExpenses = async (tripId: string, category?: ExpenseType | null): Promise<TripExpense[]> => {
    const params: { tripId: string; category?: ExpenseType } = { tripId };
    if (category) {
        params.category = category;
    }
    return await api.get<unknown, TripExpense[]>('/trip-expenses/list', { params });
};

// 获取指定旅程的总支出统计信息
export const getTripExpenseStatistics = async (tripId: string): Promise<DoubleSummaryStatistics> => {
    return await api.get<unknown, DoubleSummaryStatistics>('/trip-expenses/statistics/total', {
        params: { tripId }
    });
};

// 获取指定旅程的各类支出统计信息
export const getTripExpenseByCategory = async (tripId: string): Promise<CategoryExpenseStats> => {
    return await api.get<unknown, CategoryExpenseStats>('/trip-expenses/statistics/category', {
        params: { tripId }
    });
};

// 删除支出记录
export const deleteExpense = async (expenseId: string): Promise<void> => {
    await api.delete<unknown, void>('/trip-expenses/delete', {
        params: { expenseId }
    });
};
