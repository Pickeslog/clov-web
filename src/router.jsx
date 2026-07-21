import { createBrowserRouter, Navigate } from 'react-router-dom'
import ProtectedRoute from './routes/ProtectedRoute'
import Login from './pages/auth/Login/Login'
import Signup from './pages/auth/Signup/Signup'
import OAuthRedirect from './pages/auth/OAuthRedirect/OAuthRedirect'
import RoomList from './pages/rooms/RoomList/RoomList'
import Dashboard from './pages/rooms/Dashboard/Dashboard'

// 라우팅 골격. 보호 라우트는 ProtectedRoute 하위에 둔다.
export const router = createBrowserRouter([
  { path: '/login', element: <Login /> },
  { path: '/signup', element: <Signup /> },
  { path: '/oauth2/redirect', element: <OAuthRedirect /> },
  {
    element: <ProtectedRoute />,
    children: [
      { path: '/', element: <RoomList /> },
      { path: '/rooms/:roomId', element: <Dashboard /> },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
])
