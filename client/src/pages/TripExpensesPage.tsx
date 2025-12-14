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
    Tooltip,
    Divider,
    Popover,
} from '@mui/material';
import {
    ArrowBack,
    Add,
    Edit,
    Delete,
    DirectionsCar,
    Hotel,
    Restaurant,
    Park,
    ShoppingCart,
    Category,
    TrendingUp,
    AttachMoney,
} from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { getTripExpenses, getTripExpenseStatistics, getTripExpenseByCategory, addExpense, batchAddExpenses, updateExpense, deleteExpense } from '@/api/tripExpense';
import { TripExpense, TripExpenseCreateUpdateDto, ExpenseType, DoubleSummaryStatistics, CategoryExpenseStats } from '@/types/api';
import { toast } from '@/utils/toast';
import { PieChart } from '@mui/x-charts/PieChart';
import { useItemTooltip, ChartsTooltipContainer } from '@mui/x-charts/ChartsTooltip';

// Expense category config
const EXPENSE_CATEGORIES: { type: ExpenseType; label: string; icon: React.ReactElement; color: string }[] = [
    { type: 'TRANSPORTATION', label: '交通', icon: <DirectionsCar />, color: '#42a5f5' },
    { type: 'ACCOMMODATION', label: '住宿', icon: <Hotel />, color: '#ab47bc' },
    { type: 'DINING', label: '餐饮', icon: <Restaurant />, color: '#ff7043' },
    { type: 'SIGHTSEEING', label: '游玩', icon: <Park />, color: '#66bb6a' },
    { type: 'SHOPPING', label: '购物', icon: <ShoppingCart />, color: '#ec407a' },
    { type: 'OTHER', label: '其他', icon: <Category />, color: '#78909c' },
];

const getCategoryConfig = (type: ExpenseType) => EXPENSE_CATEGORIES.find(c => c.type === type) || EXPENSE_CATEGORIES[5];

// Custom tooltip for PieChart showing detailed category stats
const CustomPieTooltipContent = ({ categoryStats }: { categoryStats: CategoryExpenseStats | null }) => {
    const tooltipData = useItemTooltip();
    if (!tooltipData) return null;

    // Find the category by matching the label
    const label = tooltipData.label as string;
    const cat = EXPENSE_CATEGORIES.find(c => c.label === label);
    if (!cat) return null;

    const stats = categoryStats?.[cat.type];
    if (!stats) return null;

    return (
        <ChartsTooltipContainer trigger="item">
            <Box sx={{ p: 1.5, bgcolor: 'white', borderRadius: 1, boxShadow: 3, minWidth: 160 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: cat.color, mr: 1 }} />
                    <Typography variant="subtitle2" fontWeight="bold">{cat.label}</Typography>
                </Box>
                <Divider sx={{ mb: 1 }} />
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="caption" color="text.secondary">笔数</Typography>
                        <Typography variant="caption" fontWeight="bold">{stats.count}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="caption" color="text.secondary">总计</Typography>
                        <Typography variant="caption" fontWeight="bold">¥{stats.sum.toFixed(2)}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="caption" color="text.secondary">最低</Typography>
                        <Typography variant="caption" fontWeight="bold">¥{stats.min.toFixed(2)}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="caption" color="text.secondary">平均</Typography>
                        <Typography variant="caption" fontWeight="bold">¥{stats.average.toFixed(2)}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="caption" color="text.secondary">最高</Typography>
                        <Typography variant="caption" fontWeight="bold">¥{stats.max.toFixed(2)}</Typography>
                    </Box>
                </Box>
            </Box>
        </ChartsTooltipContainer>
    );
};

// Get local timezone offset as string (e.g., "+08:00")
const getTimezoneOffset = (): string => {
    const offset = new Date().getTimezoneOffset();
    const sign = offset <= 0 ? '+' : '-';
    const hours = String(Math.floor(Math.abs(offset) / 60)).padStart(2, '0');
    const minutes = String(Math.abs(offset) % 60).padStart(2, '0');
    return `${sign}${hours}:${minutes}`;
};

// Format datetime-local value to OffsetDateTime
const formatToOffsetDateTime = (localDateTime: string): string => {
    if (!localDateTime) return '';
    return `${localDateTime}:00${getTimezoneOffset()}`;
};

