import { createRoot } from 'react-dom/client';
import { Snackbar, Alert, AlertColor, Slide, SlideProps } from '@mui/material';
import React, { useState, useEffect } from 'react';

// Toast notification container element
let toastContainer: HTMLDivElement | null = null;

function getContainer() {
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'toast-container';
        document.body.appendChild(toastContainer);
    }
    return toastContainer;
}

// Slide transition
function SlideTransition(props: SlideProps) {
    return <Slide {...props} direction="up" />;
}

// Toast notification component
interface ToastProps {
    message: string;
    severity: AlertColor;
    duration?: number;
    onClose: () => void;
}

const Toast: React.FC<ToastProps> = ({ message, severity, duration = 4000, onClose }) => {
    const [open, setOpen] = useState(true);

    useEffect(() => {
        const timer = setTimeout(() => {
            setOpen(false);
        }, duration);
        return () => clearTimeout(timer);
    }, [duration]);

    const handleClose = (_event?: React.SyntheticEvent | Event, reason?: string) => {
        if (reason === 'clickaway') return;
        setOpen(false);
    };

    const handleExited = () => {
        onClose();
    };

    return (
        <Snackbar
            open={open}
            autoHideDuration={duration}
            onClose={handleClose}
            TransitionComponent={SlideTransition}
            TransitionProps={{ onExited: handleExited }}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            sx={{ zIndex: 9999 }}
        >
            <Alert
                onClose={handleClose}
                severity={severity}
                variant="filled"
                sx={{
                    width: '100%',
                    minWidth: 300,
                    boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                    borderRadius: 2,
                    fontSize: '0.95rem',
                }}
            >
                {message}
            </Alert>
        </Snackbar>
    );
};

// Toast manager for showing notifications
class ToastManager {
    private queue: Array<{ id: number; element: HTMLDivElement }> = [];
    private counter = 0;

    show(message: string, severity: AlertColor = 'error', duration = 4000) {
        const container = getContainer();
        const id = ++this.counter;
        const wrapper = document.createElement('div');
        wrapper.id = `toast-${id}`;
        container.appendChild(wrapper);

        const root = createRoot(wrapper);

        const handleClose = () => {
            root.unmount();
            wrapper.remove();
            this.queue = this.queue.filter(item => item.id !== id);
        };

        root.render(
            <Toast
                message={message}
                severity={severity}
                duration={duration}
                onClose={handleClose}
            />
        );

        this.queue.push({ id, element: wrapper });
    }

    error(message: string, duration = 4000) {
        this.show(message, 'error', duration);
    }

    success(message: string, duration = 3000) {
        this.show(message, 'success', duration);
    }

    warning(message: string, duration = 4000) {
        this.show(message, 'warning', duration);
    }

    info(message: string, duration = 3000) {
        this.show(message, 'info', duration);
    }
}

// Global toast instance
export const toast = new ToastManager();
