import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import LoadingSpinner from '@/components/LoadingSpinner';
import ScrollToTop from '@/components/ScrollToTop';
import ProtectedRoute from './components/auth/ProtectedRoute';
import { AppProvider } from './context/AppContext';
import { AuthProvider } from './context/AuthContext';
import { GlobalLoadingProvider } from './hooks/useLoadingState';
import { ThemeProvider } from './context/ThemeContext';

// Lazy load layouts
const MainLayout = lazy(() => import('./layouts/MainLayout'));
const AuthLayout = lazy(() => import('./layouts/AuthLayout'));

// Lazy load pages - Main app pages
const Dashboard = lazy(() => import('./pages/Dashboard'));
const UnifiedMealEntry = lazy(() => import('./pages/UnifiedMealEntry'));
const Analytics = lazy(() => import('./pages/Analytics'));
const Profile = lazy(() => import('./pages/Profile'));
const Recommendations = lazy(() => import('./pages/Recommendations'));
const NotFound = lazy(() => import('./pages/NotFound'));

// Lazy load auth pages
const AuthTabs = lazy(() => import('./components/auth/AuthTabs'));
const ForgotPassword = lazy(() => import('./pages/auth/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/auth/ResetPassword'));

// Keep old components for backward compatibility (temporary)
const Login = lazy(() => import('./pages/auth/Login'));
const Register = lazy(() => import('./pages/auth/Register'));

// Lazy load onboarding pages
const Welcome = lazy(() => import('./pages/onboarding/Welcome'));
const ProfileSetup = lazy(() => import('./pages/onboarding/ProfileSetup'));
const GoalSetting = lazy(() => import('./pages/onboarding/GoalSetting'));
const AppTour = lazy(() => import('./pages/onboarding/AppTour'));

// Lazy load information pages
const ProteinCalculationExplanation = lazy(() => import('./pages/ProteinCalculationExplanation'));

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
    <ThemeProvider defaultTheme="system" storageKey="dynprot-theme">
      <AuthProvider>
        <GlobalLoadingProvider>
          <AppProvider>
          <TooltipProvider>
          <Toaster />
          <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <ScrollToTop />
            <Suspense fallback={<LoadingSpinner />}>
              <Routes>
                {/* Authentication Routes */}
                <Route element={<AuthLayout />}>
                  {/* New unified auth component */}
                  <Route path="/auth" element={<AuthTabs />} />
                  
                  {/* Redirect old routes to unified component */}
                  <Route path="/login" element={<AuthTabs />} />
                  <Route path="/register" element={<AuthTabs />} />
                  
                  {/* Password reset routes */}
                  <Route path="/forgot-password" element={<ForgotPassword />} />
                  <Route path="/reset-password" element={<ResetPassword />} />
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
                  <Route path="/add-meal" element={<UnifiedMealEntry />} />
                  <Route path="/analytics" element={<Analytics />} />
                  <Route path="/profile" element={<Profile />} />
                  <Route path="/recommendations" element={<Recommendations />} />
                  {/* Redirect nutrition-analysis to Analytics with AI tab */}
                  <Route path="/nutrition-analysis" element={<Analytics />} />
                  <Route path="/protein-calculation-explained" element={<ProteinCalculationExplanation />} />
                  {/* Redirect legacy routes to analytics with appropriate tabs */}
                  <Route path="/history" element={<Analytics />} />
                  <Route path="/summary" element={<Analytics />} />
                  {/* Redirect legacy scan route to add-meal */}
                  <Route path="/scan" element={<UnifiedMealEntry />} />
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
    </ThemeProvider>
    <ReactQueryDevtools initialIsOpen={false} />
  </QueryClientProvider>
);

export default App;