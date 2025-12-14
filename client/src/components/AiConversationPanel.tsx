import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import {
    Box,
    Typography,
    TextField,
    IconButton,
    CircularProgress,
    Accordion,
    AccordionSummary,
    AccordionDetails,
    List,
    ListItem,
    ListItemText,
    FormControl,
    Select,
    MenuItem,
    Button,
} from '@mui/material';
import {
    Send,
    ExpandMore,
    FolderOpen,
    Add,
} from '@mui/icons-material';
import ReactMarkdown from 'react-markdown';
import { handleUserQuery, getConversationHistory, getConversation, getAllConversations, createConversation } from '@/api/aiRecommendation';
import { Message, AiRecommendResponse, AiRecommendationConversation } from '@/types/api';
import { toast } from '@/utils/toast';
import ResourcePanel from '@/components/ResourcePanel';

// Client-side message interface for caching
interface ConversationMessage {
    role: 'user' | 'assistant';
    content: string;
    toolUse?: string[];
    toolCallResults?: Record<string, string[]>;
    timestamp: string;
}

export interface AiConversationPanelProps {
    /** Initial conversation ID to load */
    initialConversationId?: string;
    /** Whether to show conversation switcher */
    showConversationSwitcher?: boolean;
    /** Callback when conversation changes */
    onConversationChange?: (conversationId: string) => void;
    /** Height of the panel */
    height?: string | number;
    /** Compact mode for popup */
    compact?: boolean;
}

export interface AiConversationPanelRef {
    refreshConversations: () => void;
}

