// API Response and Model Types

// Generic API Response
export interface Result<T = unknown> {
    code: number;
    message: string;
    data: T;
}

// Pagination - MyBatis-Plus IPage format
export interface Page<T> {
    records: T[];      // 数据列表
    total: number;     // 总记录数
    size: number;      // 每页大小
    current: number;   // 当前页码 (从1开始)
    pages: number;     // 总页数
}

// User related types
export interface UserDto {
    username: string;
    password: string;
    preferencesText?: string;
}

export interface User {
    userId: string;
    username: string;
    preferencesText?: string;
    createdAt: string;
}

// Auth types
export interface LoginResponse {
    token: string;
}

// Trip related types
export type TripStatus = 'PLANNED' | 'PLANNING' | 'IN_PROGRESS' | 'ONGOING' | 'COMPLETED' | 'CANCELLED';

export interface Trip {
    tripId: string;
    userId: string;
    title: string;
    destinationCity: string;
    startDate: string;
    endDate: string;
    totalBudget?: number;
    status: TripStatus;
    description?: string;
    createdAt: string;
    isPrivate: boolean;
}

// Member role for trip membership
export type MemberRole = 'OWNER' | 'EDITOR' | 'VIEWER';

// Trip with member info (from getUserTrips API)
export interface TripWithMemberInfo {
    tripId: string;
    ownerId: string;
    title: string;
    destinationCity: string;
    startDate: string;
    endDate: string;
    totalBudget?: number;
    status: TripStatus;
    description?: string;
    createdAt: string;
    isPrivate: boolean;
    memberRole: MemberRole;
    isPass?: boolean;
    joinedAt?: string;
}

// TripDay types
export interface TripDay {
    tripDayId: string;
    tripId: string;
    dayDate: string;
    notes?: string;
}

// TripDayItem types
export interface TripDayItem {
    itemId: string;
    tripDayId: string;
    entityId: string;
    startTime?: string;
    endTime?: string;
    itemOrder?: number;
    transportNotes?: string;
    estimatedCost?: number;
    isPoi: boolean;
    notes?: string;
}

// NonPoiItem types
export type NonPoiType = 'ACTIVITY' | 'FOOD' | 'CULTURE' | 'OTHER';

export interface NonPoiItem {
    id: string;
    type: NonPoiType;
    title: string;
    description?: string;
    city?: string;
    activityTime?: string;
    estimatedAddress?: string;
    extraInfo?: string;
    sourceUrl?: string;
    createdAt?: string;
    privateUserId?: string;
}

// POI related types
export interface Poi {
    poiId: string;
    externalApiId?: string;
    name: string;
    type?: string;
    city?: string;
    address?: string;
    latitude?: number;
    longitude?: number;
    description?: string;
    openingHours?: string;
    avgVisitDuration?: number;
    avgCost?: string;
    photos?: string[];
    phone?: string;
    rating?: string;
    createdAt?: string;
}

// EntireTrip types (for trip detail response)
export interface EntireTripDayItem {
    item: TripDayItem;
    entity: Poi | NonPoiItem | null;
}

export interface EntireTripDay {
    tripDay: TripDay;
    tripDayItems: EntireTripDayItem[];
}

export interface EntireTrip {
    trip: Trip;
    tripDays: EntireTripDay[];
}

// Trip Member types (for member management)
export interface TripMember {
    id: string;
    tripId: string;
    userId: string;
    role: MemberRole;
    isPass: boolean;
    createdAt: string;
    userName: string;
    preferencesText?: string;
}

// Pending member requests per trip (for owner notification)
export interface TripPendingRequest {
    tripId: string;
    title: string;
    pendingRequestCount: number;
}

// Log types (no longer used - logs can have both text and images)
export interface TripLog {
    logId: string;
    tripId: string;
    content: string;
    createdAt: string;
    userId: string;
    isPublic: boolean;
    imgs: string; // JSON string containing array of image URLs
}

// Extended DTO with username for public logs
export interface TripLogsDto extends TripLog {
    username: string;
}

// Expense types
export type ExpenseType = 'TRANSPORTATION' | 'ACCOMMODATION' | 'DINING' | 'SIGHTSEEING' | 'SHOPPING' | 'OTHER';

export interface TripExpense {
    expenseId: string;
    userId: string;
    tripId: string;
    amount: number;
    category: ExpenseType;
    description?: string;
    expenseTime?: string;
}

// Expense statistics
export interface DoubleSummaryStatistics {
    count: number;
    sum: number;
    min: number;
    average: number;
    max: number;
}

export type CategoryExpenseStats = Record<ExpenseType, DoubleSummaryStatistics>;

// Create/Update DTOs
export interface TripLogCreateDto {
    content: string;
    isPublic?: boolean;
}

export interface TripExpenseCreateUpdateDto {
    amount: number;
    category: ExpenseType;
    description?: string;
    expenseTime?: string; // OffsetDateTime format: "2025-12-11T12:28:00+08:00"
}

// AI Recommendation types
export type MessageType = 'USER' | 'ASSISTANT';

export interface MessageMetadata {
    messageType: MessageType;
}

export interface Message {
    messageType: MessageType;
    metadata: MessageMetadata;
    text: string;
    media?: any[];  // Optional, not used currently
    toolCalls?: any[];  // Optional, for ASSISTANT type
}

export interface AiRecommendationConversation {
    conversationId: string;
    userId: string;
    title: string;
    createdAt: string;
    updatedAt: string;
}

export interface AiRecommendResponse {
    aiMessages: string[];  // Markdown formatted messages
    toolUse: string[];     // Tools used in this response
    toolCallResults: Record<string, string[]>;  // Results of tool calls
}

// Web Page types
export interface WebPage {
    id: string;
    conversationId: string;
    name: string;           // 网页标题
    url: string;            // 网页URL
    displayUrl?: string;    // 展示URL，url decode后的格式
    snippet?: string;       // 网页简短描述 (用于卡片展示2行)
    summary?: string;       // 网页总结、文本摘要 (详情中展示)
    siteName?: string;      // 网站名称
    datePublished?: string; // 发布日期
    createdAt: string;
}

// Extract Result types
export interface ExtractResult {
    message?: string;
    webPageId: string;
    webPageTitle: string;
    pois: Poi[];
    nonPois: NonPoiItem[];  // Backend uses nonPois, not nonPoiItems
}

// Extract request DTO
export interface ExtractWebPageDto {
    city?: string;
    webPageIds: string[];
}
