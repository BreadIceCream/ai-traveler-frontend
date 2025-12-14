import React, { useState, useEffect, useCallback } from 'react';
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
    FormControlLabel,
    Switch,
    Tooltip,
    ToggleButton,
    ToggleButtonGroup,
    ImageList,
    ImageListItem,
} from '@mui/material';
import {
    ArrowBack,
    Notes,
    Lock,
    LockOpen,
    Delete,
    Add,
    CloudUpload,
    Person,
    Public,
    PersonOutline,
    Close,
    Image as ImageIcon,
    ChevronLeft,
    ChevronRight,
} from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { getTripLogs, getPublicTripLogs, createLog, updateLogVisibility, deleteLog } from '@/api/tripLog';
import { TripLog, TripLogsDto } from '@/types/api';
import { toast } from '@/utils/toast';

// Parse imgs JSON string to array
const parseImgs = (imgs: string): string[] => {
    if (!imgs) return [];
    try {
        return JSON.parse(imgs);
    } catch {
        return [];
    }
};

const TripLogsPage: React.FC = () => {
    const navigate = useNavigate();
    const { tripId } = useParams<{ tripId: string }>();
    const { isAuthenticated } = useAuthStore();

    // View mode: 'my' or 'public'
    const [viewMode, setViewMode] = useState<'my' | 'public'>('my');

    // My logs state
    const [myLogs, setMyLogs] = useState<TripLog[]>([]);
    const [myLogsLoading, setMyLogsLoading] = useState(false);

    // Public logs state (with username)
    const [publicLogs, setPublicLogs] = useState<TripLogsDto[]>([]);
    const [publicLogsLoading, setPublicLogsLoading] = useState(false);

    // Create dialog state
    const [createDialogOpen, setCreateDialogOpen] = useState(false);
    const [noteContent, setNoteContent] = useState('');
    const [imageFiles, setImageFiles] = useState<File[]>([]);
    const [imagePreviews, setImagePreviews] = useState<string[]>([]);
    const [isPublic, setIsPublic] = useState(false);
    const [creating, setCreating] = useState(false);

    // Image preview dialog
    const [previewOpen, setPreviewOpen] = useState(false);
    const [previewImages, setPreviewImages] = useState<string[]>([]);
    const [previewIndex, setPreviewIndex] = useState(0);

    // Log detail dialog
    const [detailDialogOpen, setDetailDialogOpen] = useState(false);
    const [selectedLog, setSelectedLog] = useState<TripLog | TripLogsDto | null>(null);
    const [selectedLogIsMyLog, setSelectedLogIsMyLog] = useState(false);

    // Delete confirmation dialog
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [logToDelete, setLogToDelete] = useState<string | null>(null);

    useEffect(() => {
        if (!isAuthenticated) {
            navigate('/login');
            return;
        }
    }, [isAuthenticated, navigate]);

    const fetchMyLogs = useCallback(async () => {
        if (!tripId) return;
        setMyLogsLoading(true);
        try {
            const logs = await getTripLogs(tripId);
            setMyLogs(logs);
        } catch (err) {
            console.error('Failed to fetch my logs:', err);
        } finally {
            setMyLogsLoading(false);
        }
    }, [tripId]);

    const fetchPublicLogs = useCallback(async () => {
        if (!tripId) return;
        setPublicLogsLoading(true);
        try {
            const logs = await getPublicTripLogs(tripId);
            setPublicLogs(logs);
        } catch (err) {
            console.error('Failed to fetch public logs:', err);
        } finally {
            setPublicLogsLoading(false);
        }
    }, [tripId]);

    useEffect(() => {
        if (viewMode === 'my') {
            fetchMyLogs();
        } else {
            fetchPublicLogs();
        }
    }, [viewMode, fetchMyLogs, fetchPublicLogs]);

    const handleCreateLog = async () => {
        if (!tripId) return;
        if (!noteContent.trim() && imageFiles.length === 0) {
            toast.warning('请输入日志内容或上传图片');
            return;
        }
        setCreating(true);
        try {
            const result = await createLog(tripId, { content: noteContent, isPublic }, imageFiles.length > 0 ? imageFiles : undefined);
            // Show result message from backend
            if (result) {
                toast.success(result);
            } else {
                toast.success('日志创建成功');
            }
            setCreateDialogOpen(false);
            setNoteContent('');
            setImageFiles([]);
            setImagePreviews([]);
            setIsPublic(false);
            fetchMyLogs();
        } catch (err) {
            console.error('Failed to create log:', err);
        } finally {
            setCreating(false);
        }
    };

    const handleToggleVisibility = async (logId: string, currentIsPublic: boolean) => {
        try {
            await updateLogVisibility(logId, !currentIsPublic);
            toast.success(currentIsPublic ? '已设为私密' : '已设为公开');
            fetchMyLogs();
        } catch (err) {
            console.error('Failed to toggle visibility:', err);
        }
    };

    const handleOpenDeleteDialog = (logId: string, e?: React.MouseEvent) => {
        e?.stopPropagation();
        setLogToDelete(logId);
        setDeleteDialogOpen(true);
    };

    const handleCloseDeleteDialog = () => {
        setDeleteDialogOpen(false);
        setLogToDelete(null);
    };

    const handleConfirmDelete = async () => {
        if (!logToDelete) return;
        try {
            await deleteLog(logToDelete);
            toast.success('日志已删除');
            fetchMyLogs();
        } catch (err) {
            console.error('Failed to delete log:', err);
        } finally {
            handleCloseDeleteDialog();
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files) return;

        const newFiles: File[] = [];
        const newPreviews: string[] = [];
        let totalSize = imageFiles.reduce((sum, f) => sum + f.size, 0);

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            if (file.size > 3 * 1024 * 1024) {
                toast.warning(`图片 ${file.name} 超过3MB，已跳过`);
                continue;
            }
            totalSize += file.size;
            if (totalSize > 30 * 1024 * 1024) {
                toast.warning('全部图片总大小不能超过30MB');
                break;
            }
            newFiles.push(file);
            newPreviews.push(URL.createObjectURL(file));
        }

        setImageFiles([...imageFiles, ...newFiles]);
        setImagePreviews([...imagePreviews, ...newPreviews]);
    };

    const removeImage = (index: number) => {
        const newFiles = [...imageFiles];
        const newPreviews = [...imagePreviews];
        URL.revokeObjectURL(newPreviews[index]);
        newFiles.splice(index, 1);
        newPreviews.splice(index, 1);
        setImageFiles(newFiles);
        setImagePreviews(newPreviews);
    };

    const formatDate = (dateStr: string) => {
        try {
            return new Date(dateStr).toLocaleString('zh-CN');
        } catch {
            return dateStr;
        }
    };

    const openImagePreview = (images: string[], index: number) => {
        setPreviewImages(images);
        setPreviewIndex(index);
        setPreviewOpen(true);
    };

    const openLogDetail = (log: TripLog | TripLogsDto, isMyLog: boolean) => {
        setSelectedLog(log);
        setSelectedLogIsMyLog(isMyLog);
        setDetailDialogOpen(true);
    };

    // Render log card (shared structure for my logs and public logs)
    const renderLogCard = (log: TripLog | TripLogsDto, isMyLog: boolean) => {
        const images = parseImgs(log.imgs);
        const hasImages = images.length > 0;
        const hasContent = log.content && log.content.trim().length > 0;
        const username = 'username' in log ? log.username : null;

        return (
            <Grid item xs={12} sm={6} md={4} key={log.logId}>
                <Card
                    onClick={() => openLogDetail(log, isMyLog)}
                    sx={{
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        borderRadius: 3,
                        overflow: 'hidden',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                        transition: 'transform 0.2s, box-shadow 0.2s',
                        cursor: 'pointer',
                        '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 4px 16px rgba(0,0,0,0.12)' }
                    }}>
                    {/* Image Section */}
                    {hasImages && (
                        <Box
                            sx={{
                                position: 'relative',
                                height: 160,
                                overflow: 'hidden',
                                cursor: 'pointer',
                            }}
                            onClick={(e) => { e.stopPropagation(); openImagePreview(images, 0); }}
                        >
                            <Box
                                component="img"
                                src={images[0]}
                                alt="日志图片"
                                sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                            {images.length > 1 && (
                                <Chip
                                    size="small"
                                    icon={<ImageIcon sx={{ fontSize: 14 }} />}
                                    label={`+${images.length - 1}`}
                                    sx={{
                                        position: 'absolute',
                                        bottom: 8,
                                        right: 8,
                                        bgcolor: 'rgba(0,0,0,0.6)',
                                        color: 'white',
                                        '& .MuiChip-icon': { color: 'white' },
                                    }}
                                />
                            )}
                        </Box>
                    )}

                    {/* Text Content Section */}
                    {hasContent && (
                        <CardContent sx={{ flex: 1, bgcolor: hasImages ? 'white' : '#f8f9fc', minHeight: hasImages ? 'auto' : 80, py: 1.5, px: 2 }}>
                            <Typography
                                variant="body2"
                                sx={{
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    display: '-webkit-box',
                                    WebkitLineClamp: 3,
                                    WebkitBoxOrient: 'vertical',
                                    color: 'text.primary',
                                }}
                            >
                                {log.content}
                            </Typography>
                        </CardContent>
                    )}

                    {/* Footer */}
                    <CardContent sx={{ mb: -1.5, py: 0.5, px: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #f0f0f0' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            {!isMyLog && username && (
                                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                    <Person sx={{ fontSize: 16, color: '#667eea', mr: 0.5 }} />
                                    <Typography variant="caption" fontWeight="bold" color="#667eea">
                                        {username}
                                    </Typography>
                                </Box>
                            )}
                            {isMyLog && (
                                <Chip
                                    size="small"
                                    icon={log.isPublic ? <LockOpen sx={{ fontSize: 14 }} /> : <Lock sx={{ fontSize: 14 }} />}
                                    label={log.isPublic ? '公开' : '私密'}
                                    variant="outlined"
                                    sx={{ height: 20, '& .MuiChip-label': { px: 0.5, fontSize: '0.65rem' } }}
                                />
                            )}
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Typography variant="caption" color="text.secondary">
                                {formatDate(log.createdAt)}
                            </Typography>
                            {isMyLog && (
                                <>
                                    <Tooltip title={log.isPublic ? '设为私密' : '设为公开'}>
                                        <IconButton size="small" onClick={(e) => { e.stopPropagation(); handleToggleVisibility(log.logId, log.isPublic); }}>
                                            {log.isPublic ? <Lock sx={{ fontSize: 16 }} /> : <LockOpen sx={{ fontSize: 16 }} />}
                                        </IconButton>
                                    </Tooltip>
                                    <Tooltip title="删除">
                                        <IconButton size="small" color="error" onClick={(e) => handleOpenDeleteDialog(log.logId, e)}>
                                            <Delete sx={{ fontSize: 16 }} />
                                        </IconButton>
                                    </Tooltip>
                                </>
                            )}
                        </Box>
                    </CardContent>
                </Card>
            </Grid>
        );
    };

    return (
        <Box sx={{ height: '100%', bgcolor: '#f5f5f5', py: 3 }}>
            <Container maxWidth="lg">
                {/* Header */}
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <IconButton onClick={() => navigate(-1)} sx={{ mr: 1 }}>
                            <ArrowBack />
                        </IconButton>
                        <Typography
                            variant="h4"
                            fontWeight="bold"
                            sx={{
                                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                            }}
                        >
                            旅程日志
                        </Typography>
                    </Box>
                    {viewMode === 'my' && (
                        <Button
                            variant="contained"
                            startIcon={<Add />}
                            onClick={() => setCreateDialogOpen(true)}
                            sx={{
                                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                '&:hover': { background: 'linear-gradient(135deg, #5a6fd6 0%, #6a4190 100%)' },
                                borderRadius: 2,
                            }}
                        >
                            新建日志
                        </Button>
                    )}
                </Box>

                {/* Toggle Button */}
                <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
                    <ToggleButtonGroup
                        value={viewMode}
                        exclusive
                        onChange={(_, v) => v && setViewMode(v)}
                        sx={{
                            bgcolor: 'white',
                            borderRadius: 3,
                            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                            '& .MuiToggleButton-root': {
                                border: 'none',
                                px: 4,
                                py: 1,
                                borderRadius: '12px !important',
                                '&.Mui-selected': {
                                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                    color: 'white',
                                    '&:hover': { background: 'linear-gradient(135deg, #5a6fd6 0%, #6a4190 100%)' },
                                },
                            },
                        }}
                    >
                        <ToggleButton value="my">
                            <PersonOutline sx={{ mr: 1 }} />
                            我的日志
                        </ToggleButton>
                        <ToggleButton value="public">
                            <Public sx={{ mr: 1 }} />
                            公开日志
                        </ToggleButton>
                    </ToggleButtonGroup>
                </Box>

                {/* Main Content */}
                <Card sx={{ borderRadius: 3, boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
                    {/* My Logs View */}
                    {viewMode === 'my' && (
                        <Box sx={{ p: 3 }}>
                            {myLogsLoading ? (
                                <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                                    <CircularProgress />
                                </Box>
                            ) : myLogs.length === 0 ? (
                                <Box sx={{ textAlign: 'center', py: 6 }}>
                                    <Notes sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                                    <Typography color="text.secondary">暂无日志，点击右上角新建</Typography>
                                </Box>
                            ) : (
                                <Grid container spacing={2}>
                                    {myLogs.map(log => renderLogCard(log, true))}
                                </Grid>
                            )}
                        </Box>
                    )}

                    {/* Public Logs View */}
                    {viewMode === 'public' && (
                        <Box sx={{ p: 3 }}>
                            {publicLogsLoading ? (
                                <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                                    <CircularProgress />
                                </Box>
                            ) : publicLogs.length === 0 ? (
                                <Box sx={{ textAlign: 'center', py: 6 }}>
                                    <Public sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                                    <Typography color="text.secondary">暂无公开日志</Typography>
                                </Box>
                            ) : (
                                <Grid container spacing={2}>
                                    {publicLogs.map(log => renderLogCard(log, false))}
                                </Grid>
                            )}
                        </Box>
                    )}
                </Card>

                {/* Create Log Dialog */}
                <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="sm" fullWidth>
                    <DialogTitle sx={{
                        color: 'black',
                        fontWeight: 'bold',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                    }}>
                        新建日志
                    </DialogTitle>
                    <DialogContent sx={{ pt: 3 }}>
                        {/* Text Input Section */}
                        <Box sx={{ mb: 3 }}>
                            <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1, color: '#667eea', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <Notes sx={{ fontSize: 18 }} />
                                日志内容
                            </Typography>
                            <TextField
                                multiline
                                rows={4}
                                fullWidth
                                value={noteContent}
                                onChange={(e) => setNoteContent(e.target.value)}
                                placeholder="记录您的旅途心情..."
                                sx={{
                                    '& .MuiOutlinedInput-root': {
                                        borderRadius: 2,
                                        '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#667eea' },
                                        '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#667eea' },
                                    }
                                }}
                            />
                        </Box>

                        {/* Image Upload Section */}
                        <Box sx={{ mb: 2 }}>
                            <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1, color: '#667eea', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <ImageIcon sx={{ fontSize: 18 }} />
                                添加图片
                                <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                                    (单张≤3MB，总计≤30MB)
                                </Typography>
                            </Typography>
                            <Box
                                sx={{
                                    border: '2px dashed',
                                    borderColor: imagePreviews.length > 0 ? '#667eea' : 'divider',
                                    borderRadius: 2,
                                    p: 2,
                                    textAlign: 'center',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    bgcolor: imagePreviews.length > 0 ? 'rgba(102, 126, 234, 0.05)' : 'transparent',
                                    '&:hover': { borderColor: '#667eea', bgcolor: 'rgba(102, 126, 234, 0.08)' },
                                }}
                                onClick={() => document.getElementById('image-upload')?.click()}
                            >
                                <input
                                    id="image-upload"
                                    type="file"
                                    accept="image/*"
                                    multiple
                                    style={{ display: 'none' }}
                                    onChange={handleFileChange}
                                />
                                <CloudUpload sx={{ fontSize: 32, color: imagePreviews.length > 0 ? '#667eea' : 'text.secondary', mb: 0.5 }} />
                                <Typography color={imagePreviews.length > 0 ? '#667eea' : 'text.secondary'} variant="body2">
                                    {imagePreviews.length > 0 ? `已选择 ${imagePreviews.length} 张图片，点击继续添加` : '点击选择图片'}
                                </Typography>
                            </Box>

                            {/* Image Previews */}
                            {imagePreviews.length > 0 && (
                                <ImageList sx={{ mt: 2 }} cols={4} rowHeight={80}>
                                    {imagePreviews.map((preview, index) => (
                                        <ImageListItem key={index} sx={{ position: 'relative' }}>
                                            <img
                                                src={preview}
                                                alt={`预览 ${index + 1}`}
                                                style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 4 }}
                                            />
                                            <IconButton
                                                size="small"
                                                sx={{
                                                    position: 'absolute',
                                                    top: 2,
                                                    right: 2,
                                                    bgcolor: 'rgba(0,0,0,0.5)',
                                                    color: 'white',
                                                    '&:hover': { bgcolor: 'rgba(0,0,0,0.7)' },
                                                    padding: 0.25,
                                                }}
                                                onClick={(e) => { e.stopPropagation(); removeImage(index); }}
                                            >
                                                <Close sx={{ fontSize: 14 }} />
                                            </IconButton>
                                        </ImageListItem>
                                    ))}
                                </ImageList>
                            )}
                        </Box>

                        {/* Visibility Toggle */}
                        <Box sx={{ bgcolor: '#f8f9fc', borderRadius: 2, p: 1.5 }}>
                            <FormControlLabel
                                control={<Switch checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} color="primary" />}
                                label={
                                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                        {isPublic ? <LockOpen sx={{ mr: 0.5, fontSize: 18, color: '#667eea' }} /> : <Lock sx={{ mr: 0.5, fontSize: 18, color: 'text.secondary' }} />}
                                        <Typography variant="body2" fontWeight="medium">
                                            {isPublic ? '公开 (旅程成员可见)' : '私密 (仅自己可见)'}
                                        </Typography>
                                    </Box>
                                }
                            />
                        </Box>
                    </DialogContent>
                    <DialogActions sx={{ px: 3, pb: 2 }}>
                        <Button onClick={() => setCreateDialogOpen(false)}>取消</Button>
                        <Button
                            onClick={handleCreateLog}
                            variant="contained"
                            disabled={creating}
                            sx={{
                                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                '&:hover': { background: 'linear-gradient(135deg, #5a6fd6 0%, #6a4190 100%)' },
                            }}
                        >
                            {creating ? '创建中...' : '创建'}
                        </Button>
                    </DialogActions>
                </Dialog>

                {/* Log Detail Dialog */}
                <Dialog open={detailDialogOpen} onClose={() => setDetailDialogOpen(false)} maxWidth="sm" fullWidth>
                    {selectedLog && (() => {
                        const detailImages = parseImgs(selectedLog.imgs);
                        const detailUsername = 'username' in selectedLog ? selectedLog.username : null;
                        return (
                            <>
                                <DialogTitle sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    borderBottom: '1px solid #f0f0f0',
                                    pb: 1,
                                }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <Notes sx={{ color: '#667eea' }} />
                                        <Typography fontWeight="bold">日志详情</Typography>
                                    </Box>
                                    <IconButton onClick={() => setDetailDialogOpen(false)} size="small">
                                        <Close />
                                    </IconButton>
                                </DialogTitle>
                                <DialogContent sx={{ pt: 2 }}>
                                    {/* Images - show max 3 */}
                                    {detailImages.length > 0 && (
                                        <Box sx={{ mb: 2 }}>
                                            <ImageList cols={Math.min(detailImages.length, 3)} gap={8}>
                                                {detailImages.slice(0, 3).map((img, idx) => (
                                                    <ImageListItem
                                                        key={idx}
                                                        sx={{ cursor: 'pointer', borderRadius: 2, overflow: 'hidden', position: 'relative' }}
                                                        onClick={() => openImagePreview(detailImages, idx)}
                                                    >
                                                        <img src={img} alt={`图片 ${idx + 1}`} style={{ borderRadius: 8 }} />
                                                        {/* Show +N on the last visible image if there are more */}
                                                        {idx === 2 && detailImages.length > 3 && (
                                                            <Box sx={{
                                                                position: 'absolute',
                                                                top: 0,
                                                                left: 0,
                                                                right: 0,
                                                                bottom: 0,
                                                                bgcolor: 'rgba(0,0,0,0.5)',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                borderRadius: 2,
                                                            }}>
                                                                <Typography variant="h5" color="white" fontWeight="bold">
                                                                    +{detailImages.length - 3}
                                                                </Typography>
                                                            </Box>
                                                        )}
                                                    </ImageListItem>
                                                ))}
                                            </ImageList>
                                        </Box>
                                    )}
                                    {/* Content */}
                                    {selectedLog.content && (
                                        <Typography variant="body1" sx={{ mb: 2, whiteSpace: 'pre-wrap' }}>
                                            {selectedLog.content}
                                        </Typography>
                                    )}
                                    {/* Metadata */}
                                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center', pt: 1, borderTop: '1px solid #f0f0f0' }}>
                                        {!selectedLogIsMyLog && detailUsername && (
                                            <Chip
                                                size="small"
                                                icon={<Person sx={{ fontSize: 16 }} />}
                                                label={detailUsername}
                                                sx={{ bgcolor: '#667eea', color: 'white', '& .MuiChip-icon': { color: 'white' } }}
                                            />
                                        )}
                                        <Chip
                                            size="small"
                                            icon={selectedLog.isPublic ? <LockOpen sx={{ fontSize: 14 }} /> : <Lock sx={{ fontSize: 14 }} />}
                                            label={selectedLog.isPublic ? '公开' : '私密'}
                                            variant="outlined"
                                        />
                                        <Typography variant="caption" color="text.secondary">
                                            {formatDate(selectedLog.createdAt)}
                                        </Typography>
                                    </Box>
                                </DialogContent>
                                {selectedLogIsMyLog && (
                                    <DialogActions sx={{ px: 3, pb: 2, borderTop: '1px solid #f0f0f0' }}>
                                        <Button
                                            size="small"
                                            startIcon={selectedLog.isPublic ? <Lock /> : <LockOpen />}
                                            onClick={() => { handleToggleVisibility(selectedLog.logId, selectedLog.isPublic); setDetailDialogOpen(false); }}
                                        >
                                            {selectedLog.isPublic ? '设为私密' : '设为公开'}
                                        </Button>
                                        <Button
                                            size="small"
                                            color="error"
                                            startIcon={<Delete />}
                                            onClick={() => { handleOpenDeleteDialog(selectedLog.logId); setDetailDialogOpen(false); }}
                                        >
                                            删除
                                        </Button>
                                    </DialogActions>
                                )}
                            </>
                        );
                    })()}
                </Dialog>

                {/* Image Preview Dialog */}
                <Dialog
                    open={previewOpen}
                    onClose={() => setPreviewOpen(false)}
                    maxWidth="md"
                    fullWidth
                    PaperProps={{
                        sx: { bgcolor: 'rgba(0,0,0,0.8)', borderRadius: 2 }
                    }}
                >
                    <DialogContent sx={{ p: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 400, position: 'relative' }}>
                        {previewImages.length > 0 && (
                            <>
                                {/* Left Navigation Button */}
                                {previewImages.length > 1 && (
                                    <IconButton
                                        sx={{
                                            position: 'absolute',
                                            left: 16,
                                            top: '50%',
                                            transform: 'translateY(-50%)',
                                            color: 'white',
                                            bgcolor: 'rgba(255,255,255,0.1)',
                                            '&:hover': { bgcolor: 'rgba(255,255,255,0.2)' },
                                            zIndex: 1,
                                        }}
                                        onClick={() => setPreviewIndex((previewIndex - 1 + previewImages.length) % previewImages.length)}
                                    >
                                        <ChevronLeft sx={{ fontSize: 32 }} />
                                    </IconButton>
                                )}

                                {/* Image */}
                                <Box sx={{ textAlign: 'center', width: '100%' }}>
                                    <img
                                        src={previewImages[previewIndex]}
                                        alt={`图片 ${previewIndex + 1}`}
                                        style={{ maxWidth: '100%', maxHeight: '70vh', objectFit: 'contain' }}
                                    />
                                    {/* Dot Indicators */}
                                    {previewImages.length > 1 && (
                                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1, mt: 2 }}>
                                            <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1 }}>
                                                {previewImages.map((_, idx) => (
                                                    <Box
                                                        key={idx}
                                                        sx={{
                                                            width: 8,
                                                            height: 8,
                                                            borderRadius: '50%',
                                                            bgcolor: idx === previewIndex ? 'white' : 'rgba(255,255,255,0.5)',
                                                            cursor: 'pointer',
                                                        }}
                                                        onClick={() => setPreviewIndex(idx)}
                                                    />
                                                ))}
                                            </Box>
                                            <Typography variant="body1" sx={{ fontSize: 16, color: 'rgba(255,255,255,0.8)' }}>
                                                {previewIndex + 1} / {previewImages.length}
                                            </Typography>
                                        </Box>
                                    )}
                                </Box>

                                {/* Right Navigation Button */}
                                {previewImages.length > 1 && (
                                    <IconButton
                                        sx={{
                                            position: 'absolute',
                                            right: 16,
                                            top: '50%',
                                            transform: 'translateY(-50%)',
                                            color: 'white',
                                            bgcolor: 'rgba(255,255,255,0.1)',
                                            '&:hover': { bgcolor: 'rgba(255,255,255,0.2)' },
                                            zIndex: 1,
                                        }}
                                        onClick={() => setPreviewIndex((previewIndex + 1) % previewImages.length)}
                                    >
                                        <ChevronRight sx={{ fontSize: 32 }} />
                                    </IconButton>
                                )}

                                {/* Close Button */}
                                <IconButton
                                    sx={{ position: 'absolute', top: 8, right: 8, color: 'white', bgcolor: 'rgba(255,255,255,0.1)', '&:hover': { bgcolor: 'rgba(255,255,255,0.2)' } }}
                                    onClick={() => setPreviewOpen(false)}
                                >
                                    <Close />
                                </IconButton>
                            </>
                        )}
                    </DialogContent>
                </Dialog>

                {/* Delete Confirmation Dialog */}
                <Dialog open={deleteDialogOpen} onClose={handleCloseDeleteDialog}>
                    <DialogTitle>确认删除</DialogTitle>
                    <DialogContent>
                        <Typography>确定要删除这条日志吗？此操作不可撤销。</Typography>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={handleCloseDeleteDialog}>取消</Button>
                        <Button onClick={handleConfirmDelete} color="error" variant="contained">删除</Button>
                    </DialogActions>
                </Dialog>
            </Container>
        </Box>
    );
};

export default TripLogsPage;
