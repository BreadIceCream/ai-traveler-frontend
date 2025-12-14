import { createHashRouter, Navigate } from 'react-router-dom';
import LoginPage from '@/pages/LoginPage';
import RegisterPage from '@/pages/RegisterPage';
import HomePage from '@/pages/HomePage';
import UserProfilePage from '@/pages/UserProfilePage';
import ExplorePage from '@/pages/ExplorePage';
import TripDetailPage from '@/pages/TripDetailPage';
import TripLogsPage from '@/pages/TripLogsPage';
import TripExpensesPage from '@/pages/TripExpensesPage';
import PersonalActivityPage from '@/pages/PersonalActivityPage';
import MyTripsPage from '@/pages/MyTripsPage';
import AiConversationPage from '@/pages/AiConversationPage';

// Using HashRouter for Electron compatibility
const router = createHashRouter([
    {
        path: '/',
        element: <HomePage />,
        children: [
            {
                path: 'ai/conversation/:conversationId',
                element: <AiConversationPage />,
            },
        ],
    },
    {
        path: '/login',
        element: <LoginPage />,
    },
    {
        path: '/register',
        element: <RegisterPage />,
    },
    {
        path: '/profile',
        element: <UserProfilePage />,
    },
    {
        path: '/explore',
        element: <ExplorePage />,
    },
    {
        path: '/trip/:tripId',
        element: <TripDetailPage />,
    },
    {
        path: '/trip/:tripId/logs',
        element: <TripLogsPage />,
    },
    {
        path: '/trip/:tripId/expenses',
        element: <TripExpensesPage />,
    },
    {
        path: '/personal-activities',
        element: <PersonalActivityPage />,
    },
    {
        path: '/my-trips',
        element: <MyTripsPage />,
    },
    {
        path: '*',
        element: <Navigate to="/" replace />,
    },
]);

export default router;
