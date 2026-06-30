import { Navigate } from 'react-router-dom';
import { RouteConfig } from './types';
import Home from './pages/Home';
import Reels from './pages/Reels';
import Search from './pages/Search';
import Create from './pages/Create';
import CreateWithCamera from './pages/CreateWithCamera';
import ChatList from './pages/ChatList';
import IndividualChat from './pages/IndividualChat';
import AIChatBot from './pages/AIChatBot';
import FeedbackPage from './pages/FeedbackPage';
import Notifications from './pages/Notifications';
import ProfilePage from './pages/Profile';
import Settings from './pages/Settings';
import EditProfile from './pages/EditProfile';
import WatchHistoryPage from './pages/WatchHistory';
import VerificationRequestPage from './pages/VerificationRequest';
import AdminDashboard from './pages/AdminDashboard';
import Login from './pages/Login';
import Signup from './pages/Signup';
import FollowList from './pages/FollowList';
import VideoCall from './pages/VideoCall';
import NotFound from './pages/NotFound';
import HelpCenter from './pages/HelpCenter';
import ReportPage from './pages/ReportPage';

// IndianReels ecosystem pages
import IRHome from './pages/indianreels/Home';
import IRSearch from './pages/indianreels/Search';
import IRReels from './pages/indianreels/Reels';
import IRChat from './pages/indianreels/Chat';
import IRProfile from './pages/indianreels/Profile';

import IndianReelsStudio from './pages/IndianReelsStudio';
import AudioPage from './pages/AudioPage';
import StoriesViewer from './pages/StoriesViewer';

import AppBuilder from './pages/AppBuilder';

import TokenManagement from './pages/TokenManagement';

import MusicPlayer from './pages/MusicPlayer';

import VoucherReward from './pages/VoucherReward';

import PaymentGift from './pages/PaymentGift';

export const routes: RouteConfig[] = [
  {
    path: '/',
    element: <Reels />,
  },
  {
    path: '/reels',
    element: <Reels />,
  },
  {
    path: '/stories/:userId',
    element: <StoriesViewer />,
  },
  {
    path: '/feed',
    element: <Home />,
  },
  {
    path: '/studio',
    element: <IndianReelsStudio />,
  },
  {
    path: '/audio/:reelId',
    element: <AudioPage />,
  },
  {
    path: '/search',
    element: <Search />,
  },
  {
    path: '/create',
    element: <Create />,
  },
  {
    path: '/create-camera',
    element: <CreateWithCamera />,
  },
  {
    path: '/messages',
    element: <ChatList />,
  },
  {
    path: '/messages/ai-chat',
    element: <AIChatBot />,
  },
  {
    path: '/messages/:username',
    element: <IndividualChat />,
  },
  {
    path: '/messages/group/:groupId',
    element: <IndividualChat isGroup />,
  },
  {
    path: '/notifications',
    element: <Notifications />,
  },
  {
    path: '/profile/:username',
    element: <ProfilePage />,
  },
  {
    path: '/profile/:username/followers',
    element: <FollowList type="followers" />,
  },
  {
    path: '/profile/:username/following',
    element: <FollowList type="following" />,
  },
  {
    path: '/settings',
    element: <Settings />,
  },
  {
    path: '/settings/profile',
    element: <EditProfile />,
  },
  {
    path: '/settings/history',
    element: <WatchHistoryPage />,
  },
  {
    path: '/settings/verification',
    element: <VerificationRequestPage />,
  },
  {
    path: '/settings/help',
    element: <HelpCenter />,
  },
  {
    path: '/settings/report',
    element: <ReportPage />,
  },

  {
    path: '/voucher-reward',
    element: <VoucherReward />,
  },
  {
    path: '/payment-gift',
    element: <PaymentGift />,
  },
  {
    path: '/settings/feedback',
    element: <FeedbackPage />,
  },
  {
    path: '/admin',
    element: <AdminDashboard />,
  },
  {
    path: '/app-builder',
    element: <AppBuilder />,
  },
  {
    path: '/settings/tokens',
    element: <TokenManagement />,
  },
  {
    path: '/music-player',
    element: <MusicPlayer />,
  },
  {
    path: '/call/:roomName',
    element: <VideoCall />,
  },
  {
    path: '/indianreels',
    element: <Navigate to="/indianreels/home" replace />,
  },
  {
    path: '/indianreels/home',
    element: <IRHome />,
  },
  {
    path: '/indianreels/search',
    element: <IRSearch />,
  },
  {
    path: '/indianreels/reels',
    element: <IRReels />,
  },
  {
    path: '/indianreels/chat',
    element: <IRChat />,
  },
  {
    path: '/indianreels/profile',
    element: <IRProfile />,
  },
  {
    path: '/threads-redirect',
    element: <Navigate to="/indianreels/home" replace />,
  },
  {
    path: '/login',
    element: <Login />,
  },
  {
    path: '/signup',
    element: <Signup />,
  },
  {
    path: '*',
    element: <NotFound />,
  },
];
