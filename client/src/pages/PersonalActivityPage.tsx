import React, { useState, useEffect } from 'react';
import {
    Box,
    Container,
    Typography,
    Button,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    IconButton,
    Chip,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    InputAdornment,
    Pagination,
    CircularProgress,
    Grid,
    Divider,
    Link,
} from '@mui/material';
import {
    Add,
    Edit,
    Delete,
    ArrowBack,
    Close,
    Place,
    LocationOn,
    AccessTime,
    Event,
    OpenInNew,
    Restaurant,
    Celebration,
    Museum,
    MoreHoriz,
    Assignment,
    Search,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { getNonPoiItemsPage, createNonPoiItem, updateNonPoiItem, deleteNonPoiItem } from '../api/nonPoiItem';
import { NonPoiItem, NonPoiType } from '../types/api';
import { useAuthStore } from '../store/authStore';

// Type color mapping for NonPoiType (reused from TripDetailPage)
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

const formatDateTime = (dateStr: string) => {
    try {
        return new Date(dateStr).toLocaleString('zh-CN');
    } catch {
        return dateStr;
    }
};

const PersonalActivityPage: React.FC = () => {
    const navigate = useNavigate();
    const { isAuthenticated } = useAuthStore();

    const [items, setItems] = useState<NonPoiItem[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [pageSize] = useState(10);
    const [loading, setLoading] = useState(false);
    const [typeFilter, setTypeFilter] = useState<NonPoiType | ''>('');
    const [keywordFilter, setKeywordFilter] = useState('');

    // Dialog states
    const [dialogOpen, setDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [detailDialogOpen, setDetailDialogOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState<NonPoiItem | null>(null);
    const [detailItem, setDetailItem] = useState<NonPoiItem | null>(null);
    const [itemToDelete, setItemToDelete] = useState<string | null>(null);

    // Form state
    const [formData, setFormData] = useState({
        type: 'ACTIVITY' as NonPoiType,
        title: '',
        description: '',
        city: '',
        activityTime: '',
        estimatedAddress: '',
        extraInfo: '',
        sourceUrl: '',
    });

    useEffect(() => {
        if (!isAuthenticated) {
            navigate('/login');
            return;
        }
        fetchItems();
    }, [isAuthenticated, page, typeFilter]);

    const fetchItems = async () => {
        setLoading(true);
        try {
            const data = await getNonPoiItemsPage(page, pageSize, typeFilter || undefined);
            // Client-side keyword filtering
            let filteredRecords = data.records;
            if (keywordFilter.trim()) {
                const keyword = keywordFilter.toLowerCase();
                filteredRecords = data.records.filter(item =>
                    item.title.toLowerCase().includes(keyword) ||
                    (item.description && item.description.toLowerCase().includes(keyword))
                );
            }
            setItems(filteredRecords);
            setTotal(keywordFilter.trim() ? filteredRecords.length : data.total);
        } catch (error) {
            console.error('Failed to fetch items:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenCreateDialog = () => {
        setSelectedItem(null);
        setFormData({
            type: 'ACTIVITY',
            title: '',
            description: '',
            city: '',
            activityTime: '',
            estimatedAddress: '',
            extraInfo: '',
            sourceUrl: '',
        });
        setDialogOpen(true);
    };

    const handleOpenEditDialog = (item: NonPoiItem, e: React.MouseEvent) => {
        e.stopPropagation();
        setSelectedItem(item);
        setFormData({
            type: item.type,
            title: item.title,
            description: item.description || '',
            city: item.city || '',
            activityTime: item.activityTime || '',
            estimatedAddress: item.estimatedAddress || '',
            extraInfo: item.extraInfo || '',
            sourceUrl: item.sourceUrl || '',
        });
        setDialogOpen(true);
    };

    const handleCloseDialog = () => {
        setDialogOpen(false);
        setSelectedItem(null);
    };

    const handleSubmit = async () => {
        try {
            if (selectedItem) {
                await updateNonPoiItem({ id: selectedItem.id, ...formData });
            } else {
                await createNonPoiItem(formData);
            }
            handleCloseDialog();
            fetchItems();
        } catch (error) {
            console.error('Failed to save item:', error);
        }
    };

    const handleOpenDeleteDialog = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setItemToDelete(id);
        setDeleteDialogOpen(true);
    };

    const handleCloseDeleteDialog = () => {
        setDeleteDialogOpen(false);
        setItemToDelete(null);
    };

    const handleDelete = async () => {
        if (!itemToDelete) return;
        try {
            await deleteNonPoiItem(itemToDelete);
            handleCloseDeleteDialog();
            fetchItems();
        } catch (error) {
            console.error('Failed to delete item:', error);
        }
    };

    const handleRowClick = (item: NonPoiItem) => {
        setDetailItem(item);
        setDetailDialogOpen(true);
    };

    const handleCloseDetailDialog = () => {
        setDetailDialogOpen(false);
        setDetailItem(null);
    };

    const totalPages = Math.ceil(total / pageSize);

    return (
        <Box sx={{ height: '100%', bgcolor: '#f5f5f5', py: 4 }}>
            <Container maxWidth="lg">
                {/* Header */}
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 4 }}>
                    <IconButton onClick={() => navigate('/')} sx={{ mr: 2 }}>
                        <ArrowBack />
                    </IconButton>
                    <Assignment sx={{ fontSize: 32, color: '#667eea', mr: 1 }} />
                    <Typography
                        variant="h4"
                        fontWeight="bold"
                        sx={{
                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            backgroundClip: 'text',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            flex: 1,
                        }}
                    >
                        个人活动
                    </Typography>
                    <Button
                        variant="contained"
                        startIcon={<Add />}
                        onClick={handleOpenCreateDialog}
                        sx={{
                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            '&:hover': {
                                background: 'linear-gradient(135deg, #5a6fd6 0%, #6a4190 100%)',
                            },
                        }}
                    >
                        新建活动
                    </Button>
                </Box>

                {/* Search and Type Filters */}
                <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                        <Chip
                            label="全部"
                            onClick={() => setTypeFilter('')}
                            color={typeFilter === '' ? 'primary' : 'default'}
                            sx={{ cursor: 'pointer' }}
                        />
                        {(['ACTIVITY', 'FOOD', 'CULTURE', 'OTHER'] as NonPoiType[]).map((type) => (
                            <Chip
                                key={type}
                                icon={getNonPoiTypeIcon(type)}
                                label={type}
                                onClick={() => setTypeFilter(type)}
                                color={typeFilter === type ? getNonPoiTypeColor(type) : 'default'}
                                sx={{ cursor: 'pointer' }}
                            />
                        ))}
                    </Box>
                    <TextField
                        size="small"
                        placeholder="搜索活动..."
                        value={keywordFilter}
                        onChange={(e) => setKeywordFilter(e.target.value)}
                        onKeyUp={(e) => e.key === 'Enter' && fetchItems()}
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <Search fontSize="small" />
                                </InputAdornment>
                            ),
                        }}
                        sx={{ width: 240 }}
                    />
                </Box>

                {/* Table */}
                <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
                    <Table>
                        <TableHead>
                            <TableRow sx={{ bgcolor: '#f5f7fa' }}>
                                <TableCell sx={{ fontWeight: 'bold' }}>标题</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>类型</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>城市</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>大致地点</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>活动时间</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>创建时间</TableCell>
                                <TableCell align="right" sx={{ fontWeight: 'bold' }}>操作</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                                        <CircularProgress />
                                    </TableCell>
                                </TableRow>
                            ) : items.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                                        <Typography color="text.secondary">暂无数据</Typography>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                items.map((item) => (
                                    <TableRow
                                        key={item.id}
                                        hover
                                        sx={{ cursor: 'pointer' }}
                                        onClick={() => handleRowClick(item)}
                                    >
                                        <TableCell>
                                            <Typography variant="body2" fontWeight="medium">
                                                {item.title}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Chip
                                                icon={getNonPoiTypeIcon(item.type)}
                                                label={item.type}
                                                color={getNonPoiTypeColor(item.type)}
                                                size="small"
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="body2" color="text.secondary">
                                                {item.city || '-'}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="body2" color="text.secondary">
                                                {item.estimatedAddress || '-'}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="body2" color="text.secondary">
                                                {item.activityTime || '-'}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="body2" color="text.secondary">
                                                {item.createdAt ? formatDateTime(item.createdAt) : '-'}
                                            </Typography>
                                        </TableCell>
                                        <TableCell align="right">
                                            <IconButton
                                                size="small"
                                                onClick={(e) => handleOpenEditDialog(item, e)}
                                                color="primary"
                                            >
                                                <Edit fontSize="small" />
                                            </IconButton>
                                            <IconButton
                                                size="small"
                                                onClick={(e) => handleOpenDeleteDialog(item.id, e)}
                                                color="error"
                                            >
                                                <Delete fontSize="small" />
                                            </IconButton>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>

                {/* Pagination */}
                {total > 0 && (
                    <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
                        <Pagination
                            count={totalPages}
                            page={page}
                            onChange={(_, value) => setPage(value)}
                            color="primary"
                        />
                    </Box>
                )}

                {/* Detail Dialog - reused from TripDetailPage NonPoi Dialog */}
                <Dialog
                    open={detailDialogOpen}
                    onClose={handleCloseDetailDialog}
                    maxWidth="sm"
                    fullWidth
                >
                    {detailItem && (
                        <>
                            <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <Typography variant="h5" fontWeight="bold" sx={{ flex: 1, mr: 1 }}>{detailItem.title}</Typography>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
                                    <Chip
                                        size="small"
                                        icon={getNonPoiTypeIcon(detailItem.type)}
                                        label={detailItem.type}
                                        color={getNonPoiTypeColor(detailItem.type)}
                                    />
                                    <IconButton onClick={handleCloseDetailDialog} size="small">
                                        <Close />
                                    </IconButton>
                                </Box>
                            </DialogTitle>
                            <DialogContent dividers>
                                {/* Description */}
                                {detailItem.description && (
                                    <Box sx={{ mb: 2 }}>
                                        <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1 }}>描述</Typography>
                                        <Typography variant="body2" sx={{ lineHeight: 1.6 }}>
                                            {detailItem.description}
                                        </Typography>
                                    </Box>
                                )}

                                <Divider sx={{ my: 2 }} />

                                {/* Details Grid */}
                                <Grid container spacing={2}>
                                    {detailItem.city && (
                                        <Grid item xs={12} sm={6}>
                                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                                <Place fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                                                <Box>
                                                    <Typography variant="caption" color="text.secondary">城市</Typography>
                                                    <Typography variant="body2">{detailItem.city}</Typography>
                                                </Box>
                                            </Box>
                                        </Grid>
                                    )}
                                    {detailItem.estimatedAddress && (
                                        <Grid item xs={12} sm={6}>
                                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                                <LocationOn fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                                                <Box>
                                                    <Typography variant="caption" color="text.secondary">预计地址</Typography>
                                                    <Typography variant="body2">{detailItem.estimatedAddress}</Typography>
                                                </Box>
                                            </Box>
                                        </Grid>
                                    )}
                                    {detailItem.activityTime && (
                                        <Grid item xs={12} sm={6}>
                                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                                <AccessTime fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                                                <Box>
                                                    <Typography variant="caption" color="text.secondary">活动时间</Typography>
                                                    <Typography variant="body2">{detailItem.activityTime}</Typography>
                                                </Box>
                                            </Box>
                                        </Grid>
                                    )}
                                    {detailItem.createdAt && (
                                        <Grid item xs={12} sm={6}>
                                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                                <Event fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                                                <Box>
                                                    <Typography variant="caption" color="text.secondary">创建时间</Typography>
                                                    <Typography variant="body2">{formatDateTime(detailItem.createdAt)}</Typography>
                                                </Box>
                                            </Box>
                                        </Grid>
                                    )}
                                </Grid>

                                {/* Extra Info */}
                                {detailItem.extraInfo && (
                                    <Box sx={{ mt: 2 }}>
                                        <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1 }}>额外信息</Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            {detailItem.extraInfo}
                                        </Typography>
                                    </Box>
                                )}

                                {/* Source URL */}
                                {detailItem.sourceUrl && (
                                    <Box sx={{ mt: 2 }}>
                                        <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1 }}>来源链接</Typography>
                                        <Link
                                            href={detailItem.sourceUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
                                        >
                                            {detailItem.sourceUrl}
                                            <OpenInNew fontSize="small" />
                                        </Link>
                                    </Box>
                                )}
                            </DialogContent>
                        </>
                    )}
                </Dialog>

                {/* Create/Edit Dialog */}
                <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
                    <DialogTitle>{selectedItem ? '编辑活动' : '新建活动'}</DialogTitle>
                    <DialogContent>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
                            <FormControl fullWidth>
                                <InputLabel>类型</InputLabel>
                                <Select
                                    value={formData.type}
                                    label="类型"
                                    onChange={(e) => setFormData({ ...formData, type: e.target.value as NonPoiType })}
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
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            />
                            <TextField
                                label="描述"
                                fullWidth
                                multiline
                                rows={3}
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            />
                            <TextField
                                label="城市"
                                fullWidth
                                value={formData.city}
                                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                            />
                            <TextField
                                label="活动时间"
                                fullWidth
                                placeholder="例如：2024/12/25 14:00"
                                value={formData.activityTime}
                                onChange={(e) => setFormData({ ...formData, activityTime: e.target.value })}
                            />
                            <TextField
                                label="大致地点"
                                fullWidth
                                value={formData.estimatedAddress}
                                onChange={(e) => setFormData({ ...formData, estimatedAddress: e.target.value })}
                            />
                            <TextField
                                label="额外信息"
                                fullWidth
                                multiline
                                rows={2}
                                value={formData.extraInfo}
                                onChange={(e) => setFormData({ ...formData, extraInfo: e.target.value })}
                            />
                            <TextField
                                label="来源链接"
                                fullWidth
                                value={formData.sourceUrl}
                                onChange={(e) => setFormData({ ...formData, sourceUrl: e.target.value })}
                            />
                        </Box>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={handleCloseDialog}>取消</Button>
                        <Button onClick={handleSubmit} variant="contained" disabled={!formData.title}>
                            {selectedItem ? '保存' : '创建'}
                        </Button>
                    </DialogActions>
                </Dialog>

                {/* Delete Confirmation Dialog */}
                <Dialog open={deleteDialogOpen} onClose={handleCloseDeleteDialog}>
                    <DialogTitle>确认删除</DialogTitle>
                    <DialogContent>
                        <Typography>确定要删除这个活动吗？此操作不可撤销。</Typography>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={handleCloseDeleteDialog}>取消</Button>
                        <Button onClick={handleDelete} color="error" variant="contained">
                            删除
                        </Button>
                    </DialogActions>
                </Dialog>
            </Container>
        </Box>
    );
};

export default PersonalActivityPage;