// Parse OffsetDateTime to local datetime-local value
const parseFromOffsetDateTime = (offsetDateTime: string): string => {
    if (!offsetDateTime) return '';
    try {
        const date = new Date(offsetDateTime);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${year}-${month}-${day}T${hours}:${minutes}`;
    } catch {
        return offsetDateTime.slice(0, 16);
    }
};

// Get current local datetime in the format for datetime-local input
const getCurrentLocalDateTime = (): string => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
};

const TripExpensesPage: React.FC = () => {
    const navigate = useNavigate();
    const { tripId } = useParams<{ tripId: string }>();
    const { isAuthenticated } = useAuthStore();

    // Data state
    const [expenses, setExpenses] = useState<TripExpense[]>([]);
    const [totalStats, setTotalStats] = useState<DoubleSummaryStatistics | null>(null);
    const [categoryStats, setCategoryStats] = useState<CategoryExpenseStats | null>(null);
    const [loading, setLoading] = useState(false);

    // Dialog state
    const [dialogOpen, setDialogOpen] = useState(false);
    const [dialogMode, setDialogMode] = useState<'add' | 'batch' | 'edit'>('add');
    const [editingExpense, setEditingExpense] = useState<TripExpense | null>(null);
    const [formData, setFormData] = useState<TripExpenseCreateUpdateDto>({
        amount: 0,
        category: 'OTHER',
        description: '',
        expenseTime: '',
    });
    const [batchItems, setBatchItems] = useState<TripExpenseCreateUpdateDto[]>([]);
    const [submitting, setSubmitting] = useState(false);

    // Category detail popover state
    const [popoverAnchor, setPopoverAnchor] = useState<HTMLElement | null>(null);
    const [selectedCategory, setSelectedCategory] = useState<ExpenseType | null>(null);

    // Category filter state
    const [filterCategory, setFilterCategory] = useState<ExpenseType | null>(null);

    // Delete confirmation dialog state
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [expenseToDelete, setExpenseToDelete] = useState<string | null>(null);

    useEffect(() => {
        if (!isAuthenticated) {
            navigate('/login');
            return;
        }
    }, [isAuthenticated, navigate]);

    // Fetch all data (initial load and after add/edit/delete)
    const fetchAllData = useCallback(async () => {
        if (!tripId) return;
        setLoading(true);
        try {
            const [expenseList, total, category] = await Promise.all([
                getTripExpenses(tripId, filterCategory),
                getTripExpenseStatistics(tripId),
                getTripExpenseByCategory(tripId),
            ]);
            setExpenses(expenseList);
            setTotalStats(total);
            setCategoryStats(category);
        } catch (err) {
            console.error('Failed to fetch expenses:', err);
        } finally {
            setLoading(false);
        }
    }, [tripId, filterCategory]);

    // Fetch only expenses list (for filter changes)
    const fetchExpensesList = useCallback(async () => {
        if (!tripId) return;
        try {
            const expenseList = await getTripExpenses(tripId, filterCategory);
            setExpenses(expenseList);
        } catch (err) {
            console.error('Failed to fetch expenses:', err);
        }
    }, [tripId, filterCategory]);

    // Initial data load
    useEffect(() => {
        fetchAllData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tripId]);

    // Re-fetch only expenses when filter changes
    useEffect(() => {
        if (filterCategory !== null || filterCategory === null) {
            fetchExpensesList();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filterCategory]);

    const openAddDialog = () => {
        setDialogMode('add');
        setEditingExpense(null);
        setFormData({
            amount: 0,
            category: 'OTHER',
            description: '',
            expenseTime: getCurrentLocalDateTime(),
        });
        setDialogOpen(true);
    };

    const openBatchDialog = () => {
        setDialogMode('batch');
        setBatchItems([{ amount: 0, category: 'OTHER', description: '', expenseTime: getCurrentLocalDateTime() }]);
        setDialogOpen(true);
    };

    const openEditDialog = (expense: TripExpense) => {
        setDialogMode('edit');
        setEditingExpense(expense);
        setFormData({
            amount: expense.amount,
            category: expense.category,
            description: expense.description || '',
            expenseTime: parseFromOffsetDateTime(expense.expenseTime || ''),
        });
        setDialogOpen(true);
    };

    const handleSubmit = async () => {
        if (!tripId) return;
        setSubmitting(true);
        try {
            if (dialogMode === 'add') {
                if (formData.amount <= 0) {
                    toast.warning('请输入有效金额');
                    setSubmitting(false);
                    return;
                }
                const dto = { ...formData, expenseTime: formData.expenseTime ? formatToOffsetDateTime(formData.expenseTime) : undefined };
                await addExpense(tripId, dto);
                toast.success('支出已添加');
            } else if (dialogMode === 'batch') {
                const validItems = batchItems.filter(item => item.amount > 0);
                if (validItems.length === 0) {
                    toast.warning('请至少添加一条有效支出');
                    setSubmitting(false);
                    return;
                }
                const dtos = validItems.map(item => ({ ...item, expenseTime: item.expenseTime ? formatToOffsetDateTime(item.expenseTime) : undefined }));
                await batchAddExpenses(tripId, dtos);
                toast.success(`已添加 ${validItems.length} 条支出`);
            } else if (dialogMode === 'edit' && editingExpense) {
                const dto = { ...formData, expenseTime: formData.expenseTime ? formatToOffsetDateTime(formData.expenseTime) : undefined };
                await updateExpense(editingExpense.expenseId, dto);
                toast.success('支出已更新');
            }
            setDialogOpen(false);
            fetchAllData();
        } catch (err) {
            console.error('Failed to submit:', err);
        } finally {
            setSubmitting(false);
        }
    };

    const handleOpenDeleteDialog = (expenseId: string) => {
        setExpenseToDelete(expenseId);
        setDeleteDialogOpen(true);
    };

    const handleCloseDeleteDialog = () => {
        setDeleteDialogOpen(false);
        setExpenseToDelete(null);
    };

    const handleConfirmDelete = async () => {
        if (!expenseToDelete) return;
        try {
            await deleteExpense(expenseToDelete);
            toast.success('支出已删除');
            fetchAllData();
        } catch (err) {
            console.error('Failed to delete:', err);
        } finally {
            handleCloseDeleteDialog();
        }
    };

    const addBatchItem = () => {
        setBatchItems([...batchItems, { amount: 0, category: 'OTHER', description: '', expenseTime: new Date().toISOString().slice(0, 16) }]);
    };

    const updateBatchItem = (index: number, field: keyof TripExpenseCreateUpdateDto, value: string | number) => {
        const updated = [...batchItems];
        const item = updated[index];
        if (field === 'amount') {
            item.amount = value as number;
        } else if (field === 'category') {
            item.category = value as ExpenseType;
        } else if (field === 'description') {
            item.description = value as string;
        } else if (field === 'expenseTime') {
            item.expenseTime = value as string;
        }
        setBatchItems(updated);
    };

    const removeBatchItem = (index: number) => {
        setBatchItems(batchItems.filter((_, i) => i !== index));
    };

    const formatDate = (dateStr?: string) => {
        if (!dateStr) return '-';
        try {
            return new Date(dateStr).toLocaleString('zh-CN');
        } catch {
            return dateStr;
        }
    };

    const handleCategoryClick = (event: React.MouseEvent<HTMLElement>, type: ExpenseType) => {
        setPopoverAnchor(event.currentTarget);
        setSelectedCategory(type);
    };

    const handlePopoverClose = () => {
        setPopoverAnchor(null);
        setSelectedCategory(null);
    };

    // Pre-calculate pie chart segments with cumulative percentages
    const pieSegments = React.useMemo(() => {
        const totalAmt = totalStats?.sum || 0;
        if (totalAmt === 0) return [];

        const segments: { type: ExpenseType; color: string; label: string; amount: number; startAngle: number; endAngle: number }[] = [];
        let cumulative = 0;

        EXPENSE_CATEGORIES.forEach(cat => {
            const stats = categoryStats?.[cat.type];
            const amount = stats?.sum || 0;
            if (amount > 0) {
                const percent = (amount / totalAmt) * 100;
                const startAngle = (cumulative / 100) * 360 - 90;
                cumulative += percent;
                const endAngle = (cumulative / 100) * 360 - 90;
                segments.push({
                    type: cat.type,
                    color: cat.color,
                    label: cat.label,
                    amount,
                    startAngle,
                    endAngle,
                });
            }
        });

        return segments;
    }, [totalStats, categoryStats]);

    const totalAmount = totalStats?.sum || 0;

    if (loading) {
        return (
            <Box sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#f5f5f5' }}>
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Box sx={{ height: '100%', bgcolor: '#f5f5f5', py: 4 }}>
            <Container maxWidth="lg">
                {/* Header */}
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <IconButton onClick={() => navigate(-1)} sx={{ mr: 2 }}>
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
                            支出记录
                        </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                        <Button variant="outlined" onClick={openBatchDialog} sx={{ borderColor: '#667eea', color: '#667eea' }}>
                            批量添加
                        </Button>
                        <Button
                            variant="contained"
                            startIcon={<Add />}
                            onClick={openAddDialog}
                            sx={{
                                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                '&:hover': { background: 'linear-gradient(135deg, #5a6fd6 0%, #6a4190 100%)' },
                            }}
                        >
                            添加支出
                        </Button>
                    </Box>
                </Box>

                {/* Main Content: Stats Left 40%, List Right 60% */}
                <Box sx={{ display: 'flex', gap: 3 }}>
                    {/* Left: Statistics (40%) */}
                    <Box sx={{ width: '40%' }}>
                        {/* Total Stats Card - Lighter background */}
                        <Card sx={{ mb: 3, background: 'linear-gradient(135deg, #e8ecff 0%, #f0e6ff 100%)', borderRadius: 3 }}>
                            <CardContent sx={{ p: 3 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                    <TrendingUp sx={{ mr: 1, color: '#667eea' }} />
                                    <Typography variant="h6" fontWeight="bold" color="#667eea">总支出统计</Typography>
                                </Box>
                                <Typography variant="h3" fontWeight="bold" sx={{ color: '#667eea', mb: 2 }}>
                                    ¥{totalStats?.sum?.toFixed(2) || '0.00'}
                                </Typography>
                                <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                                    <Box>
                                        <Typography variant="caption" color="text.secondary">笔数</Typography>
                                        <Typography variant="body1" fontWeight="bold">{totalStats?.count || 0}</Typography>
                                    </Box>
                                    <Divider orientation="vertical" flexItem />
                                    <Box>
                                        <Typography variant="caption" color="text.secondary">平均</Typography>
                                        <Typography variant="body1" fontWeight="bold">¥{totalStats?.average?.toFixed(2) || '0.00'}</Typography>
                                    </Box>
                                    <Divider orientation="vertical" flexItem />
                                    <Box>
                                        <Typography variant="caption" color="text.secondary">最高</Typography>
                                        <Typography variant="body1" fontWeight="bold">¥{totalStats?.max?.toFixed(2) || '0.00'}</Typography>
                                    </Box>
                                    <Divider orientation="vertical" flexItem />
                                    <Box>
                                        <Typography variant="caption" color="text.secondary">最低</Typography>
                                        <Typography variant="body1" fontWeight="bold">¥{totalStats?.min?.toFixed(2) || '0.00'}</Typography>
                                    </Box>
                                </Box>
                            </CardContent>
                        </Card>

                        {/* Category Stats Card with Pie Chart */}
                        <Card sx={{ borderRadius: 3 }}>
                            <CardContent sx={{ p: 3 }}>
                                <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>
                                    <AttachMoney sx={{ verticalAlign: 'middle', mr: 0.5, color: '#667eea' }} />
                                    分类支出
                                </Typography>

                                {/* MUI PieChart */}
                                <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                                    <PieChart
                                        series={[{
                                            data: EXPENSE_CATEGORIES.map((cat, idx) => {
                                                const stats = categoryStats?.[cat.type];
                                                const amount = stats?.sum || 0;
                                                return {
                                                    id: idx,
                                                    value: amount,
                                                    label: cat.label,
                                                    color: cat.color,
                                                };
                                            }).filter(d => d.value > 0),
                                            innerRadius: 50,
                                            outerRadius: 90,
                                            paddingAngle: 2,
                                            cornerRadius: 4,
                                        }]}
                                        width={300}
                                        height={200}
                                        slots={{
                                            tooltip: () => <CustomPieTooltipContent categoryStats={categoryStats} />,
                                        }}
                                    />
                                </Box>

                                {/* Category Stats Detail */}
                                <Box sx={{ mt: 2 }}>
                                    {EXPENSE_CATEGORIES.map(cat => {
                                        const stats = categoryStats?.[cat.type];
                                        if (!stats || stats.sum === 0) return null;
                                        const percent = totalAmount ? ((stats.sum / totalAmount) * 100).toFixed(1) : '0';
                                        return (
                                            <Box
                                                key={cat.type}
                                                sx={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'space-between',
                                                    py: 0.75,
                                                    px: 1,
                                                    borderBottom: '1px solid #f0f0f0',
                                                    cursor: 'pointer',
                                                    borderRadius: 1,
                                                    transition: 'background 0.2s',
                                                    '&:hover': { bgcolor: '#f5f7fa' },
                                                }}
                                                onClick={(e) => handleCategoryClick(e, cat.type)}
                                            >
                                                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                                    <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: cat.color, mr: 1 }} />
                                                    <Typography variant="body2">{cat.label}</Typography>
                                                </Box>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                    <Typography variant="body2" fontWeight="bold">¥{stats.sum.toFixed(2)}</Typography>
                                                    <Typography variant="caption" color="text.secondary">({percent}%)</Typography>
                                                </Box>
                                            </Box>
                                        );
                                    })}
                                </Box>
                            </CardContent>
                        </Card>
                    </Box>

                    {/* Right: Expense List (60%) */}
                    <Box sx={{ width: '60%', display: 'flex', flexDirection: 'column' }}>
                        <Card sx={{ borderRadius: 3, flex: 1, display: 'flex', flexDirection: 'column', maxHeight: 750 }}>
                            <CardContent sx={{ p: 3, display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                                    <Typography variant="h6" fontWeight="bold">
                                        支出明细 ({expenses.length})
                                    </Typography>
                                </Box>
                                {/* Category Filter Chips */}
                                <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: 2 }}>
                                    <Chip
                                        size="small"
                                        label="全部"
                                        variant={filterCategory === null ? 'filled' : 'outlined'}
                                        color={filterCategory === null ? 'primary' : 'default'}
                                        onClick={() => setFilterCategory(null)}
                                        sx={{ cursor: 'pointer' }}
                                    />
                                    {EXPENSE_CATEGORIES.map(cat => (
                                        <Chip
                                            key={cat.type}
                                            size="small"
                                            label={cat.label}
                                            variant={filterCategory === cat.type ? 'filled' : 'outlined'}
                                            sx={{
                                                cursor: 'pointer',
                                                ...(filterCategory === cat.type ? { bgcolor: cat.color, color: 'white' } : {}),
                                            }}
                                            onClick={() => setFilterCategory(cat.type)}
                                        />
                                    ))}
                                </Box>
                                {expenses.length === 0 ? (
                                    <Box sx={{ textAlign: 'center', py: 4, flex: 1 }}>
                                        <Typography color="text.secondary">暂无支出记录</Typography>
                                    </Box>
                                ) : (
                                    <Box sx={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: 1,
                                        overflowY: 'auto',
                                        flex: 1,
                                        scrollbarWidth: 'none',
                                        '&::-webkit-scrollbar': { display: 'none' },
                                    }}>
                                        {expenses.map(expense => {
                                            const cat = getCategoryConfig(expense.category);
                                            return (
                                                <Box
                                                    key={expense.expenseId}
                                                    sx={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        py: 1,
                                                        px: 1.5,
                                                        bgcolor: '#f5f7fa',
                                                        borderRadius: 2,
                                                        borderLeft: `4px solid ${cat.color}`,
                                                        transition: 'box-shadow 0.2s, transform 0.2s',
                                                        '&:hover': { boxShadow: 2, transform: 'translateY(-1px)' },
                                                    }}
                                                >
                                                    <Box sx={{ color: cat.color, mr: 1.5 }}>
                                                        {React.cloneElement(cat.icon, { sx: { fontSize: 24 } })}
                                                    </Box>
                                                    <Box sx={{ flex: 1, minWidth: 0 }}>
                                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                            <Typography variant="body1" fontWeight="bold">¥{expense.amount.toFixed(2)}</Typography>
                                                            <Chip size="small" label={cat.label} sx={{ bgcolor: cat.color, color: 'white', height: 20, '& .MuiChip-label': { px: 1, fontSize: '0.7rem' } }} />
                                                            <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto' }}>
                                                                {formatDate(expense.expenseTime)}
                                                            </Typography>
                                                        </Box>
                                                        {expense.description && (
                                                            <Typography variant="body2" color="text.secondary" noWrap>{expense.description}</Typography>
                                                        )}
                                                    </Box>
                                                    <Box sx={{ ml: 1, display: 'flex' }}>
                                                        <Tooltip title="编辑">
                                                            <IconButton size="small" color="primary" onClick={() => openEditDialog(expense)}>
                                                                <Edit fontSize="small" />
                                                            </IconButton>
                                                        </Tooltip>
                                                        <Tooltip title="删除">
                                                            <IconButton size="small" color="error" onClick={() => handleOpenDeleteDialog(expense.expenseId)}>
                                                                <Delete fontSize="small" />
                                                            </IconButton>
                                                        </Tooltip>
                                                    </Box>
                                                </Box>
                                            );
                                        })}
                                    </Box>
                                )}
                            </CardContent>
                        </Card>
                    </Box>
                </Box>

                {/* Category Detail Popover */}
                <Popover
                    open={Boolean(popoverAnchor)}
                    anchorEl={popoverAnchor}
                    onClose={handlePopoverClose}
                    anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
                    transformOrigin={{ vertical: 'top', horizontal: 'center' }}
                >
                    {selectedCategory && categoryStats?.[selectedCategory] && (
                        <Box sx={{ p: 2, minWidth: 200 }}>
                            <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 1, color: getCategoryConfig(selectedCategory).color }}>
                                {getCategoryConfig(selectedCategory).label} 详细统计
                            </Typography>
                            <Divider sx={{ mb: 1 }} />
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <Typography variant="body2" color="text.secondary">笔数</Typography>
                                    <Typography variant="body2" fontWeight="bold">{categoryStats[selectedCategory].count}</Typography>
                                </Box>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <Typography variant="body2" color="text.secondary">总计</Typography>
                                    <Typography variant="body2" fontWeight="bold">¥{categoryStats[selectedCategory].sum.toFixed(2)}</Typography>
                                </Box>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <Typography variant="body2" color="text.secondary">最低</Typography>
                                    <Typography variant="body2" fontWeight="bold">¥{categoryStats[selectedCategory].min.toFixed(2)}</Typography>
                                </Box>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <Typography variant="body2" color="text.secondary">平均</Typography>
                                    <Typography variant="body2" fontWeight="bold">¥{categoryStats[selectedCategory].average.toFixed(2)}</Typography>
                                </Box>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <Typography variant="body2" color="text.secondary">最高</Typography>
                                    <Typography variant="body2" fontWeight="bold">¥{categoryStats[selectedCategory].max.toFixed(2)}</Typography>
                                </Box>
                            </Box>
                        </Box>
                    )}
                </Popover>

                {/* Add/Edit Dialog */}
                <Dialog open={dialogOpen && dialogMode !== 'batch'} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
                    <DialogTitle>{dialogMode === 'edit' ? '编辑支出' : '添加支出'}</DialogTitle>
                    <DialogContent>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
                            <TextField
                                label="金额"
                                type="number"
                                fullWidth
                                required
                                value={formData.amount}
                                onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                            />
                            <Box>
                                <Typography variant="body2" sx={{ mb: 1 }}>分类</Typography>
                                <Grid container spacing={1}>
                                    {EXPENSE_CATEGORIES.map(cat => (
                                        <Grid item xs={4} key={cat.type}>
                                            <Button
                                                fullWidth
                                                variant={formData.category === cat.type ? 'contained' : 'outlined'}
                                                onClick={() => setFormData({ ...formData, category: cat.type })}
                                                sx={{
                                                    bgcolor: formData.category === cat.type ? cat.color : undefined,
                                                    borderColor: cat.color,
                                                    color: formData.category === cat.type ? 'white' : cat.color,
                                                    '&:hover': { bgcolor: cat.color, color: 'white' },
                                                }}
                                                startIcon={cat.icon}
                                            >
                                                {cat.label}
                                            </Button>
                                        </Grid>
                                    ))}
                                </Grid>
                            </Box>
                            <TextField
                                label="描述 (可选)"
                                fullWidth
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            />
                            <TextField
                                label="支出时间"
                                type="datetime-local"
                                fullWidth
                                InputLabelProps={{ shrink: true }}
                                value={formData.expenseTime}
                                onChange={(e) => setFormData({ ...formData, expenseTime: e.target.value })}
                            />
                        </Box>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setDialogOpen(false)}>取消</Button>
                        <Button
                            onClick={handleSubmit}
                            variant="contained"
                            disabled={submitting}
                            sx={{
                                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                '&:hover': { background: 'linear-gradient(135deg, #5a6fd6 0%, #6a4190 100%)' },
                            }}
                        >
                            {submitting ? '提交中...' : '提交'}
                        </Button>
                    </DialogActions>
                </Dialog>

                {/* Batch Add Dialog */}
                <Dialog open={dialogOpen && dialogMode === 'batch'} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
                    <DialogTitle>批量添加支出</DialogTitle>
                    <DialogContent>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
                            {batchItems.map((item, index) => (
                                <Box key={index} sx={{ display: 'flex', gap: 1, alignItems: 'flex-start', p: 1.5, bgcolor: '#f5f7fa', borderRadius: 2 }}>
                                    <TextField
                                        label="金额"
                                        type="number"
                                        size="small"
                                        sx={{ width: 100 }}
                                        value={item.amount}
                                        onChange={(e) => updateBatchItem(index, 'amount', parseFloat(e.target.value) || 0)}
                                    />
                                    <TextField
                                        label="分类"
                                        select
                                        size="small"
                                        sx={{ width: 100 }}
                                        value={item.category}
                                        onChange={(e) => updateBatchItem(index, 'category', e.target.value)}
                                        SelectProps={{ native: true }}
                                    >
                                        {EXPENSE_CATEGORIES.map(cat => (
                                            <option key={cat.type} value={cat.type}>{cat.label}</option>
                                        ))}
                                    </TextField>
                                    <TextField
                                        label="描述"
                                        size="small"
                                        sx={{ flex: 1 }}
                                        value={item.description}
                                        onChange={(e) => updateBatchItem(index, 'description', e.target.value)}
                                    />
                                    <TextField
                                        label="时间"
                                        type="datetime-local"
                                        size="small"
                                        InputLabelProps={{ shrink: true }}
                                        sx={{ width: 200 }}
                                        value={item.expenseTime}
                                        onChange={(e) => updateBatchItem(index, 'expenseTime', e.target.value)}
                                    />
                                    <IconButton color="error" onClick={() => removeBatchItem(index)} disabled={batchItems.length === 1}>
                                        <Delete />
                                    </IconButton>
                                </Box>
                            ))}
                            <Button startIcon={<Add />} onClick={addBatchItem}>添加一行</Button>
                        </Box>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setDialogOpen(false)}>取消</Button>
                        <Button
                            onClick={handleSubmit}
                            variant="contained"
                            disabled={submitting}
                            sx={{
                                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                '&:hover': { background: 'linear-gradient(135deg, #5a6fd6 0%, #6a4190 100%)' },
                            }}
                        >
                            {submitting ? '提交中...' : `提交 (${batchItems.filter(i => i.amount > 0).length} 条)`}
                        </Button>
                    </DialogActions>
                </Dialog>

                {/* Delete Confirmation Dialog */}
                <Dialog open={deleteDialogOpen} onClose={handleCloseDeleteDialog}>
                    <DialogTitle>确认删除</DialogTitle>
                    <DialogContent>
                        <Typography>确定要删除这条支出记录吗？此操作不可撤销。</Typography>
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

export default TripExpensesPage;
