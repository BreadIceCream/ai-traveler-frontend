import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { ExtractResult } from '@/types/api';
import { extractWebPages } from '@/api/webPage';
import { toast } from '@/utils/toast';

const STORAGE_KEY = 'extract-store';

interface ExtractTask {
    webPageIds: string[];
    status: 'pending' | 'extracting' | 'completed' | 'failed';
    results?: ExtractResult[];
    error?: string;
}

// Serializable state for persistence
interface PersistedState {
    tasks: [string, ExtractTask][];
    results: [string, ExtractResult][];
}

interface ExtractStore {
    // 每个会话的提取任务: conversationId -> ExtractTask
    tasks: Map<string, ExtractTask>;

    // 每个网页的提取结果: webPageId -> ExtractResult
    results: Map<string, ExtractResult>;

    // 正在提取的网页ID集合
    extractingWebPageIds: Set<string>;

    // 开始提取
    startExtract: (conversationId: string, webPageIds: string[], city?: string) => void;

    // 获取网页的提取结果
    getResult: (webPageId: string) => ExtractResult | undefined;

    // 检查网页是否正在提取
    isExtracting: (webPageId: string) => boolean;

    // 检查网页是否已有提取结果
    hasResult: (webPageId: string) => boolean;

    // Clear conversation task
    clearTask: (conversationId: string) => void;

    // Get all results for a conversation
    getResultsByConversation: (conversationId: string) => ExtractResult[];

    // Check if conversation has any results
    hasConversationResults: (conversationId: string) => boolean;

    // Remove a single result from a conversation
    removeResult: (conversationId: string, webPageId: string) => void;

    // Clear all results for a conversation
    clearAllResults: (conversationId: string) => void;
}

