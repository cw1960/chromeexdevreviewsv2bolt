import React, { useEffect, useState } from 'react'
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
  NumberInput,
  Switch
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
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<string | null>('overview')
  
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
  const [userModalOpen, setUserModalOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [assignmentsLoading, setAssignmentsLoading] = useState(false)

  const verificationForm = useForm({
    initialValues: {
      status: 'verified' as 'verified' | 'rejected',
      rejection_reason: ''
    }
  })

  const userForm = useForm({
    initialValues: {
      credit_balance: 0,
      role: 'user' as 'admin' | 'moderator' | 'user',
      has_completed_qualification: false
    }
  })

  useEffect(() => {
    if (profile?.role === 'admin') {
      fetchAdminData()
    }
  }, [profile])

  const fetchAdminData = async () => {
    try {
      setLoading(true)
      
      // Fetch all data in parallel
      const [
        usersResult,
        extensionsResult,
        assignmentsResult,
        transactionsResult
      ] = await Promise.all([
        supabase.from('users').select('*').order('created_at', { ascending: false }),
        supabase
          .from('extensions')
          .select(`
            *,
            owner:users(*)
          `)
          .order('created_at', { ascending: false }),
        supabase
          .from('review_assignments')
          .select(`
            *,
            extension:extensions(*),
            reviewer:users(*)
          `)
          .order('assigned_at', { ascending: false })
          .limit(50),
        supabase
          .from('credit_transactions')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(100)
      ])

      if (usersResult.error) throw usersResult.error
      if (extensionsResult.error) throw extensionsResult.error
      if (assignmentsResult.error) throw assignmentsResult.error
      if (transactionsResult.error) throw transactionsResult.error

      const usersData = usersResult.data || []
      const extensionsData = extensionsResult.data || []
      const assignmentsData = assignmentsResult.data || []
      const transactionsData = transactionsResult.data || []

      setUsers(usersData)
      setExtensions(extensionsData as ExtensionWithOwner[])
      setAssignments(assignmentsData as AssignmentWithDetails[])
      setTransactions(transactionsData)

      // Calculate stats
      const totalCreditsIssued = transactionsData
        .filter(t => t.type === 'earned')
        .reduce((sum, t) => sum + t.amount, 0)

      setStats({
        totalUsers: usersData.length,
        totalExtensions: extensionsData.length,
        pendingVerifications: extensionsData.filter(e => 
          e.status === 'pending_verification' || e.status === 'queued'
        ).length,
        activeReviews: assignmentsData.filter(a => a.status === 'assigned').length,
        totalCreditsIssued,
        avgQueueTime: '2.3 days' // This would be calculated from actual data
      })

    } catch (error) {
      console.error('Error fetching admin data:', error)
      notifications.show({
        title: 'Error',
        message: 'Failed to load admin data',
        color: 'red'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyExtension = async (values: typeof verificationForm.values) => {
    if (!selectedExtension) return

    try {
      const { error } = await supabase
        .from('extensions')
        .update({
          status: values.status,
          rejection_reason: values.status === 'rejected' ? values.rejection_reason : null,
          admin_verified: values.status === 'verified'
        })
        .eq('id', selectedExtension.id)

      if (error) throw error

      // Send email notification to the extension owner
      try {
        const ownerEmail = selectedExtension.owner?.email
        const ownerName = selectedExtension.owner?.name || 'Developer'
        
        if (ownerEmail) {
          if (values.status === 'verified') {
            await sendTransactionalEmail({
              to: ownerEmail,
              subject: `Extension "${selectedExtension.name}" Approved!`,
              html: createApprovalEmail(selectedExtension.name, ownerName),
              type: 'extension_approved'
            })
          } else if (values.status === 'rejected') {
            await sendTransactionalEmail({
              to: ownerEmail,
              subject: `Extension "${selectedExtension.name}" Needs Review`,
              html: createRejectionEmail(selectedExtension.name, ownerName, values.rejection_reason || 'No specific reason provided'),
              type: 'extension_rejected'
            })
          }
        }
      } catch (emailError) {
        console.error('Failed to send notification email:', emailError)
        // Don't fail the verification process if email fails
      }

      notifications.show({
        title: 'Success',
        message: `Extension ${values.status === 'verified' ? 'approved' : 'rejected'}. Notification email sent to owner.`,
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

  const handleUpdateUser = async (values: typeof userForm.values) => {
    if (!selectedUser) return

    try {
      // Update user profile
      const { error: userError } = await supabase
        .from('users')
        .update({
          credit_balance: values.credit_balance,
          role: values.role,
          has_completed_qualification: values.has_completed_qualification
        })
        .eq('id', selectedUser.id)

      if (userError) throw userError

      // If credit balance changed, create a transaction record
      const creditDiff = values.credit_balance - selectedUser.credit_balance
      if (creditDiff !== 0) {
        const { error: transactionError } = await supabase
          .from('credit_transactions')
          .insert({
            user_id: selectedUser.id,
            amount: creditDiff,
            type: creditDiff > 0 ? 'earned' : 'spent',
            description: `Admin adjustment: ${creditDiff > 0 ? 'added' : 'removed'} ${Math.abs(creditDiff)} credits`
          })

        if (transactionError) throw transactionError
      }

      notifications.show({
        title: 'Success',
        message: 'User updated successfully',
        color: 'green'
      })

      setUserModalOpen(false)
      setSelectedUser(null)
      userForm.reset()
      fetchAdminData()
    } catch (error: any) {
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to update user',
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

  const openUserModal = (user: User) => {
    setSelectedUser(user)
    userForm.setValues({
      credit_balance: user.credit_balance,
      role: user.role,
      has_completed_qualification: user.has_completed_qualification
    })
    setUserModalOpen(true)
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
    return (
      <Container size="lg">
        <Text>Loading admin dashboard...</Text>
      </Container>
    )
  }

  return (
    <Container size="xl">
      <Group justify="space-between" mb="xl">
        <div>
          <Title order={1}>Admin Dashboard</Title>
          <Text c="dimmed" size="lg">
            Manage users, extensions, and review assignments
          </Text>
        </div>
        <Badge size="lg" variant="light" color="red">
          Administrator
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
                          <Text fw={500}>{extension.name}</Text>
                          <Text size="sm" c="dimmed" truncate maw={200}>
                            {extension.description}
                          </Text>
                        </div>
                      </Group>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">{extension.owner?.name || 'Unknown'}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Badge color={getStatusColor(extension.status)} size="sm">
                        {getStatusLabel(extension.status)}
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
                  <Table.Th>Joined</Table.Th>
                  <Table.Th>Actions</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {users.slice(0, 20).map((user) => (
                  <Table.Tr key={user.id}>
                    <Table.Td>
                      <div>
                        <Text fw={500}>{user.name || 'No name'}</Text>
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
                      <Text size="sm">
                        {new Date(user.created_at).toLocaleDateString()}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <ActionIcon
                        variant="light"
                        size="sm"
                        onClick={() => openUserModal(user)}
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
                      <Text size="sm">{assignment.extension?.name || 'Unknown'}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">{assignment.reviewer?.name || 'Unknown'}</Text>
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

      {/* User Management Modal */}
      <Modal
        opened={userModalOpen}
        onClose={() => setUserModalOpen(false)}
        title="Edit User"
        size="md"
      >
        <form onSubmit={userForm.onSubmit(handleUpdateUser)}>
          <Stack>
            {selectedUser && (
              <Card withBorder p="md" mb="md">
                <div>
                  <Text fw={600}>{selectedUser.name}</Text>
                  <Text size="sm" c="dimmed">{selectedUser.email}</Text>
                  <Text size="xs" c="dimmed">
                    Joined: {new Date(selectedUser.created_at).toLocaleDateString()}
                  </Text>
                </div>
              </Card>
            )}
            
            <NumberInput
              label="Credit Balance"
              min={0}
              {...userForm.getInputProps('credit_balance')}
            />
            
            <Select
              label="Role"
              data={[
                { value: 'user', label: 'User' },
                { value: 'moderator', label: 'Moderator' },
                { value: 'admin', label: 'Administrator' }
              ]}
              {...userForm.getInputProps('role')}
            />
            
            <Switch
              label="Has Completed Qualification"
              {...userForm.getInputProps('has_completed_qualification', { type: 'checkbox' })}
            />
            
            <Group justify="flex-end">
              <Button variant="light" onClick={() => setUserModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">
                Update User
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>
    </Container>
  )
}