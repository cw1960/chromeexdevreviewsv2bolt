import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { MantineProvider, Loader, Text, Stack, Center } from '@mantine/core'
import { Notifications } from '@mantine/notifications'
import { theme } from './theme'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { StripeProvider } from './contexts/StripeContext'
import { AppLayout } from './components/layout/AppLayout'
import { AuthPage } from './pages/AuthPage'
import { LandingPage } from './pages/LandingPage'
import { DashboardPage } from './pages/DashboardPage'
import { AdminDashboardPage } from './pages/AdminDashboardPage'
import { AdminUserProfilePage } from './pages/AdminUserProfilePage'
import { ExtensionLibraryPage } from './pages/ExtensionLibraryPage'
import { ReviewQueuePage } from './pages/ReviewQueuePage'
import { ProfilePage } from './pages/ProfilePage'
import { OnboardingPage } from './pages/OnboardingPage'
import { QualificationPage } from './pages/QualificationPage'
import { UpgradePage } from './pages/UpgradePage'
import { SuccessPage } from './pages/SuccessPage'

// Import Mantine styles
import '@mantine/core/styles.css'
import '@mantine/notifications/styles.css'
import '@mantine/dates/styles.css'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, profile, loading } = useAuth()

  if (loading) {
    return (
      <Center h="100vh">
        <Stack align="center" gap="md">
          <Loader size="lg" />
          <Text size="lg" c="dimmed">Loading your profile...</Text>
        </Stack>
      </Center>
    )
  }

  if (!user || !profile) {
    return <Navigate to="/auth" replace />
  }

  // Check if user needs to complete onboarding
  if (!profile.onboarding_complete) {
    return <Navigate to="/onboarding" replace />
  }

  // Check if user needs to complete qualification
  if (!profile.has_completed_qualification) {
    return <Navigate to="/qualification" replace />
  }

  return <AppLayout>{children}</AppLayout>
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, profile, loading } = useAuth()

  if (loading) {
    return (
      <Center h="100vh">
        <Stack align="center" gap="md">
          <Loader size="lg" />
          <Text size="lg" c="dimmed">Loading...</Text>
        </Stack>
      </Center>
    )
  }

  if (user && profile && profile.onboarding_complete) {
    return <Navigate to="/dashboard" replace />
  }

  if (user && profile && !profile.onboarding_complete) {
    return <Navigate to="/onboarding" replace />
  }

  return <>{children}</>
}

function OnboardingRoute({ children }: { children: React.ReactNode }) {
  const { user, profile, loading } = useAuth()

  if (loading) {
    return (
      <Center h="100vh">
        <Stack align="center" gap="md">
          <Loader size="lg" />
          <Text size="lg" c="dimmed">Setting up your account...</Text>
        </Stack>
      </Center>
    )
  }

  if (!user || !profile) {
    return <Navigate to="/auth" replace />
  }

  if (profile.onboarding_complete && profile.has_completed_qualification) {
    return <Navigate to="/dashboard" replace />
  }

  if (profile.onboarding_complete && !profile.has_completed_qualification) {
    return <Navigate to="/qualification" replace />
  }

  return <>{children}</>
}

function QualificationRoute({ children }: { children: React.ReactNode }) {
  const { user, profile, loading } = useAuth()

  if (loading) {
    return (
      <Center h="100vh">
        <Stack align="center" gap="md">
          <Loader size="lg" />
          <Text size="lg" c="dimmed">Checking qualification status...</Text>
        </Stack>
      </Center>
    )
  }

  if (!user || !profile) {
    return <Navigate to="/auth" replace />
  }

  if (!profile.onboarding_complete) {
    return <Navigate to="/onboarding" replace />
  }

  if (profile.has_completed_qualification) {
    return <Navigate to="/dashboard" replace />
  }

  return <>{children}</>
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route 
        path="/auth" 
        element={
          <PublicRoute>
            <AuthPage />
          </PublicRoute>
        } 
      />
      <Route 
        path="/onboarding" 
        element={
          <OnboardingRoute>
            <OnboardingPage />
          </OnboardingRoute>
        } 
      />
      <Route 
        path="/qualification" 
        element={
          <QualificationRoute>
            <QualificationPage />
          </QualificationRoute>
        } 
      />
      <Route 
        path="/dashboard" 
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/admin" 
        element={
          <ProtectedRoute>
            <AdminDashboardPage />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/admin/users/:userId" 
        element={
          <ProtectedRoute>
            <AdminUserProfilePage />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/extensions" 
        element={
          <ProtectedRoute>
            <ExtensionLibraryPage />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/reviews" 
        element={
          <ProtectedRoute>
            <ReviewQueuePage />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/profile" 
        element={
          <ProtectedRoute>
            <ProfilePage />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/upgrade" 
        element={
          <ProtectedRoute>
            <UpgradePage />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/success" 
        element={
          <ProtectedRoute>
            <SuccessPage />
          </ProtectedRoute>
        } 
      />
    </Routes>
  )
}

function App() {
  return (
    <MantineProvider theme={theme}>
      <Notifications />
      <AuthProvider>
        <StripeProvider>
          <Router>
            <AppRoutes />
          </Router>
        </StripeProvider>
      </AuthProvider>
    </MantineProvider>
  )
}

export default App