export const useExtractStore = create<ExtractStore>()(
    persist(
        (set, get) => ({
            tasks: new Map(),
            results: new Map(),
            extractingWebPageIds: new Set(),

            startExtract: (conversationId: string, webPageIds: string[], city?: string) => {
                // 添加到正在提取集合
                set(state => {
                    const newExtracting = new Set(state.extractingWebPageIds);
                    webPageIds.forEach(id => newExtracting.add(id));

                    const newTasks = new Map(state.tasks);
                    const existingTask = state.tasks.get(conversationId);

                    // 保留已有的结果
                    newTasks.set(conversationId, {
                        webPageIds: [...new Set([...(existingTask?.webPageIds || []), ...webPageIds])],
                        status: 'extracting',
                        results: existingTask?.results // 保留已有结果
                    });

                    return {
                        extractingWebPageIds: newExtracting,
                        tasks: newTasks
                    };
                });

                // 发起异步请求
                extractWebPages({ webPageIds, city })
                    .then(results => {
                        set(state => {
                            // 更新结果
                            const newResults = new Map(state.results);
                            results.forEach(r => newResults.set(r.webPageId, r));

                            // 移除提取中状态
                            const newExtracting = new Set(state.extractingWebPageIds);
                            webPageIds.forEach(id => newExtracting.delete(id));

                            // 更新任务状态 - 累积结果而不是替换
                            const newTasks = new Map(state.tasks);
                            const existingTask = state.tasks.get(conversationId);
                            const existingResults = existingTask?.results || [];

                            // 合并结果：用 webPageId 去重，新结果覆盖旧结果
                            const mergedResultsMap = new Map<string, ExtractResult>();
                            existingResults.forEach(r => mergedResultsMap.set(r.webPageId, r));
                            results.forEach(r => mergedResultsMap.set(r.webPageId, r));
                            const mergedResults = Array.from(mergedResultsMap.values());

                            newTasks.set(conversationId, {
                                webPageIds: [...new Set([...(existingTask?.webPageIds || []), ...webPageIds])],
                                status: 'completed',
                                results: mergedResults
                            });

                            return {
                                results: newResults,
                                extractingWebPageIds: newExtracting,
                                tasks: newTasks
                            };
                        });

                        // Show message from backend
                        const messages = results.map(r => r.message).filter(Boolean);
                        if (messages.length > 0) {
                            toast.success(`${messages.join('\n')}，可在“提取结果”中查看`);
                        } else {
                            // Fallback: count POIs and nonPois
                            const totalPois = results.reduce((sum, r) => sum + (r.pois?.length || 0), 0);
                            const totalNonPois = results.reduce((sum, r) => sum + (r.nonPois?.length || 0), 0);
                            toast.success(`提取完成！发现 ${totalPois} 个景点，${totalNonPois} 个其他推荐项\n可在“提取结果”中查看`);
                        }
                    })
                    .catch(error => {
                        set(state => {
                            // 移除提取中状态
                            const newExtracting = new Set(state.extractingWebPageIds);
                            webPageIds.forEach(id => newExtracting.delete(id));

                            // 更新任务状态
                            const newTasks = new Map(state.tasks);
                            newTasks.set(conversationId, {
                                webPageIds,
                                status: 'failed',
                                error: error.message
                            });

                            return {
                                extractingWebPageIds: newExtracting,
                                tasks: newTasks
                            };
                        });

                        toast.error(`提取失败: ${error.message || '未知错误'}`);
                    });
            },

            getResult: (webPageId: string) => {
                return get().results.get(webPageId);
            },

            isExtracting: (webPageId: string) => {
                return get().extractingWebPageIds.has(webPageId);
            },

            hasResult: (webPageId: string) => {
                return get().results.has(webPageId);
            },

            clearTask: (conversationId: string) => {
                set(state => {
                    const newTasks = new Map(state.tasks);
                    newTasks.delete(conversationId);
                    return { tasks: newTasks };
                });
            },

            getResultsByConversation: (conversationId: string) => {
                const task = get().tasks.get(conversationId);
                return task?.results || [];
            },

            hasConversationResults: (conversationId: string) => {
                const task = get().tasks.get(conversationId);
                return (task?.results?.length || 0) > 0;
            },

            removeResult: (conversationId: string, webPageId: string) => {
                set(state => {
                    const newTasks = new Map(state.tasks);
                    const existingTask = state.tasks.get(conversationId);
                    if (existingTask?.results) {
                        const filteredResults = existingTask.results.filter(r => r.webPageId !== webPageId);
                        newTasks.set(conversationId, {
                            ...existingTask,
                            results: filteredResults
                        });
                    }

                    const newResults = new Map(state.results);
                    newResults.delete(webPageId);

                    return { tasks: newTasks, results: newResults };
                });
            },

            clearAllResults: (conversationId: string) => {
                set(state => {
                    const newTasks = new Map(state.tasks);
                    const existingTask = state.tasks.get(conversationId);

                    // Remove all results from the results Map
                    const newResults = new Map(state.results);
                    existingTask?.results?.forEach(r => newResults.delete(r.webPageId));

                    // Clear results from task
                    if (existingTask) {
                        newTasks.set(conversationId, {
                            ...existingTask,
                            results: []
                        });
                    }

                    return { tasks: newTasks, results: newResults };
                });
            }
        }),
        {
            name: STORAGE_KEY,
            storage: createJSONStorage(() => sessionStorage),
            // Only persist tasks and results, not extractingWebPageIds
            partialize: (state) => ({
                tasks: state.tasks,
                results: state.results,
            }),
            // Custom serialization for Map objects
            serialize: (state) => {
                const persistedState = state.state as Pick<ExtractStore, 'tasks' | 'results'>;
                return JSON.stringify({
                    ...state,
                    state: {
                        tasks: Array.from(persistedState.tasks?.entries() || []),
                        results: Array.from(persistedState.results?.entries() || []),
                    }
                });
            },
            deserialize: (str) => {
                const parsed = JSON.parse(str);
                return {
                    ...parsed,
                    state: {
                        tasks: new Map(parsed.state.tasks || []),
                        results: new Map(parsed.state.results || []),
                        extractingWebPageIds: new Set(),
                    }
                };
            },
        }
    )
);
