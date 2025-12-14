import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    Box,
    Container,
    Typography,
    Card,
    CardContent,
    Grid,
    Chip,
    CircularProgress,
    IconButton,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Badge,
    List,
    ListItem,
    ListItemText,
    ListItemButton,
} from '@mui/material';
import {
    ArrowBack,
    CardTravel,
    Lock,
    LockOpen,
    CalendarToday,
    LocationOn,
    AttachMoney,
    Person,
    GroupAdd,
    Block,
    Event,
    Add,
    Notifications,
    Notes,
    Receipt,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { getUserTrips, createTrip } from '../api/trip';
import { getPendingRequests } from '../api/tripMember';
import { getTripDetail } from '../api/explore';
import { TripWithMemberInfo, TripStatus, MemberRole, TripPendingRequest } from '../types/api';
import { toast } from '../utils/toast';

// Status color mapping
const getStatusColor = (status: TripStatus): 'info' | 'warning' | 'success' | 'error' | 'default' => {
    switch (status) {
        case 'PLANNING': return 'info';
        case 'IN_PROGRESS': return 'warning';
        case 'COMPLETED': return 'success';
        case 'CANCELLED': return 'error';
        default: return 'default';
    }
};

const getStatusLabel = (status: TripStatus) => {
    switch (status) {
        case 'PLANNING': return '规划中';
        case 'IN_PROGRESS': return '进行中';
        case 'COMPLETED': return '已完成';
        case 'CANCELLED': return '已取消';
        default: return status;
    }
};

const getMemberRoleLabel = (role: MemberRole) => {
    switch (role) {
        case 'OWNER': return '创建者';
        case 'EDITOR': return '可编辑';
        case 'VIEWER': return '仅查看';
        default: return role;
    }
};

const getMemberRoleColor = (role: MemberRole): 'primary' | 'secondary' | 'default' => {
    switch (role) {
        case 'OWNER': return 'primary';
        case 'EDITOR': return 'secondary';
        case 'VIEWER': return 'default';
        default: return 'default';
    }
};

const formatDate = (dateStr: string) => {
    try {
        return new Date(dateStr).toLocaleDateString('zh-CN');
    } catch {
        return dateStr;
    }
};

const formatDateTime = (dateStr: string) => {
    try {
        return new Date(dateStr).toLocaleString('zh-CN');
    } catch {
        return dateStr;
    }
};

const MyTripsPage: React.FC = () => {
    const navigate = useNavigate();
    const { isAuthenticated } = useAuthStore();

    const [trips, setTrips] = useState<TripWithMemberInfo[]>([]);
    const [loading, setLoading] = useState(false);
    const [navigating, setNavigating] = useState(false);

    // Create dialog state
    const [createDialogOpen, setCreateDialogOpen] = useState(false);
    const [creating, setCreating] = useState(false);
    const [createForm, setCreateForm] = useState({
        title: '',
        destinationCity: '',
        startDate: '',
        endDate: '',
        totalBudget: '',
        description: '',
    });

    // Pending requests state
    const [pendingRequests, setPendingRequests] = useState<TripPendingRequest[]>([]);
    const [pendingDialogOpen, setPendingDialogOpen] = useState(false);
    const totalPendingCount = pendingRequests.reduce((sum, r) => sum + r.pendingRequestCount, 0);

    // Prevent duplicate API calls
    const fetchedRef = useRef(false);

    const fetchPendingRequests = useCallback(async () => {
        try {
            const data = await getPendingRequests();
            setPendingRequests(data);
        } catch (error) {
            console.error('Failed to fetch pending requests:', error);
        }
    }, []);

    const fetchTrips = useCallback(async () => {
        if (loading) return;
        setLoading(true);
        try {
            const data = await getUserTrips();
            setTrips(data);
        } catch (error) {
            console.error('Failed to fetch trips:', error);
        } finally {
            setLoading(false);
        }
    }, [loading]);

    useEffect(() => {
        if (!isAuthenticated) {
            navigate('/login');
            return;
        }
        // Prevent duplicate calls on mount
        if (!fetchedRef.current) {
            fetchedRef.current = true;
            fetchTrips();
            fetchPendingRequests();
        }
    }, [isAuthenticated, navigate]);

    // Navigate to TripDetailPage only after successful API check
    const handleTripClick = async (trip: TripWithMemberInfo) => {
        if (navigating) return;
        setNavigating(true);
        try {
            // First verify we can access this trip
            await getTripDetail(trip.tripId);
            // Only navigate if API call succeeds
            navigate(`/trip/${trip.tripId}`, {
                state: {
                    memberRole: trip.memberRole,
                    fromMyTrips: true,
                    tripInfo: trip
                }
            });
        } catch (error) {
            // Error toast is already shown by interceptor
            console.error('Cannot access trip:', error);
        } finally {
            setNavigating(false);
        }
    };

    // Create trip handlers
    const handleOpenCreateDialog = () => {
        setCreateForm({
            title: '',
            destinationCity: '',
            startDate: '',
            endDate: '',
            totalBudget: '',
            description: '',
        });
        setCreateDialogOpen(true);
    };

    const handleCloseCreateDialog = () => setCreateDialogOpen(false);

    const handleCreateTrip = async () => {
        if (!createForm.title || !createForm.destinationCity || !createForm.startDate || !createForm.endDate) {
            toast.warning('请填写必填字段：标题、目的地、开始日期、结束日期');
            return;
        }
        setCreating(true);
        try {
            await createTrip({
                title: createForm.title,
                destinationCity: createForm.destinationCity,
                startDate: createForm.startDate,
                endDate: createForm.endDate,
                totalBudget: createForm.totalBudget ? parseFloat(createForm.totalBudget) : undefined,
                description: createForm.description || undefined,
            });
            toast.success('旅程创建成功！');
            handleCloseCreateDialog();
            fetchTrips(); // Refresh list
        } catch (error) {
            console.error('Failed to create trip:', error);
        } finally {
            setCreating(false);
        }
    };

    return (
        <Box sx={{ height: '100%', bgcolor: '#f5f5f5', py: 4 }}>
            <Container maxWidth="lg">
                {/* Header */}
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 4 }}>
                    <IconButton onClick={() => navigate('/')} sx={{ mr: 2 }}>
                        <ArrowBack />
                    </IconButton>
                    <CardTravel sx={{ fontSize: 32, color: '#667eea', mr: 1 }} />
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
                        我的旅程
                    </Typography>
                    <Box sx={{ flex: 1 }} />
                    {totalPendingCount > 0 && (
                        <Button
                            variant="outlined"
                            startIcon={
                                <Badge badgeContent={totalPendingCount} color="error">
                                    <Notifications />
                                </Badge>
                            }
                            onClick={() => setPendingDialogOpen(true)}
                            sx={{ mr: 2, borderColor: '#667eea', color: '#667eea' }}
                        >
                            待处理申请
                        </Button>
                    )}
                    <Button
                        variant="contained"
                        startIcon={<Add />}
                        onClick={handleOpenCreateDialog}
                        sx={{
                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            '&:hover': {
                                background: 'linear-gradient(135deg, #5a6fd6 0%, #6a4190 100%)',
                            },
                            borderRadius: 2,
                            px: 3,
                        }}
                    >
                        新建旅程
                    </Button>
                </Box>

                {/* Trip Grid */}
                {loading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                        <CircularProgress />
                    </Box>
                ) : trips.length === 0 ? (
                    <Box sx={{ textAlign: 'center', py: 8 }}>
                        <Typography color="text.secondary">暂无旅程</Typography>
                    </Box>
                ) : (
                    <Grid container spacing={3}>
                        {trips.map((trip) => (
                            <Grid item xs={12} sm={6} md={4} key={trip.tripId}>
                                <Card
                                    sx={{
                                        cursor: 'pointer',
                                        transition: 'box-shadow 0.2s, transform 0.2s',
                                        '&:hover': {
                                            boxShadow: 4,
                                            transform: 'translateY(-2px)',
                                        },
                                        borderRadius: 2,
                                    }}
                                    onClick={() => handleTripClick(trip)}
                                >
                                    <CardContent>
                                        {/* Title Row with chips on right */}
                                        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 1 }}>
                                            <Typography variant="h6" fontWeight="bold" noWrap sx={{ flex: 1, mr: 1, lineHeight: 1.2 }}>
                                                {trip.title}
                                            </Typography>
                                            {/* Right side chips: visibility, status, role - horizontal */}
                                            <Box sx={{ display: 'flex', flexDirection: 'row', gap: 0.5, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                                                <Chip
                                                    size="small"
                                                    icon={trip.isPrivate ? <Lock fontSize="small" /> : <LockOpen fontSize="small" />}
                                                    label={trip.isPrivate ? 'PRIVATE' : 'PUBLIC'}
                                                    variant="outlined"
                                                    sx={{ fontSize: '0.65rem', height: 20 }}
                                                />
                                                <Chip
                                                    size="small"
                                                    label={getStatusLabel(trip.status)}
                                                    color={getStatusColor(trip.status)}
                                                    sx={{ fontSize: '0.65rem', height: 20 }}
                                                />
                                                <Chip
                                                    size="small"
                                                    icon={trip.memberRole === 'OWNER' ? <Person fontSize="small" /> : <GroupAdd fontSize="small" />}
                                                    label={getMemberRoleLabel(trip.memberRole)}
                                                    color={getMemberRoleColor(trip.memberRole)}
                                                    variant="outlined"
                                                    sx={{ fontSize: '0.65rem', height: 20 }}
                                                />
                                            </Box>
                                        </Box>

                                        {/* Description (1 line truncated) */}
                                        {trip.description && (
                                            <Typography
                                                variant="body2"
                                                color="text.secondary"
                                                sx={{
                                                    mb: 1,
                                                    fontSize: '0.9rem',
                                                    overflow: 'hidden',
                                                    display: '-webkit-box',
                                                    WebkitLineClamp: 1,
                                                    WebkitBoxOrient: 'vertical',
                                                }}
                                            >
                                                {trip.description}
                                            </Typography>
                                        )}

                                        {/* Location */}
                                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5, color: 'text.secondary' }}>
                                            <LocationOn fontSize="small" sx={{ mr: 0.5 }} />
                                            <Typography variant="body2" noWrap>
                                                {trip.destinationCity}
                                            </Typography>
                                        </Box>

                                        {/* Dates */}
                                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5, color: 'text.secondary' }}>
                                            <CalendarToday fontSize="small" sx={{ mr: 0.5 }} />
                                            <Typography variant="body2">
                                                {formatDate(trip.startDate)} - {formatDate(trip.endDate)}
                                            </Typography>
                                        </Box>

                                        {/* Budget */}
                                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5, color: 'text.secondary' }}>
                                            <AttachMoney fontSize="small" sx={{ mr: 0.5 }} />
                                            <Typography variant="body2">
                                                预算: ¥{trip.totalBudget ?? 0}
                                            </Typography>
                                        </Box>

                                        {/* Created At */}
                                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5, color: 'text.secondary' }}>
                                            <Event fontSize="small" sx={{ mr: 0.5 }} />
                                            <Typography variant="body2">
                                                创建: {formatDateTime(trip.createdAt)}
                                            </Typography>
                                        </Box>

                                        {/* Joined At + isPass status on same row */}
                                        {trip.joinedAt && (
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5, mb: -0.5, flexWrap: 'wrap' }}>
                                                {trip.isPass === false && (
                                                    <Chip
                                                        size="small"
                                                        icon={<Block fontSize="small" />}
                                                        label="未通过"
                                                        color="error"
                                                        variant="outlined"
                                                    />
                                                )}
                                                <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem' }}>
                                                    加入时间: {formatDateTime(trip.joinedAt)}
                                                </Typography>
                                            </Box>
                                        )}

                                        {/* Navigation Buttons */}
                                        <Box sx={{ display: 'flex', gap: 1, mt: 2, mb: -0.5, pt: 1.5, borderTop: '1px solid #e0e0e0' }}>
                                            <Button
                                                variant="outlined"
                                                size="small"
                                                startIcon={<Notes />}
                                                onClick={(e) => { e.stopPropagation(); navigate(`/trip/${trip.tripId}/logs`); }}
                                                sx={{ flex: 1, textTransform: 'none' }}
                                            >
                                                旅程日志
                                            </Button>
                                            <Button
                                                variant="outlined"
                                                size="small"
                                                startIcon={<Receipt />}
                                                onClick={(e) => { e.stopPropagation(); navigate(`/trip/${trip.tripId}/expenses`); }}
                                                sx={{ flex: 1, textTransform: 'none' }}
                                            >
                                                支出记录
                                            </Button>
                                        </Box>
                                    </CardContent>
                                </Card>
                            </Grid>
                        ))}
                    </Grid>
                )}
            </Container>

            {/* Create Trip Dialog */}
            <Dialog open={createDialogOpen} onClose={handleCloseCreateDialog} maxWidth="sm" fullWidth>
                <DialogTitle>新建旅程</DialogTitle>
                <DialogContent>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
                        <TextField
                            label="旅程标题"
                            fullWidth
                            required
                            value={createForm.title}
                            onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
                        />
                        <TextField
                            label="目的地城市"
                            fullWidth
                            required
                            value={createForm.destinationCity}
                            onChange={(e) => setCreateForm({ ...createForm, destinationCity: e.target.value })}
                        />
                        <Box sx={{ display: 'flex', gap: 2 }}>
                            <TextField
                                label="开始日期"
                                type="date"
                                fullWidth
                                required
                                InputLabelProps={{ shrink: true }}
                                value={createForm.startDate}
                                onChange={(e) => setCreateForm({ ...createForm, startDate: e.target.value })}
                            />
                            <TextField
                                label="结束日期"
                                type="date"
                                fullWidth
                                required
                                InputLabelProps={{ shrink: true }}
                                value={createForm.endDate}
                                onChange={(e) => setCreateForm({ ...createForm, endDate: e.target.value })}
                            />
                        </Box>
                        <TextField
                            label="预算 (可选)"
                            type="number"
                            fullWidth
                            value={createForm.totalBudget}
                            onChange={(e) => setCreateForm({ ...createForm, totalBudget: e.target.value })}
                        />
                        <TextField
                            label="描述 (可选)"
                            fullWidth
                            multiline
                            rows={3}
                            value={createForm.description}
                            onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                        />
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseCreateDialog}>取消</Button>
                    <Button
                        onClick={handleCreateTrip}
                        variant="contained"
                        disabled={creating}
                        sx={{
                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            '&:hover': {
                                background: 'linear-gradient(135deg, #5a6fd6 0%, #6a4190 100%)',
                            },
                        }}
                    >
                        {creating ? '创建中...' : '创建'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Pending Requests Dialog */}
            <Dialog open={pendingDialogOpen} onClose={() => setPendingDialogOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Notifications sx={{ color: '#667eea' }} />
                        待处理的申请 ({totalPendingCount})
                    </Box>
                </DialogTitle>
                <DialogContent>
                    <List>
                        {pendingRequests.map((req) => (
                            <ListItem key={req.tripId} disablePadding>
                                <ListItemButton
                                    onClick={() => {
                                        setPendingDialogOpen(false);
                                        navigate(`/trip/${req.tripId}`, {
                                            state: { memberRole: 'OWNER', fromMyTrips: true }
                                        });
                                    }}
                                >
                                    <ListItemText
                                        primary={req.title}
                                        secondary={`${req.pendingRequestCount} 个待处理申请`}
                                    />
                                    <Chip
                                        size="small"
                                        label={req.pendingRequestCount}
                                        color="warning"
                                    />
                                </ListItemButton>
                            </ListItem>
                        ))}
                    </List>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setPendingDialogOpen(false)}>关闭</Button>
                </DialogActions>
            </Dialog>
        </Box >
    );
};

export default MyTripsPage;