const AiConversationPanel = forwardRef<AiConversationPanelRef, AiConversationPanelProps>(({
    initialConversationId,
    showConversationSwitcher = false,
    onConversationChange,
    height = '100%',
    compact = false,
}, ref) => {
    const [conversationId, setConversationId] = useState<string>(initialConversationId || '');
    const [conversations, setConversations] = useState<AiRecommendationConversation[]>([]);
    const [conversation, setConversation] = useState<AiRecommendationConversation | null>(null);
    const [messages, setMessages] = useState<ConversationMessage[]>([]);
    const [inputText, setInputText] = useState('');
    const [loading, setLoading] = useState(false);
    const [initialLoading, setInitialLoading] = useState(true);
    const [resourcePanelOpen, setResourcePanelOpen] = useState(false);
    const [isNewConversation, setIsNewConversation] = useState(true);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    // Ref to skip history loading when we just created a new conversation
    const skipHistoryLoadRef = useRef(false);

    // Expose methods to parent
    useImperativeHandle(ref, () => ({
        refreshConversations: fetchConversations,
    }));

    // Scroll to bottom when messages update
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Fetch all conversations for switcher
    const fetchConversations = async () => {
        try {
            const convs = await getAllConversations();
            setConversations(convs || []);
        } catch (error) {
            console.error('Failed to fetch conversations:', error);
        }
    };

    // Initialize - always start with new conversation mode
    useEffect(() => {
        if (showConversationSwitcher) {
            fetchConversations();
        }
        // Start with new conversation mode (no conversationId)
        setIsNewConversation(true);
        setConversationId('');
        setConversation(null);
        setMessages([]);
        setInitialLoading(false);
    }, [showConversationSwitcher]);

    // Load conversation history when conversationId changes (for switching)
    useEffect(() => {
        if (!conversationId) {
            setIsNewConversation(true);
            setMessages([]);
            setConversation(null);
            return;
        }

        // Skip loading history if we just created this conversation (messages are already in state)
        if (skipHistoryLoadRef.current) {
            skipHistoryLoadRef.current = false;
            setIsNewConversation(false);
            return;
        }

        const loadHistory = async () => {
            try {
                setInitialLoading(true);
                setIsNewConversation(false);
                // Get conversation details
                const conv = await getConversation(conversationId);
                setConversation(conv);

                // Get conversation history
                const history = await getConversationHistory(conversationId);

                // Merge consecutive assistant messages between user messages
                const mergedMessages: ConversationMessage[] = [];
                let pendingAssistantContent: string[] = [];
                let pendingToolUse: string[] = [];

                for (const msg of history) {
                    if (msg.messageType === 'USER') {
                        if (pendingAssistantContent.length > 0) {
                            mergedMessages.push({
                                role: 'assistant',
                                content: pendingAssistantContent.join('\n'),
                                toolUse: pendingToolUse.length > 0 ? pendingToolUse : undefined,
                                toolCallResults: undefined,
                                timestamp: new Date().toISOString(),
                            });
                            pendingAssistantContent = [];
                            pendingToolUse = [];
                        }
                        mergedMessages.push({
                            role: 'user',
                            content: msg.text,
                            timestamp: new Date().toISOString(),
                        });
                    } else {
                        pendingAssistantContent.push(msg.text);
                        if (msg.toolCalls && msg.toolCalls.length > 0) {
                            pendingToolUse.push(...msg.toolCalls.map((tc: any) => tc.type || 'UNKNOWN'));
                        }
                    }
                }

                if (pendingAssistantContent.length > 0) {
                    mergedMessages.push({
                        role: 'assistant',
                        content: pendingAssistantContent.join('\n'),
                        toolUse: pendingToolUse.length > 0 ? pendingToolUse : undefined,
                        toolCallResults: undefined,
                        timestamp: new Date().toISOString(),
                    });
                }

                setMessages(mergedMessages);
            } catch (error: any) {
                toast.error(error.message || '加载会话历史失败');
            } finally {
                setInitialLoading(false);
            }
        };

        loadHistory();
    }, [conversationId]);

    const handleConversationSwitch = (newConversationId: string) => {
        if (newConversationId === '__new__') {
            // Create new conversation
            setConversationId('');
            setIsNewConversation(true);
            setMessages([]);
            setConversation(null);
        } else {
            setConversationId(newConversationId);
            onConversationChange?.(newConversationId);
        }
    };

    const handleSendMessage = async () => {
        if (!inputText.trim()) return;

        const userMessage: ConversationMessage = {
            role: 'user',
            content: inputText,
            timestamp: new Date().toISOString(),
        };

        setMessages((prev) => [...prev, userMessage]);
        const query = inputText;
        setInputText('');
        setLoading(true);

        try {
            let currentConversationId = conversationId;

            // If this is a new conversation, create it first
            if (isNewConversation || !currentConversationId) {
                const newConv = await createConversation(query);
                currentConversationId = newConv.conversationId;
                // Set flag to skip history loading when conversationId changes
                skipHistoryLoadRef.current = true;
                setConversationId(currentConversationId);
                setConversation(newConv);
                setIsNewConversation(false);
                // Refresh conversations list
                fetchConversations();
            }

            const response: AiRecommendResponse = await handleUserQuery(currentConversationId, query);
            const aiContent = response.aiMessages.join('\n');

            const assistantMessage: ConversationMessage = {
                role: 'assistant',
                content: aiContent,
                toolUse: response.toolUse.length > 0 ? response.toolUse : undefined,
                toolCallResults: Object.keys(response.toolCallResults).length > 0
                    ? response.toolCallResults
                    : undefined,
                timestamp: new Date().toISOString(),
            };

            setMessages((prev) => [...prev, assistantMessage]);
        } catch (error: any) {
            toast.error(error.message || '发送消息失败');
            setMessages((prev) => prev.filter((msg) => msg !== userMessage));
        } finally {
            setLoading(false);
        }
    };

    const renderMessage = (msg: ConversationMessage, index: number) => {
        const isUser = msg.role === 'user';

        return (
            <Box
                key={index}
                sx={{
                    display: 'flex',
                    justifyContent: isUser ? 'flex-end' : 'flex-start',
                    mb: 1.5,
                }}
            >
                <Box
                    sx={{
                        maxWidth: isUser ? '70%' : '100%',
                        px: 2,
                        py: 1.5,
                        bgcolor: isUser ? '#f0f0f0' : 'transparent',
                        color: 'text.primary',
                        borderRadius: 3,
                    }}
                >
                    {isUser ? (
                        <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', fontSize: compact ? '0.9rem' : undefined }}>
                            {msg.content}
                        </Typography>
                    ) : (
                        <Box sx={{
                            '& p': { my: 1 },
                            '& ul, & ol': { pl: 2 },
                            '& li': { mb: 0.5 },
                            fontSize: compact ? '0.9rem' : undefined,
                        }}>
                            <ReactMarkdown>{msg.content}</ReactMarkdown>
                        </Box>
                    )}

                    {/* Tool Call Results */}
                    {!isUser && msg.toolCallResults && (
                        <Box sx={{ mt: 2 }}>
                            {Object.entries(msg.toolCallResults).map(([toolName, results]) => (
                                <Accordion key={toolName} sx={{ mb: 1, boxShadow: 'none', '&:before': { display: 'none' } }}>
                                    <AccordionSummary expandIcon={<ExpandMore />} sx={{ minHeight: 40, px: 1 }}>
                                        <Typography variant="body2" fontWeight="500" color="text.secondary">
                                            {toolName} ({results.length})
                                        </Typography>
                                    </AccordionSummary>
                                    <AccordionDetails sx={{
                                        px: 1,
                                        maxHeight: 200,
                                        overflowY: 'auto',
                                        scrollbarWidth: 'none',
                                        '&::-webkit-scrollbar': { display: 'none' },
                                    }}>
                                        <List dense disablePadding>
                                            {results.map((result, idx) => (
                                                <ListItem key={idx} disablePadding sx={{ py: 0.25 }}>
                                                    <ListItemText
                                                        primary={result}
                                                        primaryTypographyProps={{ variant: 'body2' }}
                                                    />
                                                </ListItem>
                                            ))}
                                        </List>
                                    </AccordionDetails>
                                </Accordion>
                            ))}
                        </Box>
                    )}
                </Box>
            </Box>
        );
    };

    // Calculate content width based on resource panel state
    const contentWidth = resourcePanelOpen ? '90%' : '60%';

    if (initialLoading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height }}>
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Box sx={{ display: 'flex', height, bgcolor: '#f5f7fa', overflow: 'hidden' }}>
            {/* Left: Main Content Area */}
            <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0, overflow: 'hidden' }}>
                {/* Header - no border */}
                <Box sx={{ p: compact ? 1 : 1.5, mt: compact ? -1 : 0, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {showConversationSwitcher ? (
                        <FormControl size="small" sx={{ minWidth: 180 }}>
                            <Select
                                value={conversationId || '__new__'}
                                onChange={(e) => handleConversationSwitch(e.target.value)}
                                sx={{ fontSize: '0.85rem', fontWeight: 500 }}
                            >
                                <MenuItem value="__new__">
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                        <Add sx={{ fontSize: 16 }} />
                                        新会话
                                    </Box>
                                </MenuItem>
                                {conversations.map((conv) => (
                                    <MenuItem key={conv.conversationId} value={conv.conversationId}>
                                        {conv.title || '未命名会话'}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    ) : (
                        <Typography
                            variant="h6"
                            fontWeight="bold"
                            color="text.primary"
                            sx={{ textAlign: 'center', fontSize: compact ? '1rem' : undefined }}
                        >
                            {conversation?.title || '新会话'}
                        </Typography>
                    )}
                    {conversationId && (
                        <IconButton
                            onClick={() => setResourcePanelOpen(!resourcePanelOpen)}
                            sx={{
                                position: 'absolute',
                                right: 8,
                                color: resourcePanelOpen ? '#667eea' : 'inherit',
                            }}
                        >
                            <FolderOpen />
                        </IconButton>
                    )}
                </Box>

                {/* Messages Container */}
                <Box sx={{
                    flexGrow: 1,
                    overflowY: 'auto',
                    py: 2,
                    scrollbarWidth: 'none',
                    '&::-webkit-scrollbar': { display: 'none' },
                    display: 'flex',
                    flexDirection: 'column',
                }}>
                    <Box sx={{ width: contentWidth, minWidth: 450, mx: 'auto', px: 2, flex: 1, display: 'flex', flexDirection: 'column' }}>
                        {isNewConversation && messages.length === 0 ? (
                            // Welcome message for new conversation
                            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                                <Typography variant="h5" fontWeight="bold" color="text.primary" sx={{ mb: 0 }}>
                                    👋 你好！
                                </Typography>
                            </Box>
                        ) : messages.length === 0 ? (
                            <Box sx={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                                <Typography color="text.secondary">开始与AI对话吧</Typography>
                            </Box>
                        ) : (
                            messages.map((msg, idx) => renderMessage(msg, idx))
                        )}
                        {loading && (
                            <Box sx={{ display: 'flex', justifyContent: 'flex-start', mb: 1.5 }}>
                                <Box sx={{ p: 2, bgcolor: 'transparent' }}>
                                    <CircularProgress size={24} />
                                </Box>
                            </Box>
                        )}
                        <div ref={messagesEndRef} />
                    </Box>
                </Box>

                {/* Input Box */}
                <Box sx={{ p: compact ? 1.5 : 2, px: 2 }}>
                    <Box sx={{ width: contentWidth, minWidth: 450, mx: 'auto' }}>
                        <Box sx={{ position: 'relative' }}>
                            <TextField
                                fullWidth
                                variant="outlined"
                                placeholder="输入您的问题..."
                                value={inputText}
                                onChange={(e) => setInputText(e.target.value)}
                                onKeyUp={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey && !loading) {
                                        e.preventDefault();
                                        handleSendMessage();
                                    }
                                }}
                                disabled={loading}
                                multiline
                                minRows={3}
                                maxRows={6}
                                sx={{
                                    '& .MuiOutlinedInput-root': {
                                        borderRadius: 4,
                                        bgcolor: 'white',
                                        pl: 3,
                                        pr: 8,
                                        fontSize: compact ? '0.9rem' : undefined,
                                        '&:hover': {
                                            boxShadow: '0 2px 8px rgba(102,126,234,0.2)',
                                        },
                                    },
                                }}
                            />
                            <IconButton
                                onClick={handleSendMessage}
                                disabled={!inputText.trim() || loading}
                                sx={{
                                    position: 'absolute',
                                    right: 12,
                                    bottom: 12,
                                    width: 40,
                                    height: 40,
                                    bgcolor: '#f0f0f0',
                                    '&:hover': { bgcolor: '#e0e0e0' },
                                    '&:disabled': { bgcolor: '#f5f5f5' },
                                }}
                            >
                                {loading ? <CircularProgress size={20} /> : <Send sx={{ fontSize: 20 }} />}
                            </IconButton>
                        </Box>
                    </Box>
                    <Typography
                        variant="body2"
                        color="text.primary"
                        sx={{ display: 'block', textAlign: 'center', mt: 1, fontSize: '0.65rem' }}
                    >
                        AI可能会犯错，请仔细检查。最多支持50条消息，超出的旧消息会被删除
                    </Typography>
                </Box>
            </Box>

            {/* Right: Resource Panel */}
            <ResourcePanel
                open={resourcePanelOpen}
                onClose={() => setResourcePanelOpen(false)}
                conversationId={conversationId || ''}
            />
        </Box>
    );
});

AiConversationPanel.displayName = 'AiConversationPanel';

export default AiConversationPanel;
