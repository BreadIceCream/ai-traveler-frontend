import React, { useState, useEffect } from 'react';
import {
    Box,
    Card,
    CardContent,
    TextField,
    Button,
    Typography,
    Alert,
    CircularProgress,
    Container,
    Avatar,
    Divider,
    Snackbar,
    IconButton,
} from '@mui/material';
import {
    ArrowBack,
    Person,
    Save,
    CalendarToday,
    Edit,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { getCurrentUser, updatePreferences } from '@/api/user';
import { useAuthStore } from '@/store/authStore';
import { User } from '@/types/api';

const UserProfilePage: React.FC = () => {
    const navigate = useNavigate();
    const { isAuthenticated, user: storedUser, setUser } = useAuthStore();

    const [user, setUserData] = useState<User | null>(storedUser);
    const [loading, setLoading] = useState(!storedUser);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [editMode, setEditMode] = useState(false);
    const [preferencesText, setPreferencesText] = useState(storedUser?.preferencesText || '');
    const [snackbarOpen, setSnackbarOpen] = useState(false);
    const [snackbarMessage, setSnackbarMessage] = useState('');

    useEffect(() => {
        if (!isAuthenticated) {
            navigate('/login');
            return;
        }

        // Fetch latest user data if not available
        if (!storedUser) {
            fetchUserData();
        }
    }, [isAuthenticated, navigate, storedUser]);

    const fetchUserData = async () => {
        try {
            setLoading(true);
            const userData = await getCurrentUser();
            setUserData(userData);
            setPreferencesText(userData.preferencesText || '');
            setUser(userData);
        } catch (err: unknown) {
            const error = err as Error;
            setError(error.message || '获取用户信息失败');
        } finally {
            setLoading(false);
        }
    };

    const handleSavePreferences = async () => {
        try {
            setSaving(true);
            setError(null);
            const updatedUser = await updatePreferences(preferencesText);
            setUserData(updatedUser);
            setUser(updatedUser); // Update store
            setEditMode(false);
            setSnackbarMessage('偏好设置已保存');
            setSnackbarOpen(true);
        } catch (err: unknown) {
            const error = err as Error;
            setError(error.message || '保存偏好设置失败');
        } finally {
            setSaving(false);
        }
    };

    const handleCancelEdit = () => {
        setPreferencesText(user?.preferencesText || '');
        setEditMode(false);
        setError(null);
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
        return null;
    }

    if (loading) {
        return (
            <Box
                sx={{
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: '#f5f7fa',
                }}
            >
                <CircularProgress sx={{ color: '#667eea' }} />
            </Box>
        );
    }

    return (
        <Box
            sx={{
                height: '100%',
                bgcolor: '#f5f7fa',
            }}
        >
            <Container maxWidth="md" sx={{ py: 4 }}>
                {/* Header */}
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 4 }}>
                    <IconButton
                        onClick={() => navigate('/')}
                        sx={{ mr: 2 }}
                    >
                        <ArrowBack />
                    </IconButton>
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
                        个人资料
                    </Typography>
                </Box>

                {/* Error Alert */}
                {error && (
                    <Alert severity="error" sx={{ mb: 3 }}>
                        {error}
                    </Alert>
                )}

                {/* Profile Card */}
                <Card
                    sx={{
                        borderRadius: 3,
                        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
                        background: 'rgba(255,255,255,0.95)',
                    }}
                >
                    <CardContent sx={{ p: 4 }}>
                        {/* User Avatar & Name */}
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 4 }}>
                            <Avatar
                                sx={{
                                    width: 80,
                                    height: 80,
                                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                    fontSize: '2rem',
                                }}
                            >
                                {user?.username?.charAt(0).toUpperCase() || <Person />}
                            </Avatar>
                            <Box sx={{ ml: 3 }}>
                                <Typography variant="h5" fontWeight="bold" color="text.primary">
                                    {user?.username || '用户'}
                                </Typography>
                                <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                                    <CalendarToday sx={{ fontSize: 16, color: 'text.secondary', mr: 0.5 }} />
                                    <Typography variant="body2" color="text.secondary">
                                        注册于 {formatDate(user?.createdAt)}
                                    </Typography>
                                </Box>
                            </Box>
                        </Box>

                        <Divider sx={{ my: 3 }} />

                        {/* Preferences Section */}
                        <Box>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                                <Typography variant="h6" fontWeight="bold" color="text.primary">
                                    旅行偏好
                                </Typography>
                                {!editMode && (
                                    <Button
                                        startIcon={<Edit />}
                                        onClick={() => setEditMode(true)}
                                        size="small"
                                    >
                                        编辑
                                    </Button>
                                )}
                            </Box>

                            {editMode ? (
                                <Box>
                                    <TextField
                                        fullWidth
                                        multiline
                                        rows={4}
                                        value={preferencesText}
                                        onChange={(e) => setPreferencesText(e.target.value)}
                                        placeholder="描述您的旅行偏好，例如：喜欢历史文化和美食..."
                                        variant="outlined"
                                        sx={{ mb: 2 }}
                                    />
                                    <Box sx={{ display: 'flex', gap: 2 }}>
                                        <Button
                                            variant="contained"
                                            startIcon={saving ? <CircularProgress size={20} /> : <Save />}
                                            onClick={handleSavePreferences}
                                            disabled={saving}
                                            sx={{
                                                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                                '&:hover': {
                                                    background: 'linear-gradient(135deg, #5a6fd6 0%, #6a4190 100%)',
                                                },
                                            }}
                                        >
                                            {saving ? '保存中...' : '保存'}
                                        </Button>
                                        <Button
                                            variant="outlined"
                                            onClick={handleCancelEdit}
                                            disabled={saving}
                                        >
                                            取消
                                        </Button>
                                    </Box>
                                </Box>
                            ) : (
                                <Box
                                    sx={{
                                        p: 2,
                                        borderRadius: 2,
                                        bgcolor: 'grey.100',
                                        minHeight: 80,
                                    }}
                                >
                                    <Typography color="text.secondary">
                                        {user?.preferencesText || '暂未设置旅行偏好，点击编辑添加您的偏好描述'}
                                    </Typography>
                                </Box>
                            )}
                        </Box>
                    </CardContent>
                </Card>

                {/* Back Button */}
                <Box sx={{ textAlign: 'center', mt: 4 }}>
                    <Button
                        variant="outlined"
                        startIcon={<ArrowBack />}
                        onClick={() => navigate('/')}
                    >
                        返回首页
                    </Button>
                </Box>
            </Container>

            {/* Success Snackbar */}
            <Snackbar
                open={snackbarOpen}
                autoHideDuration={3000}
                onClose={() => setSnackbarOpen(false)}
                message={snackbarMessage}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            />
        </Box>
    );
};

export default UserProfilePage;
