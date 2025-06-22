import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Container,
  Title,
  Grid,
  Card,
  Text,
  Group,
  Badge,
  Stack,
  Button,
  Table,
  ActionIcon,
  Modal,
  TextInput,
  Textarea,
  Select,
  Tabs,
  Alert,
  Progress,
  Avatar,
  Divider,
} from '@mantine/core'
import { useForm } from '@mantine/form'
import { notifications } from '@mantine/notifications'
import { 
  Users, 
  Package, 
  Star, 
  TrendingUp, 
  CheckCircle, 
  XCircle, 
  Edit, 
  Eye,
  AlertTriangle,
  Clock,
  Shield,
  CreditCard,
  Mail,
  Settings
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import type { Database } from '../types/database'
import { sendTransactionalEmail, createApprovalEmail, createRejectionEmail } from '../utils/sendTransactionalEmail'

type Extension = Database['public']['Tables']['extensions']['Row']
type User = Database['public']['Tables']['users']['Row']
type ReviewAssignment = Database['public']['Tables']['review_assignments']['Row']
type CreditTransaction = Database['public']['Tables']['credit_transactions']['Row']

interface ExtensionWithOwner extends Extension {
  owner: User
}

interface AssignmentWithDetails extends ReviewAssignment {
  extension: Extension
  reviewer: User
}

export function AdminDashboardPage() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  
  // DEBUGGING: Log component initialization
  console.log('🚀 AdminDashboardPage component initialized')
  console.log('👤 Profile from useAuth:', profile)
  console.log('🔐 Profile role:', profile?.role)
  console.log('📍 Current location:', window.location.pathname)
  
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<string | null>('overview')
  
  // DEBUGGING: Log state initialization
  console.log('🔄 Initial loading state:', loading)
  console.log('📑 Initial active tab:', activeTab)
  
  // Data states
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalExtensions: 0,
    pendingVerifications: 0,
    activeReviews: 0,
    totalCreditsIssued: 0,
    avgQueueTime: '0 days'
  })
  
  const [extensions, setExtensions] = useState<ExtensionWithOwner[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [assignments, setAssignments] = useState<AssignmentWithDetails[]>([])
  const [transactions, setTransactions] = useState<CreditTransaction[]>([])
  
  // Modal states
  const [verificationModalOpen, setVerificationModalOpen] = useState(false)
  const [selectedExtension, setSelectedExtension] = useState<Extension | null>(null)
  const [assignmentsLoading, setAssignmentsLoading] = useState(false)

  // DEBUGGING: Log data states initialization
  console.log('📊 Initial stats state:', stats)
  console.log('📦 Initial extensions length:', extensions.length)
  console.log('👥 Initial users length:', users.length)
  console.log('📝 Initial assignments length:', assignments.length)
  console.log('💳 Initial transactions length:', transactions.length)

  const verificationForm = useForm({
    initialValues: {
      status: 'verified' as 'verified' | 'rejected',
      rejection_reason: ''
    }
  })

  useEffect(() => {
    console.log('🔍 useEffect triggered - checking admin role')
    console.log('👤 Profile in useEffect:', profile)
    console.log('🔐 Profile role in useEffect:', profile?.role)
    
    if (profile?.role === 'admin') {
      console.log('✅ User is admin, calling fetchAdminData')
      fetchAdminData()
    } else {
      console.log('❌ User is not admin or profile not loaded yet')
      console.log('🔐 Current role:', profile?.role)
    }
  }, [profile?.role])

  const fetchAdminData = async () => {
    console.log('📡 fetchAdminData function called')
    
    try {
      setLoading(true)
      console.log('🔄 Set loading to true')
      console.log('Fetching admin data via Edge Function...')
      
      const { data, error } = await supabase.functions.invoke('fetch-admin-dashboard-data')

      console.log('📨 Edge function response received')
      console.log('📊 Response data:', data)
      console.log('❌ Response error:', error)

      if (error) {
        console.error('Edge function error:', error)
        console.error('❌ CRITICAL: Edge function failed with error:', error)
        throw error
      }

      if (!data?.success) {
        console.error('❌ CRITICAL: Edge function returned unsuccessful response:', data)
        throw new Error(data?.error || 'Failed to fetch admin data')
      }

      const { users: usersData, extensions: extensionsData, assignments: assignmentsData, transactions: transactionsData, stats: statsData } = data.data

      console.log('📊 Extracted data from response:')
      console.log('👥 Users data:', usersData)
      console.log('📦 Extensions data:', extensionsData)
      console.log('📝 Assignments data:', assignmentsData)
      console.log('💳 Transactions data:', transactionsData)
      console.log('📈 Stats data:', statsData)

      // Set the data from Edge Function response
      console.log('🔄 Setting state with fetched data...')
      setUsers(usersData)
      console.log('✅ Users state set')
      setExtensions(extensionsData as ExtensionWithOwner[])
      console.log('✅ Extensions state set')
      setAssignments(assignmentsData as AssignmentWithDetails[])
      console.log('✅ Assignments state set')
      setTransactions(transactionsData)
      console.log('✅ Transactions state set')
      setStats(statsData)
      console.log('✅ Stats state set')

      console.log('Admin data fetch completed successfully')
      console.log('🎉 All data successfully loaded and state updated')

    } catch (error) {
      console.error('Error fetching admin data:', error)
      console.error('💥 CRITICAL ERROR in fetchAdminData:', error)
      console.error('💥 Error stack:', error.stack)
      console.error('💥 Error message:', error.message)
      notifications.show({
        title: 'Error',
        message: 'Failed to load admin data. Please try again.',
        color: 'red'
      })
    } finally {
      setLoading(false)
      console.log('🔄 Set loading to false - fetch process completed')
    }
  }

  const handleVerifyExtension = async (values: typeof verificationForm.values) => {
    if (!selectedExtension) return

    try {
      console.log('Processing extension verification via Edge Function...')
      
      const { data, error } = await supabase.functions.invoke('process-extension-verification', {
        body: {
          extensionId: selectedExtension.id,
          status: values.status,
          rejection_reason: values.status === 'rejected' ? values.rejection_reason : null
        }
      })

      if (error) throw error

      if (!data?.success) {
        throw new Error(data?.error || 'Failed to process extension verification')
      }

      notifications.show({
        title: 'Success',
        message: data.message || `Extension ${values.status === 'verified' ? 'approved' : 'rejected'} successfully`,
        color: values.status === 'verified' ? 'green' : 'orange'
      })

      setVerificationModalOpen(false)
      setSelectedExtension(null)
      verificationForm.reset()
      fetchAdminData()
    } catch (error: any) {
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to update extension',
        color: 'red'
      })
    }
  }

  const openVerificationModal = (extension: Extension) => {
    setSelectedExtension(extension)
    verificationForm.setValues({
      status: 'verified',
      rejection_reason: ''
    })
    setVerificationModalOpen(true)
  }

  const navigateToUserProfile = (userId: string) => {
    navigate(`/admin/users/${userId}`)
  }

  const handleTriggerAssignments = async () => {
    setAssignmentsLoading(true)
    try {
      const { data, error } = await supabase.functions.invoke('assign-reviews', {
        body: { max_assignments: 10 }
      })

      if (error) {
        console.error('Edge function error:', error)
        throw error
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Failed to trigger assignments')
      }

      notifications.show({
        title: 'Assignments Triggered',
        message: `Successfully created ${data.assignments_created} new review assignments`,
        color: 'green'
      })

      // Refresh the admin data to show updated stats
      fetchAdminData()
    } catch (error: any) {
      console.error('Assignment trigger error:', error)
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to trigger assignments',
        color: 'red'
      })
    } finally {
      setAssignmentsLoading(false)
    }
  }

  const getStatusColor = (status: Extension['status']) => {
    switch (status) {
      case 'verified': return 'green'
      case 'pending_verification': 
      case 'queued': return 'blue'
      case 'assigned': return 'purple'
      case 'reviewed': return 'orange'
      case 'rejected': return 'red'
      case 'library': return 'gray'
      default: return 'gray'
    }
  }

  const getRoleColor = (role: User['role']) => {
    switch (role) {
      case 'admin': return 'red'
      case 'moderator': return 'blue'
      default: return 'gray'
    }
  }

  const getStatusLabel = (status: Extension['status']) => {
    switch (status) {
      case 'verified': 
      case 'library': return 'In my Library'
      case 'pending_verification': return 'In Review Queue'
      case 'queued': return 'In Review Queue'
      case 'assigned': return 'Selected for Review'
      case 'reviewed': return 'Review Submitted'
      case 'rejected': return 'Rejected'
      default: return 'Unknown'
    }
  }

  if (profile?.role !== 'admin') {
    console.log('🚫 Access denied - user is not admin')
    console.log('👤 Current profile:', profile)
    console.log('🔐 Current role:', profile?.role)
    return (
      <Container size="md">
        <Alert
          icon={<Shield size={16} />}
          title="Access Denied"
          color="red"
        >
          You don't have permission to access the admin dashboard.
        </Alert>
      </Container>
    )
  }

  if (loading) {
    console.log('⏳ Showing loading state')
    console.log('🔄 Loading value:', loading)
    return (
      <Container size="lg">
        <Text>Loading admin dashboard...</Text>
      </Container>
    )
  }

  // DEBUGGING: Log final render state
  console.log('🎨 About to render main dashboard content')
  console.log('📊 Final stats for render:', stats)
  console.log('📦 Final extensions count:', extensions.length)
  console.log('👥 Final users count:', users.length)
  console.log('📝 Final assignments count:', assignments.length)
  console.log('💳 Final transactions count:', transactions.length)
  console.log('📑 Active tab:', activeTab)

  return (
    <Container size="xl">
      {/* DEBUGGING: Add visible indicator that component is rendering */}
      <div style={{ position: 'fixed', top: 10, right: 10, background: 'green', color: 'white', padding: '5px', zIndex: 9999, fontSize: '12px' }}>
        Admin Dashboard Loaded ✅
      </div>
      
      <Group justify="space-between" mb="xl">
        <div>
          <Title order={1}>Admin Dashboard</Title>
          <Text c="dimmed" size="lg">
            Manage users, extensions, and review assignments
          </Text>
        </div>
        <Group>
          <Badge size="lg" variant="light" color="red">
            Administrator
          </Badge>
        </Group>
      </Group>

      <Group mb="md">
        <Badge color="blue">
          {assignments.filter(a => a.status === 'assigned').length} Active Reviews
        </Badge>
        <Badge color="green">
          {assignments.filter(a => a.status === 'approved').length} Completed Reviews
        </Badge>
      </Group>

      <Tabs value={activeTab} onChange={setActiveTab}>
        <Tabs.List>
          <Tabs.Tab value="overview" leftSection={<TrendingUp size={16} />}>
            Overview
          </Tabs.Tab>
          <Tabs.Tab value="extensions" leftSection={<Package size={16} />}>
            Extensions
          </Tabs.Tab>
          <Tabs.Tab value="users" leftSection={<Users size={16} />}>
            Users
          </Tabs.Tab>
          <Tabs.Tab value="reviews" leftSection={<Star size={16} />}>
            Reviews
          </Tabs.Tab>
          <Tabs.Tab value="credits" leftSection={<CreditCard size={16} />}>
            Credits
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="overview" pt="md">
          <Grid>
            <Grid.Col span={{ base: 12, md: 4 }}>
              <Card withBorder>
                <Group justify="space-between" mb="md">
                  <Text fw={600}>Total Users</Text>
                  <Users size={20} />
                </Group>
                <Text size="xl" fw={700} mb="xs">
                  {stats.totalUsers}
                </Text>
                <Text size="sm" c="dimmed">
                  Registered developers
                </Text>
              </Card>
            </Grid.Col>

            <Grid.Col span={{ base: 12, md: 4 }}>
              <Card withBorder>
                <Group justify="space-between" mb="md">
                  <Text fw={600}>Total Extensions</Text>
                  <Package size={20} />
                </Group>
                <Text size="xl" fw={700} mb="xs">
                  {stats.totalExtensions}
                </Text>
                <Text size="sm" c="dimmed">
                  In the system
                </Text>
              </Card>
            </Grid.Col>

            <Grid.Col span={{ base: 12, md: 4 }}>
              <Card withBorder>
                <Group justify="space-between" mb="md">
                  <Text fw={600}>Extensions in Review Queue</Text>
                </Group>
                <Text size="xl" fw={700} mb="xs" c={stats.pendingVerifications > 0 ? 'orange' : 'green'}>
                  {stats.pendingVerifications}
                </Text>
                <Text size="sm" c="dimmed">
                  Queued for review
                </Text>
              </Card>
            </Grid.Col>

            <Grid.Col span={{ base: 12, md: 4 }}>
              <Card withBorder>
                <Group justify="space-between" mb="md">
                  <Text fw={600}>Active Reviews</Text>
                  <Star size={20} />
                </Group>
                <Text size="xl" fw={700} mb="xs">
                  {stats.activeReviews}
                </Text>
                <Text size="sm" c="dimmed">
                  In progress
                </Text>
              </Card>
            </Grid.Col>

            <Grid.Col span={{ base: 12, md: 4 }}>
              <Card withBorder>
                <Group justify="space-between" mb="md">
                  <Text fw={600}>Credits Issued</Text>
                  <CreditCard size={20} />
                </Group>
                <Text size="xl" fw={700} mb="xs">
                  {stats.totalCreditsIssued}
                </Text>
                <Text size="sm" c="dimmed">
                  Total earned by users
                </Text>
              </Card>
            </Grid.Col>

            <Grid.Col span={{ base: 12, md: 4 }}>
              <Card withBorder>
                <Group justify="space-between" mb="md">
                  <Text fw={600}>Avg Queue Time</Text>
                  <TrendingUp size={20} />
                </Group>
                <Text size="xl" fw={700} mb="xs">
                  {stats.avgQueueTime}
                </Text>
                <Text size="sm" c="dimmed">
                  From submission to assignment
                </Text>
              </Card>
            </Grid.Col>
          </Grid>
        </Tabs.Panel>

        <Tabs.Panel value="extensions" pt="md">
          <Card withBorder>
            <Group justify="space-between" mb="md">
              <Text fw={600}>Extension Management</Text>
              <Badge color="orange">
                {stats.pendingVerifications} In Queue
              </Badge>
            </Group>
            <Table>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Extension</Table.Th>
                  <Table.Th>Owner</Table.Th>
                  <Table.Th>Status</Table.Th>
                    <Table.Th>Plan</Table.Th>
                  <Table.Th>Submitted</Table.Th>
                  <Table.Th>Actions</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {extensions.slice(0, 20).map((extension) => (
                  <Table.Tr key={extension.id}>
                    <Table.Td>
                      <Group>
                        <Avatar size="sm" src={extension.logo_url} />
                        <div>
                          <Text 
                            fw={500} 
                            component="a" 
                            href={extension.chrome_store_url} 
                            target="_blank"
                            style={{ textDecoration: 'none', color: 'inherit' }}
                            className="hover:underline"
                          >
                            {extension.name}
                          </Text>
                          <Text size="sm" c="dimmed" truncate maw={200}>
                            {extension.description}
                          </Text>
                        </div>
                      </Group>
                    </Table.Td>
                    <Table.Td>
                      <Text 
                        size="sm" 
                        component="button"
                        onClick={() => extension.owner?.id && navigateToUserProfile(extension.owner.id)}
                        style={{ 
                          background: 'none', 
                          border: 'none', 
                          cursor: 'pointer',
                          color: 'var(--mantine-color-blue-6)',
                          textDecoration: 'none'
                        }}
                        className="hover:underline"
                      >
                        {extension.owner?.name || 'Unknown'}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Badge color={getStatusColor(extension.status)} size="sm">
                        {getStatusLabel(extension.status)}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Badge 
                        color={extension.owner?.subscription_status === 'premium' ? 'green' : 'blue'} 
                        size="sm"
                      >
                        {extension.owner?.subscription_status === 'premium' ? 'Premium' : 'Free'}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">
                        {extension.created_at ? new Date(extension.created_at).toLocaleDateString() : 'N/A'}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Group gap="xs">
                        <ActionIcon
                          variant="light"
                          size="sm"
                          onClick={() => window.open(extension.chrome_store_url, '_blank')}
                        >
                          <Eye size={14} />
                        </ActionIcon>
                        {extension.status === 'pending_verification' && (
                          <ActionIcon
                            variant="light"
                            color="blue"
                            size="sm"
                            onClick={() => openVerificationModal(extension)}
                          >
                            <Edit size={14} />
                          </ActionIcon>
                        )}
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Card>
        </Tabs.Panel>

        <Tabs.Panel value="users" pt="md">
          <Card withBorder>
            <Group justify="space-between" mb="md">
              <Text fw={600}>User Management</Text>
              <Text size="sm" c="dimmed">
                {users.length} total users
              </Text>
            </Group>
            <Table>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>User</Table.Th>
                  <Table.Th>Role</Table.Th>
                  <Table.Th>Credits</Table.Th>
                  <Table.Th>Qualified</Table.Th>
                  <Table.Th>Plan</Table.Th>
                  <Table.Th>Joined</Table.Th>
                  <Table.Th>Actions</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {users.slice(0, 20).map((user) => (
                  <Table.Tr key={user.id}>
                    <Table.Td>
                      <div>
                        <Text 
                          fw={500}
                          component="button"
                          onClick={() => navigateToUserProfile(user.id)}
                          style={{ 
                            background: 'none', 
                            border: 'none', 
                            cursor: 'pointer',
                            color: 'var(--mantine-color-blue-6)',
                            textDecoration: 'none'
                          }}
                          className="hover:underline"
                        >
                          {user.name || 'No name'}
                        </Text>
                        <Text size="sm" c="dimmed">
                          {user.email}
                        </Text>
                      </div>
                    </Table.Td>
                    <Table.Td>
                      <Badge color={getRoleColor(user.role)} size="sm">
                        {user.role}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Text fw={600}>{user.credit_balance}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Badge 
                        color={user.has_completed_qualification ? 'green' : 'gray'} 
                        size="sm"
                      >
                        {user.has_completed_qualification ? 'Yes' : 'No'}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Badge 
                        color={user.subscription_status === 'premium' ? 'green' : 'blue'} 
                        size="sm"
                      >
                        {user.subscription_status === 'premium' ? 'Premium' : 'Free'}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">
                        {new Date(user.created_at).toLocaleDateString()}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <ActionIcon
                        variant="light"
                        size="sm"
                        onClick={() => navigateToUserProfile(user.id)}
                      >
                        <Edit size={14} />
                      </ActionIcon>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Card>
        </Tabs.Panel>

        <Tabs.Panel value="reviews" pt="md">
          <Card withBorder>
            <Group justify="space-between" mb="md">
              <Text fw={600}>Review Assignments</Text>
              <Group>
                <Badge color="blue">
                  {assignments.filter(a => a.status === 'assigned').length} Active
                </Badge>
                <Badge color="green">
                  {assignments.filter(a => a.status === 'approved').length} Completed
                </Badge>
              </Group>
            </Group>
            <Table>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Assignment</Table.Th>
                  <Table.Th>Extension</Table.Th>
                  <Table.Th>Reviewer</Table.Th>
                  <Table.Th>Status</Table.Th>
                  <Table.Th>Date</Table.Th>
                  <Table.Th>Rating</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {assignments.slice(0, 20).map((assignment) => (
                  <Table.Tr key={assignment.id}>
                    <Table.Td>
                      <Text fw={500}>#{assignment.assignment_number}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Text 
                        size="sm"
                        component="a" 
                        href={assignment.extension?.chrome_store_url} 
                        target="_blank"
                        style={{ textDecoration: 'none', color: 'inherit' }}
                        className="hover:underline"
                      >
                        {assignment.extension?.name || 'Unknown'}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Text 
                        size="sm"
                        component="button"
                        onClick={() => assignment.reviewer?.id && navigateToUserProfile(assignment.reviewer.id)}
                        style={{ 
                          background: 'none', 
                          border: 'none', 
                          cursor: 'pointer',
                          color: 'var(--mantine-color-blue-6)',
                          textDecoration: 'none'
                        }}
                        className="hover:underline"
                      >
                        {assignment.reviewer?.name || 'Unknown'}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Badge 
                        color={assignment.status === 'assigned' ? 'blue' : 'green'} 
                        size="sm"
                      >
                        {assignment.status === 'assigned' ? 'In Progress' : 'Completed'}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">
                        {assignment.status === 'approved' && assignment.submitted_at 
                          ? `Completed: ${new Date(assignment.submitted_at).toLocaleDateString()}`
                          : `Due: ${new Date(assignment.due_at).toLocaleDateString()}`
                        }
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">
                        {assignment.rating ? (
                          <Group gap="xs">
                            {[...Array(assignment.rating)].map((_, i) => (
                              <Star key={i} size={12} fill="#ffd43b" color="#ffd43b" />
                            ))}
                          </Group>
                        ) : (
                          '-'
                        )}
                      </Text>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Card>
        </Tabs.Panel>

        <Tabs.Panel value="credits" pt="md">
          <Card withBorder>
            <Group justify="space-between" mb="md">
              <Text fw={600}>Credit Transactions</Text>
              <Text size="sm" c="dimmed">
                Recent activity
              </Text>
            </Group>
            <Table>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>User</Table.Th>
                  <Table.Th>Amount</Table.Th>
                  <Table.Th>Type</Table.Th>
                  <Table.Th>Description</Table.Th>
                  <Table.Th>Date</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {transactions.slice(0, 20).map((transaction) => (
                  <Table.Tr key={transaction.id}>
                    <Table.Td>
                      <Text size="sm">{transaction.user_id}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Text 
                        fw={600} 
                        c={transaction.type === 'earned' ? 'green' : 'red'}
                      >
                        {transaction.type === 'earned' ? '+' : '-'}{Math.abs(transaction.amount)}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Badge 
                        color={transaction.type === 'earned' ? 'green' : 'red'} 
                        size="sm"
                      >
                        {transaction.type}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" truncate maw={200}>
                        {transaction.description}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">
                        {new Date(transaction.created_at).toLocaleDateString()}
                      </Text>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Card>
        </Tabs.Panel>
      </Tabs>

    </Container>
  )
}