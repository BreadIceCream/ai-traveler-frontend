import React, { useState, useEffect } from 'react';
import {
    Box,
    Typography,
    IconButton,
    Tabs,
    Tab,
    Checkbox,
    Button,
    Card,
    CardContent,
    CardActions,
    CircularProgress,
    Chip,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    List,
    ListItem,
    ListItemText,
    Divider,
    Paper,
    Accordion,
    AccordionSummary,
    AccordionDetails,
    TextField,
    InputAdornment,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Grid,
    CardMedia,
    ToggleButton,
    ToggleButtonGroup,
    Link,
    Pagination,
} from '@mui/material';
import {
    Close,
    Delete,
    AutoAwesome,
    Language,
    Lightbulb,
    CheckCircle,
    Restaurant,
    Celebration,
    Museum,
    MoreHoriz,
    Place,
    Visibility,
    ExpandMore,
    Add,
    Search,
    Star,
    AccessTime,
    LocationOn,
    Event,
    OpenInNew,
} from '@mui/icons-material';
import { WebPage, ExtractResult, NonPoiItem, Poi, NonPoiType, Page } from '@/types/api';
import { getWebPagesByConversation, deleteWebPage } from '@/api/webPage';
import { useExtractStore } from '@/store/extractStore';
import { toast } from '@/utils/toast';
import {
    getRecommendationPois,
    getRecommendationNonPois,
    deleteRecommendationPois,
    deleteRecommendationNonPois,
    addRecommendationPois,
    addRecommendationNonPois,
} from '@/api/aiRecommendation';
import { searchPoisFromDb, searchPoisFromApi } from '@/api/poi';
import { semanticSearchPois } from '@/api/explore';
import { getNonPoiItemsPage, createNonPoiItem } from '@/api/nonPoiItem';

// Recommendation Items Tab Component
interface RecommendationItemsTabProps {
    conversationId: string;
    recommendTabValue: number;
    setRecommendTabValue: (value: number) => void;
    recommendedPois: Poi[];
    setRecommendedPois: (pois: Poi[]) => void;
    recommendedNonPois: NonPoiItem[];
    setRecommendedNonPois: (items: NonPoiItem[]) => void;
    recommendLoading: boolean;
    setRecommendLoading: (loading: boolean) => void;
    setSelectedPoi: (poi: Poi | null) => void;
    setSelectedNonPoi: (item: NonPoiItem | null) => void;
    setDeleteRecommendDialogOpen: (open: boolean) => void;
    setItemToDelete: (item: { type: 'poi' | 'nonPoi'; id: string; name: string } | null) => void;
    setAddDialogOpen: (open: boolean) => void;
    getNonPoiTypeColor: (type: string) => 'primary' | 'secondary' | 'success' | 'warning' | 'info' | 'error';
    getNonPoiTypeIcon: (type: string) => React.ReactNode;
    isManualFilter: boolean | undefined;
    setIsManualFilter: (value: boolean | undefined) => void;
}

const RecommendationItemsTab: React.FC<RecommendationItemsTabProps> = ({
    conversationId,
    recommendTabValue,
    setRecommendTabValue,
    recommendedPois,
    setRecommendedPois,
    recommendedNonPois,
    setRecommendedNonPois,
    recommendLoading,
    setRecommendLoading,
    setSelectedPoi,
    setSelectedNonPoi,
    setDeleteRecommendDialogOpen,
    setItemToDelete,
    setAddDialogOpen,
    getNonPoiTypeColor,
    getNonPoiTypeIcon,
    isManualFilter,
    setIsManualFilter,
}) => {
    // Load recommendation items on mount and tab change
    useEffect(() => {
        if (!conversationId) return;
        loadRecommendationItems();
    }, [conversationId, recommendTabValue, isManualFilter]);

    const loadRecommendationItems = async () => {
        setRecommendLoading(true);
        try {
            if (recommendTabValue === 0) {
                const pois = await getRecommendationPois(conversationId, isManualFilter);
                setRecommendedPois(pois);
            } else {
                const nonPois = await getRecommendationNonPois(conversationId, isManualFilter);
                setRecommendedNonPois(nonPois);
            }
        } catch (error: any) {
            toast.error(error.message || '加载推荐项失败');
        } finally {
            setRecommendLoading(false);
        }
    };

    const handleDeleteClick = (type: 'poi' | 'nonPoi', id: string, name: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setItemToDelete({ type, id, name });
        setDeleteRecommendDialogOpen(true);
    };

    return (
        <>
            {/* Sub-tabs row */}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5, mt: -0.5 }}>
                <Tabs
                    value={recommendTabValue}
                    onChange={(_, v) => setRecommendTabValue(v)}
                    sx={{
                        minHeight: 32,
                        minWidth: 0,
                        '& .MuiTab-root': {
                            minHeight: 32,
                            py: 0,
                            px: 1,
                            fontSize: '0.75rem',
                            minWidth: 60,
                        },
                        '& .Mui-selected': { color: '#667eea', fontWeight: 'bold' },
                        '& .MuiTabs-indicator': { backgroundColor: '#667eea' },
                    }}
                >
                    <Tab label="POI景点" sx={{ textTransform: 'none' }} />
                    <Tab label="活动" sx={{ textTransform: 'none' }} />
                </Tabs>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <FormControl size="small" sx={{ minWidth: 80 }}>
                        <Select
                            value={isManualFilter === undefined ? 'all' : isManualFilter ? 'manual' : 'auto'}
                            onChange={(e) => {
                                const val = e.target.value;
                                setIsManualFilter(val === 'all' ? undefined : val === 'manual');
                            }}
                            displayEmpty
                            sx={{
                                fontSize: '0.75rem',
                                height: 28,
                                '& .MuiSelect-select': { py: 0.5 },
                                '& .MuiOutlinedInput-notchedOutline': { border: 'none' },
                            }}
                        >
                            <MenuItem value="all" sx={{ fontSize: '0.75rem' }}>全部</MenuItem>
                            <MenuItem value="manual" sx={{ fontSize: '0.75rem' }}>手动添加</MenuItem>
                            <MenuItem value="auto" sx={{ fontSize: '0.75rem' }}>AI 提取</MenuItem>
                        </Select>
                    </FormControl>
                    <Button
                        size="small"
                        variant="text"
                        startIcon={<Add sx={{ fontSize: 14 }} />}
                        onClick={() => setAddDialogOpen(true)}
                        sx={{
                            textTransform: 'none',
                            fontSize: '0.75rem',
                            py: 0.5,
                            px: 1,
                            color: '#667eea',
                            '&:hover': {
                                bgcolor: 'rgba(102, 126, 234, 0.08)',
                            },
                        }}
                    >
                        添加
                    </Button>
                </Box>
            </Box>
            {recommendLoading && (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                    <CircularProgress size={24} sx={{ color: '#667eea' }} />
                </Box>
            )}

            {/* POI Cards */}
            {!recommendLoading && recommendTabValue === 0 && (
                <>
                    {recommendedPois.length === 0 ? (
                        <Box sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
                            <Place sx={{ fontSize: 40, opacity: 0.3, color: '#667eea' }} />
                            <Typography variant="body2" sx={{ mt: 1 }}>
                                暂无推荐景点
                            </Typography>
                            <Typography variant="caption">
                                AI对话中推荐的景点会显示在这里
                            </Typography>
                        </Box>
                    ) : (
                        recommendedPois.map((poi) => (
                            <Card
                                key={poi.poiId}
                                sx={{
                                    mb: 1.5,
                                    borderRadius: 2,
                                    cursor: 'pointer',
                                    transition: 'box-shadow 0.2s, transform 0.2s',
                                    '&:hover': {
                                        boxShadow: 4,
                                        transform: 'translateY(-2px)',
                                    },
                                    minHeight: 110,
                                    maxHeight: 110,
                                    height: 110,
                                }}
                                onClick={() => setSelectedPoi(poi)}
                            >
                                <Box sx={{ display: 'flex', height: '100%' }}>
                                    {/* Photo */}
                                    {poi.photos && poi.photos.length > 0 && (
                                        <CardMedia
                                            component="img"
                                            sx={{
                                                width: 100,
                                                minWidth: 100,
                                                height: 110,
                                                maxHeight: 110,
                                                objectFit: 'cover',
                                                borderRadius: '8px 0 0 8px',
                                                flexShrink: 0,
                                            }}
                                            image={poi.photos[0]}
                                            alt={poi.name}
                                        />
                                    )}
                                    {/* Content */}
                                    <CardContent sx={{ flex: 1, px: 1.5, py: 1, '&:last-child': { pb: 1 }, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 0.5 }}>
                                            <Typography variant="body2" fontWeight={500} noWrap sx={{ flex: 1, mr: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                {poi.name}
                                            </Typography>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0 }}>
                                                {poi.rating && (
                                                    <Chip
                                                        size="small"
                                                        icon={<Star sx={{ fontSize: 12 }} />}
                                                        label={poi.rating}
                                                        color="warning"
                                                        sx={{ height: 18, fontSize: '0.6rem' }}
                                                    />
                                                )}
                                                <IconButton
                                                    size="small"
                                                    onClick={(e) => handleDeleteClick('poi', poi.poiId, poi.name, e)}
                                                    sx={{ p: 0.3, color: 'text.secondary', '&:hover': { color: 'error.main' } }}
                                                >
                                                    <Delete sx={{ fontSize: 16 }} />
                                                </IconButton>
                                            </Box>
                                        </Box>
                                        {poi.type && (
                                            <Chip size="small" label={poi.type} sx={{ mb: 0.5, height: 16, fontSize: '0.6rem', alignSelf: 'flex-start' }} />
                                        )}
                                        {(poi.city || poi.address) && (
                                            <Box sx={{ display: 'flex', alignItems: 'center', color: 'text.secondary', overflow: 'hidden', mb: 0.5 }}>
                                                <Place sx={{ fontSize: 10, mr: 0.3, flexShrink: 0 }} />
                                                <Typography variant="body2" noWrap sx={{ fontSize: '0.7rem', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                    {poi.city}{poi.address ? ` · ${poi.address}` : ''}
                                                </Typography>
                                            </Box>
                                        )}
                                        {poi.description && (
                                            <Typography
                                                variant="caption"
                                                color="text.secondary"
                                                sx={{
                                                    display: '-webkit-box',
                                                    maxLines: 2,
                                                    WebkitLineClamp: 2,
                                                    WebkitBoxOrient: 'vertical',
                                                    overflow: 'hidden',
                                                    lineHeight: 1.3,
                                                    flex: 1,
                                                }}
                                            >
                                                {poi.description}
                                            </Typography>
                                        )}
                                    </CardContent>
                                </Box>
                            </Card>
                        ))
                    )}
                </>
            )}

            {/* NonPoi Cards */}
            {!recommendLoading && recommendTabValue === 1 && (
                <>
                    {recommendedNonPois.length === 0 ? (
                        <Box sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
                            <Lightbulb sx={{ fontSize: 40, opacity: 0.3, color: '#764ba2' }} />
                            <Typography variant="body2" sx={{ mt: 1 }}>
                                暂无推荐活动
                            </Typography>
                            <Typography variant="caption">
                                AI对话中推荐的活动会显示在这里
                            </Typography>
                        </Box>
                    ) : (
                        recommendedNonPois.map((item) => (
                            <Card
                                key={item.id}
                                sx={{
                                    mb: 1.5,
                                    borderRadius: 2,
                                    cursor: 'pointer',
                                    transition: 'box-shadow 0.2s, transform 0.2s',
                                    '&:hover': {
                                        boxShadow: 4,
                                        transform: 'translateY(-2px)',
                                    },
                                }}
                                onClick={() => setSelectedNonPoi(item)}
                            >
                                <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 0.5 }}>
                                        <Typography variant="body2" fontWeight={500} noWrap sx={{ flex: 1, mr: 1 }}>
                                            {item.title}
                                        </Typography>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                            <Chip
                                                size="small"
                                                icon={getNonPoiTypeIcon(item.type) as React.ReactElement}
                                                label={item.type}
                                                color={getNonPoiTypeColor(item.type)}
                                                sx={{ height: 18, fontSize: '0.6rem' }}
                                            />
                                            <IconButton
                                                size="small"
                                                onClick={(e) => handleDeleteClick('nonPoi', item.id, item.title, e)}
                                                sx={{ p: 0.3, color: 'text.secondary', '&:hover': { color: 'error.main' } }}
                                            >
                                                <Delete sx={{ fontSize: 16 }} />
                                            </IconButton>
                                        </Box>
                                    </Box>
                                    {(item.city || item.estimatedAddress) && (
                                        <Box sx={{ display: 'flex', alignItems: 'center', color: 'text.secondary', mb: 0.5 }}>
                                            <Place sx={{ fontSize: 12, mr: 0.3 }} />
                                            <Typography variant="caption" noWrap>
                                                {item.city}{item.estimatedAddress ? ` · ${item.estimatedAddress}` : ''}
                                            </Typography>
                                        </Box>
                                    )}
                                    {item.activityTime && (
                                        <Box sx={{ display: 'flex', alignItems: 'center', color: 'text.secondary', mb: 0.5 }}>
                                            <AccessTime sx={{ fontSize: 12, mr: 0.3 }} />
                                            <Typography variant="caption" noWrap>
                                                {item.activityTime}
                                            </Typography>
                                        </Box>
                                    )}
                                    {item.description && (
                                        <Typography
                                            variant="caption"
                                            color="text.secondary"
                                            sx={{
                                                display: '-webkit-box',
                                                WebkitLineClamp: 2,
                                                WebkitBoxOrient: 'vertical',
                                                overflow: 'hidden',
                                                lineHeight: 1.3,
                                            }}
                                        >
                                            {item.description}
                                        </Typography>
                                    )}
                                </CardContent>
                            </Card>
                        ))
                    )}
                </>
            )}
        </>
    );
};

