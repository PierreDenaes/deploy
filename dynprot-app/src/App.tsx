import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import LoadingSpinner from '@/components/LoadingSpinner';
import ProtectedRoute from './components/auth/ProtectedRoute';
import { AppProvider } from './context/AppContext';
import { AuthProvider } from './context/AuthContext';
import { GlobalLoadingProvider } from './hooks/useLoadingState';

// Lazy load layouts
const MainLayout = lazy(() => import('./layouts/MainLayout'));
const AuthLayout = lazy(() => import('./layouts/AuthLayout'));

// Lazy load pages - Main app pages
const Dashboard = lazy(() => import('./pages/Dashboard'));
const AddMealForm = lazy(() => import('./pages/AddMealForm'));
const Analytics = lazy(() => import('./pages/Analytics'));
const Profile = lazy(() => import('./pages/Profile'));
const NotFound = lazy(() => import('./pages/NotFound'));

// Lazy load auth pages
const Login = lazy(() => import('./pages/auth/Login'));
const Register = lazy(() => import('./pages/auth/Register'));
const ForgotPassword = lazy(() => import('./pages/auth/ForgotPassword'));

// Lazy load onboarding pages
const Welcome = lazy(() => import('./pages/onboarding/Welcome'));
const ProfileSetup = lazy(() => import('./pages/onboarding/ProfileSetup'));
const GoalSetting = lazy(() => import('./pages/onboarding/GoalSetting'));
const AppTour = lazy(() => import('./pages/onboarding/AppTour'));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <GlobalLoadingProvider>
        <AppProvider>
        <TooltipProvider>
          <Toaster />
          <BrowserRouter>
            <Suspense fallback={<LoadingSpinner />}>
              <Routes>
                {/* Authentication Routes */}
                <Route element={<AuthLayout />}>
                  <Route path="/login" element={<Login />} />
                  <Route path="/register" element={<Register />} />
                  <Route path="/forgot-password" element={<ForgotPassword />} />
                </Route>

                {/* Onboarding Routes */}
                <Route path="/onboarding" element={
                  <ProtectedRoute requireOnboarding={false}>
                    <Welcome />
                  </ProtectedRoute>
                } />
                <Route path="/onboarding/profile-setup" element={
                  <ProtectedRoute requireOnboarding={false}>
                    <ProfileSetup />
                  </ProtectedRoute>
                } />
                <Route path="/onboarding/goal-setting" element={
                  <ProtectedRoute requireOnboarding={false}>
                    <GoalSetting />
                  </ProtectedRoute>
                } />
                <Route path="/onboarding/app-tour" element={
                  <ProtectedRoute requireOnboarding={false}>
                    <AppTour />
                  </ProtectedRoute>
                } />

                {/* Protected App Routes */}
                <Route element={
                  <ProtectedRoute>
                    <MainLayout />
                  </ProtectedRoute>
                }>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/add-meal" element={<AddMealForm />} />
                  <Route path="/analytics" element={<Analytics />} />
                  <Route path="/profile" element={<Profile />} />
                  {/* Redirect legacy routes to analytics with appropriate tabs */}
                  <Route path="/history" element={<Analytics />} />
                  <Route path="/summary" element={<Analytics />} />
                  {/* Redirect legacy scan route to add-meal */}
                  <Route path="/scan" element={<AddMealForm />} />
                </Route>

                {/* 404 Route */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </TooltipProvider>
        </AppProvider>
      </GlobalLoadingProvider>
    </AuthProvider>
    <ReactQueryDevtools initialIsOpen={false} />
  </QueryClientProvider>
);

export default App;