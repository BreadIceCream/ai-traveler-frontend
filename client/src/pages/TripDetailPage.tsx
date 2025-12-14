import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    Box,
    Container,
    Typography,
    Card,
    CardContent,
    CardMedia,
    Grid,
    Chip,
    CircularProgress,
    IconButton,
    Accordion,
    AccordionSummary,
    AccordionDetails,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Divider,
    Link,
    Tooltip,
    Button,
    TextField,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    FormControlLabel,
    Switch,
    ToggleButtonGroup,
    ToggleButton,
    Tabs,
    Tab,
    InputAdornment,
    Pagination,
    Fab,
    Paper,
    Collapse,
    Menu,
    ListItemIcon,
} from '@mui/material';
import {
    ArrowBack,
    ExpandMore,
    LocationOn,
    CalendarToday,
    AccessTime,
    AttachMoney,
    Star,
    Close,
    Place,
    Phone,
    Schedule,
    Event,
    Restaurant,
    Celebration,
    Museum,
    MoreHoriz,
    OpenInNew,
    Edit,
    Delete,
    Lock,
    LockOpen,
    PersonAdd,
    Check,
    Clear,
    PersonRemove,
    People,
    Search,
    Notes,
    Receipt,
    FavoriteBorder,
    Add,
    DragIndicator,
    DirectionsCar,
    ExpandLess,
    AutoAwesome,
} from '@mui/icons-material';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { getTripDetail, semanticSearchPois } from '@/api/explore';
import { getUserByUsername } from '@/api/user';
import { updateTripInfo, updateTripVisibility, updateTripStatus, deleteTrip, aiGenerateTrip } from '@/api/trip';
import { getTripMembers, handleMemberRequest, inviteUsers, deleteMember } from '@/api/tripMember';
import { getWishlistItems, deleteWishlistItems, addWishlistItem, EntireWishlistItem } from '@/api/wishlist';
import { getAllConversations, getRecommendationPois, getRecommendationNonPois } from '@/api/aiRecommendation';
import { searchPoisFromDb, searchPoisFromApi } from '@/api/poi';
import { getNonPoiItemsPage, createNonPoiItem, updateNonPoiItem } from '@/api/nonPoiItem';
import { updateTripDayItem, deleteTripDayItems, moveTripDayItem, addTripDayItem, updateTripDayItemTransport, TripDayItemDto } from '@/api/tripDayItem';
import { updateTripDayNote, exchangeTripDayOrder, createTripDay, aiReplanTripDay, getTripDaysList, deleteTripDays } from '@/api/tripDay';
import { EntireTrip, Poi, NonPoiItem, EntireTripDayItem, TripStatus, MemberRole, TripMember, User, AiRecommendationConversation, NonPoiType, EntireTripDay } from '@/types/api';
import { toast } from '@/utils/toast';
import AiConversationPanel from '@/components/AiConversationPanel';
import ReactMarkdown from 'react-markdown';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
    DragStartEvent,
    DragOverlay,
    UniqueIdentifier,
    useDraggable,
    useDroppable,
    DragOverEvent,
} from '@dnd-kit/core';
import {
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable,
    arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// Type color mapping for NonPoiType
const getNonPoiTypeColor = (type: string): 'primary' | 'secondary' | 'success' | 'warning' | 'info' | 'error' => {
    switch (type) {
        case 'ACTIVITY': return 'success';
        case 'FOOD': return 'warning';
        case 'CULTURE': return 'info';
        case 'OTHER': return 'secondary';
        default: return 'primary';
    }
};

const getNonPoiTypeIcon = (type: string) => {
    switch (type) {
        case 'ACTIVITY': return <Celebration fontSize="small" />;
        case 'FOOD': return <Restaurant fontSize="small" />;
        case 'CULTURE': return <Museum fontSize="small" />;
        case 'OTHER': return <MoreHoriz fontSize="small" />;
        default: return <MoreHoriz fontSize="small" />;
    }
};

const getStatusLabel = (status: TripStatus) => {
    switch (status) {
        case 'PLANNED': return '规划中';
        case 'PLANNING': return '规划中';
        case 'IN_PROGRESS': return '进行中';
        case 'ONGOING': return '进行中';
        case 'COMPLETED': return '已完成';
        case 'CANCELLED': return '已取消';
        default: return status;
    }
};

const getStatusColor = (status: TripStatus) => {
    switch (status) {
        case 'PLANNED': return 'info';
        case 'PLANNING': return 'info';
        case 'IN_PROGRESS': return 'warning';
        case 'ONGOING': return 'warning';
        case 'COMPLETED': return 'success';
        case 'CANCELLED': return 'error';
        default: return 'default';
    }
};

// Props for SortableScheduleItem
interface SortableScheduleItemProps {
    dayItem: EntireTripDayItem;
    itemIndex: number;
    canManage: boolean;
    isTransportExpanded: boolean;
    toggleTransportExpanded: (itemId: string) => void;
    handleOpenEditItemDialog: (dayItem: EntireTripDayItem, e: React.MouseEvent) => void;
    handleDeleteItem: (dayItem: EntireTripDayItem) => void;
    handleOpenEditTransportDialog: (dayItem: EntireTripDayItem, e: React.MouseEvent) => void;
    handleAiUpdateTransport: (itemId: string, originAddress?: string) => void;
    aiTransportLoadingId: string | null;
    aiReplanLoadingDayId: string | null;
    previousItemAddress: string;
    setSelectedPoi: (poi: Poi) => void;
    setSelectedNonPoi: (nonPoi: NonPoiItem) => void;
}

// Sortable Schedule Item Component
const SortableScheduleItem: React.FC<SortableScheduleItemProps> = ({
    dayItem,
    itemIndex,
    canManage,
    isTransportExpanded,
    toggleTransportExpanded,
    handleOpenEditItemDialog,
    handleDeleteItem,
    handleOpenEditTransportDialog,
    handleAiUpdateTransport,
    aiTransportLoadingId,
    aiReplanLoadingDayId,
    previousItemAddress,
    setSelectedPoi,
    setSelectedNonPoi,
}) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging: isItemDragging } = useSortable({ id: dayItem.item.itemId });
    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isItemDragging ? 0.5 : 1,
    };

    const poi = dayItem.item.isPoi && dayItem.entity && 'name' in dayItem.entity ? dayItem.entity as Poi : null;
    const nonPoi = !dayItem.item.isPoi && dayItem.entity && 'title' in dayItem.entity ? dayItem.entity as NonPoiItem : null;

    // Local state for AI transport input
    const [showAiInput, setShowAiInput] = React.useState(false);
    const [aiOriginAddress, setAiOriginAddress] = React.useState(previousItemAddress);

    const handleAiInputKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleAiUpdateTransport(dayItem.item.itemId, aiOriginAddress || undefined);
            setShowAiInput(false);
        } else if (e.key === 'Escape') {
            setShowAiInput(false);
        }
    };

    const handleOpenAiInput = () => {
        setAiOriginAddress(previousItemAddress);
        setShowAiInput(true);
    };

    return (
        <Box ref={setNodeRef} style={style} {...attributes}>
            {/* Transport Connector - show for all items, first item has no top line */}
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 0.25, position: 'relative', '&:hover .transport-edit-btn': { opacity: 1 } }}>
                {/* Vertical line - only for items after first */}
                {itemIndex > 0 && <Box sx={{ width: 2, height: 8, bgcolor: 'divider' }} />}
                {/* Transport bubble row - bubble + buttons */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    {/* Transport bubble - clickable */}
                    <Box
                        onClick={() => dayItem.item.transportNotes && toggleTransportExpanded(dayItem.item.itemId)}
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 0.5,
                            px: 1.5,
                            py: 0.3,
                            borderRadius: 3,
                            bgcolor: dayItem.item.transportNotes ? '#e3f2fd' : '#f5f5f5',
                            cursor: dayItem.item.transportNotes ? 'pointer' : 'default',
                            transition: 'all 0.2s',
                            '&:hover': dayItem.item.transportNotes ? { bgcolor: '#bbdefb' } : {},
                        }}
                    >
                        <DirectionsCar sx={{ fontSize: 14, color: dayItem.item.transportNotes ? 'primary.main' : 'text.disabled' }} />
                        {dayItem.item.transportNotes ? (
                            <>
                                <Typography variant="caption" color="primary.main" sx={{ maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.7rem' }}>
                                    {isTransportExpanded ? '' : dayItem.item.transportNotes.slice(0, 15) + (dayItem.item.transportNotes.length > 15 ? '...' : '')}
                                </Typography>
                                {isTransportExpanded ? <ExpandLess sx={{ fontSize: 14 }} /> : <ExpandMore sx={{ fontSize: 14 }} />}
                            </>
                        ) : (
                            <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.65rem' }}>无交通建议</Typography>
                        )}
                    </Box>
                    {/* Edit buttons - next to bubble */}
                    {canManage && (
                        <>
                            <IconButton
                                className="transport-edit-btn"
                                size="small"
                                onClick={(e) => handleOpenEditTransportDialog(dayItem, e)}
                                disabled={aiTransportLoadingId === dayItem.item.itemId || aiReplanLoadingDayId === dayItem.item.tripDayId}
                                sx={{ opacity: 0, transition: 'opacity 0.2s', width: 20, height: 20, '&:hover': { bgcolor: 'primary.light', color: 'white' } }}
                            >
                                <Edit sx={{ fontSize: 12 }} />
                            </IconButton>
                            <Tooltip title="AI更新交通建议">
                                <IconButton
                                    className="transport-edit-btn"
                                    size="small"
                                    onClick={handleOpenAiInput}
                                    disabled={aiTransportLoadingId === dayItem.item.itemId || aiReplanLoadingDayId === dayItem.item.tripDayId}
                                    sx={{ opacity: 0, transition: 'opacity 0.2s', width: 20, height: 20, bgcolor: 'rgba(103, 58, 183, 0.08)', '&:hover': { bgcolor: 'rgba(103, 58, 183, 0.2)', color: 'secondary.main' } }}
                                >
                                    {aiTransportLoadingId === dayItem.item.itemId ? <CircularProgress size={10} /> : <AutoAwesome sx={{ fontSize: 12, color: 'secondary.main' }} />}
                                </IconButton>
                            </Tooltip>
                        </>
                    )}
                    {/* AI Input - inline TextField */}
                    {showAiInput && (
                        <TextField
                            size="small"
                            autoFocus
                            placeholder="输入起始地址后回车"
                            value={aiOriginAddress}
                            onChange={(e) => setAiOriginAddress(e.target.value)}
                            onKeyDown={handleAiInputKeyDown}
                            onBlur={() => setShowAiInput(false)}
                            sx={{
                                width: 180,
                                '& .MuiInputBase-input': { fontSize: '0.75rem', py: 0.5, px: 1 },
                                '& .MuiOutlinedInput-root': { borderRadius: 2 }
                            }}
                        />
                    )}
                </Box>
                {/* Vertical line - shortened */}
                <Box sx={{ width: 2, height: 8, bgcolor: 'divider' }} />
            </Box>
            {/* Expanded transport details - full width */}
            <Collapse in={isTransportExpanded} sx={{ width: '100%' }}>
                <Box sx={{
                    px: 2,
                    py: 1,
                    bgcolor: '#f5f5f5',
                    borderRadius: 1,
                    mb: 1.3,
                    ml: 6,
                    mr: 2,
                    '& p': { m: 0, fontSize: '0.75rem', color: 'text.secondary' },
                    '& ul, & ol': { m: 0, pl: 2, fontSize: '0.75rem', color: 'text.secondary' },
                    '& li': { my: 0.5 },
                    '& strong': { fontWeight: 450 },
                    '& a': { color: 'primary.main' },
                    '& h1, & h2, & h3, & h4, & h5, & h6': { mt: 0.5, mb: 0.5, fontSize: '0.85rem' },
                }}>
                    <ReactMarkdown>{dayItem.item.transportNotes || ''}</ReactMarkdown>
                </Box>
            </Collapse>
            {/* Schedule Item Card */}
            <Box sx={{ position: 'relative', '&:hover .item-actions': { opacity: 1 }, display: 'flex', gap: 1, alignItems: 'stretch' }}>
                {/* Drag Handle */}
                {canManage && (
                    <Box
                        {...listeners}
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            cursor: 'grab',
                            color: 'text.disabled',
                            '&:hover': { color: 'primary.main' },
                            '&:active': { cursor: 'grabbing' },
                            flexShrink: 0,
                        }}
                    >
                        <DragIndicator />
                    </Box>
                )}
                {/* Card Container - with minWidth: 0 to prevent overflow */}
                <Box sx={{ flex: 1, minWidth: 0, overflow: 'visible' }}>
                    {poi ? (
                        <Card
                            sx={{
                                minHeight: 100,
                                display: 'flex',
                                cursor: 'pointer',
                                transition: 'box-shadow 0.2s, transform 0.2s',
                                '&:hover': { boxShadow: 4, transform: 'translateY(-2px)' },
                                borderRadius: 2,
                                overflow: 'hidden',
                            }}
                            onClick={() => setSelectedPoi(poi)}
                        >
                            {poi.photos && poi.photos.length > 0 && (
                                <CardMedia
                                    component="img"
                                    sx={{ width: 80, objectFit: 'cover' }}
                                    image={poi.photos[0]}
                                    alt={poi.name}
                                />
                            )}
                            <CardContent sx={{ flex: 1, overflow: 'hidden', px: 1.3, py: 1, display: 'flex', flexDirection: 'column', gap: 0.3, '&:last-child': { pb: 1 }, position: 'relative' }}>
                                {/* Rating positioned at absolute top-right */}
                                {poi.rating && (
                                    <Chip
                                        size="small"
                                        icon={<Star sx={{ fontSize: 12 }} />}
                                        label={poi.rating}
                                        color="warning"
                                        sx={{ position: 'absolute', top: 6, right: canManage ? 56 : 6, height: 18, fontSize: '0.65rem', '& .MuiChip-icon': { ml: 0.5 } }}
                                    />
                                )}
                                {/* Header: Name */}
                                <Typography variant="body2" fontWeight="bold" noWrap sx={{ fontSize: '0.85rem', pr: poi.rating ? 8 : (canManage ? 6 : 0) }}>
                                    {poi.name}
                                </Typography>
                                {/* Type tags row (gray chips) */}
                                {poi.type && <Chip size="small" label={poi.type} sx={{ height: 16, fontSize: '0.6rem', alignSelf: 'flex-start' }} />}
                                {/* Time + Cost - single line with ellipsis */}
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'text.secondary', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                                    {(dayItem.item.startTime || dayItem.item.endTime) && (
                                        <Box sx={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                                            <AccessTime sx={{ fontSize: 11, mr: 0.3 }} />
                                            <Typography variant="caption" sx={{ fontSize: '0.65rem' }}>
                                                游览时间 {dayItem.item.startTime?.slice(0, 5) || '-'} - {dayItem.item.endTime?.slice(0, 5) || '-'}
                                            </Typography>
                                        </Box>
                                    )}
                                    {dayItem.item.estimatedCost != null && dayItem.item.estimatedCost > 0 && (
                                        <Box sx={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                                            <AttachMoney sx={{ fontSize: 11 }} />
                                            <Typography variant="caption" sx={{ fontSize: '0.65rem' }}>¥{dayItem.item.estimatedCost}</Typography>
                                        </Box>
                                    )}
                                </Box>
                                {/* Location + Opening Hours - single line with ellipsis */}
                                {(poi.city || poi.address || poi.openingHours) && (
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, color: 'text.secondary', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                                        {(poi.city || poi.address) && (
                                            <Box sx={{ display: 'flex', alignItems: 'center', minWidth: 80, maxWidth: '50%', flexShrink: 1, overflow: 'hidden' }}>
                                                <Place sx={{ fontSize: 11, mr: 0.2, flexShrink: 0 }} />
                                                <Typography variant="caption" noWrap sx={{ fontSize: '0.65rem' }}>
                                                    {[poi.city, poi.address].filter(Boolean).join(' · ')}
                                                </Typography>
                                            </Box>
                                        )}
                                        {poi.openingHours && (
                                            <Box sx={{ display: 'flex', alignItems: 'center', minWidth: 80, flexShrink: 1, overflow: 'hidden' }}>
                                                <Schedule sx={{ fontSize: 11, mr: 0.2, flexShrink: 0 }} />
                                                <Typography variant="caption" noWrap sx={{ fontSize: '0.65rem' }}>开放时间 {poi.openingHours}</Typography>
                                            </Box>
                                        )}
                                    </Box>
                                )}
                                {/* Notes from TripDayItem - max 2 lines */}
                                {dayItem.item.notes && (
                                    <Typography variant="caption" color="info.main" sx={{ fontSize: '0.75rem', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                                        {dayItem.item.notes}
                                    </Typography>
                                )}
                            </CardContent>
                        </Card>
                    ) : nonPoi ? (
                        <Card
                            sx={{
                                minHeight: 100,
                                display: 'flex',
                                flexDirection: 'column',
                                cursor: 'pointer',
                                transition: 'box-shadow 0.2s, transform 0.2s',
                                '&:hover': { boxShadow: 4, transform: 'translateY(-2px)' },
                                borderRadius: 2,
                                overflow: 'hidden',
                            }}
                            onClick={() => setSelectedNonPoi(nonPoi)}
                        >
                            <CardContent sx={{ flex: 1, overflow: 'hidden', px: 1.3, py: 1, display: 'flex', flexDirection: 'column', gap: 0.3, '&:last-child': { pb: 1 }, position: 'relative' }}>
                                {/* Type chip positioned at absolute top-right */}
                                <Chip
                                    size="small"
                                    icon={getNonPoiTypeIcon(nonPoi.type)}
                                    label={nonPoi.type}
                                    color={getNonPoiTypeColor(nonPoi.type)}
                                    sx={{ position: 'absolute', top: 6, right: canManage ? 56 : 6, height: 18, fontSize: '0.6rem' }}
                                />
                                {/* Header: Title */}
                                <Typography variant="body2" fontWeight="bold" noWrap sx={{ fontSize: '0.85rem', pr: canManage ? 8 : 6 }}>
                                    {nonPoi.title}
                                </Typography>
                                {/* Time + Cost - single line with ellipsis */}
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'text.secondary', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                                    {(dayItem.item.startTime || dayItem.item.endTime) && (
                                        <Box sx={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                                            <AccessTime sx={{ fontSize: 11, mr: 0.3 }} />
                                            <Typography variant="caption" sx={{ fontSize: '0.65rem' }}>
                                                游览时间 {dayItem.item.startTime?.slice(0, 5) || '-'} - {dayItem.item.endTime?.slice(0, 5) || '-'}
                                            </Typography>
                                        </Box>
                                    )}
                                    {dayItem.item.estimatedCost != null && dayItem.item.estimatedCost > 0 && (
                                        <Box sx={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                                            <AttachMoney sx={{ fontSize: 11 }} />
                                            <Typography variant="caption" sx={{ fontSize: '0.65rem' }}>¥{dayItem.item.estimatedCost}</Typography>
                                        </Box>
                                    )}
                                </Box>
                                {/* Address + Activity Time - single line with ellipsis */}
                                {(nonPoi.estimatedAddress || nonPoi.activityTime) && (
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, color: 'text.secondary', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                                        {nonPoi.estimatedAddress && (
                                            <Box sx={{ display: 'flex', alignItems: 'center', minWidth: 80, maxWidth: '50%', flexShrink: 1, overflow: 'hidden' }}>
                                                <Place sx={{ fontSize: 11, mr: 0.2, flexShrink: 0 }} />
                                                <Typography variant="caption" noWrap sx={{ fontSize: '0.65rem' }}>
                                                    {nonPoi.estimatedAddress}
                                                </Typography>
                                            </Box>
                                        )}
                                        {nonPoi.activityTime && (
                                            <Box sx={{ display: 'flex', alignItems: 'center', minWidth: 80, flexShrink: 1, overflow: 'hidden' }}>
                                                <Event sx={{ fontSize: 11, mr: 0.2, flexShrink: 0 }} />
                                                <Typography variant="caption" noWrap sx={{ fontSize: '0.65rem' }}>活动时间 {nonPoi.activityTime}</Typography>
                                            </Box>
                                        )}
                                    </Box>
                                )}
                                {/* Notes from TripDayItem - max 2 lines */}
                                {dayItem.item.notes && (
                                    <Typography variant="caption" color="info.main" sx={{ fontSize: '0.75rem', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                                        {dayItem.item.notes}
                                    </Typography>
                                )}
                            </CardContent>
                        </Card>
                    ) : (
                        <Card sx={{ minHeight: 80, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Typography color="text.secondary" variant="body2">未知项目类型</Typography>
                        </Card>
                    )}
                </Box>
                {/* Action buttons - positioned at top-right */}
                {canManage && (
                    <Box
                        className="item-actions"
                        sx={{
                            position: 'absolute',
                            top: 4,
                            right: 4,
                            display: 'flex',
                            gap: 0.5,
                            opacity: 0,
                            transition: 'opacity 0.2s',
                        }}
                    >
                        <IconButton
                            size="small"
                            onClick={(e) => handleOpenEditItemDialog(dayItem, e)}
                            sx={{
                                bgcolor: 'rgba(255,255,255,0.9)',
                                width: 22,
                                height: 22,
                                '&:hover': { bgcolor: 'primary.light', color: 'white' },
                            }}
                        >
                            <Edit sx={{ fontSize: 16 }} />
                        </IconButton>
                        <IconButton
                            size="small"
                            onClick={(e) => { e.stopPropagation(); handleDeleteItem(dayItem); }}
                            sx={{
                                bgcolor: 'rgba(255,255,255,0.9)',
                                width: 22,
                                height: 22,
                                '&:hover': { bgcolor: 'error.light', color: 'white' },
                            }}
                        >
                            <Delete sx={{ fontSize: 16 }} />
                        </IconButton>
                    </Box>
                )}
            </Box>
        </Box>
    );
};

// Droppable component for empty days
interface DroppableEmptyDayProps {
    dayId: string;
}

const DroppableEmptyDay: React.FC<DroppableEmptyDayProps> = ({ dayId }) => {
    const { setNodeRef, isOver } = useDroppable({ id: `empty-day-${dayId}` });
    return (
        <Box
            ref={setNodeRef}
            sx={{
                py: 3,
                textAlign: 'center',
                borderRadius: 1,
                border: '2px dashed',
                borderColor: isOver ? 'primary.main' : 'divider',
                bgcolor: isOver ? 'primary.light' : 'transparent',
                transition: 'all 0.2s',
            }}
        >
            <Typography color={isOver ? 'primary.main' : 'text.secondary'}>
                {isOver ? '放置到此处' : '暂无行程项目'}
            </Typography>
        </Box>
    );
};

const TripDetailPage: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { tripId } = useParams<{ tripId: string }>();
    const { isAuthenticated, user } = useAuthStore();
    const currentUserId = user?.userId;

    // Get memberRole from navigation state (passed from MyTripsPage)
    const locationState = location.state as { memberRole?: MemberRole; fromMyTrips?: boolean; fromExplore?: boolean; tripInfo?: unknown } | null;
    const memberRole = locationState?.memberRole;
    const fromMyTrips = locationState?.fromMyTrips ?? false;
    const fromExplore = locationState?.fromExplore ?? false;
    const canManage = fromMyTrips && (memberRole === 'OWNER' || memberRole === 'EDITOR');
    const showWishlist = !fromExplore; // Hide wishlist button when from explore page

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [tripDetail, setTripDetail] = useState<EntireTrip | null>(null);
    const [selectedPoi, setSelectedPoi] = useState<Poi | null>(null);
    const [selectedNonPoi, setSelectedNonPoi] = useState<NonPoiItem | null>(null);
    const [expandedDays, setExpandedDays] = useState<string[]>([]);

    // Edit/Delete state (for OWNER/EDITOR from MyTrips)
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [editForm, setEditForm] = useState({
        title: '',
        description: '',
        destinationCity: '',
        totalBudget: '',
        startDate: '',
        endDate: '',
    });
    const [currentVisibility, setCurrentVisibility] = useState(false);
    const [currentStatus, setCurrentStatus] = useState<TripStatus>('PLANNING');

    // Member management state
    const [members, setMembers] = useState<TripMember[]>([]);
    const [pendingMembers, setPendingMembers] = useState<TripMember[]>([]);
    const [membersExpanded, setMembersExpanded] = useState(false);
    const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
    const [searchUsername, setSearchUsername] = useState('');
    const [searchedUser, setSearchedUser] = useState<User | null>(null);
    const [searching, setSearching] = useState(false);
    const [removeMemberDialogOpen, setRemoveMemberDialogOpen] = useState(false);
    const [memberToRemove, setMemberToRemove] = useState<TripMember | null>(null);
    const isOwner = memberRole === 'OWNER';

    // Wishlist state
    const [wishlistOpen, setWishlistOpen] = useState(false);
    const [wishlistItems, setWishlistItems] = useState<EntireWishlistItem[]>([]);
    const [wishlistLoading, setWishlistLoading] = useState(false);

    // Wishlist addition mode state
    const [addMode, setAddMode] = useState<'ai' | 'search' | null>(null);

    // AI session addition state
    const [conversations, setConversations] = useState<AiRecommendationConversation[]>([]);
    const [selectedConversationId, setSelectedConversationId] = useState<string>('');
    const [aiSessionPois, setAiSessionPois] = useState<Poi[]>([]);
    const [aiSessionNonPois, setAiSessionNonPois] = useState<NonPoiItem[]>([]);
    const [aiSessionLoading, setAiSessionLoading] = useState(false);
    const [aiSessionTab, setAiSessionTab] = useState(0); // 0=POI, 1=NonPOI

    // Direct search addition state
    const [searchTab, setSearchTab] = useState(0); // 0=POI, 1=NonPOI
    // POI search
    const [poiSearchType, setPoiSearchType] = useState<'semantic' | 'db' | 'api'>('semantic');
    const [poiSearchKeyword, setPoiSearchKeyword] = useState('');
    const [poiSearchCity, setPoiSearchCity] = useState('');
    const [poiSearchResults, setPoiSearchResults] = useState<Poi[]>([]);
    const [poiSearchLoading, setPoiSearchLoading] = useState(false);
    // NonPOI search
    const [nonPoiSearchKeyword, setNonPoiSearchKeyword] = useState('');
    const [nonPoiSearchType, setNonPoiSearchType] = useState<NonPoiType | ''>('');
    const [nonPoiSearchResults, setNonPoiSearchResults] = useState<NonPoiItem[]>([]);
    const [nonPoiSearchLoading, setNonPoiSearchLoading] = useState(false);
    const [nonPoiSearchPage, setNonPoiSearchPage] = useState(1);
    const [nonPoiSearchTotal, setNonPoiSearchTotal] = useState(0);
    // Create activity dialog state
    const [createActivityDialogOpen, setCreateActivityDialogOpen] = useState(false);
    const [createActivityFormData, setCreateActivityFormData] = useState({
        type: 'ACTIVITY' as NonPoiType,
        title: '',
        description: '',
        city: '',
        activityTime: '',
        estimatedAddress: '',
        extraInfo: '',
        sourceUrl: '',
    });
    const [createActivityLoading, setCreateActivityLoading] = useState(false);
    // Track already added wishlist item IDs for filtering
    const [wishlistPoiIds, setWishlistPoiIds] = useState<Set<string>>(new Set());
    const [wishlistNonPoiIds, setWishlistNonPoiIds] = useState<Set<string>>(new Set());
    // AI floating dialog state
    const [aiDialogOpen, setAiDialogOpen] = useState(false);
    const [aiDialogPosition, setAiDialogPosition] = useState({ x: 0, y: 0 });
    const [aiDialogSize, setAiDialogSize] = useState({ width: 700, height: 500 });
    const [isDragging, setIsDragging] = useState(false);
    const [isResizing, setIsResizing] = useState(false);
    const [resizeEdge, setResizeEdge] = useState<string>('');
    const dragStartRef = useRef({ x: 0, y: 0 });
    const resizeStartRef = useRef({ width: 0, height: 0, x: 0, y: 0, left: 0, top: 0 });

    // Schedule item edit/delete state
    const [editItemDialogOpen, setEditItemDialogOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<EntireTripDayItem | null>(null);
    const [editItemForm, setEditItemForm] = useState<TripDayItemDto>({
        startTime: '',
        endTime: '',
        estimatedCost: 0,
        notes: '',
    });
    const [editItemLoading, setEditItemLoading] = useState(false);
    // NonPOI edit form state (for editing the NonPOI item itself)
    const [editNonPoiForm, setEditNonPoiForm] = useState({
        id: '',
        type: '' as NonPoiType,
        title: '',
        description: '',
        city: '',
        activityTime: '',
        estimatedAddress: '',
        extraInfo: '',
        sourceUrl: '',
    });
    const [editNonPoiLoading, setEditNonPoiLoading] = useState(false);
    const [deleteItemDialogOpen, setDeleteItemDialogOpen] = useState(false);
    const [itemToDelete, setItemToDelete] = useState<EntireTripDayItem | null>(null);
    const [deleteItemLoading, setDeleteItemLoading] = useState(false);


    // Drag and drop state
    const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);
    const dropTargetRef = useRef<{
        targetDayId: string;
        prevId: string | null;
        nextId: string | null;
    } | null>(null);
    const preDragStateRef = useRef<EntireTrip | null>(null); // Store state before drag for rollback
    const [expandedTransportIds, setExpandedTransportIds] = useState<Set<string>>(new Set());

    // Transport-only edit dialog state
    const [editTransportDialogOpen, setEditTransportDialogOpen] = useState(false);
    const [editingTransportItem, setEditingTransportItem] = useState<EntireTripDayItem | null>(null);
    const [editTransportNotes, setEditTransportNotes] = useState('');
    const [editTransportLoading, setEditTransportLoading] = useState(false);

    // Add wishlist item to schedule state
    const [addToScheduleLoading, setAddToScheduleLoading] = useState<string | null>(null); // itemId being added
    const [dayMenuAnchor, setDayMenuAnchor] = useState<null | HTMLElement>(null);
    const [pendingWishlistItem, setPendingWishlistItem] = useState<EntireWishlistItem | null>(null);

    // Trip day management state
    const [editingNotesDayId, setEditingNotesDayId] = useState<string | null>(null);
    const [editingNotesValue, setEditingNotesValue] = useState('');
    const [createDayDialogOpen, setCreateDayDialogOpen] = useState(false);
    const [createDayForm, setCreateDayForm] = useState({ date: '', note: '' });
    const [createDayLoading, setCreateDayLoading] = useState(false);
    const [deleteDayDialogOpen, setDeleteDayDialogOpen] = useState(false);
    const [dayToDelete, setDayToDelete] = useState<EntireTripDay | null>(null);
    const [deleteDayLoading, setDeleteDayLoading] = useState(false);
    const [swapDayAnchor, setSwapDayAnchor] = useState<null | HTMLElement>(null);
    const [swapSourceDay, setSwapSourceDay] = useState<EntireTripDay | null>(null);
    const [aiReplanLoading, setAiReplanLoading] = useState<string | null>(null); // dayId being replanned

    // AI generate trip state
    const [aiGenerateDialogOpen, setAiGenerateDialogOpen] = useState(false);
    const [aiGenerateLoading, setAiGenerateLoading] = useState(false);
    const [aiTransportLoadingId, setAiTransportLoadingId] = useState<string | null>(null); // itemId being updated

    // dnd-kit sensors
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: { distance: 8 },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    useEffect(() => {
        if (!isAuthenticated) {
            navigate('/login');
            return;
        }
        if (tripId) {
            fetchTripDetail();
        }
    }, [isAuthenticated, tripId]);

    const fetchTripDetail = async () => {
        if (!tripId) return;
        try {
            setLoading(true);
            setError(null);
            const result = await getTripDetail(tripId);
            setTripDetail(result);
            // Sync visibility and status state
            setCurrentVisibility(result.trip.isPrivate);
            setCurrentStatus(result.trip.status);
            // Expand first day by default
            if (result.tripDays && result.tripDays.length > 0) {
                setExpandedDays([result.tripDays[0].tripDay.tripDayId]);
            }
        } catch (err: unknown) {
            setError((err as Error).message || '获取旅程详情失败');
        } finally {
            setLoading(false);
        }
    };

    // Edit/Delete handlers (for OWNER/EDITOR from MyTrips)
    const handleOpenEditDialog = () => {
        if (tripDetail) {
            setEditForm({
                title: tripDetail.trip.title || '',
                description: tripDetail.trip.description || '',
                destinationCity: tripDetail.trip.destinationCity || '',
                totalBudget: tripDetail.trip.totalBudget?.toString() || '0',
                startDate: tripDetail.trip.startDate?.split('T')[0] || '',
                endDate: tripDetail.trip.endDate?.split('T')[0] || '',
            });
            setEditDialogOpen(true);
        }
    };

    const handleCloseEditDialog = () => setEditDialogOpen(false);
    const handleOpenDeleteDialog = () => setDeleteDialogOpen(true);
    const handleCloseDeleteDialog = () => setDeleteDialogOpen(false);

    const handleSaveEdit = async () => {
        if (!tripId) return;
        try {
            await updateTripInfo({
                tripId,
                title: editForm.title,
                description: editForm.description,
                destinationCity: editForm.destinationCity,
                totalBudget: editForm.totalBudget ? parseFloat(editForm.totalBudget) : 0,
                startDate: editForm.startDate,
                endDate: editForm.endDate,
            });
            handleCloseEditDialog();
            fetchTripDetail();
        } catch (err) {
            console.error('Failed to update trip:', err);
        }
    };

    const handleToggleVisibility = async () => {
        if (!tripId) return;
        try {
            await updateTripVisibility(tripId, !currentVisibility);
            setCurrentVisibility(!currentVisibility);
            fetchTripDetail();
        } catch (err) {
            console.error('Failed to update visibility:', err);
        }
    };

    const handleStatusChange = async (newStatus: TripStatus) => {
        if (!tripId) return;
        try {
            await updateTripStatus(tripId, newStatus);
            setCurrentStatus(newStatus);
            fetchTripDetail();
        } catch (err) {
            console.error('Failed to update status:', err);
        }
    };

    const handleDelete = async () => {
        if (!tripId) return;
        try {
            await deleteTrip(tripId);
            handleCloseDeleteDialog();
            navigate('/my-trips');
        } catch (err) {
            console.error('Failed to delete trip:', err);
        }
    };

    // Member management handlers
    const fetchMembers = async () => {
        if (!tripId) return;
        try {
            const allMembers = await getTripMembers(tripId);
            setMembers(allMembers.filter(m => m.isPass === true));
            setPendingMembers(allMembers.filter(m => m.isPass === false));
        } catch (err) {
            console.error('Failed to fetch members:', err);
        }
    };

    useEffect(() => {
        if (tripId) {
            fetchMembers();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tripId]);

    const handleAcceptRequest = async (userId: string) => {
        if (!tripId) return;
        try {
            await handleMemberRequest(tripId, userId, true);
            toast.success('已接受加入请求');
            fetchMembers();
        } catch (err) {
            console.error('Failed to accept request:', err);
        }
    };

    const handleRejectRequest = async (userId: string) => {
        if (!tripId) return;
        try {
            await handleMemberRequest(tripId, userId, false);
            toast.success('已拒绝加入请求');
            fetchMembers();
        } catch (err) {
            console.error('Failed to reject request:', err);
        }
    };

    const handleOpenRemoveMemberDialog = (member: TripMember) => {
        setMemberToRemove(member);
        setRemoveMemberDialogOpen(true);
    };

    const handleCloseRemoveMemberDialog = () => {
        setRemoveMemberDialogOpen(false);
        setMemberToRemove(null);
    };

    const handleConfirmRemoveMember = async () => {
        if (!tripId || !memberToRemove) return;
        try {
            await deleteMember(tripId, memberToRemove.userId);
            toast.success('已移除成员');
            fetchMembers();
        } catch (err) {
            console.error('Failed to remove member:', err);
        } finally {
            handleCloseRemoveMemberDialog();
        }
    };

    const handleSearchUser = async () => {
        if (!searchUsername.trim()) return;
        setSearching(true);
        setSearchedUser(null);
        try {
            const user = await getUserByUsername(searchUsername.trim());
            setSearchedUser(user);
        } catch (err) {
            console.error('User not found:', err);
        } finally {
            setSearching(false);
        }
    };

    const handleInviteUser = async () => {
        if (!tripId || !searchedUser) return;
        try {
            await inviteUsers(tripId, [searchedUser.userId]);
            toast.success(`已邀请 ${searchedUser.username}`);
            setInviteDialogOpen(false);
            setSearchUsername('');
            setSearchedUser(null);
            fetchMembers();
        } catch (err) {
            console.error('Failed to invite user:', err);
        }
    };

    const getRoleLabel = (role: MemberRole) => {
        switch (role) {
            case 'OWNER': return '创建者';
            case 'EDITOR': return '可编辑';
            case 'VIEWER': return '仅查看';
            default: return role;
        }
    };

    const getRoleColor = (role: MemberRole): 'primary' | 'secondary' | 'default' => {
        switch (role) {
            case 'OWNER': return 'primary';
            case 'EDITOR': return 'secondary';
            default: return 'default';
        }
    };

    const handleDayToggle = (dayId: string) => {
        setExpandedDays(prev =>
            prev.includes(dayId)
                ? prev.filter(id => id !== dayId)
                : [...prev, dayId]
        );
    };

    // Wishlist handlers
    const fetchWishlist = async () => {
        if (!tripId) return;
        try {
            setWishlistLoading(true);
            const items = await getWishlistItems(tripId);
            setWishlistItems(items || []);
            // Track added IDs for filtering
            const poiIds = new Set<string>();
            const nonPoiIds = new Set<string>();
            (items || []).forEach(w => {
                if (w.item.isPoi && w.item.entityId) {
                    poiIds.add(w.item.entityId);
                } else if (!w.item.isPoi && w.item.entityId) {
                    nonPoiIds.add(w.item.entityId);
                }
            });
            setWishlistPoiIds(poiIds);
            setWishlistNonPoiIds(nonPoiIds);
        } catch (err) {
            console.error('Failed to fetch wishlist:', err);
            toast.error('获取心愿单失败');
        } finally {
            setWishlistLoading(false);
        }
    };

    const handleToggleWishlist = () => {
        if (!wishlistOpen) {
            fetchWishlist();
        }
        setWishlistOpen(!wishlistOpen);
    };

    const handleDeleteWishlistItem = async (itemId: string) => {
        try {
            await deleteWishlistItems([itemId]);
            toast.success('已从心愿单移除');
            setWishlistItems(prev => prev.filter(w => w.item.itemId !== itemId));
        } catch (err) {
            console.error('Failed to delete wishlist item:', err);
            toast.error('删除失败');
        }
    };

    // AI session addition handlers
    const handleOpenAiAddMode = async () => {
        try {
            const convs = await getAllConversations();
            setConversations(convs || []);
            setAddMode('ai');
        } catch (err) {
            console.error('Failed to fetch conversations:', err);
            toast.error('获取对话列表失败');
        }
    };

    const handleSelectConversation = async (conversationId: string) => {
        setSelectedConversationId(conversationId);
        if (!conversationId) return;

        try {
            setAiSessionLoading(true);
            const [pois, nonPois] = await Promise.all([
                getRecommendationPois(conversationId),
                getRecommendationNonPois(conversationId)
            ]);
            setAiSessionPois(pois || []);
            setAiSessionNonPois(nonPois || []);
        } catch (err) {
            console.error('Failed to fetch session items:', err);
            toast.error('获取推荐项失败');
        } finally {
            setAiSessionLoading(false);
        }
    };

    // Direct search handlers
    const handleOpenSearchAddMode = () => {
        setAddMode('search');
    };

    const handlePoiSearch = async () => {
        if (!poiSearchKeyword.trim()) return;

        try {
            setPoiSearchLoading(true);
            let results: Poi[];

            if (poiSearchType === 'semantic') {
                results = await semanticSearchPois({
                    queryText: poiSearchKeyword,
                    city: poiSearchCity || undefined,
                    topK: 20
                });
            } else if (poiSearchType === 'db') {
                results = await searchPoisFromDb({
                    keywords: poiSearchKeyword,
                    city: poiSearchCity || undefined
                });
            } else {
                // api
                results = await searchPoisFromApi({
                    keywords: poiSearchKeyword,
                    city: poiSearchCity || undefined
                });
            }

            // Filter out already added POIs
            const filtered = (results || []).filter(poi => !wishlistPoiIds.has(poi.poiId));
            setPoiSearchResults(filtered);
        } catch (err) {
            console.error('POI search failed:', err);
        } finally {
            setPoiSearchLoading(false);
        }
    };

    const handleNonPoiSearch = async () => {
        try {
            setNonPoiSearchLoading(true);
            const pageSize = 20;
            const result = await getNonPoiItemsPage(
                nonPoiSearchPage, // pageNum
                pageSize, // pageSize
                nonPoiSearchType || undefined
            );
            // Filter by keyword locally since API doesn't support it
            let filtered = result.records || [];
            if (nonPoiSearchKeyword.trim()) {
                filtered = filtered.filter(item =>
                    item.title.toLowerCase().includes(nonPoiSearchKeyword.toLowerCase()) ||
                    item.description?.toLowerCase().includes(nonPoiSearchKeyword.toLowerCase())
                );
            }
            // Filter out already added items
            filtered = filtered.filter(item => !wishlistNonPoiIds.has(item.id));
            setNonPoiSearchResults(filtered);
            setNonPoiSearchTotal(result.total || 0);
        } catch (err) {
            console.error('Non-POI search failed:', err);
        } finally {
            setNonPoiSearchLoading(false);
        }
    };

    // Add item to wishlist
    const handleAddItemToWishlist = async (entityId: string, isPoi: boolean) => {
        if (!tripId) return;

        try {
            await addWishlistItem(tripId, entityId, isPoi);
            toast.success('已添加到心愿单');
            // Remove from current search/AI session results immediately
            if (isPoi) {
                setPoiSearchResults(prev => prev.filter(p => p.poiId !== entityId));
                setAiSessionPois(prev => prev.filter(p => p.poiId !== entityId));
            } else {
                setNonPoiSearchResults(prev => prev.filter(n => n.id !== entityId));
                setAiSessionNonPois(prev => prev.filter(n => n.id !== entityId));
            }
            // Refresh wishlist
            fetchWishlist();
        } catch (err) {
            console.error('Failed to add to wishlist:', err);
            // Error toast is handled by response interceptor
        }
    };

    // Create activity and add to wishlist
    const handleCreateActivityAndAdd = async () => {
        if (!tripId || !createActivityFormData.title.trim()) return;
        try {
            setCreateActivityLoading(true);
            const newActivity = await createNonPoiItem({
                type: createActivityFormData.type,
                title: createActivityFormData.title,
                description: createActivityFormData.description || undefined,
                city: createActivityFormData.city || undefined,
                activityTime: createActivityFormData.activityTime || undefined,
                estimatedAddress: createActivityFormData.estimatedAddress || undefined,
                extraInfo: createActivityFormData.extraInfo || undefined,
                sourceUrl: createActivityFormData.sourceUrl || undefined,
            });
            // Add to wishlist
            await addWishlistItem(tripId, newActivity.id, false);
            toast.success('活动已创建并添加到心愿单');
            // Reset form and close dialog
            setCreateActivityFormData({
                type: 'ACTIVITY' as NonPoiType,
                title: '',
                description: '',
                city: '',
                activityTime: '',
                estimatedAddress: '',
                extraInfo: '',
                sourceUrl: '',
            });
            setCreateActivityDialogOpen(false);
            // Refresh wishlist
            fetchWishlist();
        } catch (err) {
            console.error('Failed to create activity:', err);
            // Error toast is handled by response interceptor
        } finally {
            setCreateActivityLoading(false);
        }
    };

    // Close add mode
    const handleCloseAddMode = () => {
        setAddMode(null);
        setSelectedConversationId('');
        setAiSessionPois([]);
        setAiSessionNonPois([]);
        setPoiSearchResults([]);
        setNonPoiSearchResults([]);
        setPoiSearchKeyword('');
        setPoiSearchCity('');
        setNonPoiSearchKeyword('');
    };

    // Open day selection menu for wishlist item
    const handleOpenDayMenu = (wishlistItem: EntireWishlistItem, e: React.MouseEvent<HTMLElement>) => {
        e.stopPropagation();
        if (!tripDetail?.tripDays || tripDetail.tripDays.length === 0) {
            toast.error('当前行程没有日程天');
            return;
        }
        setPendingWishlistItem(wishlistItem);
        setDayMenuAnchor(e.currentTarget);
    };

    // Close day selection menu
    const handleCloseDayMenu = () => {
        setDayMenuAnchor(null);
        setPendingWishlistItem(null);
    };

    // Add wishlist item to the selected day's schedule
    const handleAddWishlistToSchedule = async (targetDayId: string) => {
        if (!tripId || !pendingWishlistItem) return;

        const entityId = pendingWishlistItem.item.isPoi
            ? (pendingWishlistItem.entity as Poi)?.poiId
            : (pendingWishlistItem.entity as NonPoiItem)?.id;
        if (!entityId) {
            toast.error('无法获取项目ID');
            handleCloseDayMenu();
            return;
        }

        setAddToScheduleLoading(pendingWishlistItem.item.itemId);
        handleCloseDayMenu(); // Close menu immediately

        try {
            // Call API with empty dto (all null values as specified by user)
            const newItem = await addTripDayItem(
                tripId,
                targetDayId,
                entityId,
                pendingWishlistItem.item.isPoi,
                {} // Empty dto - backend will use defaults
            );
            // Add to tripDetail
            setTripDetail(prev => {
                if (!prev) return prev;
                return {
                    ...prev,
                    tripDays: prev.tripDays?.map(td => {
                        if (td.tripDay.tripDayId === targetDayId) {
                            return {
                                ...td,
                                tripDayItems: [
                                    ...(td.tripDayItems || []),
                                    { item: newItem, entity: pendingWishlistItem.entity }
                                ]
                            };
                        }
                        return td;
                    }) || []
                };
            });
            toast.success('已添加到日程');
        } catch (error) {
            // Error handled by interceptor
        } finally {
            setAddToScheduleLoading(null);
        }
    };

    // Handler to edit transport notes only - opens dedicated transport dialog
    const handleOpenEditTransportDialog = (dayItem: EntireTripDayItem, e: React.MouseEvent) => {
        e.stopPropagation();
        setEditingTransportItem(dayItem);
        setEditTransportNotes(dayItem.item.transportNotes || '');
        setEditTransportDialogOpen(true);
    };

    // Submit transport notes edit
    const handleUpdateTransportNotes = async () => {
        if (!editingTransportItem || !tripId) return;
        setEditTransportLoading(true);
        try {
            // Use update API with all fields, only changing transportNotes
            const updatedItem = await updateTripDayItem(tripId, {
                itemId: editingTransportItem.item.itemId,
                startTime: editingTransportItem.item.startTime || '',
                endTime: editingTransportItem.item.endTime || '',
                estimatedCost: editingTransportItem.item.estimatedCost || 0,
                notes: editingTransportItem.item.notes || '',
                transportNotes: editTransportNotes,
            });
            // Update state
            setTripDetail(prev => {
                if (!prev) return prev;
                return {
                    ...prev,
                    tripDays: prev.tripDays?.map(td => ({
                        ...td,
                        tripDayItems: td.tripDayItems?.map(item =>
                            item.item.itemId === updatedItem.itemId
                                ? { ...item, item: updatedItem }
                                : item
                        ) || []
                    })) || []
                };
            });
            toast.success('交通建议已更新');
            setEditTransportDialogOpen(false);
            setEditingTransportItem(null);
        } catch (error: any) {
            // Error handled by interceptor
        } finally {
            setEditTransportLoading(false);
        }
    };

    // Schedule item edit handlers
    const handleOpenEditItemDialog = (dayItem: EntireTripDayItem, e: React.MouseEvent) => {
        e.stopPropagation();
        setEditingItem(dayItem);
        setEditItemForm({
            itemId: dayItem.item.itemId,
            startTime: dayItem.item.startTime || '',
            endTime: dayItem.item.endTime || '',
            estimatedCost: dayItem.item.estimatedCost || 0,
            notes: dayItem.item.notes || '',
            transportNotes: dayItem.item.transportNotes || '',
        });
        // Also initialize NonPOI form if editing a NonPOI item
        if (!dayItem.item.isPoi && dayItem.entity && 'title' in dayItem.entity) {
            const nonPoi = dayItem.entity as NonPoiItem;
            setEditNonPoiForm({
                id: nonPoi.id,
                type: nonPoi.type as NonPoiType,
                title: nonPoi.title,
                description: nonPoi.description || '',
                city: nonPoi.city || '',
                activityTime: nonPoi.activityTime || '',
                estimatedAddress: nonPoi.estimatedAddress || '',
                extraInfo: nonPoi.extraInfo || '',
                sourceUrl: nonPoi.sourceUrl || '',
            });
        }
        setEditItemDialogOpen(true);
    };

    const handleUpdateItem = async () => {
        if (!editingItem || !tripId) return;
        setEditItemLoading(true);
        try {
            const updatedItem = await updateTripDayItem(tripId, editItemForm);
            // Update the item in tripDetail state
            setTripDetail(prev => {
                if (!prev) return prev;
                return {
                    ...prev,
                    tripDays: prev.tripDays?.map(td => ({
                        ...td,
                        tripDayItems: td.tripDayItems?.map(item =>
                            item.item.itemId === updatedItem.itemId
                                ? { ...item, item: updatedItem }
                                : item
                        ) || []
                    })) || []
                };
            });
            toast.success('日程项已更新');
            setEditItemDialogOpen(false);
            setEditingItem(null);
        } catch (error: any) {
            // Error handled by interceptor
        } finally {
            setEditItemLoading(false);
        }
    };

    // Update NonPOI item itself
    const handleUpdateNonPoi = async () => {
        if (!editingItem || editingItem.item.isPoi) return;
        setEditNonPoiLoading(true);
        try {
            const updatedNonPoi = await updateNonPoiItem(editNonPoiForm);
            // Update the entity in tripDetail state
            setTripDetail(prev => {
                if (!prev) return prev;
                return {
                    ...prev,
                    tripDays: prev.tripDays?.map(td => ({
                        ...td,
                        tripDayItems: td.tripDayItems?.map(item =>
                            item.item.itemId === editingItem.item.itemId
                                ? { ...item, entity: updatedNonPoi }
                                : item
                        ) || []
                    })) || []
                };
            });
            toast.success('非POI项已更新');
        } catch (error: any) {
            // Error handled by interceptor
        } finally {
            setEditNonPoiLoading(false);
        }
    };

    // Delete item directly (no confirmation dialog)
    const handleDeleteItem = async (dayItem: EntireTripDayItem) => {
        if (!tripId) return;
        try {
            await deleteTripDayItems(tripId, [dayItem.item.itemId]);
            // Remove the item from tripDetail state
            setTripDetail(prev => {
                if (!prev) return prev;
                return {
                    ...prev,
                    tripDays: prev.tripDays?.map(td => ({
                        ...td,
                        tripDayItems: td.tripDayItems?.filter(item =>
                            item.item.itemId !== dayItem.item.itemId
                        ) || []
                    })) || []
                };
            });
            toast.success('日程项已删除');
        } catch (error: any) {
            // Error handled by interceptor
        }
    };

    // AI update transport notes
    const handleAiUpdateTransport = async (itemId: string, originAddress?: string) => {
        if (!tripId) return;
        setAiTransportLoadingId(itemId);
        try {
            toast.info('正在AI更新交通建议...');
            const updatedItem = await updateTripDayItemTransport(tripId, itemId, originAddress);
            // Update the item in tripDetail state
            setTripDetail(prev => {
                if (!prev) return prev;
                return {
                    ...prev,
                    tripDays: prev.tripDays?.map(td => ({
                        ...td,
                        tripDayItems: td.tripDayItems?.map(item =>
                            item.item.itemId === updatedItem.itemId
                                ? { ...item, item: updatedItem }
                                : item
                        ) || []
                    })) || []
                };
            });
            toast.success('交通建议已更新');
        } catch (error: any) {
            // Error handled by interceptor
        } finally {
            setAiTransportLoadingId(null);
        }
    };

    // Handle transport notes toggle
    const toggleTransportExpanded = (itemId: string) => {
        setExpandedTransportIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(itemId)) {
                newSet.delete(itemId);
            } else {
                newSet.add(itemId);
            }
            return newSet;
        });
    };

    // Helper to find item and its day
    const findItemAndDay = (itemId: string): { item: EntireTripDayItem; tripDay: EntireTripDay; index: number } | null => {
        if (!tripDetail?.tripDays) return null;
        for (const tripDay of tripDetail.tripDays) {
            const items = tripDay.tripDayItems || [];
            const index = items.findIndex(item => item.item.itemId === itemId);
            if (index !== -1) {
                return { item: items[index], tripDay, index };
            }
        }
        return null;
    };

    // Item drag handlers for dnd-kit
    const handleItemDragStart = (event: DragStartEvent) => {
        setActiveId(event.active.id);
        dropTargetRef.current = null; // Reset on drag start
        preDragStateRef.current = tripDetail; // Save state before drag for rollback
    };

    // Handle drag over - update state during drag for visual feedback AND store target info
    const handleItemDragOver = (event: DragOverEvent) => {
        const { active, over } = event;
        if (!over || active.id === over.id || !tripDetail) return;

        const activeData = findItemAndDay(active.id as string);
        if (!activeData) return;

        const sourceDayId = activeData.tripDay.tripDay.tripDayId;

        // Check if dropping on an empty day
        const overId = over.id as string;
        const isEmptyDayDrop = overId.startsWith('empty-day-');

        let targetDayId: string;
        let prevId: string | null = null;
        let nextId: string | null = null;

        if (isEmptyDayDrop) {
            targetDayId = overId.replace('empty-day-', '');
            // Empty day: no prev, no next
            prevId = null;
            nextId = null;
        } else {
            const overData = findItemAndDay(overId);
            if (!overData) return;
            targetDayId = overData.tripDay.tripDay.tripDayId;

            const isSameDay = sourceDayId === targetDayId;
            const targetDayItems = [...(overData.tripDay.tripDayItems || [])];
            const overIndex = targetDayItems.findIndex(item => item.item.itemId === over.id);

            if (isSameDay) {
                // Same day: simulate arrayMove to get new positions
                const activeIndex = targetDayItems.findIndex(item => item.item.itemId === active.id);
                const itemsAfterMove = arrayMove(targetDayItems, activeIndex, overIndex);
                const newActiveIndex = itemsAfterMove.findIndex(item => item.item.itemId === active.id);

                if (newActiveIndex > 0) {
                    prevId = itemsAfterMove[newActiveIndex - 1].item.itemId;
                }
                if (newActiveIndex < itemsAfterMove.length - 1) {
                    nextId = itemsAfterMove[newActiveIndex + 1].item.itemId;
                }
            } else {
                // Cross-day: item will be inserted at overIndex
                if (overIndex > 0) {
                    prevId = targetDayItems[overIndex - 1].item.itemId;
                }
                nextId = targetDayItems[overIndex].item.itemId;
            }
        }

        // Store target info in ref for use in handleItemDragEnd
        dropTargetRef.current = { targetDayId, prevId, nextId };

        // Visual update - only for cross-day moves
        if (sourceDayId !== targetDayId) {
            setTripDetail(prev => {
                if (!prev) return prev;
                return {
                    ...prev,
                    tripDays: prev.tripDays?.map(td => {
                        if (td.tripDay.tripDayId === sourceDayId) {
                            // Remove from source
                            return {
                                ...td,
                                tripDayItems: td.tripDayItems?.filter(item => item.item.itemId !== active.id) || []
                            };
                        }
                        if (td.tripDay.tripDayId === targetDayId) {
                            // Check if item already exists in target (avoid duplicate)
                            if (td.tripDayItems?.some(item => item.item.itemId === active.id)) {
                                if (isEmptyDayDrop) return td;
                                // Already in target, just reorder
                                const items = [...(td.tripDayItems || [])];
                                const activeIndex = items.findIndex(item => item.item.itemId === active.id);
                                const overIndex = items.findIndex(item => item.item.itemId === over.id);
                                if (activeIndex !== -1 && overIndex !== -1) {
                                    return { ...td, tripDayItems: arrayMove(items, activeIndex, overIndex) };
                                }
                                return td;
                            }
                            // Add to target
                            const items = [...(td.tripDayItems || [])];
                            if (isEmptyDayDrop) {
                                // Empty day - just add at the end
                                items.push({
                                    ...activeData.item,
                                    item: { ...activeData.item.item, tripDayId: targetDayId }
                                });
                            } else {
                                // Insert at over position
                                const overIndex = items.findIndex(item => item.item.itemId === over.id);
                                const insertIndex = overIndex >= 0 ? overIndex : items.length;
                                items.splice(insertIndex, 0, {
                                    ...activeData.item,
                                    item: { ...activeData.item.item, tripDayId: targetDayId }
                                });
                            }
                            return { ...td, tripDayItems: items };
                        }
                        return td;
                    }) || []
                };
            });
        } else if (!isEmptyDayDrop) {
            // Same day - use arrayMove for visual reorder
            setTripDetail(prev => {
                if (!prev) return prev;
                return {
                    ...prev,
                    tripDays: prev.tripDays?.map(td => {
                        if (td.tripDay.tripDayId === sourceDayId) {
                            const items = [...(td.tripDayItems || [])];
                            const activeIndex = items.findIndex(item => item.item.itemId === active.id);
                            const overIndex = items.findIndex(item => item.item.itemId === over.id);
                            if (activeIndex !== -1 && overIndex !== -1 && activeIndex !== overIndex) {
                                return { ...td, tripDayItems: arrayMove(items, activeIndex, overIndex) };
                            }
                        }
                        return td;
                    }) || []
                };
            });
        }
    };

    const handleItemDragEnd = async (event: DragEndEvent) => {
        const { active } = event;
        setActiveId(null);

        // Use the target info stored by handleItemDragOver
        const dropTarget = dropTargetRef.current;
        dropTargetRef.current = null; // Reset ref

        // Get the pre-drag state for rollback
        const preDragState = preDragStateRef.current;
        preDragStateRef.current = null; // Reset ref

        console.log('handleItemDragEnd called', { activeId: active.id, dropTarget });

        if (!dropTarget || !tripId || !tripDetail) {
            console.log('Early return:', { dropTarget: !!dropTarget, tripId: !!tripId, tripDetail: !!tripDetail });
            // Rollback if no valid drop target
            if (preDragState) {
                setTripDetail(preDragState);
            }
            return;
        }

        const { targetDayId, prevId, nextId } = dropTarget;

        console.log('Calling API:', { tripId, activeId: active.id, targetDayId, prevId, nextId });
        try {
            await moveTripDayItem(tripId, active.id as string, targetDayId, prevId, nextId);
            console.log('API call succeeded');
        } catch (error) {
            console.error('API call failed', error);
            // Rollback to pre-drag state on error
            if (preDragState) {
                setTripDetail(preDragState);
            }
        }
    };

    // Trip Day management handlers
    const handleStartEditNotes = (tripDay: EntireTripDay) => {
        setEditingNotesDayId(tripDay.tripDay.tripDayId);
        setEditingNotesValue(tripDay.tripDay.notes || '');
    };

    const handleSaveNotes = async (tripDayId: string) => {
        if (!tripId) return;
        const previousState = tripDetail;

        // Optimistic update
        setTripDetail(prev => {
            if (!prev) return prev;
            return {
                ...prev,
                tripDays: prev.tripDays?.map(td =>
                    td.tripDay.tripDayId === tripDayId
                        ? { ...td, tripDay: { ...td.tripDay, notes: editingNotesValue } }
                        : td
                ) || []
            };
        });
        setEditingNotesDayId(null);

        try {
            await updateTripDayNote(tripId, tripDayId, editingNotesValue);
        } catch {
            setTripDetail(previousState);
        }
    };

    const handleCancelEditNotes = () => {
        setEditingNotesDayId(null);
        setEditingNotesValue('');
    };

    const handleCreateDay = async () => {
        if (!tripId || !createDayForm.date) return;
        setCreateDayLoading(true);
        try {
            await createTripDay(tripId, createDayForm.date, createDayForm.note || undefined);
            // Refresh all days
            const allDays = await getTripDaysList(tripId);
            setTripDetail(prev => prev ? { ...prev, tripDays: allDays } : prev);
            setCreateDayDialogOpen(false);
            setCreateDayForm({ date: '', note: '' });
            toast.success('日程创建成功');
        } catch {
            // Error handled by interceptor
        } finally {
            setCreateDayLoading(false);
        }
    };

    const handleOpenDeleteDayDialog = (tripDay: EntireTripDay) => {
        setDayToDelete(tripDay);
        setDeleteDayDialogOpen(true);
    };

    const handleDeleteDay = async () => {
        if (!tripId || !dayToDelete) return;
        setDeleteDayLoading(true);
        try {
            await deleteTripDays(tripId, [dayToDelete.tripDay.tripDayId]);
            // Refresh all days
            const allDays = await getTripDaysList(tripId);
            setTripDetail(prev => prev ? { ...prev, tripDays: allDays } : prev);
            // Remove from expandedDays
            setExpandedDays(prev => prev.filter(id => id !== dayToDelete.tripDay.tripDayId));
            setDeleteDayDialogOpen(false);
            setDayToDelete(null);
            toast.success('日程删除成功');
        } catch {
            // Error handled by interceptor
        } finally {
            setDeleteDayLoading(false);
        }
    };

    const handleOpenSwapMenu = (event: React.MouseEvent<HTMLElement>, tripDay: EntireTripDay) => {
        setSwapDayAnchor(event.currentTarget);
        setSwapSourceDay(tripDay);
    };

    const handleSwapDayOrder = async (targetDay: EntireTripDay) => {
        if (!tripId || !swapSourceDay) return;
        setSwapDayAnchor(null);

        const previousState = tripDetail;
        // Optimistic update - swap the two days in the list
        setTripDetail(prev => {
            if (!prev) return prev;
            const days = [...(prev.tripDays || [])];
            const sourceIdx = days.findIndex(d => d.tripDay.tripDayId === swapSourceDay.tripDay.tripDayId);
            const targetIdx = days.findIndex(d => d.tripDay.tripDayId === targetDay.tripDay.tripDayId);
            if (sourceIdx !== -1 && targetIdx !== -1) {
                [days[sourceIdx], days[targetIdx]] = [days[targetIdx], days[sourceIdx]];
            }
            return { ...prev, tripDays: days };
        });

        try {
            await exchangeTripDayOrder(tripId, swapSourceDay.tripDay.tripDayId, targetDay.tripDay.tripDayId);
        } catch {
            setTripDetail(previousState);
        }
        setSwapSourceDay(null);
    };

    const handleAiReplanDay = async (tripDay: EntireTripDay) => {
        if (!tripId) return;
        setAiReplanLoading(tripDay.tripDay.tripDayId);
        try {
            const updatedDay = await aiReplanTripDay(tripId, tripDay.tripDay.tripDayId);
            setTripDetail(prev => {
                if (!prev) return prev;
                return {
                    ...prev,
                    tripDays: prev.tripDays?.map(td =>
                        td.tripDay.tripDayId === tripDay.tripDay.tripDayId ? updatedDay : td
                    ) || []
                };
            });
            toast.success('AI 重新规划完成');
        } catch {
            // Error handled by interceptor
        } finally {
            setAiReplanLoading(null);
        }
    };

    const handleAiGenerateTrip = async () => {
        if (!tripId) return;
        setAiGenerateDialogOpen(false);
        setAiGenerateLoading(true);
        try {
            const generatedTrip = await aiGenerateTrip(tripId);
            setTripDetail(generatedTrip);
            // Refresh wishlist as some items may have been added to schedule
            fetchWishlist();
            toast.success('AI 旅程生成完成！');
        } catch {
            // Error handled by interceptor
        } finally {
            setAiGenerateLoading(false);
        }
    };

    const formatDate = (dateStr: string) => {
        try {
            return new Date(dateStr).toLocaleDateString('zh-CN');
        } catch {
            return dateStr;
        }
    };

    // AI dialog handlers
    const handleOpenAiDialog = useCallback(() => {
        if (aiDialogOpen) {
            // Close dialog if already open
            setAiDialogOpen(false);
            return;
        }
        // Position in center-bottom
        const dialogWidth = aiDialogSize.width;
        const dialogHeight = aiDialogSize.height;
        const x = Math.max(0, (window.innerWidth - dialogWidth) / 2);
        const y = Math.max(0, window.innerHeight - dialogHeight - 100);
        setAiDialogPosition({ x, y });
        setAiDialogOpen(true);
    }, [aiDialogSize, aiDialogOpen]);

    const handleDragStart = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        setIsDragging(true);
        dragStartRef.current = {
            x: e.clientX - aiDialogPosition.x,
            y: e.clientY - aiDialogPosition.y,
        };
    }, [aiDialogPosition]);

    const handleResizeStart = useCallback((edge: string) => (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsResizing(true);
        setResizeEdge(edge);
        resizeStartRef.current = {
            width: aiDialogSize.width,
            height: aiDialogSize.height,
            x: e.clientX,
            y: e.clientY,
            left: aiDialogPosition.x,
            top: aiDialogPosition.y,
        };
    }, [aiDialogSize, aiDialogPosition]);

    useEffect(() => {
        let animationFrameId: number | null = null;

        const handleMouseMove = (e: MouseEvent) => {
            if (animationFrameId) return;
            animationFrameId = requestAnimationFrame(() => {
                animationFrameId = null;
                if (isDragging) {
                    const newX = Math.max(0, Math.min(window.innerWidth - aiDialogSize.width, e.clientX - dragStartRef.current.x));
                    const newY = Math.max(0, Math.min(window.innerHeight - 50, e.clientY - dragStartRef.current.y));
                    setAiDialogPosition({ x: newX, y: newY });
                } else if (isResizing && resizeEdge) {
                    const deltaX = e.clientX - resizeStartRef.current.x;
                    const deltaY = e.clientY - resizeStartRef.current.y;
                    let newWidth = resizeStartRef.current.width;
                    let newHeight = resizeStartRef.current.height;
                    let newLeft = resizeStartRef.current.left;
                    let newTop = resizeStartRef.current.top;

                    // Handle horizontal resizing
                    if (resizeEdge.includes('e')) {
                        newWidth = Math.max(500, resizeStartRef.current.width + deltaX);
                    }
                    if (resizeEdge.includes('w')) {
                        const maxDeltaX = resizeStartRef.current.width - 500;
                        const actualDeltaX = Math.min(deltaX, maxDeltaX);
                        newWidth = resizeStartRef.current.width - actualDeltaX;
                        newLeft = resizeStartRef.current.left + actualDeltaX;
                    }
                    // Handle vertical resizing
                    if (resizeEdge.includes('s')) {
                        newHeight = Math.max(350, resizeStartRef.current.height + deltaY);
                    }
                    if (resizeEdge.includes('n')) {
                        const maxDeltaY = resizeStartRef.current.height - 350;
                        const actualDeltaY = Math.min(deltaY, maxDeltaY);
                        newHeight = resizeStartRef.current.height - actualDeltaY;
                        newTop = resizeStartRef.current.top + actualDeltaY;
                    }

                    setAiDialogSize({ width: newWidth, height: newHeight });
                    setAiDialogPosition({ x: Math.max(0, newLeft), y: Math.max(0, newTop) });
                }
            });
        };

        const handleMouseUp = () => {
            setIsDragging(false);
            setIsResizing(false);
            setResizeEdge('');
        };

        if (isDragging || isResizing) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        }

        return () => {
            if (animationFrameId) cancelAnimationFrame(animationFrameId);
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging, isResizing, resizeEdge, aiDialogSize]);

    const formatDateTime = (dateStr: string) => {
        try {
            return new Date(dateStr).toLocaleString('zh-CN');
        } catch {
            return dateStr;
        }
    };

    // Render POI Card
    const renderPoiCard = (poi: Poi, itemInfo: EntireTripDayItem['item']) => (
        <Card
            sx={{
                height: 140,
                display: 'flex',
                cursor: 'pointer',
                transition: 'box-shadow 0.2s, transform 0.2s',
                '&:hover': {
                    boxShadow: 4,
                    transform: 'translateY(-2px)',
                }
            }}
            onClick={() => setSelectedPoi(poi)}
        >
            {poi.photos && poi.photos.length > 0 && (
                <CardMedia
                    component="img"
                    sx={{ width: 90, objectFit: 'cover' }}
                    image={poi.photos[0]}
                    alt={poi.name}
                />
            )}
            <CardContent sx={{ flex: 1, overflow: 'hidden', p: 1.5, display: 'flex', flexDirection: 'column' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 0.2 }}>
                    <Typography variant="body1" fontWeight="bold" noWrap sx={{ flex: 1, mr: 0.5, fontSize: '0.9rem' }}>
                        {poi.name}
                    </Typography>
                    <Chip size="small" label="POI" color="primary" sx={{ flexShrink: 0, fontSize: '0.65rem', height: 20 }} />
                </Box>
                {/* Time + Cost on same line */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.2, color: 'text.secondary' }}>
                    {(itemInfo.startTime || itemInfo.endTime) && (
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <AccessTime sx={{ fontSize: 12, mr: 0.3 }} />
                            <Typography variant="body2" sx={{ fontSize: '0.7rem' }}>
                                {itemInfo.startTime?.slice(0, 5) || '-'} - {itemInfo.endTime?.slice(0, 5) || '-'}
                            </Typography>
                        </Box>
                    )}
                    {itemInfo.estimatedCost != null && (
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <AttachMoney sx={{ fontSize: 12, mr: 0.3 }} />
                            <Typography variant="body2" sx={{ fontSize: '0.7rem' }}>¥{itemInfo.estimatedCost}</Typography>
                        </Box>
                    )}
                </Box>
                {/* Location on separate line */}
                {(poi.city || poi.address) && (
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.2, color: 'text.secondary' }}>
                        <Place sx={{ fontSize: 12, mr: 0.3 }} />
                        <Typography variant="body2" sx={{ fontSize: '0.7rem' }} noWrap>
                            {poi.city}{poi.address ? ` · ${poi.address}` : ''}
                        </Typography>
                    </Box>
                )}
                {/* Transport on separate line */}
                {itemInfo.transportNotes && (
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.2, color: 'text.secondary' }}>
                        <Typography variant="body2" sx={{ fontSize: '0.7rem' }} noWrap>
                            🚗 {itemInfo.transportNotes}
                        </Typography>
                    </Box>
                )}
                {/* Notes without divider/icon, larger font, with tooltip */}
                {itemInfo.notes && (
                    <Tooltip title={itemInfo.notes} placement="top" arrow>
                        <Typography
                            variant="body2"
                            color="primary.main"
                            fontWeight="medium"
                            sx={{
                                mt: 'auto',
                                mb: -1,
                                pt: 0.3,
                                overflow: 'hidden',
                                display: '-webkit-box',
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: 'vertical',
                                cursor: 'default',
                                fontSize: '0.8rem',
                            }}
                        >
                            {itemInfo.notes}
                        </Typography>
                    </Tooltip>
                )}
            </CardContent>
        </Card>
    );

    // Render NonPoi Card
    const renderNonPoiCard = (nonPoi: NonPoiItem, itemInfo: EntireTripDayItem['item']) => (
        <Card
            sx={{
                height: 140,
                display: 'flex',
                flexDirection: 'column',
                cursor: 'pointer',
                transition: 'box-shadow 0.2s, transform 0.2s',
                '&:hover': {
                    boxShadow: 4,
                    transform: 'translateY(-2px)',
                },
            }}
            onClick={() => setSelectedNonPoi(nonPoi)}
        >
            <CardContent sx={{ flex: 1, overflow: 'hidden', p: 1.5, display: 'flex', flexDirection: 'column' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 0.2 }}>
                    <Typography variant="body1" fontWeight="bold" noWrap sx={{ flex: 1, mr: 0.5, fontSize: '0.9rem' }}>
                        {nonPoi.title}
                    </Typography>
                    <Chip
                        size="small"
                        icon={getNonPoiTypeIcon(nonPoi.type)}
                        label={nonPoi.type}
                        color={getNonPoiTypeColor(nonPoi.type)}
                        sx={{ flexShrink: 0, fontSize: '0.65rem', height: 20 }}
                    />
                </Box>
                {/* Time + Cost on same line */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.2, color: 'text.secondary' }}>
                    {(itemInfo.startTime || itemInfo.endTime) && (
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <AccessTime sx={{ fontSize: 12, mr: 0.3 }} />
                            <Typography variant="body2" sx={{ fontSize: '0.7rem' }}>
                                {itemInfo.startTime?.slice(0, 5) || '-'} - {itemInfo.endTime?.slice(0, 5) || '-'}
                            </Typography>
                        </Box>
                    )}
                    {itemInfo.estimatedCost != null && (
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <AttachMoney sx={{ fontSize: 12, mr: 0.3 }} />
                            <Typography variant="body2" sx={{ fontSize: '0.7rem' }}>¥{itemInfo.estimatedCost}</Typography>
                        </Box>
                    )}
                </Box>
                {/* Location on separate line */}
                {(nonPoi.city || nonPoi.estimatedAddress) && (
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.2, color: 'text.secondary' }}>
                        <Place sx={{ fontSize: 12, mr: 0.3 }} />
                        <Typography variant="body2" sx={{ fontSize: '0.7rem' }} noWrap>
                            {nonPoi.city}{nonPoi.estimatedAddress ? ` · ${nonPoi.estimatedAddress}` : ''}
                        </Typography>
                    </Box>
                )}
                {/* Transport on separate line */}
                {itemInfo.transportNotes && (
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.2, color: 'text.secondary' }}>
                        <Typography variant="body2" sx={{ fontSize: '0.7rem' }} noWrap>
                            🚗 {itemInfo.transportNotes}
                        </Typography>
                    </Box>
                )}
                {/* Notes without divider/icon, larger font, with tooltip */}
                {itemInfo.notes && (
                    <Tooltip title={itemInfo.notes} placement="top" arrow>
                        <Typography
                            variant="body2"
                            color="primary.main"
                            fontWeight="medium"
                            sx={{
                                mt: 'auto',
                                pt: 0.3,
                                mb: -1,
                                overflow: 'hidden',
                                display: '-webkit-box',
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: 'vertical',
                                cursor: 'default',
                                fontSize: '0.8rem',
                            }}
                        >
                            {itemInfo.notes}
                        </Typography>
                    </Tooltip>
                )}
            </CardContent>
        </Card>
    );

    if (loading) {
        return (
            <Box sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#f5f5f5' }}>
                <CircularProgress />
            </Box>
        );
    }

    if (error || !tripDetail) {
        return (
            <Box sx={{ height: '100%', bgcolor: '#f5f5f5', py: 4 }}>
                <Container maxWidth="lg">
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                        <IconButton onClick={() => navigate('/explore')}>
                            <ArrowBack />
                        </IconButton>
                        <Typography variant="h5" fontWeight="bold" sx={{ ml: 1 }}>返回</Typography>
                    </Box>
                    <Typography color="error">{error || '旅程不存在'}</Typography>
                </Container>
            </Box>
        );
    }

    return (
        <Box sx={{
            height: '100%',
            bgcolor: '#f5f5f5',
            py: 2,
            overflowY: 'auto',
            scrollbarWidth: 'none',
            '&::-webkit-scrollbar': { display: 'none' },
        }}>
            <Container maxWidth="lg">
                {/* Header */}
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, flexShrink: 0 }}>
                    <IconButton onClick={() => navigate(-1)}>
                        <ArrowBack />
                    </IconButton>
                    <Typography variant="h5" fontWeight="bold" sx={{ ml: 1 }}>旅程详情</Typography>
                </Box>

                {/* Trip Info Card */}
                <Card sx={{ mb: 2, borderRadius: 2, flexShrink: 0 }}>
                    <CardContent>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                            <Typography variant="h4" fontWeight="bold">{tripDetail.trip.title}</Typography>
                            <Chip
                                size="medium"
                                label={getStatusLabel(tripDetail.trip.status)}
                                color={getStatusColor(tripDetail.trip.status) as 'info' | 'warning' | 'success' | 'error' | 'default'}
                            />
                        </Box>

                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 5, alignItems: 'center' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                <LocationOn fontSize="small" sx={{ mr: 0.5, color: 'text.secondary' }} />
                                <Typography variant="body2">{tripDetail.trip.destinationCity}</Typography>
                            </Box>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                <CalendarToday fontSize="small" sx={{ mr: 0.5, color: 'text.secondary' }} />
                                <Typography variant="body2">
                                    {formatDate(tripDetail.trip.startDate)} - {formatDate(tripDetail.trip.endDate)}
                                </Typography>
                            </Box>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                <AttachMoney fontSize="small" sx={{ mr: 0.5, color: 'text.secondary' }} />
                                <Typography variant="body2">¥{tripDetail.trip.totalBudget ?? 0}</Typography>
                            </Box>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                <Event fontSize="small" sx={{ mr: 0.5, color: 'text.secondary' }} />
                                <Typography variant="body2">创建于 {formatDate(tripDetail.trip.createdAt)}</Typography>
                            </Box>
                        </Box>

                        {tripDetail.trip.description && (
                            <Typography variant="body1" sx={{ mt: 2, lineHeight: 1.7, color: 'text.primary' }}>
                                {tripDetail.trip.description}
                            </Typography>
                        )}

                        {/* Management Section for OWNER/EDITOR from MyTrips */}
                        {canManage && (
                            <>
                                <Divider sx={{ my: 2 }} />
                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center' }}>
                                    <FormControlLabel
                                        control={
                                            <Switch
                                                checked={!currentVisibility}
                                                onChange={handleToggleVisibility}
                                            />
                                        }
                                        label={
                                            <Chip
                                                size="small"
                                                icon={currentVisibility ? <Lock fontSize="small" /> : <LockOpen fontSize="small" />}
                                                label={currentVisibility ? 'PRIVATE' : 'PUBLIC'}
                                                variant="outlined"
                                            />
                                        }
                                    />
                                    <FormControl size="small" sx={{ minWidth: 120 }}>
                                        <InputLabel>状态</InputLabel>
                                        <Select
                                            value={currentStatus}
                                            label="状态"
                                            onChange={(e) => handleStatusChange(e.target.value as TripStatus)}
                                        >
                                            <MenuItem value="PLANNING">规划中</MenuItem>
                                            <MenuItem value="IN_PROGRESS">进行中</MenuItem>
                                            <MenuItem value="COMPLETED">已完成</MenuItem>
                                            <MenuItem value="CANCELLED">已取消</MenuItem>
                                        </Select>
                                    </FormControl>
                                    <Box sx={{ flex: 1 }} />
                                    <Button
                                        startIcon={<Delete />}
                                        color="error"
                                        onClick={handleOpenDeleteDialog}
                                    >
                                        删除
                                    </Button>
                                    <Button
                                        startIcon={<Edit />}
                                        variant="contained"
                                        onClick={handleOpenEditDialog}
                                        sx={{
                                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                            '&:hover': {
                                                background: 'linear-gradient(135deg, #5a6fd6 0%, #6a4190 100%)',
                                            },
                                        }}
                                    >
                                        编辑
                                    </Button>
                                </Box>
                            </>
                        )}
                    </CardContent>
                </Card>

                {/* Trip Days - Sidebar + Content Layout */}
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 1, mb: 2, flexShrink: 0 }}>
                    <Typography variant="h5" fontWeight="bold">行程安排</Typography>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                        {canManage && (
                            <>
                                <Button
                                    variant="outlined"
                                    startIcon={<Add />}
                                    onClick={() => setCreateDayDialogOpen(true)}
                                    disabled={aiGenerateLoading}
                                    sx={{
                                        color: '#4caf50',
                                        borderColor: '#4caf50',
                                        '&:hover': {
                                            bgcolor: 'rgba(76, 175, 80, 0.08)',
                                            borderColor: '#388e3c',
                                        }
                                    }}
                                >
                                    新日程
                                </Button>
                                <Tooltip title="AI根据心愿单智能生成完整旅程">
                                    <Button
                                        variant="outlined"
                                        startIcon={<AutoAwesome />}
                                        onClick={() => setAiGenerateDialogOpen(true)}
                                        disabled={aiGenerateLoading}
                                        sx={{
                                            color: '#9c27b0',
                                            borderColor: '#9c27b0',
                                            '&:hover': {
                                                bgcolor: 'rgba(156, 39, 176, 0.08)',
                                                borderColor: '#7b1fa2',
                                            }
                                        }}
                                    >
                                        AI生成
                                    </Button>
                                </Tooltip>
                            </>
                        )}
                        {showWishlist && (
                            <Button
                                variant={wishlistOpen ? 'contained' : 'outlined'}
                                startIcon={<FavoriteBorder />}
                                onClick={handleToggleWishlist}
                                sx={{
                                    color: wishlistOpen ? 'white' : '#667eea',
                                    borderColor: '#667eea',
                                    bgcolor: wishlistOpen ? '#667eea' : 'transparent',
                                    '&:hover': {
                                        bgcolor: wishlistOpen ? '#5a6fd6' : 'rgba(102, 126, 234, 0.08)',
                                        borderColor: '#5a6fd6',
                                    }
                                }}
                            >
                                心愿单
                            </Button>
                        )}
                    </Box>
                </Box>

                <Box sx={{ display: 'flex', gap: 2, flex: 1, minHeight: 0, mb: 1, position: 'relative' }}>
                    {/* Loading overlay when AI is generating */}
                    {aiGenerateLoading && (
                        <Box sx={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            bgcolor: 'rgba(255,255,255,0.85)',
                            zIndex: 10,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderRadius: 2,
                        }}>
                            <CircularProgress size={48} sx={{ color: '#9c27b0' }} />
                            <Typography variant="h6" sx={{ mt: 2, color: '#9c27b0' }}>
                                AI 正在生成旅程...
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                                这可能需要几分钟，请耐心等待
                            </Typography>
                        </Box>
                    )}
                    {/* Left Sidebar - Day List */}
                    <Box sx={{ width: 160, flexShrink: 0 }}>
                        {tripDetail.tripDays && tripDetail.tripDays.length > 0 ? (
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                {tripDetail.tripDays.map((tripDay, dayIndex) => {
                                    const isSelected = expandedDays.includes(tripDay.tripDay.tripDayId);
                                    return (
                                        <Box
                                            key={tripDay.tripDay.tripDayId}
                                            onClick={() => handleDayToggle(tripDay.tripDay.tripDayId)}
                                            sx={{
                                                p: 1.5,
                                                borderRadius: 2,
                                                cursor: 'pointer',
                                                bgcolor: isSelected ? 'primary.main' : '#e3f2fd',
                                                color: isSelected ? 'white' : 'primary.main',
                                                transition: 'all 0.2s ease',
                                                '&:hover': {
                                                    bgcolor: isSelected ? 'primary.dark' : '#bbdefb',
                                                },
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                            }}
                                        >
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                <CalendarToday sx={{ fontSize: 16 }} />
                                                <Box>
                                                    <Typography variant="body2" fontWeight="bold">
                                                        Day {dayIndex + 1}
                                                    </Typography>
                                                    <Typography variant="caption" sx={{ opacity: 0.8 }}>
                                                        {formatDate(tripDay.tripDay.dayDate)}
                                                    </Typography>
                                                </Box>
                                            </Box>
                                            {tripDay.tripDayItems && (
                                                <Chip
                                                    size="small"
                                                    label={tripDay.tripDayItems.length}
                                                    sx={{
                                                        bgcolor: isSelected ? 'rgba(255,255,255,0.3)' : 'primary.main',
                                                        color: 'white',
                                                        height: 20,
                                                        minWidth: 24,
                                                        fontSize: '0.7rem',
                                                    }}
                                                />
                                            )}
                                        </Box>
                                    );
                                })}
                            </Box>
                        ) : (
                            <Typography color="text.secondary" variant="body2">暂无日程</Typography>
                        )}
                    </Box>

                    {/* Right Content Area - Scrollable */}
                    <Box sx={{
                        flex: wishlistOpen ? 4 : 1,
                        minWidth: 0,
                        minHeight: '45vh',
                        maxHeight: '85vh',
                        overflowY: 'auto',
                        bgcolor: 'white',
                        borderRadius: 2,
                        p: 2,
                        scrollbarWidth: 'none',
                        '&::-webkit-scrollbar': { display: 'none' },
                    }}>
                        {expandedDays.length > 0 ? (
                            <DndContext
                                sensors={sensors}
                                collisionDetection={closestCenter}
                                onDragStart={handleItemDragStart}
                                onDragOver={handleItemDragOver}
                                onDragEnd={handleItemDragEnd}
                            >
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, pb: 1 }}>
                                    {tripDetail.tripDays
                                        ?.filter(td => expandedDays.includes(td.tripDay.tripDayId))
                                        .map((tripDay, idx) => {
                                            const dayIndex = tripDetail.tripDays?.findIndex(td => td.tripDay.tripDayId === tripDay.tripDay.tripDayId) ?? idx;
                                            return (
                                                <Card key={tripDay.tripDay.tripDayId} sx={{ borderRadius: 2, position: 'relative' }}>
                                                    {/* Loading overlay when AI is replanning this day */}
                                                    {aiReplanLoading === tripDay.tripDay.tripDayId && (
                                                        <Box sx={{
                                                            position: 'absolute',
                                                            top: 0,
                                                            left: 0,
                                                            right: 0,
                                                            bottom: 0,
                                                            bgcolor: 'rgba(255,255,255,0.85)',
                                                            zIndex: 10,
                                                            display: 'flex',
                                                            flexDirection: 'column',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            borderRadius: 2,
                                                        }}>
                                                            <CircularProgress size={32} sx={{ color: 'secondary.main' }} />
                                                            <Typography variant="body2" sx={{ mt: 1, color: 'secondary.main' }}>
                                                                AI 正在重新规划...
                                                            </Typography>
                                                        </Box>
                                                    )}
                                                    {/* Day Header */}
                                                    <Box sx={{ px: 2, py: 1, bgcolor: '#e3f2fd', borderRadius: '8px 8px 0 0' }}>
                                                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                                <CalendarToday sx={{ fontSize: 17, color: 'primary.main' }} />
                                                                <Typography variant="body2" fontWeight="bold" color="primary.main" sx={{ fontSize: 17 }}>
                                                                    Day {dayIndex + 1} - {formatDate(tripDay.tripDay.dayDate)}
                                                                </Typography>
                                                            </Box>
                                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                                {canManage && (
                                                                    <>
                                                                        <Tooltip title="AI智能重新规划（无地址的项目将被忽略，放到日程最后）">
                                                                            <IconButton
                                                                                size="small"
                                                                                onClick={() => handleAiReplanDay(tripDay)}
                                                                                disabled={aiReplanLoading === tripDay.tripDay.tripDayId || aiGenerateLoading}
                                                                                sx={{ color: 'secondary.main' }}
                                                                            >
                                                                                {aiReplanLoading === tripDay.tripDay.tripDayId
                                                                                    ? <CircularProgress size={16} />
                                                                                    : <AutoAwesome fontSize="small" />}
                                                                            </IconButton>
                                                                        </Tooltip>
                                                                        <Tooltip title="交换日程顺序">
                                                                            <IconButton
                                                                                size="small"
                                                                                onClick={(e) => handleOpenSwapMenu(e, tripDay)}
                                                                                disabled={aiReplanLoading === tripDay.tripDay.tripDayId || aiGenerateLoading}
                                                                                sx={{ color: 'info.main' }}
                                                                            >
                                                                                <Event fontSize="small" />
                                                                            </IconButton>
                                                                        </Tooltip>
                                                                        <Tooltip title="删除日程">
                                                                            <IconButton
                                                                                size="small"
                                                                                onClick={() => handleOpenDeleteDayDialog(tripDay)}
                                                                                disabled={aiReplanLoading === tripDay.tripDay.tripDayId || aiGenerateLoading}
                                                                                sx={{ color: 'error.main' }}
                                                                            >
                                                                                <Delete fontSize="small" />
                                                                            </IconButton>
                                                                        </Tooltip>
                                                                    </>
                                                                )}
                                                                <IconButton
                                                                    size="small"
                                                                    onClick={() => handleDayToggle(tripDay.tripDay.tripDayId)}
                                                                    sx={{ color: 'primary.main' }}
                                                                >
                                                                    <Close fontSize="small" />
                                                                </IconButton>
                                                            </Box>
                                                        </Box>
                                                    </Box>
                                                    {/* Day Content */}
                                                    <CardContent sx={{ px: 2, py: 1 }}>
                                                        {/* Notes section with inline editing */}
                                                        {editingNotesDayId === tripDay.tripDay.tripDayId ? (
                                                            <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                                                                <TextField
                                                                    size="small"
                                                                    fullWidth
                                                                    value={editingNotesValue}
                                                                    onChange={(e) => setEditingNotesValue(e.target.value)}
                                                                    onKeyDown={(e) => {
                                                                        if (e.key === 'Enter') handleSaveNotes(tripDay.tripDay.tripDayId);
                                                                        if (e.key === 'Escape') handleCancelEditNotes();
                                                                    }}
                                                                    placeholder="输入日程备注..."
                                                                    autoFocus
                                                                    sx={{ bgcolor: '#fff3e0' }}
                                                                />
                                                                <IconButton size="small" onClick={() => handleSaveNotes(tripDay.tripDay.tripDayId)} color="success">
                                                                    <Check fontSize="small" />
                                                                </IconButton>
                                                                <IconButton size="small" onClick={handleCancelEditNotes} color="error">
                                                                    <Close fontSize="small" />
                                                                </IconButton>
                                                            </Box>
                                                        ) : tripDay.tripDay.notes ? (
                                                            <Box sx={{ mb: 2, px: 1.5, py: 1, bgcolor: '#fff3e0', borderRadius: 1, borderLeft: '4px solid', borderColor: 'warning.main', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                                <Typography variant="body2" fontWeight="bold" color="warning.dark">
                                                                    📅 {tripDay.tripDay.notes}
                                                                </Typography>
                                                                {canManage && (
                                                                    <IconButton size="small" onClick={() => handleStartEditNotes(tripDay)} sx={{ ml: 1 }}>
                                                                        <Edit fontSize="small" sx={{ fontSize: 14 }} />
                                                                    </IconButton>
                                                                )}
                                                            </Box>
                                                        ) : canManage ? (
                                                            <Box sx={{ mb: 2 }}>
                                                                <Button
                                                                    size="small"
                                                                    variant="text"
                                                                    startIcon={<Add sx={{ fontSize: 14 }} />}
                                                                    onClick={() => handleStartEditNotes(tripDay)}
                                                                    sx={{ fontSize: '0.75rem', color: 'text.secondary' }}
                                                                >
                                                                    添加备注
                                                                </Button>
                                                            </Box>
                                                        ) : null}
                                                        {tripDay.tripDayItems && tripDay.tripDayItems.length > 0 ? (
                                                            <SortableContext
                                                                items={tripDay.tripDayItems.map(item => item.item.itemId)}
                                                                strategy={verticalListSortingStrategy}
                                                            >
                                                                <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                                                                    {tripDay.tripDayItems.map((dayItem, itemIndex) => {
                                                                        // Calculate previous item's address
                                                                        const prevItem = itemIndex > 0 ? tripDay.tripDayItems[itemIndex - 1] : null;
                                                                        let previousItemAddress = '';
                                                                        if (prevItem) {
                                                                            if (prevItem.item.isPoi && prevItem.entity && 'name' in prevItem.entity) {
                                                                                const poi = prevItem.entity as Poi;
                                                                                previousItemAddress = [poi.city, poi.address].filter(Boolean).join(' ');
                                                                            } else if (!prevItem.item.isPoi && prevItem.entity && 'title' in prevItem.entity) {
                                                                                const nonPoi = prevItem.entity as NonPoiItem;
                                                                                previousItemAddress = nonPoi.estimatedAddress || nonPoi.city || '';
                                                                            }
                                                                        }
                                                                        return (
                                                                            <SortableScheduleItem
                                                                                key={dayItem.item.itemId}
                                                                                dayItem={dayItem}
                                                                                itemIndex={itemIndex}
                                                                                canManage={canManage}
                                                                                isTransportExpanded={expandedTransportIds.has(dayItem.item.itemId)}
                                                                                toggleTransportExpanded={toggleTransportExpanded}
                                                                                handleOpenEditItemDialog={handleOpenEditItemDialog}
                                                                                handleDeleteItem={handleDeleteItem}
                                                                                handleOpenEditTransportDialog={handleOpenEditTransportDialog}
                                                                                handleAiUpdateTransport={handleAiUpdateTransport}
                                                                                aiTransportLoadingId={aiTransportLoadingId}
                                                                                aiReplanLoadingDayId={aiReplanLoading}
                                                                                previousItemAddress={previousItemAddress}
                                                                                setSelectedPoi={setSelectedPoi}
                                                                                setSelectedNonPoi={setSelectedNonPoi}
                                                                            />
                                                                        );
                                                                    })}
                                                                </Box>
                                                            </SortableContext>
                                                        ) : (
                                                            <DroppableEmptyDay dayId={tripDay.tripDay.tripDayId} />
                                                        )}
                                                    </CardContent>
                                                </Card>
                                            );
                                        })}
                                </Box>
                            </DndContext>
                        ) : (
                            <Box sx={{ p: 4, textAlign: 'center' }}>
                                <Typography color="text.secondary">请从左侧选择要查看的日程</Typography>
                            </Box>
                        )}
                    </Box>

                    {/* Wishlist Panel - Side by Side with Right Content */}
                    {wishlistOpen && (
                        <Box sx={{
                            flex: 3,
                            minWidth: 0,
                            minHeight: '45vh',
                            maxHeight: '85vh',
                            overflowY: 'auto',
                            bgcolor: 'white',
                            borderRadius: 2,
                            border: '2px solid #667eea',
                            scrollbarWidth: 'none',
                            '&::-webkit-scrollbar': { display: 'none' },
                        }}>
                            <Box sx={{ px: 1.5, py: 1, bgcolor: '#f5f7fa', borderRadius: '8px 8px 0 0', position: 'sticky', top: 0, zIndex: 1 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                        <FavoriteBorder sx={{ color: '#667eea', fontSize: 16 }} />
                                        <Typography variant="body1" fontWeight="bold" sx={{ fontSize: '0.9rem' }}>心愿单</Typography>
                                        <Chip size="small" label={wishlistItems.length} sx={{ bgcolor: '#667eea', color: 'white', height: 18, fontSize: '0.65rem' }} />
                                    </Box>
                                    <IconButton onClick={() => setWishlistOpen(false)} size="small" sx={{ p: 0.3 }}>
                                        <Close sx={{ fontSize: 18 }} />
                                    </IconButton>
                                </Box>
                            </Box>

                            {/* Action Buttons - Only show when in default mode */}
                            {addMode === null && (
                                <Box sx={{ px: 2, pt: 2, display: 'flex', gap: 1 }}>
                                    <Button
                                        size="small"
                                        variant="outlined"
                                        startIcon={<Search />}
                                        onClick={handleOpenAiAddMode}
                                        sx={{ flex: 1, color: '#667eea', borderColor: '#667eea', fontSize: '0.75rem', '&:hover': { borderColor: '#5a6fd6', bgcolor: 'rgba(102, 126, 234, 0.08)' } }}
                                    >
                                        从AI对话中添加
                                    </Button>
                                    <Button
                                        size="small"
                                        variant="outlined"
                                        startIcon={<Add />}
                                        onClick={handleOpenSearchAddMode}
                                        sx={{ flex: 1, color: '#667eea', borderColor: '#667eea', fontSize: '0.75rem', '&:hover': { borderColor: '#5a6fd6', bgcolor: 'rgba(102, 126, 234, 0.08)' } }}
                                    >
                                        直接搜索添加
                                    </Button>
                                </Box>
                            )}

                            {/* Content Area */}
                            <Box sx={{ p: 1.5 }}>
                                {/* AI Session Addition Mode */}
                                {addMode === 'ai' && (
                                    <Box>
                                        <Button size="small" startIcon={<ArrowBack sx={{ fontSize: 14 }} />} onClick={handleCloseAddMode} sx={{ mb: 1, py: 0, color: '#667eea', fontSize: '0.75rem' }}>
                                            返回心愿单
                                        </Button>
                                        <FormControl fullWidth size="small" sx={{ mb: 0.5 }}>
                                            <InputLabel sx={{ fontSize: '0.8rem' }}>选择AI对话</InputLabel>
                                            <Select value={selectedConversationId} label="选择AI对话" onChange={(e) => handleSelectConversation(e.target.value)} sx={{ fontSize: '0.8rem' }}>
                                                <MenuItem value=""><em>请选择对话</em></MenuItem>
                                                {conversations.map((conv) => (
                                                    <MenuItem key={conv.conversationId} value={conv.conversationId}>{conv.title || '未命名对话'}</MenuItem>
                                                ))}
                                            </Select>
                                        </FormControl>
                                        {selectedConversationId && (
                                            <>
                                                <Tabs value={aiSessionTab} onChange={(_, v) => setAiSessionTab(v)} sx={{ mb: 1, minHeight: 32, '& .MuiTab-root': { minHeight: 32, py: 0, fontSize: '0.75rem' }, '& .Mui-selected': { color: '#667eea' }, '& .MuiTabs-indicator': { backgroundColor: '#667eea' } }}>
                                                    <Tab label={`POI (${aiSessionPois.length})`} />
                                                    <Tab label={`活动 (${aiSessionNonPois.length})`} />
                                                </Tabs>
                                                {aiSessionLoading ? (
                                                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress sx={{ color: '#667eea' }} /></Box>
                                                ) : (
                                                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                                        {aiSessionTab === 0 && aiSessionPois.map((poi) => (
                                                            <Card key={poi.poiId} sx={{ borderRadius: 2, cursor: 'pointer', transition: 'box-shadow 0.2s, transform 0.2s', '&:hover': { boxShadow: 4, transform: 'translateY(-2px)' }, height: 110, overflow: 'hidden' }} onClick={() => setSelectedPoi(poi)}>
                                                                <Box sx={{ display: 'flex', height: '100%' }}>
                                                                    {poi.photos && poi.photos.length > 0 && (
                                                                        <CardMedia component="img" sx={{ width: 90, minWidth: 90, objectFit: 'cover', borderRadius: '8px 0 0 8px', flexShrink: 0, height: 110, overflow: 'hidden' }} image={poi.photos[0]} alt={poi.name} />
                                                                    )}
                                                                    <CardContent sx={{ flex: 1, px: 1.5, py: 1, '&:last-child': { pb: 1 }, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
                                                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 0.2 }}>
                                                                            <Typography variant="body2" fontWeight={500} noWrap sx={{ flex: 1, mr: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>{poi.name}</Typography>
                                                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0 }}>
                                                                                {poi.rating && <Chip size="small" icon={<Star sx={{ fontSize: 12 }} />} label={poi.rating} color="warning" sx={{ height: 18, fontSize: '0.6rem' }} />}
                                                                                <IconButton size="small" onClick={(e) => { e.stopPropagation(); handleAddItemToWishlist(poi.poiId, true); }} sx={{ p: 0.3, color: '#667eea', '&:hover': { color: 'white', bgcolor: '#667eea' } }}>
                                                                                    <Add sx={{ fontSize: 16 }} />
                                                                                </IconButton>
                                                                            </Box>
                                                                        </Box>
                                                                        {poi.type && <Chip size="small" label={poi.type} sx={{ mb: 0.5, height: 16, fontSize: '0.6rem', alignSelf: 'flex-start' }} />}
                                                                        {(poi.city || poi.address) && (
                                                                            <Box sx={{ display: 'flex', alignItems: 'center', color: 'text.secondary', overflow: 'hidden', mb: 0.5 }}>
                                                                                <Place sx={{ fontSize: 10, mr: 0.3, flexShrink: 0 }} />
                                                                                <Typography variant="body2" noWrap sx={{ fontSize: '0.7rem', overflow: 'hidden', textOverflow: 'ellipsis' }}>{poi.city}{poi.address ? ` · ${poi.address}` : ''}</Typography>
                                                                            </Box>
                                                                        )}
                                                                        {poi.description && (
                                                                            <Typography variant="caption" color="text.secondary" sx={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: 1.3, flex: 1 }}>{poi.description}</Typography>
                                                                        )}
                                                                    </CardContent>
                                                                </Box>
                                                            </Card>
                                                        ))}
                                                        {aiSessionTab === 1 && aiSessionNonPois.map((nonPoi) => (
                                                            <Card key={nonPoi.id} sx={{ borderRadius: 2, cursor: 'pointer', transition: 'box-shadow 0.2s, transform 0.2s', '&:hover': { boxShadow: 4, transform: 'translateY(-2px)' } }} onClick={() => setSelectedNonPoi(nonPoi)}>
                                                                <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                                                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 0.5 }}>
                                                                        <Typography variant="body2" fontWeight={500} noWrap sx={{ flex: 1, mr: 1 }}>{nonPoi.title}</Typography>
                                                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                                            <Chip size="small" icon={getNonPoiTypeIcon(nonPoi.type)} label={nonPoi.type} color={getNonPoiTypeColor(nonPoi.type)} sx={{ height: 18, fontSize: '0.6rem' }} />
                                                                            <IconButton size="small" onClick={(e) => { e.stopPropagation(); handleAddItemToWishlist(nonPoi.id, false); }} sx={{ p: 0.3, color: '#667eea', '&:hover': { color: 'white', bgcolor: '#667eea' } }}>
                                                                                <Add sx={{ fontSize: 16 }} />
                                                                            </IconButton>
                                                                        </Box>
                                                                    </Box>
                                                                    {(nonPoi.city || nonPoi.estimatedAddress) && (
                                                                        <Box sx={{ display: 'flex', alignItems: 'center', color: 'text.secondary', mb: 0.5 }}>
                                                                            <Place sx={{ fontSize: 12, mr: 0.3 }} />
                                                                            <Typography variant="caption" noWrap>{nonPoi.city}{nonPoi.estimatedAddress ? ` · ${nonPoi.estimatedAddress}` : ''}</Typography>
                                                                        </Box>
                                                                    )}
                                                                    {nonPoi.activityTime && (
                                                                        <Box sx={{ display: 'flex', alignItems: 'center', color: 'text.secondary', mb: 0.5 }}>
                                                                            <AccessTime sx={{ fontSize: 12, mr: 0.3 }} />
                                                                            <Typography variant="caption" noWrap>{nonPoi.activityTime}</Typography>
                                                                        </Box>
                                                                    )}
                                                                    {nonPoi.description && (
                                                                        <Typography variant="caption" color="text.secondary" sx={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: 1.3 }}>{nonPoi.description}</Typography>
                                                                    )}
                                                                </CardContent>
                                                            </Card>
                                                        ))}
                                                        {((aiSessionTab === 0 && aiSessionPois.length === 0) || (aiSessionTab === 1 && aiSessionNonPois.length === 0)) && (
                                                            <Typography color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>暂无推荐项</Typography>
                                                        )}
                                                    </Box>
                                                )}
                                            </>
                                        )}
                                    </Box>
                                )}

                                {/* Direct Search Mode */}
                                {addMode === 'search' && (
                                    <Box>
                                        <Button size="small" startIcon={<ArrowBack sx={{ fontSize: 14 }} />} onClick={handleCloseAddMode} sx={{ mb: 1, py: 0, color: '#667eea', fontSize: '0.75rem' }}>
                                            返回心愿单
                                        </Button>
                                        <Tabs value={searchTab} onChange={(_, v) => setSearchTab(v)} variant="fullWidth" sx={{ mt: -1, mb: 1, minHeight: 32, '& .MuiTab-root': { minHeight: 32, py: 0, fontSize: '0.75rem' }, '& .Mui-selected': { color: '#667eea' }, '& .MuiTabs-indicator': { backgroundColor: '#667eea' } }}>
                                            <Tab label="POI搜索" />
                                            <Tab label="活动搜索" />
                                        </Tabs>
                                        {searchTab === 0 && (
                                            <Box>
                                                <Box sx={{ mb: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <ToggleButtonGroup value={poiSearchType === 'api' ? null : poiSearchType} exclusive onChange={(_, value) => value && setPoiSearchType(value)} size="small" sx={{ '& .MuiToggleButton-root': { py: 0.3, fontSize: '0.7rem' } }}>
                                                        <ToggleButton value="semantic">语义</ToggleButton>
                                                        <ToggleButton value="db">精确</ToggleButton>
                                                    </ToggleButtonGroup>
                                                    <Button size="small" variant="text" onClick={() => setPoiSearchType('api')} sx={{ color: poiSearchType === 'api' ? '#667eea' : 'text.secondary', fontSize: '0.7rem', py: 0 }}>高德API</Button>
                                                </Box>
                                                <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                                                    <TextField size="small" placeholder="关键词..." value={poiSearchKeyword} onChange={(e) => setPoiSearchKeyword(e.target.value)} onKeyUp={(e) => e.key === 'Enter' && handlePoiSearch()} InputProps={{ startAdornment: <InputAdornment position="start"><Search sx={{ fontSize: 16 }} /></InputAdornment>, sx: { fontSize: '0.8rem' } }} sx={{ flex: 1 }} />
                                                    <TextField size="small" placeholder="城市" value={poiSearchCity} onChange={(e) => setPoiSearchCity(e.target.value)} InputProps={{ sx: { fontSize: '0.8rem' } }} sx={{ width: 60 }} />
                                                    <Button variant="contained" size="small" onClick={handlePoiSearch} disabled={!poiSearchKeyword.trim()} sx={{ bgcolor: '#667eea', '&:hover': { bgcolor: '#5a6fd6' }, fontSize: '0.75rem', px: 1.5 }}>搜索</Button>
                                                </Box>
                                                {poiSearchLoading ? (
                                                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress sx={{ color: '#667eea' }} /></Box>
                                                ) : poiSearchResults.length > 0 ? (
                                                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                                        {poiSearchResults.map((poi) => (
                                                            <Card key={poi.poiId} sx={{ borderRadius: 2, cursor: 'pointer', transition: 'box-shadow 0.2s, transform 0.2s', '&:hover': { boxShadow: 4, transform: 'translateY(-2px)' }, height: 110, overflow: 'hidden' }} onClick={() => setSelectedPoi(poi)}>
                                                                <Box sx={{ display: 'flex', height: '100%' }}>
                                                                    {poi.photos && poi.photos.length > 0 && (
                                                                        <CardMedia component="img" sx={{ width: 90, minWidth: 90, objectFit: 'cover', borderRadius: '8px 0 0 8px', flexShrink: 0, height: 110, overflow: 'hidden' }} image={poi.photos[0]} alt={poi.name} />
                                                                    )}
                                                                    <CardContent sx={{ flex: 1, px: 1.5, py: 1, '&:last-child': { pb: 1 }, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
                                                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 0.2 }}>
                                                                            <Typography variant="body2" fontWeight={500} noWrap sx={{ flex: 1, mr: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>{poi.name}</Typography>
                                                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0 }}>
                                                                                {poi.rating && <Chip size="small" icon={<Star sx={{ fontSize: 12 }} />} label={poi.rating} color="warning" sx={{ height: 18, fontSize: '0.6rem' }} />}
                                                                                <IconButton size="small" onClick={(e) => { e.stopPropagation(); handleAddItemToWishlist(poi.poiId, true); }} sx={{ p: 0.3, color: '#667eea', '&:hover': { color: 'white', bgcolor: '#667eea' } }}>
                                                                                    <Add sx={{ fontSize: 16 }} />
                                                                                </IconButton>
                                                                            </Box>
                                                                        </Box>
                                                                        {poi.type && <Chip size="small" label={poi.type} sx={{ mb: 0.5, height: 16, fontSize: '0.6rem', alignSelf: 'flex-start' }} />}
                                                                        {(poi.city || poi.address) && (
                                                                            <Box sx={{ display: 'flex', alignItems: 'center', color: 'text.secondary', overflow: 'hidden', mb: 0.5 }}>
                                                                                <Place sx={{ fontSize: 10, mr: 0.3, flexShrink: 0 }} />
                                                                                <Typography variant="body2" noWrap sx={{ fontSize: '0.7rem', overflow: 'hidden', textOverflow: 'ellipsis' }}>{poi.city}{poi.address ? ` · ${poi.address}` : ''}</Typography>
                                                                            </Box>
                                                                        )}
                                                                        {poi.description && (
                                                                            <Typography variant="caption" color="text.secondary" sx={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: 1.3, flex: 1 }}>{poi.description}</Typography>
                                                                        )}
                                                                    </CardContent>
                                                                </Box>
                                                            </Card>
                                                        ))}
                                                    </Box>
                                                ) : poiSearchKeyword && <Typography color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>未找到相关POI</Typography>}
                                            </Box>
                                        )}
                                        {searchTab === 1 && (
                                            <Box>
                                                <Box sx={{ display: 'flex', gap: 1, mb: 1, alignItems: 'center' }}>
                                                    <TextField size="small" placeholder="关键词(可选)..." value={nonPoiSearchKeyword} onChange={(e) => setNonPoiSearchKeyword(e.target.value)} onKeyUp={(e) => e.key === 'Enter' && handleNonPoiSearch()} InputProps={{ startAdornment: <InputAdornment position="start"><Search sx={{ fontSize: 16 }} /></InputAdornment>, sx: { fontSize: '0.8rem', height: 36 } }} sx={{ flex: 2 }} />
                                                    <FormControl size="small" sx={{ minWidth: 75, height: 36, '& .MuiInputBase-root': { height: 36 } }}>
                                                        <InputLabel sx={{ fontSize: '0.8rem' }}>类型</InputLabel>
                                                        <Select value={nonPoiSearchType} label="类型" onChange={(e) => setNonPoiSearchType(e.target.value as NonPoiType | '')} sx={{ fontSize: '0.8rem' }}>
                                                            <MenuItem value="">全部</MenuItem>
                                                            <MenuItem value="ACTIVITY">ACTIVITY</MenuItem>
                                                            <MenuItem value="FOOD">FOOD</MenuItem>
                                                            <MenuItem value="CULTURE">CULTURE</MenuItem>
                                                            <MenuItem value="OTHER">OTHER</MenuItem>
                                                        </Select>
                                                    </FormControl>
                                                    <Button variant="contained" size="small" onClick={() => { setNonPoiSearchPage(1); handleNonPoiSearch(); }} sx={{ bgcolor: '#667eea', '&:hover': { bgcolor: '#5a6fd6' }, fontSize: '0.7rem', px: 0, height: 36, minWidth: 50 }}>搜索</Button>
                                                    <IconButton size="small" onClick={() => setCreateActivityDialogOpen(true)} sx={{ color: '#667eea', border: '1px solid #667eea', width: 36, height: 36, '&:hover': { borderColor: '#5a6fd6', bgcolor: 'rgba(102, 126, 234, 0.08)' } }}><Add sx={{ fontSize: 18 }} /></IconButton>
                                                </Box>
                                                {nonPoiSearchLoading ? (
                                                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress sx={{ color: '#667eea' }} /></Box>
                                                ) : nonPoiSearchResults.length > 0 ? (
                                                    <>
                                                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                                            {nonPoiSearchResults.map((nonPoi) => (
                                                                <Card key={nonPoi.id} sx={{ borderRadius: 2, cursor: 'pointer', transition: 'box-shadow 0.2s, transform 0.2s', '&:hover': { boxShadow: 4, transform: 'translateY(-2px)' } }} onClick={() => setSelectedNonPoi(nonPoi)}>
                                                                    <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                                                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 0.5 }}>
                                                                            <Typography variant="body2" fontWeight={500} noWrap sx={{ flex: 1, mr: 1 }}>{nonPoi.title}</Typography>
                                                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                                                <Chip size="small" icon={getNonPoiTypeIcon(nonPoi.type)} label={nonPoi.type} color={getNonPoiTypeColor(nonPoi.type)} sx={{ height: 18, fontSize: '0.6rem' }} />
                                                                                <IconButton size="small" onClick={(e) => { e.stopPropagation(); handleAddItemToWishlist(nonPoi.id, false); }} sx={{ p: 0.3, color: '#667eea', '&:hover': { color: 'white', bgcolor: '#667eea' } }}>
                                                                                    <Add sx={{ fontSize: 16 }} />
                                                                                </IconButton>
                                                                            </Box>
                                                                        </Box>
                                                                        {(nonPoi.city || nonPoi.estimatedAddress) && (
                                                                            <Box sx={{ display: 'flex', alignItems: 'center', color: 'text.secondary', mb: 0.5 }}>
                                                                                <Place sx={{ fontSize: 12, mr: 0.3 }} />
                                                                                <Typography variant="caption" noWrap>{nonPoi.city}{nonPoi.estimatedAddress ? ` · ${nonPoi.estimatedAddress}` : ''}</Typography>
                                                                            </Box>
                                                                        )}
                                                                        {nonPoi.activityTime && (
                                                                            <Box sx={{ display: 'flex', alignItems: 'center', color: 'text.secondary', mb: 0.5 }}>
                                                                                <AccessTime sx={{ fontSize: 12, mr: 0.3 }} />
                                                                                <Typography variant="caption" noWrap>{nonPoi.activityTime}</Typography>
                                                                            </Box>
                                                                        )}
                                                                        {nonPoi.description && (
                                                                            <Typography variant="caption" color="text.secondary" sx={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: 1.3 }}>{nonPoi.description}</Typography>
                                                                        )}
                                                                    </CardContent>
                                                                </Card>
                                                            ))}
                                                        </Box>
                                                        {nonPoiSearchTotal > 20 && (
                                                            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                                                                <Pagination
                                                                    count={Math.ceil(nonPoiSearchTotal / 20)}
                                                                    page={nonPoiSearchPage}
                                                                    onChange={(_, page) => { setNonPoiSearchPage(page); handleNonPoiSearch(); }}
                                                                    size="small"
                                                                    color="primary"
                                                                />
                                                            </Box>
                                                        )}
                                                    </>
                                                ) : <Typography color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>点击搜索获取活动列表</Typography>}
                                            </Box>
                                        )}
                                    </Box>
                                )}

                                {/* Default Wishlist Display */}
                                {addMode === null && (
                                    <>
                                        {wishlistLoading ? (
                                            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                                                <CircularProgress sx={{ color: '#667eea' }} />
                                            </Box>
                                        ) : wishlistItems.length === 0 ? (
                                            <Typography color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                                                心愿单为空
                                            </Typography>
                                        ) : (
                                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                                {wishlistItems.map((wishlistItem) => {
                                                    const { item, entity } = wishlistItem;
                                                    const isPoi = item.isPoi && entity && 'name' in entity;
                                                    const isNonPoi = !item.isPoi && entity && 'title' in entity;

                                                    if (isPoi) {
                                                        const poi = entity as Poi;
                                                        return (
                                                            <Card key={item.itemId} sx={{ borderRadius: 2, cursor: 'pointer', transition: 'box-shadow 0.2s, transform 0.2s', '&:hover': { boxShadow: 4, transform: 'translateY(-2px)' }, height: 110, overflow: 'hidden', position: 'relative' }} onClick={() => setSelectedPoi(poi)}>
                                                                <Box sx={{ display: 'flex', height: '100%' }}>
                                                                    {poi.photos && poi.photos.length > 0 && (
                                                                        <CardMedia component="img" sx={{ width: 90, minWidth: 90, objectFit: 'cover', borderRadius: '8px 0 0 8px', flexShrink: 0, height: 110, overflow: 'hidden' }} image={poi.photos[0]} alt={poi.name} />
                                                                    )}
                                                                    <CardContent sx={{ flex: 1, px: 1.5, py: 1, '&:last-child': { pb: 1 }, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
                                                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 0.2 }}>
                                                                            <Typography variant="body2" fontWeight={500} noWrap sx={{ flex: 1, mr: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>{poi.name}</Typography>
                                                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0 }}>
                                                                                {poi.rating && <Chip size="small" icon={<Star sx={{ fontSize: 12 }} />} label={poi.rating} color="warning" sx={{ height: 18, fontSize: '0.6rem' }} />}
                                                                                <Tooltip title="添加到日程">
                                                                                    <IconButton
                                                                                        size="small"
                                                                                        onClick={(e) => handleOpenDayMenu(wishlistItem, e)}
                                                                                        disabled={addToScheduleLoading === item.itemId}
                                                                                        sx={{ p: 0.3, color: 'primary.main', '&:hover': { color: 'white', bgcolor: 'primary.main' } }}
                                                                                    >
                                                                                        {addToScheduleLoading === item.itemId ? <CircularProgress size={14} /> : <Add sx={{ fontSize: 16 }} />}
                                                                                    </IconButton>
                                                                                </Tooltip>
                                                                                <IconButton size="small" onClick={(e) => { e.stopPropagation(); handleDeleteWishlistItem(item.itemId); }} sx={{ p: 0.3, color: 'error.main', '&:hover': { color: 'white', bgcolor: 'error.main' } }}>
                                                                                    <Delete sx={{ fontSize: 16 }} />
                                                                                </IconButton>
                                                                            </Box>
                                                                        </Box>
                                                                        {poi.type && <Chip size="small" label={poi.type} sx={{ mb: 0.5, height: 16, fontSize: '0.6rem', alignSelf: 'flex-start' }} />}
                                                                        {(poi.city || poi.address) && (
                                                                            <Box sx={{ display: 'flex', alignItems: 'center', color: 'text.secondary', overflow: 'hidden', mb: 0.5 }}>
                                                                                <Place sx={{ fontSize: 10, mr: 0.3, flexShrink: 0 }} />
                                                                                <Typography variant="body2" noWrap sx={{ fontSize: '0.7rem', overflow: 'hidden', textOverflow: 'ellipsis' }}>{poi.city}{poi.address ? ` · ${poi.address}` : ''}</Typography>
                                                                            </Box>
                                                                        )}
                                                                        {poi.description && (
                                                                            <Typography variant="caption" color="text.secondary" sx={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: 1.3, flex: 1 }}>{poi.description}</Typography>
                                                                        )}
                                                                    </CardContent>
                                                                </Box>
                                                            </Card>
                                                        );
                                                    } else if (isNonPoi) {
                                                        const nonPoi = entity as NonPoiItem;
                                                        return (
                                                            <Card key={item.itemId} sx={{ borderRadius: 2, cursor: 'pointer', transition: 'box-shadow 0.2s, transform 0.2s', '&:hover': { boxShadow: 4, transform: 'translateY(-2px)' }, position: 'relative' }} onClick={() => setSelectedNonPoi(nonPoi)}>
                                                                <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                                                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 0.5 }}>
                                                                        <Typography variant="body2" fontWeight={500} noWrap sx={{ flex: 1, mr: 1 }}>{nonPoi.title}</Typography>
                                                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                                            <Chip size="small" icon={getNonPoiTypeIcon(nonPoi.type)} label={nonPoi.type} color={getNonPoiTypeColor(nonPoi.type)} sx={{ height: 18, fontSize: '0.6rem' }} />
                                                                            <Tooltip title="添加到日程">
                                                                                <IconButton
                                                                                    size="small"
                                                                                    onClick={(e) => handleOpenDayMenu(wishlistItem, e)}
                                                                                    disabled={addToScheduleLoading === item.itemId}
                                                                                    sx={{ p: 0.3, color: 'primary.main', '&:hover': { color: 'white', bgcolor: 'primary.main' } }}
                                                                                >
                                                                                    {addToScheduleLoading === item.itemId ? <CircularProgress size={14} /> : <Add sx={{ fontSize: 16 }} />}
                                                                                </IconButton>
                                                                            </Tooltip>
                                                                            <IconButton size="small" onClick={(e) => { e.stopPropagation(); handleDeleteWishlistItem(item.itemId); }} sx={{ p: 0.3, color: 'error.main', '&:hover': { color: 'white', bgcolor: 'error.main' } }}>
                                                                                <Delete sx={{ fontSize: 16 }} />
                                                                            </IconButton>
                                                                        </Box>
                                                                    </Box>
                                                                    {(nonPoi.city || nonPoi.estimatedAddress) && (
                                                                        <Box sx={{ display: 'flex', alignItems: 'center', color: 'text.secondary', mb: 0.5 }}>
                                                                            <Place sx={{ fontSize: 12, mr: 0.3 }} />
                                                                            <Typography variant="caption" noWrap>{nonPoi.city}{nonPoi.estimatedAddress ? ` · ${nonPoi.estimatedAddress}` : ''}</Typography>
                                                                        </Box>
                                                                    )}
                                                                    {nonPoi.activityTime && (
                                                                        <Box sx={{ display: 'flex', alignItems: 'center', color: 'text.secondary', mb: 0.5 }}>
                                                                            <AccessTime sx={{ fontSize: 12, mr: 0.3 }} />
                                                                            <Typography variant="caption" noWrap>{nonPoi.activityTime}</Typography>
                                                                        </Box>
                                                                    )}
                                                                    {nonPoi.description && (
                                                                        <Typography variant="caption" color="text.secondary" sx={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: 1.3 }}>{nonPoi.description}</Typography>
                                                                    )}
                                                                </CardContent>
                                                            </Card>
                                                        );
                                                    } else {
                                                        return (
                                                            <Card key={item.itemId} sx={{ height: 110, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                                <Typography color="text.secondary">未知项目类型</Typography>
                                                            </Card>
                                                        );
                                                    }
                                                })}
                                            </Box>
                                        )}
                                    </>
                                )}
                            </Box>
                        </Box>
                    )}
                </Box>

                {/* Member List Section */}
                <Accordion
                    expanded={membersExpanded}
                    onChange={() => setMembersExpanded(!membersExpanded)}
                    sx={{
                        mt: 3,
                        borderRadius: 2,
                        '&:before': { display: 'none' },
                        '& .MuiAccordionDetails-root': {
                            maxHeight: '300px',
                            overflowY: 'auto',
                            scrollbarWidth: 'none',
                            '&::-webkit-scrollbar': { display: 'none' },
                        }
                    }}
                >
                    <AccordionSummary expandIcon={<ExpandMore />} sx={{ bgcolor: '#f5f7fa', borderRadius: membersExpanded ? '8px 8px 0 0' : 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                            <People sx={{ color: '#667eea' }} />
                            <Typography variant="h6" fontWeight="bold">旅程成员</Typography>
                            <Chip size="small" label={members.length} sx={{ ml: 1 }} />
                            {isOwner && pendingMembers.length > 0 && (
                                <Chip size="small" label={`${pendingMembers.length} 待审批`} color="warning" sx={{ ml: 1 }} />
                            )}
                            <Box sx={{ flex: 1 }} />
                            {isOwner && (
                                <Button
                                    size="small"
                                    startIcon={<PersonAdd />}
                                    onClick={(e) => { e.stopPropagation(); setInviteDialogOpen(true); }}
                                    sx={{ mr: 2 }}
                                >
                                    邀请
                                </Button>
                            )}
                        </Box>
                    </AccordionSummary>
                    <AccordionDetails>
                        {/* Pending Requests (OWNER only) */}
                        {isOwner && pendingMembers.length > 0 && (
                            <Box sx={{ mb: 3 }}>
                                <Typography variant="subtitle2" fontWeight="bold" color="warning.main" sx={{ mb: 1 }}>
                                    待审批请求 ({pendingMembers.length})
                                </Typography>
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                    {pendingMembers.map(member => (
                                        <Box key={member.id} sx={{ display: 'flex', alignItems: 'center', p: 1.5, bgcolor: '#fff3e0', borderRadius: 2 }}>
                                            <Box sx={{ flex: 1 }}>
                                                <Typography fontWeight="bold">{member.userName}</Typography>
                                                {member.preferencesText && (
                                                    <Typography variant="body2" color="text.secondary">{member.preferencesText}</Typography>
                                                )}
                                            </Box>
                                            <Tooltip title="接受">
                                                <IconButton color="success" onClick={() => handleAcceptRequest(member.userId)}>
                                                    <Check />
                                                </IconButton>
                                            </Tooltip>
                                            <Tooltip title="拒绝">
                                                <IconButton color="error" onClick={() => handleRejectRequest(member.userId)}>
                                                    <Clear />
                                                </IconButton>
                                            </Tooltip>
                                        </Box>
                                    ))}
                                </Box>
                                <Divider sx={{ my: 2 }} />
                            </Box>
                        )}

                        {/* Approved Members */}
                        <Box sx={{ mt: -1, display: 'flex', flexDirection: 'column', gap: 1 }}>
                            {members.map(member => (
                                <Box key={member.id} sx={{ display: 'flex', alignItems: 'center', p: 1.5, bgcolor: '#f5f5f5', borderRadius: 2 }}>
                                    <Box sx={{ flex: 1 }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                                            <Typography fontWeight="bold">{member.userName}</Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                加入于 {new Date(member.createdAt).toLocaleDateString('zh-CN')}
                                            </Typography>
                                            <Chip size="small" label={getRoleLabel(member.role)} color={getRoleColor(member.role)} />
                                            {member.userId === currentUserId && (
                                                <Chip size="small" label="你" variant="outlined" color="primary" />
                                            )}
                                        </Box>
                                        {member.preferencesText && (
                                            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                                                偏好: {member.preferencesText}
                                            </Typography>
                                        )}
                                    </Box>
                                    {isOwner && member.role !== 'OWNER' && (
                                        <Tooltip title="移除成员">
                                            <IconButton color="error" onClick={() => handleOpenRemoveMemberDialog(member)}>
                                                <PersonRemove />
                                            </IconButton>
                                        </Tooltip>
                                    )}
                                </Box>
                            ))}
                            {members.length === 0 && (
                                <Typography color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>暂无成员</Typography>
                            )}
                        </Box>
                    </AccordionDetails>
                </Accordion>

                {/* Navigation Buttons for Logs and Expenses */}
                <Box sx={{ display: 'flex', gap: 2, mt: 3 }}>
                    <Button
                        variant="outlined"
                        startIcon={<Notes />}
                        onClick={() => navigate(`/trip/${tripId}/logs`)}
                        sx={{ flex: 1, py: 1.5, borderColor: '#667eea', color: '#667eea' }}
                    >
                        旅程日志
                    </Button>
                    <Button
                        variant="outlined"
                        startIcon={<Receipt />}
                        onClick={() => navigate(`/trip/${tripId}/expenses`)}
                        sx={{ flex: 1, py: 1.5, borderColor: '#667eea', color: '#667eea' }}
                    >
                        支出记录
                    </Button>
                </Box>

                {/* Invite User Dialog */}
                <Dialog open={inviteDialogOpen} onClose={() => setInviteDialogOpen(false)} maxWidth="sm" fullWidth>
                    <DialogTitle>邀请用户</DialogTitle>
                    <DialogContent>
                        <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                            <TextField
                                label="用户名"
                                fullWidth
                                value={searchUsername}
                                onChange={(e) => setSearchUsername(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && handleSearchUser()}
                            />
                            <Button
                                variant="contained"
                                onClick={handleSearchUser}
                                disabled={searching}
                                sx={{
                                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                    '&:hover': { background: 'linear-gradient(135deg, #5a6fd6 0%, #6a4190 100%)' },
                                }}
                            >
                                {searching ? <CircularProgress size={24} /> : <Search />}
                            </Button>
                        </Box>
                        {searchedUser && (
                            <Box sx={{ mt: 2, p: 2, bgcolor: '#f5f5f5', borderRadius: 2, display: 'flex', alignItems: 'center' }}>
                                <Box sx={{ flex: 1 }}>
                                    <Typography fontWeight="bold">{searchedUser.username}</Typography>
                                    {searchedUser.preferencesText && (
                                        <Typography variant="body2" color="text.secondary">{searchedUser.preferencesText}</Typography>
                                    )}
                                </Box>
                                <Button
                                    variant="contained"
                                    startIcon={<PersonAdd />}
                                    onClick={handleInviteUser}
                                    sx={{
                                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                        '&:hover': { background: 'linear-gradient(135deg, #5a6fd6 0%, #6a4190 100%)' },
                                    }}
                                >
                                    邀请
                                </Button>
                            </Box>
                        )}
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => { setInviteDialogOpen(false); setSearchUsername(''); setSearchedUser(null); }}>关闭</Button>
                    </DialogActions>
                </Dialog>

                {/* POI Detail Dialog */}
                <Dialog
                    open={!!selectedPoi}
                    onClose={() => setSelectedPoi(null)}
                    maxWidth="md"
                    fullWidth
                >
                    {selectedPoi && (
                        <>
                            <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Box>
                                    <Typography variant="h5" fontWeight="bold">{selectedPoi.name}</Typography>
                                    {selectedPoi.type && <Chip size="small" label={selectedPoi.type} sx={{ mt: 0.5 }} />}
                                </Box>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    {selectedPoi.rating && (
                                        <Chip icon={<Star />} label={selectedPoi.rating} color="warning" />
                                    )}
                                    <IconButton onClick={() => setSelectedPoi(null)}>
                                        <Close />
                                    </IconButton>
                                </Box>
                            </DialogTitle>
                            <DialogContent dividers>
                                {/* Photos Gallery */}
                                {selectedPoi.photos && selectedPoi.photos.length > 0 && (
                                    <Box sx={{ mb: 3 }}>
                                        <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1 }}>照片</Typography>
                                        <Box sx={{ display: 'flex', gap: 1, overflowX: 'auto', pb: 1 }}>
                                            {selectedPoi.photos.map((photo, idx) => (
                                                <Box
                                                    key={idx}
                                                    component="img"
                                                    src={photo}
                                                    alt={`${selectedPoi.name} ${idx + 1}`}
                                                    sx={{ height: 150, minWidth: 200, objectFit: 'cover', borderRadius: 2 }}
                                                />
                                            ))}
                                        </Box>
                                    </Box>
                                )}

                                {/* Location Info */}
                                <Box sx={{ mb: 2 }}>
                                    <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1 }}>位置信息</Typography>
                                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                                        <Place fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                                        <Typography variant="body2">
                                            {selectedPoi.city}{selectedPoi.address ? ` · ${selectedPoi.address}` : ''}
                                        </Typography>
                                    </Box>
                                    {(selectedPoi.latitude || selectedPoi.longitude) && (
                                        <Typography variant="body2" color="text.secondary" sx={{ ml: 4 }}>
                                            经纬度: {selectedPoi.latitude}, {selectedPoi.longitude}
                                        </Typography>
                                    )}
                                </Box>

                                {/* Description */}
                                {selectedPoi.description && (
                                    <Box sx={{ mb: 2 }}>
                                        <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1 }}>描述</Typography>
                                        <Typography variant="body2" sx={{ lineHeight: 1.6 }}>
                                            {selectedPoi.description}
                                        </Typography>
                                    </Box>
                                )}

                                {/* Opening Hours */}
                                {selectedPoi.openingHours && (
                                    <Box sx={{ mb: 2 }}>
                                        <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1 }}>开放时间</Typography>
                                        <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
                                            <AccessTime fontSize="small" sx={{ mr: 1, mt: 0.3, color: 'text.secondary' }} />
                                            <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                                                {selectedPoi.openingHours}
                                            </Typography>
                                        </Box>
                                    </Box>
                                )}

                                {/* Additional Info */}
                                <Grid container spacing={2}>
                                    {selectedPoi.avgVisitDuration && (
                                        <Grid item xs={6} md={4}>
                                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                                <Schedule fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                                                <Box>
                                                    <Typography variant="caption" color="text.secondary">平均游玩时间</Typography>
                                                    <Typography variant="body2">{selectedPoi.avgVisitDuration} 分钟</Typography>
                                                </Box>
                                            </Box>
                                        </Grid>
                                    )}
                                    {selectedPoi.avgCost && (
                                        <Grid item xs={6} md={4}>
                                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                                <AttachMoney fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                                                <Box>
                                                    <Typography variant="caption" color="text.secondary">平均花费</Typography>
                                                    <Typography variant="body2">{selectedPoi.avgCost}</Typography>
                                                </Box>
                                            </Box>
                                        </Grid>
                                    )}
                                    {selectedPoi.phone && (
                                        <Grid item xs={6} md={4}>
                                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                                <Phone fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                                                <Box>
                                                    <Typography variant="caption" color="text.secondary">电话</Typography>
                                                    <Typography variant="body2">{selectedPoi.phone}</Typography>
                                                </Box>
                                            </Box>
                                        </Grid>
                                    )}
                                </Grid>
                            </DialogContent>
                        </>
                    )}
                </Dialog>

                {/* NonPoi Detail Dialog */}
                <Dialog
                    open={!!selectedNonPoi}
                    onClose={() => setSelectedNonPoi(null)}
                    maxWidth="sm"
                    fullWidth
                >
                    {selectedNonPoi && (
                        <>
                            <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <Typography variant="h5" fontWeight="bold" sx={{ flex: 1, mr: 1 }}>{selectedNonPoi.title}</Typography>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
                                    <Chip
                                        size="small"
                                        icon={getNonPoiTypeIcon(selectedNonPoi.type)}
                                        label={selectedNonPoi.type}
                                        color={getNonPoiTypeColor(selectedNonPoi.type)}
                                    />
                                    <IconButton onClick={() => setSelectedNonPoi(null)} size="small">
                                        <Close />
                                    </IconButton>
                                </Box>
                            </DialogTitle>
                            <DialogContent dividers>
                                {/* Description */}
                                {selectedNonPoi.description && (
                                    <Box sx={{ mb: 2 }}>
                                        <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1 }}>描述</Typography>
                                        <Typography variant="body2" sx={{ lineHeight: 1.6 }}>
                                            {selectedNonPoi.description}
                                        </Typography>
                                    </Box>
                                )}

                                <Divider sx={{ my: 2 }} />

                                {/* Details Grid */}
                                <Grid container spacing={2}>
                                    {selectedNonPoi.city && (
                                        <Grid item xs={12} sm={6}>
                                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                                <Place fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                                                <Box>
                                                    <Typography variant="caption" color="text.secondary">城市</Typography>
                                                    <Typography variant="body2">{selectedNonPoi.city}</Typography>
                                                </Box>
                                            </Box>
                                        </Grid>
                                    )}
                                    {selectedNonPoi.estimatedAddress && (
                                        <Grid item xs={12} sm={6}>
                                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                                <LocationOn fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                                                <Box>
                                                    <Typography variant="caption" color="text.secondary">预计地址</Typography>
                                                    <Typography variant="body2">{selectedNonPoi.estimatedAddress}</Typography>
                                                </Box>
                                            </Box>
                                        </Grid>
                                    )}
                                    {selectedNonPoi.activityTime && (
                                        <Grid item xs={12} sm={6}>
                                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                                <AccessTime fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                                                <Box>
                                                    <Typography variant="caption" color="text.secondary">活动时间</Typography>
                                                    <Typography variant="body2">{selectedNonPoi.activityTime}</Typography>
                                                </Box>
                                            </Box>
                                        </Grid>
                                    )}
                                    {selectedNonPoi.createdAt && (
                                        <Grid item xs={12} sm={6}>
                                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                                <Event fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                                                <Box>
                                                    <Typography variant="caption" color="text.secondary">创建时间</Typography>
                                                    <Typography variant="body2">{formatDateTime(selectedNonPoi.createdAt)}</Typography>
                                                </Box>
                                            </Box>
                                        </Grid>
                                    )}
                                </Grid>

                                {/* Extra Info */}
                                {selectedNonPoi.extraInfo && (
                                    <Box sx={{ mt: 2 }}>
                                        <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1 }}>额外信息</Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            {selectedNonPoi.extraInfo}
                                        </Typography>
                                    </Box>
                                )}

                                {/* Source URL */}
                                {selectedNonPoi.sourceUrl && (
                                    <Box sx={{ mt: 2 }}>
                                        <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1 }}>来源链接</Typography>
                                        <Link
                                            href={selectedNonPoi.sourceUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
                                        >
                                            {selectedNonPoi.sourceUrl}
                                            <OpenInNew fontSize="small" />
                                        </Link>
                                    </Box>
                                )}
                            </DialogContent>
                        </>
                    )}
                </Dialog>

                {/* Create Activity Dialog */}
                <Dialog open={createActivityDialogOpen} onClose={() => setCreateActivityDialogOpen(false)} maxWidth="sm" fullWidth>
                    <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="h6" fontWeight="bold">创建新活动</Typography>
                        <IconButton onClick={() => setCreateActivityDialogOpen(false)} size="small">
                            <Close />
                        </IconButton>
                    </DialogTitle>
                    <DialogContent dividers>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
                            <FormControl fullWidth>
                                <InputLabel>类型</InputLabel>
                                <Select
                                    value={createActivityFormData.type}
                                    label="类型"
                                    onChange={(e) => setCreateActivityFormData({ ...createActivityFormData, type: e.target.value as NonPoiType })}
                                >
                                    <MenuItem value="ACTIVITY">ACTIVITY</MenuItem>
                                    <MenuItem value="FOOD">FOOD</MenuItem>
                                    <MenuItem value="CULTURE">CULTURE</MenuItem>
                                    <MenuItem value="OTHER">OTHER</MenuItem>
                                </Select>
                            </FormControl>
                            <TextField
                                label="标题"
                                required
                                fullWidth
                                value={createActivityFormData.title}
                                onChange={(e) => setCreateActivityFormData({ ...createActivityFormData, title: e.target.value })}
                            />
                            <TextField
                                label="描述"
                                fullWidth
                                multiline
                                rows={2}
                                value={createActivityFormData.description}
                                onChange={(e) => setCreateActivityFormData({ ...createActivityFormData, description: e.target.value })}
                            />
                            <TextField
                                label="城市"
                                fullWidth
                                value={createActivityFormData.city}
                                onChange={(e) => setCreateActivityFormData({ ...createActivityFormData, city: e.target.value })}
                            />
                            <TextField
                                label="活动时间"
                                fullWidth
                                placeholder="例如：2024/12/25 14:00"
                                value={createActivityFormData.activityTime}
                                onChange={(e) => setCreateActivityFormData({ ...createActivityFormData, activityTime: e.target.value })}
                            />
                            <TextField
                                label="大致地点"
                                fullWidth
                                value={createActivityFormData.estimatedAddress}
                                onChange={(e) => setCreateActivityFormData({ ...createActivityFormData, estimatedAddress: e.target.value })}
                            />
                            <TextField
                                label="额外信息"
                                fullWidth
                                multiline
                                rows={2}
                                value={createActivityFormData.extraInfo}
                                onChange={(e) => setCreateActivityFormData({ ...createActivityFormData, extraInfo: e.target.value })}
                            />
                            <TextField
                                label="来源链接"
                                fullWidth
                                value={createActivityFormData.sourceUrl}
                                onChange={(e) => setCreateActivityFormData({ ...createActivityFormData, sourceUrl: e.target.value })}
                            />
                        </Box>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setCreateActivityDialogOpen(false)}>取消</Button>
                        <Button
                            variant="contained"
                            onClick={handleCreateActivityAndAdd}
                            disabled={!createActivityFormData.title.trim() || createActivityLoading}
                            sx={{ bgcolor: '#667eea', '&:hover': { bgcolor: '#5a6fd6' } }}
                        >
                            {createActivityLoading ? <CircularProgress size={20} /> : '创建并添加到心愿单'}
                        </Button>
                    </DialogActions>
                </Dialog>

                {/* Edit Dialog */}
                <Dialog open={editDialogOpen} onClose={handleCloseEditDialog} maxWidth="sm" fullWidth>
                    <DialogTitle>编辑旅程</DialogTitle>
                    <DialogContent>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
                            <TextField
                                label="标题"
                                fullWidth
                                value={editForm.title}
                                onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                            />
                            <TextField
                                label="目的地"
                                fullWidth
                                value={editForm.destinationCity}
                                onChange={(e) => setEditForm({ ...editForm, destinationCity: e.target.value })}
                            />
                            <Box sx={{ display: 'flex', gap: 2 }}>
                                <TextField
                                    label="开始日期"
                                    type="date"
                                    fullWidth
                                    value={editForm.startDate}
                                    onChange={(e) => setEditForm({ ...editForm, startDate: e.target.value })}
                                    InputLabelProps={{ shrink: true }}
                                />
                                <TextField
                                    label="结束日期"
                                    type="date"
                                    fullWidth
                                    value={editForm.endDate}
                                    onChange={(e) => setEditForm({ ...editForm, endDate: e.target.value })}
                                    InputLabelProps={{ shrink: true }}
                                />
                            </Box>
                            <TextField
                                label="预算"
                                fullWidth
                                type="number"
                                value={editForm.totalBudget}
                                onChange={(e) => setEditForm({ ...editForm, totalBudget: e.target.value })}
                            />
                            <TextField
                                label="描述"
                                fullWidth
                                multiline
                                rows={3}
                                value={editForm.description}
                                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                            />
                        </Box>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={handleCloseEditDialog}>取消</Button>
                        <Button
                            onClick={handleSaveEdit}
                            variant="contained"
                            sx={{
                                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                '&:hover': {
                                    background: 'linear-gradient(135deg, #5a6fd6 0%, #6a4190 100%)',
                                },
                            }}
                        >
                            保存
                        </Button>
                    </DialogActions>
                </Dialog>

                {/* Delete Confirmation Dialog */}
                <Dialog open={deleteDialogOpen} onClose={handleCloseDeleteDialog}>
                    <DialogTitle>确认删除</DialogTitle>
                    <DialogContent>
                        <Typography>确定要删除旅程 "{tripDetail?.trip.title}" 吗？此操作不可撤销。</Typography>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={handleCloseDeleteDialog}>取消</Button>
                        <Button onClick={handleDelete} color="error" variant="contained">
                            删除
                        </Button>
                    </DialogActions>
                </Dialog>

                {/* Remove Member Confirmation Dialog */}
                <Dialog open={removeMemberDialogOpen} onClose={handleCloseRemoveMemberDialog}>
                    <DialogTitle>确认移除</DialogTitle>
                    <DialogContent>
                        <Typography>确定要移除成员 "{memberToRemove?.userName}" 吗？</Typography>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={handleCloseRemoveMemberDialog}>取消</Button>
                        <Button onClick={handleConfirmRemoveMember} color="error" variant="contained">
                            移除
                        </Button>
                    </DialogActions>
                </Dialog>

                {/* AI Floating Button */}
                <Fab
                    size="medium"
                    onClick={handleOpenAiDialog}
                    sx={{
                        position: 'fixed',
                        bottom: '10%',
                        right: 24,
                        zIndex: 1000,
                        background: 'linear-gradient(135deg, #e0e5ff 0%, #f0e6ff 100%)',
                        color: '#667eea',
                        fontWeight: 'bold',
                        fontSize: '1rem',
                        '&:hover': {
                            background: 'linear-gradient(135deg, #d0d8ff 0%, #e5daff 100%)',
                        },
                    }}
                >
                    AI
                </Fab>

                {/* AI Floating Dialog */}
                {aiDialogOpen && (
                    <Paper
                        elevation={8}
                        sx={{
                            position: 'fixed',
                            left: aiDialogPosition.x,
                            top: aiDialogPosition.y,
                            width: aiDialogSize.width,
                            height: aiDialogSize.height,
                            zIndex: 1200,
                            display: 'flex',
                            flexDirection: 'column',
                            overflow: 'visible',
                            borderRadius: 4,
                            userSelect: isDragging || isResizing ? 'none' : 'auto',
                        }}
                    >
                        {/* Resize borders - all edges */}
                        <Box onMouseDown={handleResizeStart('n')} sx={{ position: 'absolute', top: -3, left: 8, right: 8, height: 6, cursor: 'ns-resize', zIndex: 10 }} />
                        <Box onMouseDown={handleResizeStart('s')} sx={{ position: 'absolute', bottom: -3, left: 8, right: 8, height: 6, cursor: 'ns-resize', zIndex: 10 }} />
                        <Box onMouseDown={handleResizeStart('w')} sx={{ position: 'absolute', left: -3, top: 8, bottom: 8, width: 6, cursor: 'ew-resize', zIndex: 10 }} />
                        <Box onMouseDown={handleResizeStart('e')} sx={{ position: 'absolute', right: -3, top: 8, bottom: 8, width: 6, cursor: 'ew-resize', zIndex: 10 }} />
                        {/* Resize corners */}
                        <Box onMouseDown={handleResizeStart('nw')} sx={{ position: 'absolute', top: -3, left: -3, width: 12, height: 12, cursor: 'nwse-resize', zIndex: 11 }} />
                        <Box onMouseDown={handleResizeStart('ne')} sx={{ position: 'absolute', top: -3, right: -3, width: 12, height: 12, cursor: 'nesw-resize', zIndex: 11 }} />
                        <Box onMouseDown={handleResizeStart('sw')} sx={{ position: 'absolute', bottom: -3, left: -3, width: 12, height: 12, cursor: 'nesw-resize', zIndex: 11 }} />
                        <Box onMouseDown={handleResizeStart('se')} sx={{ position: 'absolute', bottom: -3, right: -3, width: 12, height: 12, cursor: 'nwse-resize', zIndex: 11 }} />

                        {/* Draggable Title Bar - matching content bg */}
                        <Box
                            onMouseDown={handleDragStart}
                            sx={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                px: 2,
                                py: 1,
                                bgcolor: '#f5f7fa',
                                cursor: 'move',
                                flexShrink: 0,
                                borderTopLeftRadius: 16,
                                borderTopRightRadius: 16,
                            }}
                        >
                            <Typography variant="subtitle1" fontWeight="bold" color="text.primary">AI 推荐助手</Typography>
                            <IconButton size="small" onClick={() => setAiDialogOpen(false)}>
                                <Close />
                            </IconButton>
                        </Box>
                        {/* Content */}
                        <Box sx={{ flex: 1, overflow: 'hidden', borderBottomLeftRadius: 16, borderBottomRightRadius: 16 }}>
                            <AiConversationPanel
                                showConversationSwitcher={true}
                                compact={true}
                                height="100%"
                            />
                        </Box>
                    </Paper>
                )}

                {/* Edit Schedule Item Dialog */}
                <Dialog open={editItemDialogOpen} onClose={() => setEditItemDialogOpen(false)} maxWidth="sm" fullWidth>
                    <DialogTitle>编辑日程项</DialogTitle>
                    <DialogContent sx={{
                        '&::-webkit-scrollbar': { display: 'none' },
                        scrollbarWidth: 'none',
                        msOverflowStyle: 'none',
                    }}>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
                            {/* Schedule Item Fields */}
                            <Typography variant="subtitle2" color="primary" sx={{ mb: -1 }}>日程信息</Typography>
                            <Box sx={{ display: 'flex', gap: 2 }}>
                                <TextField
                                    label="开始时间"
                                    type="time"
                                    value={editItemForm.startTime || ''}
                                    onChange={(e) => setEditItemForm({ ...editItemForm, startTime: e.target.value })}
                                    InputLabelProps={{ shrink: true }}
                                    fullWidth
                                />
                                <TextField
                                    label="结束时间"
                                    type="time"
                                    value={editItemForm.endTime || ''}
                                    onChange={(e) => setEditItemForm({ ...editItemForm, endTime: e.target.value })}
                                    InputLabelProps={{ shrink: true }}
                                    fullWidth
                                />
                            </Box>
                            <TextField
                                label="预计花费"
                                type="number"
                                value={editItemForm.estimatedCost || ''}
                                onChange={(e) => setEditItemForm({ ...editItemForm, estimatedCost: parseFloat(e.target.value) || 0 })}
                                InputProps={{
                                    startAdornment: <InputAdornment position="start">¥</InputAdornment>,
                                }}
                                fullWidth
                            />
                            <TextField
                                label="备注"
                                value={editItemForm.notes || ''}
                                onChange={(e) => setEditItemForm({ ...editItemForm, notes: e.target.value })}
                                multiline
                                rows={2}
                                fullWidth
                            />
                            <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                                <Button
                                    onClick={handleUpdateItem}
                                    variant="contained"
                                    size="small"
                                    disabled={editItemLoading}
                                    sx={{
                                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                        '&:hover': { background: 'linear-gradient(135deg, #5a6fd6 0%, #6a4190 100%)' },
                                    }}
                                >
                                    {editItemLoading ? <CircularProgress size={16} /> : '保存日程'}
                                </Button>
                            </Box>

                            {/* NonPOI Fields - only show for NonPOI items */}
                            {editingItem && !editingItem.item.isPoi && (
                                <>
                                    <Divider sx={{ my: 1 }} />
                                    <Typography variant="subtitle2" color="secondary" sx={{ mb: -1 }}>活动项信息</Typography>
                                    <TextField
                                        label="标题"
                                        value={editNonPoiForm.title}
                                        onChange={(e) => setEditNonPoiForm({ ...editNonPoiForm, title: e.target.value })}
                                        fullWidth
                                        required
                                    />
                                    <FormControl fullWidth>
                                        <InputLabel>类型</InputLabel>
                                        <Select
                                            value={editNonPoiForm.type}
                                            label="类型"
                                            onChange={(e) => setEditNonPoiForm({ ...editNonPoiForm, type: e.target.value as NonPoiType })}
                                        >
                                            <MenuItem value="ACTIVITY">活动</MenuItem>
                                            <MenuItem value="FOOD">美食</MenuItem>
                                            <MenuItem value="CULTURE">文化</MenuItem>
                                            <MenuItem value="OTHER">其他</MenuItem>
                                        </Select>
                                    </FormControl>
                                    <TextField
                                        label="描述"
                                        value={editNonPoiForm.description}
                                        onChange={(e) => setEditNonPoiForm({ ...editNonPoiForm, description: e.target.value })}
                                        multiline
                                        rows={2}
                                        fullWidth
                                    />
                                    <Box sx={{ display: 'flex', gap: 2 }}>
                                        <TextField
                                            label="城市"
                                            value={editNonPoiForm.city}
                                            onChange={(e) => setEditNonPoiForm({ ...editNonPoiForm, city: e.target.value })}
                                            fullWidth
                                        />
                                        <TextField
                                            label="活动时间"
                                            value={editNonPoiForm.activityTime}
                                            onChange={(e) => setEditNonPoiForm({ ...editNonPoiForm, activityTime: e.target.value })}
                                            fullWidth
                                            placeholder="如：每天 10:00-18:00"
                                        />
                                    </Box>
                                    <TextField
                                        label="预计地址"
                                        value={editNonPoiForm.estimatedAddress}
                                        onChange={(e) => setEditNonPoiForm({ ...editNonPoiForm, estimatedAddress: e.target.value })}
                                        fullWidth
                                    />
                                    <TextField
                                        label="额外信息"
                                        value={editNonPoiForm.extraInfo}
                                        onChange={(e) => setEditNonPoiForm({ ...editNonPoiForm, extraInfo: e.target.value })}
                                        multiline
                                        rows={2}
                                        fullWidth
                                    />
                                    <TextField
                                        label="来源链接"
                                        value={editNonPoiForm.sourceUrl}
                                        onChange={(e) => setEditNonPoiForm({ ...editNonPoiForm, sourceUrl: e.target.value })}
                                        fullWidth
                                    />
                                    <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                                        <Button
                                            onClick={handleUpdateNonPoi}
                                            variant="contained"
                                            size="small"
                                            disabled={editNonPoiLoading || !editNonPoiForm.title.trim()}
                                            color="secondary"
                                        >
                                            {editNonPoiLoading ? <CircularProgress size={16} /> : '保存活动项'}
                                        </Button>
                                    </Box>
                                </>
                            )}
                        </Box>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setEditItemDialogOpen(false)} disabled={editItemLoading || editNonPoiLoading}>关闭</Button>
                    </DialogActions>
                </Dialog>

                {/* Edit Transport Notes Dialog */}
                <Dialog open={editTransportDialogOpen} onClose={() => setEditTransportDialogOpen(false)} maxWidth="sm" fullWidth>
                    <DialogTitle>编辑交通建议</DialogTitle>
                    <DialogContent>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
                            <TextField
                                label="交通建议"
                                value={editTransportNotes}
                                onChange={(e) => setEditTransportNotes(e.target.value)}
                                multiline
                                rows={4}
                                fullWidth
                                placeholder="输入到达此地点的交通方式，如：乘坐地铁11号线到海风运动公园站"
                            />
                        </Box>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setEditTransportDialogOpen(false)} disabled={editTransportLoading}>取消</Button>
                        <Button
                            onClick={handleUpdateTransportNotes}
                            variant="contained"
                            disabled={editTransportLoading}
                            sx={{
                                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                '&:hover': { background: 'linear-gradient(135deg, #5a6fd6 0%, #6a4190 100%)' },
                            }}
                        >
                            {editTransportLoading ? <CircularProgress size={20} /> : '保存'}
                        </Button>
                    </DialogActions>
                </Dialog>



                {/* Day Selection Menu for Add to Schedule */}
                <Menu
                    anchorEl={dayMenuAnchor}
                    open={Boolean(dayMenuAnchor)}
                    onClose={handleCloseDayMenu}
                    anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
                    transformOrigin={{ vertical: 'top', horizontal: 'left' }}
                >
                    <Box sx={{ px: 2, py: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
                        <Typography variant="caption" color="text.secondary">选择要添加到的日程天</Typography>
                    </Box>
                    {tripDetail?.tripDays?.map((td, idx) => (
                        <MenuItem
                            key={td.tripDay.tripDayId}
                            onClick={() => handleAddWishlistToSchedule(td.tripDay.tripDayId)}
                            sx={{ minWidth: 200 }}
                        >
                            <ListItemIcon>
                                <CalendarToday sx={{ fontSize: 16 }} />
                            </ListItemIcon>
                            <Typography variant="body2">
                                Day {idx + 1} - {formatDate(td.tripDay.dayDate)}
                            </Typography>
                        </MenuItem>
                    ))}
                </Menu>

                {/* Create Day Dialog */}
                <Dialog open={createDayDialogOpen} onClose={() => setCreateDayDialogOpen(false)} maxWidth="xs" fullWidth>
                    <DialogTitle>创建新日程</DialogTitle>
                    <DialogContent>
                        <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <TextField
                                label="日期"
                                type="date"
                                value={createDayForm.date}
                                onChange={(e) => setCreateDayForm(prev => ({ ...prev, date: e.target.value }))}
                                fullWidth
                                InputLabelProps={{ shrink: true }}
                                required
                            />
                            <TextField
                                label="备注（可选）"
                                value={createDayForm.note}
                                onChange={(e) => setCreateDayForm(prev => ({ ...prev, note: e.target.value }))}
                                fullWidth
                                multiline
                                rows={2}
                            />
                        </Box>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setCreateDayDialogOpen(false)}>取消</Button>
                        <Button
                            onClick={handleCreateDay}
                            disabled={!createDayForm.date || createDayLoading}
                            variant="contained"
                        >
                            {createDayLoading ? <CircularProgress size={20} /> : '创建'}
                        </Button>
                    </DialogActions>
                </Dialog>

                {/* Delete Day Confirmation Dialog */}
                <Dialog open={deleteDayDialogOpen} onClose={() => setDeleteDayDialogOpen(false)} maxWidth="xs" fullWidth>
                    <DialogTitle sx={{ color: 'error.main' }}>确认删除日程</DialogTitle>
                    <DialogContent>
                        <Typography>
                            确定要删除此日程吗？日程下的所有项目也将被一并删除，此操作不可撤销。
                        </Typography>
                        {dayToDelete && (
                            <Box sx={{ mt: 2, p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
                                <Typography variant="body2" fontWeight="bold">
                                    {formatDate(dayToDelete.tripDay.dayDate)}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                    包含 {dayToDelete.tripDayItems?.length || 0} 个项目
                                </Typography>
                            </Box>
                        )}
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setDeleteDayDialogOpen(false)}>取消</Button>
                        <Button
                            onClick={handleDeleteDay}
                            disabled={deleteDayLoading}
                            color="error"
                            variant="contained"
                        >
                            {deleteDayLoading ? <CircularProgress size={20} /> : '删除'}
                        </Button>
                    </DialogActions>
                </Dialog>

                {/* Swap Day Order Menu */}
                <Menu
                    anchorEl={swapDayAnchor}
                    open={Boolean(swapDayAnchor)}
                    onClose={() => { setSwapDayAnchor(null); setSwapSourceDay(null); }}
                    PaperProps={{ sx: { maxHeight: 300 } }}
                >
                    <Box sx={{ px: 2, py: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
                        <Typography variant="caption" color="text.secondary">选择要交换的目标日程</Typography>
                    </Box>
                    {tripDetail?.tripDays?.filter(td => td.tripDay.tripDayId !== swapSourceDay?.tripDay.tripDayId).map((td, idx) => (
                        <MenuItem
                            key={td.tripDay.tripDayId}
                            onClick={() => handleSwapDayOrder(td)}
                            sx={{ minWidth: 200 }}
                        >
                            <ListItemIcon>
                                <Event sx={{ fontSize: 16 }} />
                            </ListItemIcon>
                            <Typography variant="body2">
                                Day {(tripDetail?.tripDays?.findIndex(d => d.tripDay.tripDayId === td.tripDay.tripDayId) ?? idx) + 1} - {formatDate(td.tripDay.dayDate)}
                            </Typography>
                        </MenuItem>
                    ))}
                </Menu>

                {/* AI Generate Trip Confirmation Dialog */}
                <Dialog open={aiGenerateDialogOpen} onClose={() => setAiGenerateDialogOpen(false)} maxWidth="sm" fullWidth>
                    <DialogTitle sx={{ color: '#9c27b0', display: 'flex', alignItems: 'center', gap: 1 }}>
                        <AutoAwesome />
                        AI 智能生成完整旅程
                    </DialogTitle>
                    <DialogContent>
                        <Box sx={{ mb: 2 }}>
                            <Typography variant="body1" sx={{ mb: 2 }}>
                                AI 将根据您的心愿单智能规划完整旅程。请注意以下事项：
                            </Typography>
                            <Box sx={{ bgcolor: '#fff3e0', p: 2, borderRadius: 1, mb: 2 }}>
                                <Typography variant="body2" color="warning.dark" sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, mb: 1 }}>
                                    ⏱️ <strong>耗时较长</strong>：此功能可能需要几分钟完成，请耐心等待
                                </Typography>
                                <Typography variant="body2" color="warning.dark" sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, mb: 1 }}>
                                    ⚠️ <strong>覆盖原旅程</strong>：新生成的旅程将替换现有的所有日程安排
                                </Typography>
                                <Typography variant="body2" color="warning.dark" sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, mb: 1 }}>
                                    📍 <strong>仅含地址项目</strong>：只考虑有地址的心愿单项目，无地址的项目会被忽略
                                </Typography>
                                <Typography variant="body2" color="warning.dark" sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                                    💡 <strong>手动添加</strong>：无地址的项目将保留在心愿单中，您需要自行添加到日程
                                </Typography>
                            </Box>
                        </Box>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setAiGenerateDialogOpen(false)}>取消</Button>
                        <Button
                            onClick={handleAiGenerateTrip}
                            variant="contained"
                            sx={{ bgcolor: '#9c27b0', '&:hover': { bgcolor: '#7b1fa2' } }}
                            startIcon={<AutoAwesome />}
                        >
                            开始生成
                        </Button>
                    </DialogActions>
                </Dialog>
            </Container >
        </Box >
    );
};

export default TripDetailPage;