interface ResourcePanelProps {
    open: boolean;
    onClose: () => void;
    conversationId: string;
}

const ResourcePanel: React.FC<ResourcePanelProps> = ({ open, onClose, conversationId }) => {
    const [tabValue, setTabValue] = useState(0);
    const [webPages, setWebPages] = useState<WebPage[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [detailDialogOpen, setDetailDialogOpen] = useState(false);
    const [selectedWebPage, setSelectedWebPage] = useState<WebPage | null>(null);
    const [showResults, setShowResults] = useState(false);
    const [selectedPoi, setSelectedPoi] = useState<Poi | null>(null);
    const [selectedNonPoi, setSelectedNonPoi] = useState<NonPoiItem | null>(null);
    const [clearAllDialogOpen, setClearAllDialogOpen] = useState(false);
    const [deleteWebPageDialogOpen, setDeleteWebPageDialogOpen] = useState(false);
    const [webPageToDelete, setWebPageToDelete] = useState<WebPage | null>(null);

    // Recommendation items tab states
    const [recommendTabValue, setRecommendTabValue] = useState(0); // 0=POI, 1=活动
    const [recommendedPois, setRecommendedPois] = useState<Poi[]>([]);
    const [recommendedNonPois, setRecommendedNonPois] = useState<NonPoiItem[]>([]);
    const [recommendLoading, setRecommendLoading] = useState(false);
    const [deleteRecommendDialogOpen, setDeleteRecommendDialogOpen] = useState(false);
    const [itemToDelete, setItemToDelete] = useState<{ type: 'poi' | 'nonPoi'; id: string; name: string } | null>(null);
    const [addDialogOpen, setAddDialogOpen] = useState(false);
    const [isManualFilter, setIsManualFilter] = useState<boolean | undefined>(undefined);

    // Add POI dialog states
    const [poiSearchType, setPoiSearchType] = useState<'db' | 'semantic' | 'api'>('semantic');
    const [poiSearchKeyword, setPoiSearchKeyword] = useState('');
    const [poiSearchCity, setPoiSearchCity] = useState('');
    const [poiSearchResults, setPoiSearchResults] = useState<Poi[]>([]);
    const [poiSearchLoading, setPoiSearchLoading] = useState(false);

    // Add NonPoi dialog states
    const [nonPoiSearchMode, setNonPoiSearchMode] = useState<'search' | 'create'>('search');
    const [nonPoiSearchKeyword, setNonPoiSearchKeyword] = useState('');
    const [nonPoiSearchType, setNonPoiSearchType] = useState<NonPoiType | ''>('');
    const [nonPoiSearchResults, setNonPoiSearchResults] = useState<NonPoiItem[]>([]);
    const [nonPoiSearchLoading, setNonPoiSearchLoading] = useState(false);
    const [nonPoiSearchPage, setNonPoiSearchPage] = useState(1);
    const [nonPoiSearchTotal, setNonPoiSearchTotal] = useState(0);
    const [nonPoiFormData, setNonPoiFormData] = useState({
        type: 'ACTIVITY' as NonPoiType,
        title: '',
        description: '',
        city: '',
        activityTime: '',
        estimatedAddress: '',
        extraInfo: '',
        sourceUrl: '',
    });

    const { startExtract, isExtracting, hasResult, getResult, getResultsByConversation, hasConversationResults, removeResult, clearAllResults } = useExtractStore();

    // Type helpers
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

    // Load web pages when panel opens
    useEffect(() => {
        if (open && conversationId) {
            loadWebPages();
        }
    }, [open, conversationId]);

    const loadWebPages = async () => {
        setLoading(true);
        try {
            const pages = await getWebPagesByConversation(conversationId);
            setWebPages(pages);
        } catch (error: any) {
            toast.error(error.message || '加载网页列表失败');
        } finally {
            setLoading(false);
        }
    };

    const handleSelectAll = () => {
        if (selectedIds.size === webPages.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(webPages.map(p => p.id)));
        }
    };

    const handleToggleSelect = (id: string) => {
        const newSelected = new Set(selectedIds);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        setSelectedIds(newSelected);
    };

    const handleOpenDeleteWebPageDialog = (webPage: WebPage) => {
        setWebPageToDelete(webPage);
        setDeleteWebPageDialogOpen(true);
    };

    const handleCloseDeleteWebPageDialog = () => {
        setDeleteWebPageDialogOpen(false);
        setWebPageToDelete(null);
    };

    const handleConfirmDeleteWebPage = async () => {
        if (!webPageToDelete) return;
        try {
            await deleteWebPage(webPageToDelete.id);
            setWebPages(prev => prev.filter(p => p.id !== webPageToDelete.id));
            setSelectedIds(prev => {
                const newSet = new Set(prev);
                newSet.delete(webPageToDelete.id);
                return newSet;
            });
            toast.success('删除成功');
        } catch (error: any) {
            toast.error(error.message || '删除失败');
        } finally {
            handleCloseDeleteWebPageDialog();
        }
    };

    const handleExtractSelected = () => {
        if (selectedIds.size === 0) {
            toast.error('请先选择要提取的网页');
            return;
        }
        const ids = Array.from(selectedIds);
        startExtract(conversationId, ids);
        setSelectedIds(new Set());
    };

    const handleViewDetail = (webPage: WebPage) => {
        setSelectedWebPage(webPage);
        setDetailDialogOpen(true);
    };

    // POI Search handler
    const handlePoiSearch = async () => {
        if (!poiSearchKeyword.trim()) return;
        setPoiSearchLoading(true);
        try {
            let results: Poi[] = [];
            const city = poiSearchCity.trim() || undefined;
            switch (poiSearchType) {
                case 'semantic':
                    results = await semanticSearchPois({ queryText: poiSearchKeyword, city, topK: 10 });
                    break;
                case 'db':
                    results = await searchPoisFromDb({ keywords: poiSearchKeyword, city });
                    break;
                case 'api':
                    results = await searchPoisFromApi({ keywords: poiSearchKeyword, city });
                    break;
            }
            setPoiSearchResults(results);
            // Filter out already added items (fetch all to ensure accurate filtering)
            const allPois = await getRecommendationPois(conversationId);
            const addedIds = new Set(allPois.map(p => p.poiId));
            setPoiSearchResults(results.filter(poi => !addedIds.has(poi.poiId)));
        } catch (error: any) {
            toast.error(error.message || '搜索失败');
        } finally {
            setPoiSearchLoading(false);
        }
    };

    // Add POI to recommendations
    const handleAddPoiToRecommendation = async (poiId: string) => {
        try {
            await addRecommendationPois(conversationId, [poiId]);
            // Refresh POI list with current filter
            const pois = await getRecommendationPois(conversationId, isManualFilter);
            setRecommendedPois(pois);
            // Remove from search results
            setPoiSearchResults(prev => prev.filter(p => p.poiId !== poiId));
            toast.success('添加成功');
        } catch (error: any) {
            toast.error(error.message || '添加失败');
        }
    };

    // NonPoi Search handler
    const handleNonPoiSearch = async (page: number = nonPoiSearchPage) => {
        setNonPoiSearchLoading(true);
        try {
            const pageSize = 50;
            const result = await getNonPoiItemsPage(
                page,
                pageSize,
                nonPoiSearchType || undefined
            );
            setNonPoiSearchTotal(result.total || 0);
            // Filter by keyword on client side if provided
            let filtered = result.records;
            if (nonPoiSearchKeyword.trim()) {
                const keyword = nonPoiSearchKeyword.toLowerCase();
                filtered = result.records.filter(item =>
                    item.title.toLowerCase().includes(keyword) ||
                    (item.description && item.description.toLowerCase().includes(keyword))
                );
            }
            // Filter out already added items (fetch all to ensure accurate filtering)
            const allNonPois = await getRecommendationNonPois(conversationId);
            const addedIds = new Set(allNonPois.map(n => n.id));
            filtered = filtered.filter(item => !addedIds.has(item.id));
            setNonPoiSearchResults(filtered);
        } catch (error: any) {
            toast.error(error.message || '搜索失败');
        } finally {
            setNonPoiSearchLoading(false);
        }
    };

    // Add NonPoi to recommendations
    const handleAddNonPoiToRecommendation = async (nonPoiId: string) => {
        try {
            await addRecommendationNonPois(conversationId, [nonPoiId]);
            // Refresh NonPoi list with current filter
            const nonPois = await getRecommendationNonPois(conversationId, isManualFilter);
            setRecommendedNonPois(nonPois);
            // Remove from search results
            setNonPoiSearchResults(prev => prev.filter(n => n.id !== nonPoiId));
            toast.success('添加成功');
        } catch (error: any) {
            toast.error(error.message || '添加失败');
        }
    };

    // Create NonPoi and add to recommendations
    const handleCreateAndAddNonPoi = async () => {
        if (!nonPoiFormData.title) return;
        try {
            // Create the NonPoi item first
            const newItem = await createNonPoiItem(nonPoiFormData);
            // Then add to recommendations
            await addRecommendationNonPois(conversationId, [newItem.id]);
            // Refresh NonPoi list with current filter
            const nonPois = await getRecommendationNonPois(conversationId, isManualFilter);
            setRecommendedNonPois(nonPois);
            // Reset form
            setNonPoiFormData({
                type: 'ACTIVITY' as NonPoiType,
                title: '',
                description: '',
                city: '',
                activityTime: '',
                estimatedAddress: '',
                extraInfo: '',
                sourceUrl: '',
            });
            setAddDialogOpen(false);
            toast.success('创建并添加成功');
        } catch (error: any) {
            toast.error(error.message || '操作失败');
        }
    };

    const renderWebPageCard = (webPage: WebPage) => {
        const extracting = isExtracting(webPage.id);
        const extracted = hasResult(webPage.id);
        const result = getResult(webPage.id);

        return (
            <Card
                key={webPage.id}
                sx={{
                    mb: 1.5,
                    cursor: 'pointer',
                    borderRadius: 2,
                    '&:hover': {
                        boxShadow: 3,
                        transform: 'translateY(-1px)',
                    },
                    transition: 'box-shadow 0.2s, transform 0.2s',
                }}
                onClick={() => handleViewDetail(webPage)}
            >
                <CardContent sx={{ pb: 0.5, pt: 1.5, px: 1.5 }}>
                    {/* Title with status indicator */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                        <Typography variant="body2" fontWeight={500} noWrap sx={{ flex: 1 }}>
                            {webPage.name}
                        </Typography>
                        {extracting && (
                            <CircularProgress size={14} sx={{ color: '#667eea' }} />
                        )}
                        {extracted && !extracting && (
                            <CheckCircle color="success" sx={{ fontSize: 16 }} />
                        )}
                    </Box>

                    {/* 2-line snippet */}
                    <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                            lineHeight: 1.4,
                        }}
                    >
                        {webPage.snippet || '暂无描述'}
                    </Typography>

                    {/* Extraction result badges */}
                    {extracted && result && (
                        <Box sx={{ mt: 0.5, display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                            {result.pois && result.pois.length > 0 && (
                                <Chip
                                    size="small"
                                    label={`${result.pois.length} 景点`}
                                    sx={{
                                        height: 18,
                                        fontSize: '0.65rem',
                                        bgcolor: 'rgba(102, 126, 234, 0.1)',
                                        color: '#667eea',
                                    }}
                                />
                            )}
                            {result.nonPois && result.nonPois.length > 0 && (
                                <Chip
                                    size="small"
                                    label={`${result.nonPois.length} 活动`}
                                    sx={{
                                        height: 18,
                                        fontSize: '0.65rem',
                                        bgcolor: 'rgba(118, 75, 162, 0.1)',
                                        color: '#764ba2',
                                    }}
                                />
                            )}
                        </Box>
                    )}
                </CardContent>

                {/* Bottom row: Checkbox on left, buttons on right */}
                <CardActions sx={{ pt: 0, px: 1.5, pb: 1, justifyContent: 'space-between' }}>
                    <Checkbox
                        checked={selectedIds.has(webPage.id)}
                        onChange={(e) => {
                            e.stopPropagation();
                            handleToggleSelect(webPage.id);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        size="small"
                        disabled={extracting}
                        sx={{ p: 0.5 }}
                    />
                    <Box>
                        <Button
                            size="small"
                            startIcon={<AutoAwesome sx={{ fontSize: 12 }} />}
                            onClick={(e) => {
                                e.stopPropagation();
                                startExtract(conversationId, [webPage.id]);
                            }}
                            disabled={extracting}
                            sx={{
                                fontSize: '0.7rem',
                                py: 0,
                                px: 1,
                                minWidth: 0,
                                color: '#667eea',
                            }}
                        >
                            {extracting ? '提取中' : '提取'}
                        </Button>
                        <Button
                            size="small"
                            color="error"
                            startIcon={<Delete sx={{ fontSize: 12 }} />}
                            onClick={(e) => {
                                e.stopPropagation();
                                handleOpenDeleteWebPageDialog(webPage);
                            }}
                            sx={{ fontSize: '0.7rem', py: 0, px: 1, minWidth: 0 }}
                        >
                            删除
                        </Button>
                    </Box>
                </CardActions>
            </Card>
        );
    };

    const renderExtractResult = (result: ExtractResult) => {
        const pois = result.pois || [];
        const nonPois = result.nonPois || [];

        return (
            <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2" sx={{ color: '#667eea' }} gutterBottom>
                    提取结果
                </Typography>
                {pois.length > 0 && (
                    <Box sx={{ mb: 1 }}>
                        <Typography variant="body2" fontWeight={500}>
                            景点 ({pois.length})
                        </Typography>
                        <List dense disablePadding>
                            {pois.map((poi, idx) => (
                                <ListItem key={idx} disablePadding sx={{ pl: 1 }}>
                                    <ListItemText
                                        primary={poi.name}
                                        secondary={poi.address}
                                        primaryTypographyProps={{ variant: 'body2' }}
                                        secondaryTypographyProps={{ variant: 'caption' }}
                                    />
                                </ListItem>
                            ))}
                        </List>
                    </Box>
                )}
                {nonPois.length > 0 && (
                    <Box>
                        <Typography variant="body2" fontWeight={500}>
                            活动 ({nonPois.length})
                        </Typography>
                        <List dense disablePadding>
                            {nonPois.map((item: NonPoiItem, idx: number) => (
                                <ListItem key={idx} disablePadding sx={{ pl: 1 }}>
                                    <ListItemText
                                        primary={item.title}
                                        secondary={item.description}
                                        primaryTypographyProps={{ variant: 'body2' }}
                                        secondaryTypographyProps={{ variant: 'caption' }}
                                    />
                                </ListItem>
                            ))}
                        </List>
                    </Box>
                )}
                {pois.length === 0 && nonPois.length === 0 && (
                    <Typography variant="body2" color="text.secondary">
                        未提取到任何内容
                    </Typography>
                )}
            </Box>
        );
    };

    if (!open) return null;

    return (
        <>
            {/* Side Panel */}
            <Paper
                elevation={2}
                sx={{
                    width: 'calc(30% - 16px)',
                    height: 'calc(100% - 40px)',
                    m: 2,
                    ml: 0,
                    borderRadius: 3,
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                }}
            >
                {/* Header */}
                <Box sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    px: 2,
                    py: 1.5,
                    borderBottom: 1,
                    borderColor: 'divider'
                }}>
                    <Typography
                        variant="subtitle1"
                        fontWeight="bold"
                        sx={{
                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            backgroundClip: 'text',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                        }}
                    >
                        资源
                    </Typography>
                    <IconButton onClick={onClose} size="small">
                        <Close fontSize="small" />
                    </IconButton>
                </Box>

                {/* Tabs */}
                <Tabs
                    value={tabValue}
                    onChange={(_, v) => {
                        setTabValue(v);
                        // Refresh web pages when clicking on "网页" tab
                        if (v === 0) {
                            loadWebPages();
                        }
                    }}
                    sx={{
                        minHeight: 40,
                        borderBottom: 1,
                        borderColor: 'divider',
                        px: 1,
                        '& .MuiTab-root': {
                            minHeight: 40,
                            py: 0,
                            fontSize: '0.8rem',
                        },
                        '& .Mui-selected': {
                            color: '#667eea',
                        },
                        '& .MuiTabs-indicator': {
                            backgroundColor: '#667eea',
                        },
                    }}
                >
                    <Tab
                        icon={<Language sx={{ fontSize: 16 }} />}
                        iconPosition="start"
                        label="网页"
                        sx={{ textTransform: 'none' }}
                    />
                    <Tab
                        icon={<Lightbulb sx={{ fontSize: 16 }} />}
                        iconPosition="start"
                        label="推荐项"
                        sx={{ textTransform: 'none' }}
                    />
                </Tabs>

                {/* Content */}
                <Box sx={{
                    flex: 1,
                    overflow: 'auto',
                    p: 1.5,
                    scrollbarWidth: 'none',
                    '&::-webkit-scrollbar': { display: 'none' },
                }}>
                    {tabValue === 0 && (
                        <>
                            {/* Batch actions */}
                            {webPages.length > 0 && (
                                <Box sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    mb: 1.5,
                                    px: 0.5,
                                }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                        {showResults ? (
                                            /* Clear all button when viewing results */
                                            <Button
                                                size="small"
                                                color="error"
                                                startIcon={<Delete sx={{ fontSize: 14 }} />}
                                                onClick={() => setClearAllDialogOpen(true)}
                                                sx={{
                                                    textTransform: 'none',
                                                    fontSize: '0.75rem',
                                                    py: 0.25,
                                                }}
                                            >
                                                清空全部
                                            </Button>
                                        ) : (
                                            /* Select all checkbox when viewing web pages */
                                            <>
                                                <Checkbox
                                                    checked={selectedIds.size === webPages.length && webPages.length > 0}
                                                    indeterminate={selectedIds.size > 0 && selectedIds.size < webPages.length}
                                                    onChange={handleSelectAll}
                                                    size="small"
                                                    sx={{ p: 0.5 }}
                                                />
                                                <Typography variant="caption" color="text.secondary">
                                                    {selectedIds.size > 0 ? `已选 ${selectedIds.size}` : '全选'}
                                                </Typography>
                                            </>
                                        )}
                                    </Box>
                                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                                        <Button
                                            size="small"
                                            variant="contained"
                                            startIcon={<AutoAwesome sx={{ fontSize: 14 }} />}
                                            onClick={handleExtractSelected}
                                            disabled={selectedIds.size === 0}
                                            sx={{
                                                textTransform: 'none',
                                                fontSize: '0.75rem',
                                                py: 0.5,
                                                px: 1.5,
                                                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                                '&:hover': {
                                                    background: 'linear-gradient(135deg, #5a6fd6 0%, #6a4190 100%)',
                                                },
                                                '&:disabled': {
                                                    background: '#e0e0e0',
                                                },
                                            }}
                                        >
                                            提取选中
                                        </Button>
                                        {hasConversationResults(conversationId) && (
                                            <Button
                                                size="small"
                                                variant={showResults ? 'contained' : 'outlined'}
                                                startIcon={<Visibility sx={{ fontSize: 14 }} />}
                                                onClick={() => setShowResults(!showResults)}
                                                sx={{
                                                    textTransform: 'none',
                                                    fontSize: '0.75rem',
                                                    py: 0.5,
                                                    px: 1.5,
                                                    borderColor: '#667eea',
                                                    color: showResults ? 'white' : '#667eea',
                                                    background: showResults ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : 'transparent',
                                                    '&:hover': {
                                                        borderColor: '#5a6fd6',
                                                        background: showResults
                                                            ? 'linear-gradient(135deg, #5a6fd6 0%, #6a4190 100%)'
                                                            : 'rgba(102, 126, 234, 0.08)',
                                                    },
                                                }}
                                            >
                                                提取结果
                                            </Button>
                                        )}
                                    </Box>
                                </Box>
                            )}

                            {/* Content: Show results or web pages based on toggle */}
                            {showResults ? (
                                /* Results View */
                                <>
                                    {getResultsByConversation(conversationId).map((result) => (
                                        <Box key={result.webPageId} sx={{ mb: 2 }}>
                                            {/* Result header with delete button */}
                                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                <Typography variant="body2" fontWeight={500} sx={{ color: '#667eea', flex: 1 }} noWrap>
                                                    {result.webPageTitle}
                                                </Typography>
                                                <IconButton
                                                    size="small"
                                                    onClick={() => removeResult(conversationId, result.webPageId)}
                                                    sx={{ p: 0.5, color: 'text.secondary', '&:hover': { color: 'error.main' } }}
                                                >
                                                    <Close sx={{ fontSize: 16 }} />
                                                </IconButton>
                                            </Box>
                                            {/* Message from backend */}
                                            {result.message && (
                                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                                                    {result.message}
                                                </Typography>
                                            )}

                                            {/* POI cards - Collapsible */}
                                            {result.pois && result.pois.length > 0 && (
                                                <Accordion
                                                    sx={{
                                                        boxShadow: 'none',
                                                        '&:before': { display: 'none' },
                                                        bgcolor: 'transparent',
                                                        margin: '0 !important',
                                                    }}
                                                >
                                                    <AccordionSummary
                                                        expandIcon={<ExpandMore />}
                                                        sx={{
                                                            minHeight: 32,
                                                            px: 0,
                                                            '& .MuiAccordionSummary-content': { my: 0.5 },
                                                        }}
                                                    >
                                                        <Typography variant="caption" color="text.secondary">
                                                            景点 ({result.pois.length})
                                                        </Typography>
                                                    </AccordionSummary>
                                                    <AccordionDetails sx={{ p: 0 }}>
                                                        {result.pois.map((poi, idx) => (
                                                            <Card
                                                                key={`poi-${idx}`}
                                                                sx={{
                                                                    mb: 1,
                                                                    cursor: 'pointer',
                                                                    transition: 'box-shadow 0.2s',
                                                                    '&:hover': { boxShadow: 3 },
                                                                }}
                                                                onClick={() => setSelectedPoi(poi)}
                                                            >
                                                                <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                                                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                                                                        <Typography variant="body2" fontWeight={500} noWrap sx={{ flex: 1 }}>
                                                                            {poi.name}
                                                                        </Typography>
                                                                        <Chip size="small" label="POI" color="primary" sx={{ height: 18, fontSize: '0.6rem' }} />
                                                                    </Box>
                                                                    {(poi.city || poi.address) && (
                                                                        <Box sx={{ display: 'flex', alignItems: 'center', color: 'text.secondary' }}>
                                                                            <Place sx={{ fontSize: 12, mr: 0.3 }} />
                                                                            <Typography variant="caption" noWrap>
                                                                                {poi.city}{poi.address ? ` · ${poi.address}` : ''}
                                                                            </Typography>
                                                                        </Box>
                                                                    )}
                                                                    {poi.description && (
                                                                        <Typography
                                                                            variant="caption"
                                                                            color="text.secondary"
                                                                            sx={{
                                                                                display: '-webkit-box',
                                                                                WebkitLineClamp: 2,
                                                                                WebkitBoxOrient: 'vertical',
                                                                                overflow: 'hidden',
                                                                                mt: 0.5,
                                                                            }}
                                                                        >
                                                                            {poi.description}
                                                                        </Typography>
                                                                    )}
                                                                </CardContent>
                                                            </Card>
                                                        ))}
                                                    </AccordionDetails>
                                                </Accordion>
                                            )}

                                            {/* NonPoi cards - Collapsible */}
                                            {result.nonPois && result.nonPois.length > 0 && (
                                                <Accordion
                                                    sx={{
                                                        boxShadow: 'none',
                                                        '&:before': { display: 'none' },
                                                        bgcolor: 'transparent',
                                                        margin: '0 !important',
                                                    }}
                                                >
                                                    <AccordionSummary
                                                        expandIcon={<ExpandMore />}
                                                        sx={{
                                                            minHeight: 32,
                                                            px: 0,
                                                            my: -1.5,
                                                            '& .MuiAccordionSummary-content': { my: 0.5 },
                                                        }}
                                                    >
                                                        <Typography variant="caption" color="text.secondary">
                                                            活动 ({result.nonPois.length})
                                                        </Typography>
                                                    </AccordionSummary>
                                                    <AccordionDetails sx={{ p: 0 }}>
                                                        {result.nonPois.map((item, idx) => (
                                                            <Card
                                                                key={`nonpoi-${idx}`}
                                                                sx={{
                                                                    mb: 1,
                                                                    borderRadius: 2,
                                                                    cursor: 'pointer',
                                                                    transition: 'box-shadow 0.2s ',
                                                                    '&:hover': { boxShadow: 3 },
                                                                }}
                                                                onClick={() => setSelectedNonPoi(item)}
                                                            >
                                                                <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                                                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                                                                        <Typography variant="body2" fontWeight={500} noWrap sx={{ flex: 1 }}>
                                                                            {item.title}
                                                                        </Typography>
                                                                        <Chip
                                                                            size="small"
                                                                            icon={getNonPoiTypeIcon(item.type)}
                                                                            label={item.type}
                                                                            color={getNonPoiTypeColor(item.type)}
                                                                            sx={{ height: 18, fontSize: '0.6rem' }}
                                                                        />
                                                                    </Box>
                                                                    {(item.city || item.estimatedAddress) && (
                                                                        <Box sx={{ display: 'flex', alignItems: 'center', color: 'text.secondary' }}>
                                                                            <Place sx={{ fontSize: 12, mr: 0.3 }} />
                                                                            <Typography variant="caption" noWrap>
                                                                                {item.city}{item.estimatedAddress ? ` · ${item.estimatedAddress}` : ''}
                                                                            </Typography>
                                                                        </Box>
                                                                    )}
                                                                    {item.description && (
                                                                        <Typography
                                                                            variant="caption"
                                                                            color="text.secondary"
                                                                            sx={{
                                                                                display: '-webkit-box',
                                                                                WebkitLineClamp: 2,
                                                                                WebkitBoxOrient: 'vertical',
                                                                                overflow: 'hidden',
                                                                                mt: 0.5,
                                                                            }}
                                                                        >
                                                                            {item.description}
                                                                        </Typography>
                                                                    )}
                                                                </CardContent>
                                                            </Card>
                                                        ))}
                                                    </AccordionDetails>
                                                </Accordion>
                                            )}
                                            <Divider sx={{ my: 1 }} />
                                        </Box>
                                    ))}
                                </>
                            ) : (
                                /* Web Pages View */
                                <>
                                    {/* Loading */}
                                    {loading && (
                                        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                                            <CircularProgress size={24} sx={{ color: '#667eea' }} />
                                        </Box>
                                    )}

                                    {/* Web page list */}
                                    {!loading && webPages.map(renderWebPageCard)}

                                    {/* Empty state */}
                                    {!loading && webPages.length === 0 && (
                                        <Box sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
                                            <Language sx={{ fontSize: 40, opacity: 0.3, color: '#667eea' }} />
                                            <Typography variant="body2" sx={{ mt: 1 }}>
                                                暂无网页
                                            </Typography>
                                            <Typography variant="caption">
                                                AI会话中提到的网页会显示在这里
                                            </Typography>
                                        </Box>
                                    )}
                                </>
                            )}
                        </>
                    )}

                    {tabValue === 1 && (
                        <RecommendationItemsTab
                            conversationId={conversationId}
                            recommendTabValue={recommendTabValue}
                            setRecommendTabValue={setRecommendTabValue}
                            recommendedPois={recommendedPois}
                            setRecommendedPois={setRecommendedPois}
                            recommendedNonPois={recommendedNonPois}
                            setRecommendedNonPois={setRecommendedNonPois}
                            recommendLoading={recommendLoading}
                            setRecommendLoading={setRecommendLoading}
                            setSelectedPoi={setSelectedPoi}
                            setSelectedNonPoi={setSelectedNonPoi}
                            setDeleteRecommendDialogOpen={setDeleteRecommendDialogOpen}
                            setItemToDelete={setItemToDelete}
                            setAddDialogOpen={setAddDialogOpen}
                            getNonPoiTypeColor={getNonPoiTypeColor}
                            getNonPoiTypeIcon={getNonPoiTypeIcon}
                            isManualFilter={isManualFilter}
                            setIsManualFilter={setIsManualFilter}
                        />
                    )}
                </Box>
            </Paper>

            {/* Web Page Detail Dialog */}
            <Dialog
                open={detailDialogOpen}
                onClose={() => setDetailDialogOpen(false)}
                maxWidth="sm"
                fullWidth
                PaperProps={{
                    sx: { borderRadius: 3 }
                }}
            >
                {selectedWebPage && (
                    <>
                        <DialogTitle sx={{ pb: 1 }}>
                            <Typography variant="h6" component="div" fontWeight="bold">
                                {selectedWebPage.name}
                            </Typography>
                            {/* URL as clickable link */}
                            <Typography
                                component="a"
                                href={selectedWebPage.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                variant="body2"
                                sx={{
                                    fontSize: '0.8rem',
                                    color: '#667eea',
                                    textDecoration: 'none',
                                    display: 'block',
                                    '&:hover': { textDecoration: 'underline' },
                                }}
                                onClick={(e) => e.stopPropagation()}
                            >
                                {selectedWebPage.displayUrl || selectedWebPage.url}
                            </Typography>
                            {/* Source and publish date */}
                            <Box sx={{ display: 'flex', gap: 2, mt: 0.5, flexWrap: 'wrap' }}>
                                {selectedWebPage.siteName && (
                                    <Typography variant="caption" color="text.secondary">
                                        来源: {selectedWebPage.siteName}
                                    </Typography>
                                )}
                                {selectedWebPage.datePublished && (
                                    <Typography variant="caption" color="text.secondary">
                                        发布时间: {new Date(selectedWebPage.datePublished).toLocaleString('zh-CN', {
                                            year: 'numeric',
                                            month: '2-digit',
                                            day: '2-digit',
                                            hour: '2-digit',
                                            minute: '2-digit',
                                        })}
                                    </Typography>
                                )}
                            </Box>
                        </DialogTitle>
                        <DialogContent dividers>
                            {selectedWebPage.snippet && (
                                <>
                                    <Typography variant="subtitle2" gutterBottom fontWeight={500}>
                                        简要描述
                                    </Typography>
                                    <Typography variant="body2" paragraph>
                                        {selectedWebPage.snippet}
                                    </Typography>
                                </>
                            )}

                            {selectedWebPage.summary && (
                                <>
                                    <Divider sx={{ my: 2 }} />
                                    <Typography variant="subtitle2" gutterBottom fontWeight={500}>
                                        网页总结
                                    </Typography>
                                    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                                        {selectedWebPage.summary}
                                    </Typography>
                                </>
                            )}

                            {!selectedWebPage.snippet && !selectedWebPage.summary && (
                                <Typography variant="body2" color="text.secondary">
                                    暂无详细信息
                                </Typography>
                            )}

                            {/* Show extract result if available */}
                            {hasResult(selectedWebPage.id) && (
                                <>
                                    <Divider sx={{ my: 2 }} />
                                    {renderExtractResult(getResult(selectedWebPage.id)!)}
                                </>
                            )}
                        </DialogContent>
                        <DialogActions>
                            <Button
                                onClick={() => setDetailDialogOpen(false)}
                                sx={{ color: '#667eea' }}
                            >
                                关闭
                            </Button>
                        </DialogActions>
                    </>
                )}
            </Dialog>

            {/* POI Detail Dialog */}
            <Dialog
                open={!!selectedPoi}
                onClose={() => setSelectedPoi(null)}
                maxWidth="md"
                fullWidth
                PaperProps={{ sx: { borderRadius: 3 } }}
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
                                                sx={{
                                                    height: 150,
                                                    minWidth: 200,
                                                    objectFit: 'cover',
                                                    borderRadius: 2,
                                                }}
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
                                            <Event fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                                            <Box>
                                                <Typography variant="caption" color="text.secondary">平均游玩时间</Typography>
                                                <Typography variant="body2">{selectedPoi.avgVisitDuration} 分钟</Typography>
                                            </Box>
                                        </Box>
                                    </Grid>
                                )}
                                {selectedPoi.avgCost && (
                                    <Grid item xs={6} md={4}>
                                        <Typography variant="caption" color="text.secondary">平均花费</Typography>
                                        <Typography variant="body2">{selectedPoi.avgCost}</Typography>
                                    </Grid>
                                )}
                                {selectedPoi.phone && (
                                    <Grid item xs={6} md={4}>
                                        <Typography variant="caption" color="text.secondary">电话</Typography>
                                        <Typography variant="body2">{selectedPoi.phone}</Typography>
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
                PaperProps={{ sx: { borderRadius: 3 } }}
            >
                {selectedNonPoi && (
                    <>
                        <DialogTitle sx={{ pb: 1 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Typography variant="h6" fontWeight="bold">{selectedNonPoi.title}</Typography>
                                <Chip
                                    size="small"
                                    icon={getNonPoiTypeIcon(selectedNonPoi.type)}
                                    label={selectedNonPoi.type}
                                    color={getNonPoiTypeColor(selectedNonPoi.type)}
                                />
                            </Box>
                            {(selectedNonPoi.city || selectedNonPoi.estimatedAddress) && (
                                <Box sx={{ display: 'flex', alignItems: 'center', color: 'text.secondary', mt: 0.5 }}>
                                    <Place sx={{ fontSize: 16, mr: 0.5 }} />
                                    <Typography variant="body2" sx={{ fontSize: 13 }}>
                                        {selectedNonPoi.city}{selectedNonPoi.estimatedAddress ? ` · ${selectedNonPoi.estimatedAddress}` : ''}
                                    </Typography>
                                </Box>
                            )}
                        </DialogTitle>
                        <DialogContent dividers>
                            {selectedNonPoi.description && (
                                <Typography variant="body2" paragraph>
                                    {selectedNonPoi.description}
                                </Typography>
                            )}
                            {selectedNonPoi.activityTime && (
                                <Box sx={{ mb: 1 }}>
                                    <Typography variant="subtitle2" fontWeight={500}>活动时间</Typography>
                                    <Typography variant="body2" color="text.secondary">{selectedNonPoi.activityTime}</Typography>
                                </Box>
                            )}
                            {selectedNonPoi.extraInfo && (
                                <Box sx={{ mb: 1 }}>
                                    <Typography variant="subtitle2" fontWeight={500}>额外信息</Typography>
                                    <Typography variant="body2" color="text.secondary">{selectedNonPoi.extraInfo}</Typography>
                                </Box>
                            )}
                            {selectedNonPoi.sourceUrl && (
                                <Box sx={{ mb: 0 }}>
                                    <Typography variant="subtitle2" fontWeight={500}>来源链接</Typography>
                                    <Typography
                                        component="a"
                                        href={selectedNonPoi.sourceUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        variant="body2"
                                        sx={{ color: '#667eea', textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
                                    >
                                        {selectedNonPoi.sourceUrl}
                                    </Typography>
                                </Box>
                            )}
                        </DialogContent>
                        <DialogActions>
                            <Button onClick={() => setSelectedNonPoi(null)} sx={{ color: '#667eea' }}>关闭</Button>
                        </DialogActions>
                    </>
                )}
            </Dialog>

            {/* Clear All Confirmation Dialog */}
            <Dialog
                open={clearAllDialogOpen}
                onClose={() => setClearAllDialogOpen(false)}
                PaperProps={{ sx: { borderRadius: 3 } }}
            >
                <DialogTitle>确认清空</DialogTitle>
                <DialogContent>
                    <Typography>
                        确定要清空当前会话的所有提取结果吗？此操作无法撤销。
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setClearAllDialogOpen(false)}>取消</Button>
                    <Button
                        color="error"
                        onClick={() => {
                            clearAllResults(conversationId);
                            setClearAllDialogOpen(false);
                            setShowResults(false);
                        }}
                    >
                        确认清空
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Delete Web Page Confirmation Dialog */}
            <Dialog
                open={deleteWebPageDialogOpen}
                onClose={handleCloseDeleteWebPageDialog}
                PaperProps={{ sx: { borderRadius: 3 } }}
            >
                <DialogTitle>确认删除</DialogTitle>
                <DialogContent>
                    <Typography>
                        确定要删除网页 "{webPageToDelete?.name}" 吗？此操作无法撤销。
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseDeleteWebPageDialog}>取消</Button>
                    <Button color="error" onClick={handleConfirmDeleteWebPage}>
                        确认删除
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Delete Recommendation Item Confirmation Dialog */}
            <Dialog
                open={deleteRecommendDialogOpen}
                onClose={() => setDeleteRecommendDialogOpen(false)}
                PaperProps={{ sx: { borderRadius: 3 } }}
            >
                <DialogTitle>确认删除</DialogTitle>
                <DialogContent>
                    <Typography>
                        确定要从推荐项中删除 "{itemToDelete?.name}" 吗？
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDeleteRecommendDialogOpen(false)}>取消</Button>
                    <Button
                        color="error"
                        onClick={async () => {
                            if (itemToDelete) {
                                try {
                                    if (itemToDelete.type === 'poi') {
                                        await deleteRecommendationPois(conversationId, [itemToDelete.id]);
                                        setRecommendedPois(recommendedPois.filter(p => p.poiId !== itemToDelete.id));
                                    } else {
                                        await deleteRecommendationNonPois(conversationId, [itemToDelete.id]);
                                        setRecommendedNonPois(recommendedNonPois.filter(n => n.id !== itemToDelete.id));
                                    }
                                    toast.success('删除成功');
                                } catch (error: any) {
                                    toast.error(error.message || '删除失败');
                                }
                            }
                            setDeleteRecommendDialogOpen(false);
                            setItemToDelete(null);
                        }}
                    >
                        确认删除
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Add POI/NonPoi Dialog */}
            <Dialog
                open={addDialogOpen}
                onClose={() => {
                    setAddDialogOpen(false);
                    setPoiSearchResults([]);
                    setNonPoiSearchResults([]);
                    setPoiSearchKeyword('');
                    setPoiSearchCity('');
                    setNonPoiSearchKeyword('');
                }}
                maxWidth="sm"
                fullWidth
                PaperProps={{ sx: { borderRadius: 3 } }}
            >
                <DialogTitle sx={{ pb: 1 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="h6" fontWeight="bold">
                            {recommendTabValue === 0 ? '添加POI到推荐项' : '添加活动到推荐项'}
                        </Typography>
                        <IconButton onClick={() => {
                            setAddDialogOpen(false);
                            setPoiSearchResults([]);
                            setNonPoiSearchResults([]);
                        }}>
                            <Close />
                        </IconButton>
                    </Box>
                </DialogTitle>
                <DialogContent dividers sx={{ minHeight: 400 }}>
                    {/* POI Search */}
                    {recommendTabValue === 0 && (
                        <>
                            {/* Search Type Toggle */}
                            <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <ToggleButtonGroup
                                    value={poiSearchType === 'api' ? null : poiSearchType}
                                    exclusive
                                    onChange={(_, value) => value && setPoiSearchType(value)}
                                    size="small"
                                    sx={{
                                        display: 'flex',
                                        gap: 1,
                                        '& .MuiToggleButton-root': {
                                            border: '1px solid #e0e0e0',
                                            borderRadius: '16px !important',
                                            px: 2,
                                            py: 0.5,
                                            color: 'text.secondary',
                                            '&.Mui-selected': {
                                                bgcolor: 'rgba(102, 126, 234, 0.1)',
                                                color: '#667eea',
                                                borderColor: '#667eea',
                                                '&:hover': {
                                                    bgcolor: 'rgba(102, 126, 234, 0.2)',
                                                }
                                            },
                                            '&:hover': {
                                                bgcolor: 'rgba(0, 0, 0, 0.04)',
                                            }
                                        }
                                    }}
                                >
                                    <ToggleButton value="semantic">语义搜索</ToggleButton>
                                    <ToggleButton value="db">精确搜索</ToggleButton>
                                </ToggleButtonGroup>
                                <Button
                                    variant="text"
                                    size="small"
                                    onClick={() => setPoiSearchType('api')}
                                    sx={{
                                        color: poiSearchType === 'api' ? '#667eea' : 'text.secondary',
                                        fontSize: '0.85rem',
                                        fontWeight: poiSearchType === 'api' ? 600 : 400,
                                        '&:hover': { color: '#667eea', bgcolor: 'transparent' }
                                    }}
                                >
                                    找不到景点？使用高德API搜索
                                </Button>
                            </Box>

                            {/* Search Form */}
                            <Box sx={{ display: 'flex', gap: 1.5, mb: 2, alignItems: 'flex-end', justifyContent: 'flex-start' }}>
                                <TextField
                                    size="small"
                                    label="关键词"
                                    placeholder="输入搜索关键词..."
                                    value={poiSearchKeyword}
                                    onChange={(e) => setPoiSearchKeyword(e.target.value)}
                                    onKeyUp={(e) => e.key === 'Enter' && handlePoiSearch()}
                                    InputProps={{
                                        startAdornment: (
                                            <InputAdornment position="start">
                                                <Search fontSize="small" />
                                            </InputAdornment>
                                        ),
                                    }}
                                    sx={{ flex: 1 }}
                                />
                                <TextField
                                    size="small"
                                    label="城市"
                                    placeholder="可选"
                                    value={poiSearchCity}
                                    onChange={(e) => setPoiSearchCity(e.target.value)}
                                    sx={{ width: 100 }}
                                />
                                <Button
                                    variant="outlined"
                                    onClick={handlePoiSearch}
                                    disabled={!poiSearchKeyword.trim() || poiSearchLoading}
                                    sx={{ width: 80, height: 40, color: '#667eea', borderColor: '#667eea', fontWeight: 500, '&:hover': { borderColor: '#5a6fd6', bgcolor: 'rgba(102, 126, 234, 0.04)' } }}
                                >
                                    搜索
                                </Button>
                            </Box>

                            {/* Search Loading */}
                            {poiSearchLoading && (
                                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                                    <CircularProgress size={24} sx={{ color: '#667eea' }} />
                                </Box>
                            )}

                            {/* Search Results */}
                            {!poiSearchLoading && poiSearchResults.length > 0 && (
                                <Box sx={{
                                    maxHeight: 400,
                                    overflowY: 'auto',
                                    p: 1,
                                    '&::-webkit-scrollbar': { display: 'none' },
                                    scrollbarWidth: 'none',  // Firefox
                                }}>
                                    {poiSearchResults.map((poi) => (
                                        <Card
                                            key={poi.poiId}
                                            sx={{
                                                mb: 1.5,
                                                borderRadius: 2,
                                                cursor: 'pointer',
                                                transition: 'box-shadow 0.2s, transform 0.2s',
                                                '&:hover': {
                                                    boxShadow: 4,
                                                    transform: 'translateY(-2px)',
                                                },
                                                height: 110,
                                                overflow: 'hidden',
                                                border: '1px solid #f0f0f0',
                                            }}
                                            onClick={() => setSelectedPoi(poi)}
                                        >
                                            <Box sx={{ display: 'flex', height: '100%' }}>
                                                {/* Photo */}
                                                {poi.photos && poi.photos.length > 0 && (
                                                    <CardMedia
                                                        component="img"
                                                        sx={{
                                                            width: 100,
                                                            minWidth: 100,
                                                            height: 110,
                                                            maxHeight: 110,
                                                            objectFit: 'cover',
                                                            borderRadius: '8px 0 0 8px',
                                                            flexShrink: 0,
                                                        }}
                                                        image={poi.photos[0]}
                                                        alt={poi.name}
                                                    />
                                                )}
                                                {/* Content */}
                                                <CardContent sx={{ flex: 1, px: 1.5, py: 1, '&:last-child': { pb: 1.5 }, overflow: 'hidden', minWidth: 0 }}>
                                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', my: -0.3 }}>
                                                        <Typography variant="body2" fontWeight={500} noWrap sx={{ flex: 1, mr: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                            {poi.name}
                                                        </Typography>
                                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0 }}>
                                                            {poi.rating && (
                                                                <Chip
                                                                    size="small"
                                                                    icon={<Star sx={{ fontSize: 12 }} />}
                                                                    label={poi.rating}
                                                                    color="warning"
                                                                    sx={{ height: 18, fontSize: '0.6rem' }}
                                                                />
                                                            )}
                                                            <IconButton
                                                                size="small"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleAddPoiToRecommendation(poi.poiId);
                                                                }}
                                                                sx={{ p: 0.3, color: '#667eea', '&:hover': { bgcolor: 'rgba(102, 126, 234, 0.08)' } }}
                                                            >
                                                                <Add sx={{ fontSize: 18 }} />
                                                            </IconButton>
                                                        </Box>
                                                    </Box>
                                                    {poi.type && (
                                                        <Chip size="small" label={poi.type} sx={{ mb: 0.5, height: 16, fontSize: '0.6rem', maxWidth: '100%' }} />
                                                    )}
                                                    {(poi.city || poi.address) && (
                                                        <Box sx={{ display: 'flex', alignItems: 'center', color: 'text.secondary', overflow: 'hidden' }}>
                                                            <Place sx={{ fontSize: 8, mr: 0.3, flexShrink: 0 }} />
                                                            <Typography variant="body2" noWrap sx={{ fontSize: '0.7rem', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                                {poi.city}{poi.address ? ` · ${poi.address}` : ''}
                                                            </Typography>
                                                        </Box>
                                                    )}
                                                    {poi.description && (
                                                        <Typography
                                                            variant="caption"
                                                            color="text.secondary"
                                                            sx={{
                                                                display: '-webkit-box',
                                                                WebkitLineClamp: 2,
                                                                WebkitBoxOrient: 'vertical',
                                                                overflow: 'hidden',
                                                                mt: 0.5,
                                                                lineHeight: 1.3,
                                                            }}
                                                        >
                                                            {poi.description}
                                                        </Typography>
                                                    )}
                                                </CardContent>
                                            </Box>
                                        </Card>
                                    ))}
                                </Box>
                            )}

                            {/* No Results */}
                            {!poiSearchLoading && poiSearchKeyword && poiSearchResults.length === 0 && (
                                <Box sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
                                    <Typography>未找到相关POI</Typography>
                                </Box>
                            )}
                        </>
                    )}

                    {/* NonPoi Search/Create */}
                    {recommendTabValue === 1 && (
                        <>
                            {/* Mode Toggle & Create Button */}
                            <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <ToggleButtonGroup
                                    value={nonPoiSearchMode}
                                    exclusive
                                    onChange={(_, value) => value && setNonPoiSearchMode(value)}
                                    size="small"
                                    sx={{
                                        display: 'flex',
                                        gap: 1,
                                        '& .MuiToggleButton-root': {
                                            border: '1px solid #e0e0e0',
                                            borderRadius: '16px !important',
                                            px: 2,
                                            py: 0.5,
                                            color: 'text.secondary',
                                            '&.Mui-selected': {
                                                bgcolor: 'rgba(102, 126, 234, 0.1)',
                                                color: '#667eea',
                                                borderColor: '#667eea',
                                                '&:hover': {
                                                    bgcolor: 'rgba(102, 126, 234, 0.2)',
                                                }
                                            },
                                            '&:hover': {
                                                bgcolor: 'rgba(0, 0, 0, 0.04)',
                                            }
                                        }
                                    }}
                                >
                                    <ToggleButton value="search">搜索现有活动</ToggleButton>
                                    <ToggleButton value="create">创建新活动</ToggleButton>
                                </ToggleButtonGroup>

                                {nonPoiSearchMode === 'create' && (
                                    <Button
                                        variant="outlined"
                                        size="small"
                                        onClick={handleCreateAndAddNonPoi}
                                        disabled={!nonPoiFormData.title}
                                        sx={{
                                            color: '#667eea',
                                            borderColor: '#667eea',
                                            fontWeight: 500,
                                            borderRadius: 4,
                                            px: 3,
                                            '&:hover': {
                                                borderColor: '#5a6fd6',
                                                bgcolor: 'rgba(102, 126, 234, 0.04)'
                                            }
                                        }}
                                    >
                                        创建并添加
                                    </Button>
                                )}
                            </Box>

                            {/* Search Mode */}
                            {nonPoiSearchMode === 'search' && (
                                <>
                                    <Box sx={{ display: 'flex', gap: 1.5, mb: 2, alignItems: 'flex-end', justifyContent: 'flex-start', width: '100%' }}>
                                        <TextField
                                            size="small"
                                            label="关键词"
                                            placeholder="搜索活动..."
                                            value={nonPoiSearchKeyword}
                                            onChange={(e) => setNonPoiSearchKeyword(e.target.value)}
                                            onKeyUp={(e) => e.key === 'Enter' && handleNonPoiSearch()}
                                            InputProps={{
                                                startAdornment: (
                                                    <InputAdornment position="start">
                                                        <Search fontSize="small" />
                                                    </InputAdornment>
                                                ),
                                            }}
                                            sx={{ flex: 1 }}
                                        />
                                        <FormControl size="small" sx={{ width: 100 }}>
                                            <InputLabel>类型</InputLabel>
                                            <Select
                                                value={nonPoiSearchType}
                                                label="类型"
                                                onChange={(e) => setNonPoiSearchType(e.target.value as NonPoiType | '')}
                                            >
                                                <MenuItem value="">全部</MenuItem>
                                                <MenuItem value="ACTIVITY">ACTIVITY</MenuItem>
                                                <MenuItem value="FOOD">FOOD</MenuItem>
                                                <MenuItem value="CULTURE">CULTURE</MenuItem>
                                                <MenuItem value="OTHER">OTHER</MenuItem>
                                            </Select>
                                        </FormControl>
                                        <Button
                                            variant="outlined"
                                            onClick={() => { setNonPoiSearchPage(1); handleNonPoiSearch(1); }}
                                            disabled={nonPoiSearchLoading}
                                            sx={{ width: 80, height: 40, color: '#667eea', borderColor: '#667eea', fontWeight: 500, '&:hover': { borderColor: '#5a6fd6', bgcolor: 'rgba(102, 126, 234, 0.04)' } }}
                                        >
                                            搜索
                                        </Button>
                                    </Box>

                                    {/* Search Loading */}
                                    {nonPoiSearchLoading && (
                                        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                                            <CircularProgress size={24} sx={{ color: '#667eea' }} />
                                        </Box>
                                    )}

                                    {/* Search Results */}
                                    {!nonPoiSearchLoading && nonPoiSearchResults.length > 0 && (
                                        <>
                                            <Box sx={{
                                                maxHeight: 400,
                                                overflowY: 'auto',
                                                maxWidth: 600,
                                                p: 1,
                                                '&::-webkit-scrollbar': { width: 6 },
                                                '&::-webkit-scrollbar-track': { background: 'transparent' },
                                                '&::-webkit-scrollbar-thumb': { background: 'transparent', borderRadius: 3 },
                                                '&:hover::-webkit-scrollbar-thumb': { background: 'rgba(0,0,0,0.1)' },
                                            }}>
                                                {nonPoiSearchResults.map((item) => (
                                                    <Card
                                                        key={item.id}
                                                        sx={{
                                                            borderRadius: 2,
                                                            mb: 1.5,
                                                            cursor: 'pointer',
                                                            transition: 'box-shadow 0.2s',
                                                            '&:hover': { boxShadow: 3 },
                                                        }}
                                                        onClick={() => setSelectedNonPoi(item)}
                                                    >
                                                        <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                                <Typography variant="body2" fontWeight={500} noWrap sx={{ flex: 1, mr: 1 }}>
                                                                    {item.title}
                                                                </Typography>
                                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                                    <Chip
                                                                        size="small"
                                                                        icon={getNonPoiTypeIcon(item.type) as React.ReactElement}
                                                                        label={item.type}
                                                                        color={getNonPoiTypeColor(item.type)}
                                                                        sx={{ height: 18, fontSize: '0.6rem' }}
                                                                    />
                                                                    <IconButton
                                                                        size="small"
                                                                        color="primary"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            handleAddNonPoiToRecommendation(item.id);
                                                                        }}
                                                                        sx={{ p: 0.3 }}
                                                                    >
                                                                        <Add sx={{ fontSize: 18 }} />
                                                                    </IconButton>
                                                                </Box>
                                                            </Box>
                                                            {(item.city || item.estimatedAddress) && (
                                                                <Box sx={{ display: 'flex', alignItems: 'center', color: 'text.secondary', mt: 0.5 }}>
                                                                    <Place sx={{ fontSize: 12, mr: 0.3 }} />
                                                                    <Typography variant="caption" noWrap>
                                                                        {item.city}{item.estimatedAddress ? ` · ${item.estimatedAddress}` : ''}
                                                                    </Typography>
                                                                </Box>
                                                            )}
                                                            {item.activityTime && (
                                                                <Box sx={{ display: 'flex', alignItems: 'center', color: 'text.secondary', mt: 0.5 }}>
                                                                    <AccessTime sx={{ fontSize: 12, mr: 0.3 }} />
                                                                    <Typography variant="caption" noWrap>
                                                                        {item.activityTime}
                                                                    </Typography>
                                                                </Box>
                                                            )}
                                                            {item.description && (
                                                                <Typography
                                                                    variant="caption"
                                                                    color="text.secondary"
                                                                    sx={{
                                                                        display: '-webkit-box',
                                                                        WebkitLineClamp: 2,
                                                                        WebkitBoxOrient: 'vertical',
                                                                        overflow: 'hidden',
                                                                        mt: 0.5,
                                                                        lineHeight: 1.3,
                                                                    }}
                                                                >
                                                                    {item.description}
                                                                </Typography>
                                                            )}
                                                        </CardContent>
                                                    </Card>
                                                ))}
                                            </Box>
                                            {nonPoiSearchTotal > 50 && (
                                                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                                                    <Pagination
                                                        count={Math.ceil(nonPoiSearchTotal / 50)}
                                                        page={nonPoiSearchPage}
                                                        onChange={(_, page) => { setNonPoiSearchPage(page); handleNonPoiSearch(page); }}
                                                        size="small"
                                                        color="primary"
                                                    />
                                                </Box>
                                            )}
                                        </>
                                    )}
                                </>
                            )}

                            {/* Create Mode */}
                            {nonPoiSearchMode === 'create' && (
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                    <FormControl fullWidth>
                                        <InputLabel>类型</InputLabel>
                                        <Select
                                            value={nonPoiFormData.type}
                                            label="类型"
                                            onChange={(e) => setNonPoiFormData({ ...nonPoiFormData, type: e.target.value as NonPoiType })}
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
                                        value={nonPoiFormData.title}
                                        onChange={(e) => setNonPoiFormData({ ...nonPoiFormData, title: e.target.value })}
                                    />
                                    <TextField
                                        label="描述"
                                        fullWidth
                                        multiline
                                        rows={2}
                                        value={nonPoiFormData.description}
                                        onChange={(e) => setNonPoiFormData({ ...nonPoiFormData, description: e.target.value })}
                                    />
                                    <TextField
                                        label="城市"
                                        fullWidth
                                        value={nonPoiFormData.city}
                                        onChange={(e) => setNonPoiFormData({ ...nonPoiFormData, city: e.target.value })}
                                    />
                                    <TextField
                                        label="活动时间"
                                        fullWidth
                                        placeholder="例如：2024/12/25 14:00"
                                        value={nonPoiFormData.activityTime}
                                        onChange={(e) => setNonPoiFormData({ ...nonPoiFormData, activityTime: e.target.value })}
                                    />
                                    <TextField
                                        label="大致地点"
                                        fullWidth
                                        value={nonPoiFormData.estimatedAddress}
                                        onChange={(e) => setNonPoiFormData({ ...nonPoiFormData, estimatedAddress: e.target.value })}
                                    />
                                    <TextField
                                        label="额外信息"
                                        fullWidth
                                        multiline
                                        rows={2}
                                        value={nonPoiFormData.extraInfo}
                                        onChange={(e) => setNonPoiFormData({ ...nonPoiFormData, extraInfo: e.target.value })}
                                    />
                                    <TextField
                                        label="来源链接"
                                        fullWidth
                                        value={nonPoiFormData.sourceUrl}
                                        onChange={(e) => setNonPoiFormData({ ...nonPoiFormData, sourceUrl: e.target.value })}
                                    />
                                </Box>
                            )}
                        </>
                    )}
                </DialogContent>
            </Dialog >
        </>
    );
};

export default ResourcePanel;
