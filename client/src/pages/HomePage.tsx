import React, { useState, useEffect } from 'react';
import {
    Box,
    Typography,
    Button,
    Drawer,
    List,
    ListItem,
    ListItemButton,
    ListItemIcon,
    Avatar,
    Popover,
    Divider,
    IconButton,
    TextField,
    CircularProgress,
    Menu,
    MenuItem,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
} from '@mui/material';
import {
    Explore,
    Logout,
    Menu as MenuIcon,
    MenuOpen,
    Edit,
    Save,
    CalendarToday,
    Assignment,
    CardTravel,
    Send,
    AddComment,
    MoreVert,
    Delete,
} from '@mui/icons-material';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { updatePreferences } from '@/api/user';
import { createConversation, handleUserQuery, getAllConversations, renameConversation, deleteConversation } from '@/api/aiRecommendation';
import { toast } from '@/utils/toast';
import { AiRecommendationConversation } from '@/types/api';

const DRAWER_WIDTH = 220;
const DRAWER_COLLAPSED_WIDTH = 56;
const ICON_CONTAINER_SIZE = 40;
const SIDE_PADDING = 8; // Consistent padding for alignment

const HomePage: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { isAuthenticated, user, logout, setUser } = useAuthStore();
    const isSubRoute = location.pathname !== '/' && location.pathname.startsWith('/ai/');

    const [drawerOpen, setDrawerOpen] = useState(true);
    const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
    const [editingPreferences, setEditingPreferences] = useState(false);
    const [preferencesText, setPreferencesText] = useState(user?.preferencesText || '');
    const [saving, setSaving] = useState(false);
    const [aiInput, setAiInput] = useState('');
    const [aiLoading, setAiLoading] = useState(false);
    const [conversations, setConversations] = useState<AiRecommendationConversation[]>([]);

    // Conversation edit state
    const [convMenuAnchor, setConvMenuAnchor] = useState<HTMLElement | null>(null);
    const [selectedConv, setSelectedConv] = useState<AiRecommendationConversation | null>(null);
    const [renameDialogOpen, setRenameDialogOpen] = useState(false);
    const [newTitle, setNewTitle] = useState('');
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    // Load AI conversations
    useEffect(() => {
        const loadConversations = async () => {
            if (isAuthenticated) {
                try {
                    const convs = await getAllConversations();
                    setConversations(convs);
                } catch (error: any) {
                    console.error('Failed to load conversations:', error);
                }
            }
        };
        loadConversations();
    }, [isAuthenticated]);

    const handleAvatarClick = (event: React.MouseEvent<HTMLElement>) => {
        setAnchorEl(event.currentTarget);
        setPreferencesText(user?.preferencesText || '');
        setEditingPreferences(false);
    };

    const handlePopoverClose = () => {
        setAnchorEl(null);
        setEditingPreferences(false);
    };

    const handleSavePreferences = async () => {
        try {
            setSaving(true);
            const updatedUser = await updatePreferences(preferencesText);
            setUser(updatedUser);
            setEditingPreferences(false);
        } catch (err) {
            console.error('Failed to save preferences:', err);
        } finally {
            setSaving(false);
        }
    };

    const handleStartAiConversation = async () => {
        if (!aiInput.trim()) return;

        setAiLoading(true);
        try {
            // Step 1: Create conversation
            const conversation = await createConversation(aiInput);

            // Step 2: Update sidebar immediately (optimistic update)
            setConversations(prev => [conversation, ...prev]);

            // Step 3: Navigate to conversation page with prefill query
            // Use sessionStorage to track that this is a new conversation needing auto-submit
            const queryText = aiInput;
            setAiInput('');
            sessionStorage.setItem(`ai_conv_autosubmit_${conversation.conversationId}`, 'true');
            navigate(`/ai/conversation/${conversation.conversationId}`, {
                state: { prefillQuery: queryText },
                replace: true  // Replace so back button doesn't re-trigger
            });
        } catch (error: any) {
            toast.error(error.message || '创建AI会话失败');
        } finally {
            setAiLoading(false);
        }
    };

    // Conversation menu handlers
    const handleConvMenuOpen = (event: React.MouseEvent<HTMLElement>, conv: AiRecommendationConversation) => {
        event.stopPropagation();
        setConvMenuAnchor(event.currentTarget);
        setSelectedConv(conv);
    };

    const handleConvMenuClose = () => {
        setConvMenuAnchor(null);
    };

    const handleRenameClick = () => {
        if (selectedConv) {
            setNewTitle(selectedConv.title);
            setRenameDialogOpen(true);
        }
        handleConvMenuClose();
    };

    const handleRenameConfirm = async () => {
        if (!selectedConv || !newTitle.trim()) return;
        try {
            const updated = await renameConversation(selectedConv.conversationId, newTitle.trim());
            setConversations(prev => prev.map(c =>
                c.conversationId === updated.conversationId ? updated : c
            ));
            toast.success('重命名成功');

            // If currently viewing this conversation, update the title via navigation state
            if (location.pathname.includes(selectedConv.conversationId)) {
                navigate(`/ai/conversation/${selectedConv.conversationId}`, {
                    state: { updatedTitle: updated.title },
                    replace: true
                });
            }
        } catch (error: any) {
            toast.error(error.message || '重命名失败');
        } finally {
            setRenameDialogOpen(false);
            setSelectedConv(null);
        }
    };

    const handleOpenDeleteDialog = () => {
        handleConvMenuClose();
        setDeleteDialogOpen(true);
    };

    const handleCloseDeleteDialog = () => {
        setDeleteDialogOpen(false);
        setSelectedConv(null);
    };

    const handleConfirmDelete = async () => {
        if (!selectedConv) return;
        try {
            await deleteConversation(selectedConv.conversationId);
            setConversations(prev => prev.filter(c => c.conversationId !== selectedConv.conversationId));
            toast.success('删除成功');
            // If currently viewing this conversation, navigate back
            if (location.pathname.includes(selectedConv.conversationId)) {
                navigate('/');
            }
        } catch (error: any) {
            toast.error(error.message || '删除失败');
        } finally {
            handleCloseDeleteDialog();
        }
    };

    const formatDate = (dateString?: string) => {
        if (!dateString) return '未知';
        try {
            return new Date(dateString).toLocaleDateString('zh-CN', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
            });
        } catch {
            return dateString;
        }
    };

    if (!isAuthenticated) {
        navigate('/login');
        return null;
    }

    const open = Boolean(anchorEl);
    const currentDrawerWidth = drawerOpen ? DRAWER_WIDTH : DRAWER_COLLAPSED_WIDTH;

    return (
        <Box sx={{ display: 'flex', height: '100%', bgcolor: '#f5f7fa' }}>
            {/* Sidebar */}
            <Drawer
                variant="permanent"
                sx={{
                    width: currentDrawerWidth,
                    flexShrink: 0,
                    transition: 'width 0.2s ease',
                    '& .MuiDrawer-paper': {
                        width: currentDrawerWidth,
                        boxSizing: 'border-box',
                        bgcolor: 'white',
                        borderRight: '1px solid rgba(0,0,0,0.08)',
                        transition: 'width 0.2s ease',
                        overflowX: 'hidden',
                        display: 'flex',
                        flexDirection: 'column',
                        top: 32, // Offset for title bar
                        height: 'calc(100% - 32px)', // Remaining height after title bar
                    },
                }}
            >
                {/* Toggle Button - Fixed left position */}
                <Box
                    sx={{
                        py: 1,
                        px: `${SIDE_PADDING}px`,
                        display: 'flex',
                        alignItems: 'center',
                    }}
                >
                    <IconButton
                        onClick={() => setDrawerOpen(!drawerOpen)}
                        sx={{
                            width: ICON_CONTAINER_SIZE,
                            height: ICON_CONTAINER_SIZE,
                            borderRadius: 1.5,
                            '&:hover': { bgcolor: 'grey.100' },
                        }}
                    >
                        {drawerOpen ? <MenuOpen sx={{ fontSize: 22 }} /> : <MenuIcon sx={{ fontSize: 22 }} />}
                    </IconButton>
                </Box>

                {/* Navigation - Icons fixed, text animates */}
                <List sx={{ px: `${SIDE_PADDING}px`, py: 1, my: -1 }}>
                    {/* New Chat Button */}
                    <ListItem disablePadding>
                        <ListItemButton
                            onClick={() => navigate('/')}
                            sx={{
                                borderRadius: 1.5,
                                py: 0,
                                px: 0,
                                minHeight: ICON_CONTAINER_SIZE,
                            }}
                        >
                            <ListItemIcon
                                sx={{
                                    minWidth: ICON_CONTAINER_SIZE,
                                    width: ICON_CONTAINER_SIZE,
                                    height: ICON_CONTAINER_SIZE,
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                }}
                            >
                                <AddComment sx={{ fontSize: 22 }} />
                            </ListItemIcon>
                            <Typography
                                variant="body2"
                                noWrap
                                sx={{
                                    opacity: drawerOpen ? 1 : 0,
                                    width: drawerOpen ? 'auto' : 0,
                                    transition: 'opacity 0.2s ease, width 0.2s ease',
                                    overflow: 'hidden',
                                }}
                            >
                                新聊天
                            </Typography>
                        </ListItemButton>
                    </ListItem>
                    <ListItem disablePadding>
                        <ListItemButton
                            onClick={() => navigate('/explore')}
                            sx={{
                                borderRadius: 1.5,
                                py: 0,
                                px: 0,
                                minHeight: ICON_CONTAINER_SIZE,
                            }}
                        >
                            <ListItemIcon
                                sx={{
                                    minWidth: ICON_CONTAINER_SIZE,
                                    width: ICON_CONTAINER_SIZE,
                                    height: ICON_CONTAINER_SIZE,
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                }}
                            >
                                <Explore sx={{ fontSize: 22 }} />
                            </ListItemIcon>
                            <Typography
                                variant="body2"
                                noWrap
                                sx={{
                                    opacity: drawerOpen ? 1 : 0,
                                    width: drawerOpen ? 'auto' : 0,
                                    transition: 'opacity 0.2s ease, width 0.2s ease',
                                    overflow: 'hidden',
                                }}
                            >
                                探索
                            </Typography>
                        </ListItemButton>
                    </ListItem>
                    <ListItem disablePadding>
                        <ListItemButton
                            onClick={() => navigate('/my-trips')}
                            sx={{
                                borderRadius: 1.5,
                                py: 0,
                                px: 0,
                                minHeight: ICON_CONTAINER_SIZE,
                            }}
                        >
                            <ListItemIcon
                                sx={{
                                    minWidth: ICON_CONTAINER_SIZE,
                                    width: ICON_CONTAINER_SIZE,
                                    height: ICON_CONTAINER_SIZE,
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                }}
                            >
                                <CardTravel sx={{ fontSize: 22 }} />
                            </ListItemIcon>
                            <Typography
                                variant="body2"
                                noWrap
                                sx={{
                                    opacity: drawerOpen ? 1 : 0,
                                    width: drawerOpen ? 'auto' : 0,
                                    transition: 'opacity 0.2s ease, width 0.2s ease',
                                    overflow: 'hidden',
                                }}
                            >
                                我的旅程
                            </Typography>
                        </ListItemButton>
                    </ListItem>
                    <ListItem disablePadding>
                        <ListItemButton
                            onClick={() => navigate('/personal-activities')}
                            sx={{
                                borderRadius: 1.5,
                                py: 0,
                                px: 0,
                                minHeight: ICON_CONTAINER_SIZE,
                            }}
                        >
                            <ListItemIcon
                                sx={{
                                    minWidth: ICON_CONTAINER_SIZE,
                                    width: ICON_CONTAINER_SIZE,
                                    height: ICON_CONTAINER_SIZE,
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                }}
                            >
                                <Assignment sx={{ fontSize: 22 }} />
                            </ListItemIcon>
                            <Typography
                                variant="body2"
                                noWrap
                                sx={{
                                    opacity: drawerOpen ? 1 : 0,
                                    width: drawerOpen ? 'auto' : 0,
                                    transition: 'opacity 0.2s ease, width 0.2s ease',
                                    overflow: 'hidden',
                                }}
                            >
                                个人活动
                            </Typography>
                        </ListItemButton>
                    </ListItem>
                </List>

                {/* Divider with AI推荐会话 label */}
                <Box sx={{
                    display: 'flex',
                    alignItems: 'center',
                    mx: `${SIDE_PADDING}px`,
                    mt: 1,
                    opacity: drawerOpen ? 1 : 0,
                    transition: 'opacity 0.15s ease',
                }}>
                    <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{
                            ml: 1,
                            whiteSpace: 'nowrap',
                            fontSize: '0.85rem',
                            fontWeight: 500,
                        }}
                    >
                        AI推荐会话
                    </Typography>
                    <Divider sx={{ flexGrow: 1, ml: 1 }} />
                </Box>

                {/* AI Conversation History - takes remaining space */}
                <Box sx={{
                    px: `${SIDE_PADDING}px`,
                    flexGrow: 1,
                    overflowY: 'auto',
                    scrollbarWidth: 'none',
                    '&::-webkit-scrollbar': { display: 'none' },
                }}>
                    <List dense>
                        {(conversations || []).map((conv) => (
                            <ListItem
                                key={conv.conversationId}
                                disablePadding
                                secondaryAction={
                                    drawerOpen && (
                                        <IconButton
                                            size="small"
                                            onClick={(e) => handleConvMenuOpen(e, conv)}
                                            sx={{
                                                opacity: 0,
                                                transition: 'opacity 0.2s ease',
                                                '.MuiListItem-root:hover &': {
                                                    opacity: 1,
                                                },
                                            }}
                                        >
                                            <MoreVert sx={{ fontSize: 18 }} />
                                        </IconButton>
                                    )
                                }
                                sx={{
                                    '&:hover .MuiIconButton-root': {
                                        opacity: 1,
                                    },
                                }}
                            >
                                <ListItemButton
                                    onClick={() => navigate(`/ai/conversation/${conv.conversationId}`)}
                                    sx={{
                                        borderRadius: 2,
                                        py: 0.3,
                                        pr: drawerOpen ? 4 : 0,
                                        bgcolor: (drawerOpen && location.pathname.includes(conv.conversationId)) ? '#e3f2fd' : 'transparent',
                                        '&:hover': {
                                            bgcolor: (drawerOpen && location.pathname.includes(conv.conversationId)) ? '#e3f2fd' : 'action.hover',
                                        },
                                    }}
                                >
                                    <Typography
                                        variant="body2"
                                        noWrap
                                        sx={{
                                            fontSize: '0.85rem',
                                            my: 0.5,
                                            opacity: drawerOpen ? 1 : 0,
                                            width: drawerOpen ? 'auto' : 0,
                                            transition: 'opacity 0.2s ease, width 0.2s ease',
                                            overflow: 'hidden',
                                            fontWeight: (drawerOpen && location.pathname.includes(conv.conversationId)) ? 600 : 400,
                                        }}
                                    >
                                        {conv.title}
                                    </Typography>
                                </ListItemButton>
                            </ListItem>
                        ))}
                        {(!conversations || conversations.length === 0) && (
                            <Typography
                                variant="caption"
                                color="text.secondary"
                                sx={{
                                    px: 1,
                                    display: 'block',
                                    opacity: drawerOpen ? 1 : 0,
                                    width: drawerOpen ? 'auto' : 0,
                                    transition: 'opacity 0.15s ease, width 0.15s ease',
                                    overflow: 'hidden',
                                    whiteSpace: 'nowrap',
                                }}
                            >
                                暂无历史会话
                            </Typography>
                        )}
                    </List>
                </Box>

                {/* User Avatar at bottom - Icon fixed, text animates */}
                <Box sx={{ px: `${SIDE_PADDING}px`, py: 1, mt: 'auto' }}>
                    <Box
                        onClick={handleAvatarClick}
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            py: 0.5,
                            borderRadius: 1.5,
                            cursor: 'pointer',
                            '&:hover': {
                                bgcolor: 'grey.100',
                            },
                        }}
                    >
                        <Box
                            sx={{
                                width: ICON_CONTAINER_SIZE,
                                height: ICON_CONTAINER_SIZE,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                            }}
                        >
                            <Avatar
                                sx={{
                                    width: 32,
                                    height: 32,
                                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                    fontSize: '0.85rem',
                                }}
                            >
                                {user?.username?.charAt(0).toUpperCase() || 'U'}
                            </Avatar>
                        </Box>
                        <Typography
                            variant="body2"
                            fontWeight="500"
                            noWrap
                            sx={{
                                opacity: drawerOpen ? 1 : 0,
                                width: drawerOpen ? 'auto' : '0px',
                                transition: 'opacity 0.2s ease, width 0.2s ease',
                                overflow: 'hidden',
                                whiteSpace: 'nowrap',
                            }}
                        >
                            {user?.username || '用户'}
                        </Typography>
                    </Box>
                </Box>
            </Drawer>

            {/* Avatar Popover - positioned above */}
            <Popover
                open={open}
                anchorEl={anchorEl}
                onClose={handlePopoverClose}
                anchorOrigin={{
                    vertical: 'top',
                    horizontal: 'center',
                }}
                transformOrigin={{
                    vertical: 'bottom',
                    horizontal: 'center',
                }}
                sx={{
                    '& .MuiPopover-paper': {
                        borderRadius: 2,
                        width: 280,
                        boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
                        mb: 1,
                    },
                }}
            >
                <Box sx={{ p: 2 }}>
                    {/* Header with Avatar */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                        <Avatar
                            sx={{
                                width: 48,
                                height: 48,
                                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            }}
                        >
                            {user?.username?.charAt(0).toUpperCase() || 'U'}
                        </Avatar>
                        <Box>
                            <Typography variant="subtitle1" fontWeight="bold">
                                {user?.username || '用户'}
                            </Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', color: 'text.secondary' }}>
                                <CalendarToday sx={{ fontSize: 14, mr: 0.5 }} />
                                <Typography variant="caption">
                                    注册于 {formatDate(user?.createdAt)}
                                </Typography>
                            </Box>
                        </Box>
                    </Box>

                    <Divider sx={{ my: 1.5 }} />

                    {/* Preferences Section */}
                    <Box sx={{ mb: 2 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                            <Typography variant="body2" fontWeight="bold" color="text.secondary">
                                旅行偏好
                            </Typography>
                            {!editingPreferences && (
                                <IconButton size="small" onClick={() => setEditingPreferences(true)}>
                                    <Edit fontSize="small" />
                                </IconButton>
                            )}
                        </Box>
                        {editingPreferences ? (
                            <Box>
                                <TextField
                                    fullWidth
                                    multiline
                                    rows={3}
                                    size="small"
                                    value={preferencesText}
                                    onChange={(e) => setPreferencesText(e.target.value)}
                                    placeholder="描述您的旅行偏好..."
                                    sx={{ mb: 1 }}
                                />
                                <Box sx={{ display: 'flex', gap: 1 }}>
                                    <Button
                                        size="small"
                                        variant="contained"
                                        startIcon={saving ? <CircularProgress size={16} /> : <Save />}
                                        onClick={handleSavePreferences}
                                        disabled={saving}
                                        sx={{
                                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                        }}
                                    >
                                        保存
                                    </Button>
                                    <Button
                                        size="small"
                                        variant="outlined"
                                        onClick={() => {
                                            setEditingPreferences(false);
                                            setPreferencesText(user?.preferencesText || '');
                                        }}
                                        disabled={saving}
                                    >
                                        取消
                                    </Button>
                                </Box>
                            </Box>
                        ) : (
                            <Typography
                                variant="body2"
                                color="text.secondary"
                                sx={{
                                    p: 1,
                                    bgcolor: 'grey.100',
                                    borderRadius: 1,
                                    minHeight: 40,
                                }}
                            >
                                {user?.preferencesText || '暂无偏好描述，点击编辑添加'}
                            </Typography>
                        )}
                    </Box>

                    <Divider sx={{ my: 1.5 }} />

                    {/* Logout Button */}
                    <Button
                        fullWidth
                        variant="outlined"
                        color="error"
                        startIcon={<Logout />}
                        onClick={handleLogout}
                        size="small"
                    >
                        退出登录
                    </Button>
                </Box>
            </Popover>

            {/* Main Content */}
            <Box
                component="main"
                sx={{
                    flexGrow: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    transition: 'margin-left 0.2s ease'
                }}
            >
                {/* Content Area - conditionally render welcome or Outlet */}
                {isSubRoute ? (
                    <Outlet />
                ) : (
                    <>
                        {/* Header with Title */}
                        <Box sx={{ p: 3 }}>
                            <Typography
                                variant="h5"
                                fontWeight="bold"
                                sx={{
                                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                    backgroundClip: 'text',
                                    WebkitBackgroundClip: 'text',
                                    WebkitTextFillColor: 'transparent',
                                }}
                            >
                                AI Traveler
                            </Typography>
                        </Box>

                        {/* Welcome Section */}
                        <Box
                            sx={{
                                flexGrow: 1,
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                textAlign: 'center',
                                px: 4,
                                mt: -12
                            }}
                        >
                            <Typography variant="h3" fontSize={36} fontWeight="bold" color="text.primary" gutterBottom >
                                欢迎回来{user?.username ? `，${user.username}` : ''}！
                            </Typography>

                            {/* AI Input Box */}
                            <Box sx={{ mt: 1, width: '100%', maxWidth: 650 }}>
                                <Box sx={{ position: 'relative' }}>
                                    <TextField
                                        fullWidth
                                        variant="outlined"
                                        placeholder="向AI助手提问，开始您的旅程规划..."
                                        value={aiInput}
                                        onChange={(e) => setAiInput(e.target.value)}
                                        onKeyUp={(e) => {
                                            if (e.key === 'Enter' && !e.shiftKey && !aiLoading) {
                                                e.preventDefault();
                                                handleStartAiConversation();
                                            }
                                        }}
                                        disabled={aiLoading}
                                        multiline
                                        minRows={3.5}
                                        maxRows={6}
                                        sx={{
                                            '& .MuiOutlinedInput-root': {
                                                borderRadius: 4,
                                                bgcolor: 'white',
                                                pl: 3,
                                                pr: 7,
                                                '&:hover': {
                                                    boxShadow: '0 2px 8px rgba(102,126,234,0.2)',
                                                },
                                            },
                                        }}
                                    />
                                    <IconButton
                                        onClick={handleStartAiConversation}
                                        disabled={!aiInput.trim() || aiLoading}
                                        sx={{
                                            position: 'absolute',
                                            right: 12,
                                            bottom: 12,
                                            width: 40,
                                            height: 40,
                                            bgcolor: '#f0f0f0',
                                            '&:hover': {
                                                bgcolor: '#e0e0e0',
                                            },
                                            '&:disabled': {
                                                bgcolor: '#f5f5f5',
                                            },
                                        }}
                                    >
                                        {aiLoading ? <CircularProgress size={20} /> : <Send sx={{ fontSize: 20 }} />}
                                    </IconButton>
                                </Box>
                            </Box>
                        </Box>
                    </>
                )}
            </Box>

            {/* Conversation Edit Menu */}
            <Menu
                anchorEl={convMenuAnchor}
                open={Boolean(convMenuAnchor)}
                onClose={handleConvMenuClose}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                transformOrigin={{ vertical: 'top', horizontal: 'right' }}
            >
                <MenuItem onClick={handleRenameClick}>
                    <Edit sx={{ fontSize: 18, mr: 1 }} />
                    重命名
                </MenuItem>
                <MenuItem onClick={handleOpenDeleteDialog} sx={{ color: 'error.main' }}>
                    <Delete sx={{ fontSize: 18, mr: 1 }} />
                    删除
                </MenuItem>
            </Menu>

            {/* Rename Dialog */}
            <Dialog open={renameDialogOpen} onClose={() => setRenameDialogOpen(false)}>
                <DialogTitle>重命名会话</DialogTitle>
                <DialogContent>
                    <TextField
                        autoFocus
                        fullWidth
                        value={newTitle}
                        onChange={(e) => setNewTitle(e.target.value)}
                        placeholder="输入新标题"
                        sx={{ mt: 1, minWidth: 300 }}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setRenameDialogOpen(false)}>取消</Button>
                    <Button onClick={handleRenameConfirm} variant="contained" disabled={!newTitle.trim()}>
                        确定
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog open={deleteDialogOpen} onClose={handleCloseDeleteDialog}>
                <DialogTitle>确认删除</DialogTitle>
                <DialogContent>
                    <Typography>确定要删除会话 "{selectedConv?.title}" 吗？此操作不可撤销。</Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseDeleteDialog}>取消</Button>
                    <Button onClick={handleConfirmDelete} color="error" variant="contained">删除</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default HomePage;

