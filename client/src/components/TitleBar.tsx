import React from 'react';
import { Box, IconButton, Typography } from '@mui/material';
import { Remove, CropSquare, Close } from '@mui/icons-material';

// Declare electronWindow on window object
declare global {
    interface Window {
        electronWindow?: {
            minimize: () => void;
            maximize: () => void;
            close: () => void;
        };
    }
}

const TitleBar: React.FC = () => {
    const handleMinimize = () => {
        window.electronWindow?.minimize();
    };

    const handleMaximize = () => {
        window.electronWindow?.maximize();
    };

    const handleClose = () => {
        window.electronWindow?.close();
    };

    return (
        <Box
            sx={{
                height: 32,
                bgcolor: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                WebkitAppRegion: 'drag', // Make title bar draggable
                userSelect: 'none',
                borderBottom: '1px solid rgba(0,0,0,0.08)',
            }}
        >
            {/* Left: App icon and title */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, pl: 1.5 }}>
                <img src="/app-icon.png" alt="AI Traveler" style={{ width: 18, height: 18 }} />
                <Typography variant="body2" sx={{ fontSize: '0.8rem', fontWeight: 500, color: '#333' }}>
                    AI Traveler
                </Typography>
            </Box>

            {/* Right: Window controls */}
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    WebkitAppRegion: 'no-drag', // Controls should not be draggable
                }}
            >
                <IconButton
                    size="small"
                    onClick={handleMinimize}
                    sx={{
                        borderRadius: 0,
                        width: 46,
                        height: 32,
                        '&:hover': { bgcolor: 'rgba(0,0,0,0.05)' },
                    }}
                >
                    <Remove sx={{ fontSize: 16, color: '#666' }} />
                </IconButton>
                <IconButton
                    size="small"
                    onClick={handleMaximize}
                    sx={{
                        borderRadius: 0,
                        width: 46,
                        height: 32,
                        '&:hover': { bgcolor: 'rgba(0,0,0,0.05)' },
                    }}
                >
                    <CropSquare sx={{ fontSize: 14, color: '#666' }} />
                </IconButton>
                <IconButton
                    size="small"
                    onClick={handleClose}
                    sx={{
                        borderRadius: 0,
                        width: 46,
                        height: 32,
                        '&:hover': { bgcolor: '#e81123', '& svg': { color: 'white' } },
                    }}
                >
                    <Close sx={{ fontSize: 16, color: '#666' }} />
                </IconButton>
            </Box>
        </Box>
    );
};

export default TitleBar;
