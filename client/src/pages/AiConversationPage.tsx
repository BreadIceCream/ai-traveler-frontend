import React, { useState, useEffect, useRef } from 'react';
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
} from '@mui/material';
import {
    Send,
    ExpandMore,
    FolderOpen,
} from '@mui/icons-material';
import { useParams, useLocation } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { handleUserQuery, getConversationHistory, getConversation } from '@/api/aiRecommendation';
import { Message, AiRecommendResponse, AiRecommendationConversation } from '@/types/api';
import { toast } from '@/utils/toast';
import ResourcePanel from '@/components/ResourcePanel';

// Client-side message interface for caching
interface ConversationMessage {
    role: 'user' | 'assistant';
    content: string;  // For user: plain text, for assistant: markdown
    toolUse?: string[];
    toolCallResults?: Record<string, string[]>;
    timestamp: string;
}

const AiConversationPage: React.FC = () => {
    const { conversationId } = useParams<{ conversationId: string }>();
    const location = useLocation();
    const [conversation, setConversation] = useState<AiRecommendationConversation | null>(null);
    const [messages, setMessages] = useState<ConversationMessage[]>([]);
    const [inputText, setInputText] = useState('');
    const [loading, setLoading] = useState(false);
    const [initialLoading, setInitialLoading] = useState(true);
    const [resourcePanelOpen, setResourcePanelOpen] = useState(false);
    const autoSubmitProcessedRef = useRef(false);  // Prevent duplicate auto-submit
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Get states from navigation
    const navState = location.state as { prefillQuery?: string; updatedTitle?: string } | null;
    const prefillQuery = navState?.prefillQuery;
    const updatedTitle = navState?.updatedTitle;

    // Check if this is a new conversation that needs auto-submit
    const autoSubmitKey = conversationId ? `ai_conv_autosubmit_${conversationId}` : null;
    const shouldAutoSubmit = autoSubmitKey ? sessionStorage.getItem(autoSubmitKey) === 'true' : false;

    // Update title when renamed from sidebar
    useEffect(() => {
        if (updatedTitle && conversation) {
            setConversation(prev => prev ? { ...prev, title: updatedTitle } : prev);
        }
    }, [updatedTitle]);

    // Scroll to bottom when messages update
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Load conversation history on mount
    useEffect(() => {
        if (!conversationId) return;

        const loadHistory = async () => {
            try {
                // Get conversation details
                const conv = await getConversation(conversationId);
                setConversation(conv);

                // Check if we should auto-submit (new conversation from homepage)
                if (shouldAutoSubmit && prefillQuery && !autoSubmitProcessedRef.current) {
                    autoSubmitProcessedRef.current = true;
                    // Clear the sessionStorage flag immediately to prevent refresh re-submit
                    if (autoSubmitKey) {
                        sessionStorage.removeItem(autoSubmitKey);
                    }

                    // Fill input box with user's query first
                    setInputText(prefillQuery);
                    setInitialLoading(false);

                    // Auto-submit after a short delay to ensure input is rendered
                    setTimeout(() => {
                        // Trigger the normal send message flow
                        const submitBtn = document.getElementById('ai-send-btn');
                        if (submitBtn) submitBtn.click();
                    }, 100);
                    return;
                }

                // Get conversation history
                const history = await getConversationHistory(conversationId);

                // Merge consecutive assistant messages between user messages
                const mergedMessages: ConversationMessage[] = [];
                let pendingAssistantContent: string[] = [];
                let pendingToolUse: string[] = [];

                for (const msg of history) {
                    if (msg.messageType === 'USER') {
                        // If there are pending assistant messages, merge and add them first
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
                        // Add user message
                        mergedMessages.push({
                            role: 'user',
                            content: msg.text,
                            timestamp: new Date().toISOString(),
                        });
                    } else {
                        // Accumulate assistant messages
                        pendingAssistantContent.push(msg.text);
                        if (msg.toolCalls && msg.toolCalls.length > 0) {
                            pendingToolUse.push(...msg.toolCalls.map((tc: any) => tc.type || 'UNKNOWN'));
                        }
                    }
                }

                // Don't forget the last assistant message(s)
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

    const handleSendMessage = async () => {
        if (!inputText.trim() || !conversationId) return;

        const userMessage: ConversationMessage = {
            role: 'user',
            content: inputText,
            timestamp: new Date().toISOString(),
        };

        // Add user message optimistically
        setMessages((prev) => [...prev, userMessage]);
        const query = inputText;
        setInputText('');
        setLoading(true);

        try {
            const response: AiRecommendResponse = await handleUserQuery(conversationId, query);

            // Combine aiMessages into single markdown content
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
            // Remove optimistic user message on error
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
                    {/* Message Content */}
                    {isUser ? (
                        <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                            {msg.content}
                        </Typography>
                    ) : (
                        <Box sx={{
                            '& p': { my: 1 },
                            '& ul, & ol': { pl: 2 },
                            '& li': { mb: 0.5 },
                        }}>
                            <ReactMarkdown>{msg.content}</ReactMarkdown>
                        </Box>
                    )}

                    {/* Tool Call Results - Display as List */}
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

    if (initialLoading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Box sx={{ display: 'flex', height: '100%', bgcolor: '#f5f7fa', overflow: 'hidden' }}>
            {/* Left: Main Content Area */}
            <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0, overflow: 'hidden' }}>
                {/* Header - Centered Title with Resource Button */}
                <Box sx={{ p: 2, position: 'relative' }}>
                    <Typography
                        variant="h6"
                        fontWeight="bold"
                        color="text.primary"
                        sx={{ textAlign: 'center' }}
                    >
                        {conversation?.title || 'AI推荐会话'}
                    </Typography>
                    <IconButton
                        onClick={() => setResourcePanelOpen(!resourcePanelOpen)}
                        sx={{
                            position: 'absolute',
                            right: 16,
                            top: '50%',
                            transform: 'translateY(-50%)',
                            color: resourcePanelOpen ? '#667eea' : 'inherit',
                        }}
                    >
                        <FolderOpen />
                    </IconButton>
                </Box>

                {/* Messages Container - Scrollable (hidden scrollbar) */}
                <Box sx={{
                    flexGrow: 1,
                    overflowY: 'auto',
                    py: 2,
                    // Hide scrollbar but keep functionality
                    scrollbarWidth: 'none',  // Firefox
                    '&::-webkit-scrollbar': {
                        display: 'none',  // Chrome, Safari, Edge
                    },
                }}>
                    <Box sx={{ maxWidth: 780, mx: 'auto', px: { xs: 2, md: 4 } }}>
                        {messages.map((msg, idx) => renderMessage(msg, idx))}
                        {/* Loading indicator for AI response */}
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

                {/* Input Box - Fixed at Bottom */}
                <Box sx={{ p: 3, px: { xs: 2, md: 4 } }}>
                    <Box sx={{ maxWidth: 720, mx: 'auto' }}>
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
                                maxRows={5}
                                sx={{
                                    '& .MuiOutlinedInput-root': {
                                        borderRadius: 4,
                                        bgcolor: 'white',
                                        pl: 3,
                                        pr: 8,
                                        '&:hover': {
                                            boxShadow: '0 2px 8px rgba(102,126,234,0.2)',
                                        },
                                    },
                                }}
                            />
                            <IconButton
                                id="ai-send-btn"
                                onClick={handleSendMessage}
                                disabled={!inputText.trim() || loading}
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
};

export default AiConversationPage;

