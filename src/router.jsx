import { createBrowserRouter, Navigate } from 'react-router-dom'
import ProtectedRoute from './routes/ProtectedRoute'
import Login from './pages/auth/Login/Login'
import Signup from './pages/auth/Signup/Signup'
import OAuthRedirect from './pages/auth/OAuthRedirect/OAuthRedirect'
import RoomList from './pages/rooms/RoomList/RoomList'
import Dashboard from './pages/rooms/Dashboard/Dashboard'
import JoinRoom from './pages/rooms/JoinRoom/JoinRoom'
import Feed from './pages/feed/Feed/Feed'
import Letters from './pages/letters/Letters/Letters'
import Notifications from './pages/notifications/Notifications/Notifications'
import Schedule from './pages/schedule/Schedule/Schedule'

// 라우팅 골격. 보호 라우트는 ProtectedRoute 하위에 둔다.
export const router = createBrowserRouter([
  { path: '/login', element: <Login /> },
  { path: '/signup', element: <Signup /> },
  { path: '/oauth2/redirect', element: <OAuthRedirect /> },
  {
    element: <ProtectedRoute />,
    children: [
      { path: '/', element: <RoomList /> },
      { path: '/join', element: <JoinRoom /> },
      { path: '/rooms/:roomId', element: <Dashboard /> },
      { path: '/rooms/:roomId/feed', element: <Feed /> },
      { path: '/rooms/:roomId/letters', element: <Letters /> },
      { path: '/rooms/:roomId/schedule', element: <Schedule /> },
      { path: '/rooms/:roomId/notifications', element: <Notifications /> },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
])
