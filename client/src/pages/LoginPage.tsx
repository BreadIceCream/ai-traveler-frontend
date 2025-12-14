import React, { useState } from 'react';
import {
    Box,
    Card,
    CardContent,
    TextField,
    Button,
    Typography,
    Link,
    Alert,
    CircularProgress,
    InputAdornment,
    IconButton,
} from '@mui/material';
import { Visibility, VisibilityOff, Login as LoginIcon } from '@mui/icons-material';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { login, getCurrentUser } from '@/api/user';
import { useAuthStore } from '@/store/authStore';

const LoginPage: React.FC = () => {
    const navigate = useNavigate();
    const { setToken, setUser } = useAuthStore();

    const [formData, setFormData] = useState({
        username: '',
        password: '',
    });
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
        setError(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const token = await login(formData);
            setToken(token);

            try {
                const user = await getCurrentUser();
                setUser(user);
            } catch {
                // User info fetch is optional
            }

            navigate('/');
        } catch (err: unknown) {
            const error = err as Error;
            setError(error.message || '登录失败，请稍后重试');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box
            sx={{
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                padding: 2,
            }}
        >
            <Card
                sx={{
                    maxWidth: 420,
                    width: '100%',
                    borderRadius: 3,
                    boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
                }}
            >
                <CardContent sx={{ p: 4 }}>
                    {/* Header */}
                    <Box sx={{ textAlign: 'center', mb: 4 }}>
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
                            🌍 AI Traveler
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                            登录您的账户，开始智能旅程规划
                        </Typography>
                    </Box>

                    {/* Error Alert */}
                    {error && (
                        <Alert severity="error" sx={{ mb: 3 }}>
                            {error}
                        </Alert>
                    )}

                    {/* Login Form */}
                    <Box component="form" onSubmit={handleSubmit}>
                        <TextField
                            fullWidth
                            label="用户名"
                            name="username"
                            value={formData.username}
                            onChange={handleChange}
                            margin="normal"
                            required
                            autoFocus
                            autoComplete="username"
                        />

                        <TextField
                            fullWidth
                            label="密码"
                            name="password"
                            type={showPassword ? 'text' : 'password'}
                            value={formData.password}
                            onChange={handleChange}
                            margin="normal"
                            required
                            autoComplete="current-password"
                            InputProps={{
                                endAdornment: (
                                    <InputAdornment position="end">
                                        <IconButton
                                            onClick={() => setShowPassword(!showPassword)}
                                            edge="end"
                                        >
                                            {showPassword ? <VisibilityOff /> : <Visibility />}
                                        </IconButton>
                                    </InputAdornment>
                                ),
                            }}
                        />

                        <Button
                            type="submit"
                            fullWidth
                            variant="contained"
                            size="large"
                            disabled={loading}
                            startIcon={loading ? <CircularProgress size={20} /> : <LoginIcon />}
                            sx={{
                                mt: 3,
                                mb: 2,
                                py: 1.5,
                                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                '&:hover': {
                                    background: 'linear-gradient(135deg, #5a6fd6 0%, #6a4190 100%)',
                                },
                            }}
                        >
                            {loading ? '登录中...' : '登录'}
                        </Button>
                    </Box>

                    {/* Register Link */}
                    <Box sx={{ textAlign: 'center', mt: 2 }}>
                        <Typography variant="body2" color="text.secondary">
                            还没有账户？{' '}
                            <Link component={RouterLink} to="/register" underline="hover">
                                立即注册
                            </Link>
                        </Typography>
                    </Box>
                </CardContent>
            </Card>
        </Box>
    );
};

export default LoginPage;
