import React, { useState, useEffect } from 'react';
import {
    Box,
    Container,
    Typography,
    Tabs,
    Tab,
    Card,
    CardContent,
    CardMedia,
    CardActionArea,
    TextField,
    Button,
    Grid,
    Chip,
    Avatar,
    CircularProgress,
    Alert,
    Pagination,
    InputAdornment,
    IconButton,
    Snackbar,
    Divider,
    Dialog,
    DialogTitle,
    DialogContent,
} from '@mui/material';
import {
    ArrowBack,
    Search,
    LocationOn,
    CalendarToday,
    PersonAdd,
    Person,
    Place,
    AccessTime,
    AttachMoney,
    Star,
    Phone,
    Schedule,
    Close,
    Event,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { getPublicTrips, addJoinRequest, getSimilarUsers, semanticSearchPois } from '@/api/explore';
import { searchPoisFromApi } from '@/api/poi';
import { Trip, User, Poi, Page } from '@/types/api';

interface TabPanelProps {
    children?: React.ReactNode;
    index: number;
    value: number;
}

function TabPanel(props: TabPanelProps) {
    const { children, value, index, ...other } = props;
    return (
        <div role="tabpanel" hidden={value !== index} {...other}>
            {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
        </div>
    );
}

const ExplorePage: React.FC = () => {
    const navigate = useNavigate();
    const { isAuthenticated } = useAuthStore();

    const [tabValue, setTabValue] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [snackbar, setSnackbar] = useState({ open: false, message: '' });

    // Public trips state
    const [trips, setTrips] = useState<Trip[]>([]);
    const [tripsPage, setTripsPage] = useState<Page<Trip> | null>(null);
    const [tripFilters, setTripFilters] = useState({
        destinationCity: '',
        startDate: '',
        endDate: '',
        pageNum: 1,
        pageSize: 6,
    });

    // Similar users state
    const [similarUsers, setSimilarUsers] = useState<User[]>([]);

    // POI search state
    const [poiSearchQuery, setPoiSearchQuery] = useState('');
    const [poiCity, setPoiCity] = useState('');
    const [poiTopK, setPoiTopK] = useState(10);
    const [pois, setPois] = useState<Poi[]>([]);
    const [selectedPoi, setSelectedPoi] = useState<Poi | null>(null);
    const [useAmapApi, setUseAmapApi] = useState(false);

    useEffect(() => {
        if (!isAuthenticated) {
            navigate('/login');
        }
    }, [isAuthenticated, navigate]);

    useEffect(() => {
        if (tabValue === 0) {
            fetchPublicTrips();
        } else if (tabValue === 1) {
            fetchSimilarUsers();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tabValue, tripFilters.pageNum]);

    const fetchPublicTrips = async () => {
        try {
            setLoading(true);
            setError(null);
            const result = await getPublicTrips({
                destinationCity: tripFilters.destinationCity || undefined,
                startDate: tripFilters.startDate || undefined,
                endDate: tripFilters.endDate || undefined,
                pageNum: tripFilters.pageNum,
                pageSize: tripFilters.pageSize,
            });
            setTripsPage(result);
            setTrips(result?.records || []);
        } catch (err: unknown) {
            setError((err as Error).message || '获取公开旅程失败');
            setTrips([]);
        } finally {
            setLoading(false);
        }
    };

    const fetchSimilarUsers = async () => {
        try {
            setLoading(true);
            setError(null);
            const result = await getSimilarUsers(10);
            setSimilarUsers(result || []);
        } catch (err: unknown) {
            setError((err as Error).message || '获取相似用户失败');
            setSimilarUsers([]);
        } finally {
            setLoading(false);
        }
    };

    const handleSearchPois = async () => {
        if (!poiSearchQuery.trim()) return;
        try {
            setLoading(true);
            setError(null);
            let result: Poi[];
            if (useAmapApi) {
                // Use Amap API search
                result = await searchPoisFromApi({
                    keywords: poiSearchQuery,
                    city: poiCity || undefined,
                });
            } else {
                // Use semantic search
                result = await semanticSearchPois({
                    queryText: poiSearchQuery,
                    city: poiCity || undefined,
                    topK: poiTopK,
                });
            }
            setPois(result || []);
        } catch (err: unknown) {
            setError((err as Error).message || 'POI搜索失败');
            setPois([]);
        } finally {
            setLoading(false);
        }
    };

    const handleJoinTrip = async (tripId: string) => {
        try {
            await addJoinRequest(tripId);
            setSnackbar({ open: true, message: '申请已发送，等待审核' });
        } catch (err: unknown) {
            setSnackbar({ open: true, message: (err as Error).message || '申请失败' });
        }
    };

    const handleTripClick = (tripId: string) => {
        navigate(`/trip/${tripId}`, { state: { fromExplore: true } });
    };

    const handleTripPageChange = (_: React.ChangeEvent<unknown>, page: number) => {
        setTripFilters(prev => ({ ...prev, pageNum: page }));
    };

    const formatDate = (dateStr: string) => {
        try {
            return new Date(dateStr).toLocaleDateString('zh-CN');
        } catch {
            return dateStr;
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'PLANNING': return 'info';
            case 'IN_PROGRESS': return 'warning';
            case 'COMPLETED': return 'success';
            case 'CANCELLED': return 'error';
            default: return 'default';
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'PLANNING': return '规划中';
            case 'IN_PROGRESS': return '进行中';
            case 'COMPLETED': return '已完成';
            case 'CANCELLED': return '已取消';
            default: return status;
        }
    };

    if (!isAuthenticated) {
        return null;
    }

    return (
        <Box
            sx={{
                height: '100%',
                bgcolor: '#f5f7fa',
            }}
        >
            <Container maxWidth="lg" sx={{ py: 4 }}>
                {/* Header */}
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 4 }}>
                    <IconButton onClick={() => navigate('/')} sx={{ mr: 2 }}>
                        <ArrowBack />
                    </IconButton>
                    <Search sx={{ fontSize: 32, color: '#667eea', mr: 1 }} />
                    <Typography
                        variant="h4"
                        fontWeight="bold"
                        sx={{
                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            backgroundClip: 'text',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                        }}
                    >
                        探索
                    </Typography>
                </Box>

                {/* Error Alert */}
                {error && (
                    <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
                        {error}
                    </Alert>
                )}

                {/* Tabs */}
                <Card sx={{ borderRadius: 3, mb: 3 }}>
                    <Tabs
                        value={tabValue}
                        onChange={(_, v) => setTabValue(v)}
                        sx={{ borderBottom: 1, borderColor: 'divider' }}
                    >
                        <Tab label="公开旅程" />
                        <Tab label="相似用户" />
                        <Tab label="POI搜索" />
                    </Tabs>
                </Card>

                {/* Tab Panels */}
                <TabPanel value={tabValue} index={0}>
                    {/* Filters */}
                    <Box sx={{ display: 'flex', gap: 2, mb: 3, mt: -2, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center' }}>
                        <TextField
                            size="small"
                            label="目的地城市"
                            placeholder="输入您的目的地城市"
                            value={tripFilters.destinationCity}
                            onChange={(e) => setTripFilters(prev => ({ ...prev, destinationCity: e.target.value }))}
                            onKeyUp={(e) => e.key === 'Enter' && fetchPublicTrips()}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <LocationOn fontSize="small" />
                                    </InputAdornment>
                                ),
                                endAdornment: tripFilters.destinationCity && (
                                    <InputAdornment position="end">
                                        <IconButton
                                            size="small"
                                            onClick={() => setTripFilters(prev => ({ ...prev, destinationCity: '' }))}
                                            edge="end"
                                        >
                                            <Close fontSize="small" />
                                        </IconButton>
                                    </InputAdornment>
                                ),
                            }}
                            sx={{ minWidth: 180 }}
                        />
                        <TextField
                            size="small"
                            type="date"
                            label="开始日期"
                            value={tripFilters.startDate}
                            onChange={(e) => setTripFilters(prev => ({ ...prev, startDate: e.target.value }))}
                            InputLabelProps={{ shrink: true }}
                            sx={{ minWidth: 140 }}
                        />
                        <TextField
                            size="small"
                            type="date"
                            label="结束日期"
                            value={tripFilters.endDate}
                            onChange={(e) => setTripFilters(prev => ({ ...prev, endDate: e.target.value }))}
                            InputLabelProps={{ shrink: true }}
                            sx={{ minWidth: 140 }}
                        />
                        <Button variant="contained" onClick={fetchPublicTrips}>
                            搜索
                        </Button>
                    </Box>

                    {loading ? (
                        <Box sx={{ textAlign: 'center', py: 4 }}>
                            <CircularProgress />
                        </Box>
                    ) : (
                        <>
                            <Grid container spacing={3}>
                                {trips.map((trip) => (
                                    <Grid item xs={12} md={6} lg={4} key={trip.tripId}>
                                        <Card
                                            sx={{
                                                height: '100%',
                                                borderRadius: 2,
                                                cursor: 'pointer',
                                                transition: 'box-shadow 0.2s, transform 0.2s',
                                                '&:hover': {
                                                    boxShadow: 4,
                                                    transform: 'translateY(-2px)',
                                                },
                                            }}
                                            onClick={() => handleTripClick(trip.tripId)}
                                        >
                                            <CardContent>
                                                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.8 }}>
                                                    <Typography variant="h6" fontWeight="bold" noWrap sx={{ flex: 1, mr: 1 }}>
                                                        {trip.title}
                                                    </Typography>
                                                    <Chip
                                                        size="small"
                                                        label={getStatusLabel(trip.status)}
                                                        color={getStatusColor(trip.status) as 'info' | 'warning' | 'success' | 'error' | 'default'}
                                                        sx={{ flexShrink: 0 }}
                                                    />
                                                </Box>
                                                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1, color: 'text.secondary' }}>
                                                    <LocationOn fontSize="small" sx={{ mr: 0.5 }} />
                                                    <Typography variant="body2">{trip.destinationCity}</Typography>
                                                </Box>
                                                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1, color: 'text.secondary' }}>
                                                    <CalendarToday fontSize="small" sx={{ mr: 0.5 }} />
                                                    <Typography variant="body2">
                                                        {formatDate(trip.startDate)} - {formatDate(trip.endDate)}
                                                    </Typography>
                                                </Box>
                                                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5, color: 'text.secondary' }}>
                                                    <Event fontSize="small" sx={{ mr: 0.5 }} />
                                                    <Typography variant="body2">
                                                        创建于 {formatDate(trip.createdAt)}
                                                    </Typography>
                                                </Box>
                                                {trip.description && (
                                                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }} noWrap>
                                                        {trip.description}
                                                    </Typography>
                                                )}
                                                <Button
                                                    variant="outlined"
                                                    size="small"
                                                    startIcon={<PersonAdd />}
                                                    onClick={(e) => { e.stopPropagation(); handleJoinTrip(trip.tripId); }}
                                                    fullWidth
                                                >
                                                    申请加入
                                                </Button>
                                            </CardContent>
                                        </Card>
                                    </Grid>
                                ))}
                            </Grid>
                            {trips.length === 0 && !loading && (
                                <Typography color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                                    暂无公开旅程
                                </Typography>
                            )}
                            {tripsPage && tripsPage.pages > 1 && (
                                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
                                    <Pagination
                                        count={tripsPage.pages}
                                        page={tripsPage.current}
                                        onChange={handleTripPageChange}
                                        color="primary"
                                    />
                                </Box>
                            )}
                        </>
                    )}
                </TabPanel>

                <TabPanel value={tabValue} index={1}>
                    {loading ? (
                        <Box sx={{ textAlign: 'center', py: 4 }}>
                            <CircularProgress />
                        </Box>
                    ) : (
                        <Grid container spacing={3}>
                            {similarUsers.map((user) => (
                                <Grid item xs={12} sm={6} md={4} key={user.userId}>
                                    <Card sx={{ borderRadius: 2 }}>
                                        <CardContent>
                                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                                <Avatar
                                                    sx={{
                                                        width: 56,
                                                        height: 56,
                                                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                                        mr: 2,
                                                    }}
                                                >
                                                    {user.username?.charAt(0).toUpperCase() || <Person />}
                                                </Avatar>
                                                <Box>
                                                    <Typography variant="h6" fontWeight="bold">
                                                        {user.username}
                                                    </Typography>
                                                    <Typography variant="caption" color="text.secondary">
                                                        注册于 {formatDate(user.createdAt)}
                                                    </Typography>
                                                </Box>
                                            </Box>
                                            <Divider sx={{ my: 1 }} />
                                            <Typography variant="body2" color="text.secondary">
                                                {user.preferencesText || '暂无偏好描述'}
                                            </Typography>
                                        </CardContent>
                                    </Card>
                                </Grid>
                            ))}
                            {similarUsers.length === 0 && !loading && (
                                <Grid item xs={12}>
                                    <Typography color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                                        暂无相似用户
                                    </Typography>
                                </Grid>
                            )}
                        </Grid>
                    )}
                </TabPanel>

                <TabPanel value={tabValue} index={2}>
                    {/* Search Form */}
                    <Box sx={{ display: 'flex', gap: 2, mb: 3, mt: -2, alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap' }}>
                        <TextField
                            size="small"
                            label='POI搜索关键词'
                            placeholder="输入您感兴趣的地点类型、风格或偏好..."
                            value={poiSearchQuery}
                            onChange={(e) => setPoiSearchQuery(e.target.value)}
                            onKeyUp={(e) => e.key === 'Enter' && handleSearchPois()}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <Search />
                                    </InputAdornment>
                                ),
                                endAdornment: poiSearchQuery && (
                                    <InputAdornment position="end">
                                        <IconButton
                                            size="small"
                                            onClick={() => setPoiSearchQuery('')}
                                            edge="end"
                                        >
                                            <Close fontSize="small" />
                                        </IconButton>
                                    </InputAdornment>
                                ),
                            }}
                            sx={{ width: 400 }}
                        />
                        <TextField
                            size="small"
                            label='城市（可选）'
                            value={poiCity}
                            onChange={(e) => setPoiCity(e.target.value)}
                            onKeyUp={(e) => e.key === 'Enter' && handleSearchPois()}
                            InputProps={{
                                endAdornment: poiCity && (
                                    <InputAdornment position="end">
                                        <IconButton
                                            size="small"
                                            onClick={() => setPoiCity('')}
                                            edge="end"
                                        >
                                            <Close fontSize="small" />
                                        </IconButton>
                                    </InputAdornment>
                                ),
                            }}
                            sx={{ width: 120 }}
                        />
                        {!useAmapApi && (
                            <TextField
                                size="small"
                                type="number"
                                label="返回数量"
                                value={poiTopK}
                                onChange={(e) => setPoiTopK(Math.max(1, Math.min(50, parseInt(e.target.value) || 10)))}
                                InputLabelProps={{ shrink: true }}
                                inputProps={{ min: 1, max: 50 }}
                                sx={{ width: 90 }}
                            />
                        )}
                        <Button variant="contained" onClick={handleSearchPois} disabled={!poiSearchQuery.trim()}>
                            搜索
                        </Button>
                        <Button
                            variant={useAmapApi ? 'contained' : 'outlined'}
                            onClick={() => setUseAmapApi(!useAmapApi)}
                            sx={{
                                color: useAmapApi ? 'white' : '#667eea',
                                borderColor: '#667eea',
                                bgcolor: useAmapApi ? '#667eea' : 'transparent',
                                '&:hover': {
                                    bgcolor: useAmapApi ? '#5a6fd6' : 'rgba(102, 126, 234, 0.08)',
                                    borderColor: '#5a6fd6',
                                }
                            }}
                        >
                            使用高德API搜索
                        </Button>
                    </Box>

                    {loading ? (
                        <Box sx={{ textAlign: 'center', py: 4 }}>
                            <CircularProgress />
                        </Box>
                    ) : (
                        <Grid container spacing={3}>
                            {pois.map((poi) => (
                                <Grid item xs={12} md={6} key={poi.poiId}>
                                    <Card
                                        sx={{
                                            borderRadius: 2,
                                            height: 220,
                                            display: 'flex',
                                            flexDirection: 'column',
                                            cursor: 'pointer',
                                            transition: 'box-shadow 0.2s, transform 0.2s',
                                            '&:hover': {
                                                boxShadow: 4,
                                                transform: 'translateY(-2px)',
                                            },
                                        }}
                                        onClick={() => setSelectedPoi(poi)}
                                    >
                                        <Box sx={{ display: 'flex', height: '100%' }}>
                                            {/* Photo Section */}
                                            {poi.photos && poi.photos.length > 0 && (
                                                <CardMedia
                                                    component="img"
                                                    sx={{
                                                        width: 140,
                                                        height: '100%',
                                                        maxHeight: 220,
                                                        objectFit: 'cover',
                                                        borderRadius: '8px 0 0 8px',
                                                    }}
                                                    image={poi.photos[0]}
                                                    alt={poi.name}
                                                />
                                            )}
                                            {/* Content Section */}
                                            <CardContent sx={{ flex: 1, overflow: 'hidden', px: 2, pt: 1.5 }}>
                                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 0.5 }}>
                                                    <Typography variant="h6" fontWeight="bold" noWrap sx={{ flex: 1, mr: 1 }}>
                                                        {poi.name}
                                                    </Typography>
                                                    {poi.rating && (
                                                        <Chip
                                                            size="small"
                                                            icon={<Star fontSize="small" />}
                                                            label={poi.rating}
                                                            color="warning"
                                                            sx={{ flexShrink: 0 }}
                                                        />
                                                    )}
                                                </Box>
                                                {poi.type && (
                                                    <Chip size="small" label={poi.type} sx={{ mb: 1.2, fontSize: '0.8rem' }} />
                                                )}
                                                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1, color: 'text.secondary' }}>
                                                    <Place fontSize="small" sx={{ mr: 0.5, flexShrink: 0 }} />
                                                    <Typography variant="body2" noWrap>
                                                        {poi.city}{poi.address ? ` · ${poi.address}` : ''}
                                                    </Typography>
                                                </Box>
                                                {poi.openingHours && (
                                                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1, color: 'text.secondary' }}>
                                                        <AccessTime fontSize="small" sx={{ mr: 0.5, flexShrink: 0 }} />
                                                        <Typography variant="body2" noWrap>
                                                            {poi.openingHours.length > 40 ? poi.openingHours.slice(0, 40) + '...' : poi.openingHours}
                                                        </Typography>
                                                    </Box>
                                                )}
                                                {poi.description && (
                                                    <Typography
                                                        variant="body1"
                                                        color="text.secondary"
                                                        sx={{
                                                            mt: 1.5,
                                                            fontSize: '0.95rem',
                                                            display: '-webkit-box',
                                                            WebkitLineClamp: 3,
                                                            WebkitBoxOrient: 'vertical',
                                                            overflow: 'hidden',
                                                            lineHeight: 1.4,
                                                        }}
                                                    >
                                                        {poi.description.length > 200 ? poi.description.slice(0, 200) + '...' : poi.description}
                                                    </Typography>
                                                )}
                                            </CardContent>
                                        </Box>
                                    </Card>
                                </Grid>
                            ))}
                            {pois.length === 0 && poiSearchQuery && !loading && (
                                <Grid item xs={12}>
                                    <Typography color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                                        未找到相关POI
                                    </Typography>
                                </Grid>
                            )}
                            {pois.length === 0 && !poiSearchQuery && !loading && (
                                <Grid item xs={12}>
                                    <Typography color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                                        输入关键词搜索您感兴趣的地点
                                    </Typography>
                                </Grid>
                            )}
                        </Grid>
                    )}
                </TabPanel>

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
            </Container>

            {/* Snackbar */}
            <Snackbar
                open={snackbar.open}
                autoHideDuration={3000}
                onClose={() => setSnackbar({ ...snackbar, open: false })}
                message={snackbar.message}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            />
        </Box>
    );
};

export default ExplorePage;
