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
import { Visibility, VisibilityOff, PersonAdd } from '@mui/icons-material';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { register } from '@/api/user';

const RegisterPage: React.FC = () => {
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        username: '',
        password: '',
        confirmPassword: '',
        preferencesText: '',
    });
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
        setError(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        if (formData.password !== formData.confirmPassword) {
            setError('两次输入的密码不一致');
            setLoading(false);
            return;
        }

        if (formData.password.length < 6) {
            setError('密码长度至少为6位');
            setLoading(false);
            return;
        }

        try {
            await register({
                username: formData.username,
                password: formData.password,
                preferencesText: formData.preferencesText || undefined,
            });

            setSuccess(true);
            setTimeout(() => {
                navigate('/login');
            }, 2000);
        } catch (err: unknown) {
            const error = err as Error;
            setError(error.message || '注册失败，请稍后重试');
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
                background: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
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
                                background: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
                                backgroundClip: 'text',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                            }}
                        >
                            🌍 AI Traveler
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                            创建您的账户，开启智能旅程
                        </Typography>
                    </Box>

                    {/* Success Alert */}
                    {success && (
                        <Alert severity="success" sx={{ mb: 3 }}>
                            注册成功！正在跳转到登录页面...
                        </Alert>
                    )}

                    {/* Error Alert */}
                    {error && (
                        <Alert severity="error" sx={{ mb: 3 }}>
                            {error}
                        </Alert>
                    )}

                    {/* Register Form */}
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
                            helperText="请输入唯一的用户名"
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
                            autoComplete="new-password"
                            helperText="密码长度至少为6位"
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

                        <TextField
                            fullWidth
                            label="确认密码"
                            name="confirmPassword"
                            type={showPassword ? 'text' : 'password'}
                            value={formData.confirmPassword}
                            onChange={handleChange}
                            margin="normal"
                            required
                            autoComplete="new-password"
                        />

                        <TextField
                            fullWidth
                            label="旅行偏好（可选）"
                            name="preferencesText"
                            value={formData.preferencesText}
                            onChange={handleChange}
                            margin="normal"
                            multiline
                            rows={2}
                            placeholder="例如：喜欢历史文化、美食探店、自然风光..."
                            helperText="告诉我们您的旅行偏好，AI将为您提供个性化推荐"
                        />

                        <Button
                            type="submit"
                            fullWidth
                            variant="contained"
                            size="large"
                            disabled={loading || success}
                            startIcon={loading ? <CircularProgress size={20} /> : <PersonAdd />}
                            sx={{
                                mt: 3,
                                mb: 2,
                                py: 1.5,
                                background: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
                                '&:hover': {
                                    background: 'linear-gradient(135deg, #0e8a7e 0%, #2edc6f 100%)',
                                },
                            }}
                        >
                            {loading ? '注册中...' : '注册'}
                        </Button>
                    </Box>

                    {/* Login Link */}
                    <Box sx={{ textAlign: 'center', mt: 2 }}>
                        <Typography variant="body2" color="text.secondary">
                            已有账户？{' '}
                            <Link component={RouterLink} to="/login" underline="hover">
                                立即登录
                            </Link>
                        </Typography>
                    </Box>
                </CardContent>
            </Card>
        </Box>
    );
};

export default RegisterPage;
