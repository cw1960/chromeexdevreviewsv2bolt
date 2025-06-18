import React, { useEffect, useState } from 'react'
import {
  Title,
  Grid,
  Card,
  Text,
  Group,
  Badge,
  Stack,
  Button,
  Progress,
  Container,
  Notification,
} from '@mantine/core'
import { useNotifications } from '@mantine/notifications'
import { Package, Star, Clock, TrendingUp } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import type { Database } from '../types/database'

type Extension = Database['public']['Tables']['extensions']['Row']
type ReviewAssignment = Database['public']['Tables']['review_assignments']['Row']

export function DashboardPage() {
  const { profile } = useAuth()
  const [extensions, setExtensions] = useState<Extension[]>([])
  const [assignments, setAssignments] = useState<ReviewAssignment[]>([])
  const [loading, setLoading] = useState(true)
  const notifications = useNotifications()

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      const [extensionsResult, assignmentsResult] = await Promise.all([
        supabase
          .from('extensions')
          .select('*')
          .eq('owner_id', profile?.id)
          .order('created_at', { ascending: false })
          .limit(5),
        supabase
          .from('review_assignments')
          .select('*')
          .eq('reviewer_id', profile?.id)
          .eq('status', 'assigned')
          .order('due_at', { ascending: true })
          .limit(3)
      ])

      if (extensionsResult.error) throw extensionsResult.error
      if (assignmentsResult.error) throw assignmentsResult.error

      setExtensions(extensionsResult.data || [])
      setAssignments(assignmentsResult.data || [])
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
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
      default: return 'gray'
    }
  }

  const getStatusLabel = (status: Extension['status']) => {
    switch (status) {
      case 'verified': return 'In my Library'
      case 'pending_verification': 
      case 'queued': return 'In Review Queue'
      case 'assigned': return 'Selected for Review'
      case 'reviewed': return 'Review Submitted'
      case 'rejected': return 'Rejected'
      default: return status.replace('_', ' ')
    }
  }

  const handleMoveToLibrary = async (extension: Extension) => {
    try {
      const { error } = await supabase
        .from('extensions')
        .update({ status: 'verified' })
        .eq('id', extension.id)

      if (error) throw error

      notifications.show({
        title: 'Success',
        message: 'Extension moved back to your library',
        color: 'green'
      })
      fetchDashboardData()
    } catch (error: any) {
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to move extension to library',
        color: 'red'
      })
    }
  }

  const handleSubmitToQueue = async (extension: Extension) => {
    if (profile?.credit_balance < 1) {
      notifications.show({
        title: 'Insufficient Credits',
        message: 'You need at least 1 credit to submit an extension to the review queue',
        color: 'red'
      })
      return
    }

    try {
      const { error: extensionError } = await supabase
        .from('extensions')
        .update({ 
          status: 'pending_verification',
          submitted_to_queue_at: new Date().toISOString(),
          admin_verified: true
        })
        .eq('id', extension.id)

      if (extensionError) throw extensionError

      const { error: creditError } = await supabase
        .from('credit_transactions')
        .insert({
          user_id: profile.id,
          amount: -1,
          type: 'spent',
          description: `Queue submission for ${extension.name}`
        })

      if (creditError) throw creditError

      notifications.show({
        title: 'Success',
        message: 'Extension submitted for review! You will be notified once it\'s approved.',
        color: 'green'
      })
      fetchDashboardData()
    } catch (error: any) {
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to submit extension',
        color: 'red'
      })
    }
  }

  if (loading) {
    return (
      <Container size="lg">
        <Text>Loading dashboard...</Text>
      </Container>
    )
  }

  return (
    <Container size="lg">
      <Group justify="space-between" mb="xl">
        <div>
          <Title order={1}>Welcome back, {profile?.name}!</Title>
          <Text c="dimmed" size="lg">
            Here's what's happening with your extensions and reviews
          </Text>
        </div>
        <Group>
          <Badge size="lg" variant="light" color="blue">
            {profile?.credit_balance || 0} Credits
          </Badge>
        </Group>
      </Group>

      <Grid>
        <Grid.Col span={{ base: 12, md: 4 }}>
          <Card withBorder>
            <Group justify="space-between" mb="md">
              <Text fw={600}>Extensions</Text>
              <Package size={20} />
            </Group>
            <Text size="xl" fw={700} mb="xs">
              {extensions.length}
            </Text>
            <Text size="sm" c="dimmed">
              Total extensions in your library
            </Text>
          </Card>
        </Grid.Col>

        <Grid.Col span={{ base: 12, md: 4 }}>
          <Card withBorder>
            <Group justify="space-between" mb="md">
              <Text fw={600}>Pending Reviews</Text>
              <Star size={20} />
            </Group>
            <Text size="xl" fw={700} mb="xs">
              {assignments.length}
            </Text>
            <Text size="sm" c="dimmed">
              Reviews assigned to you
            </Text>
          </Card>
        </Grid.Col>

        <Grid.Col span={{ base: 12, md: 4 }}>
          <Card withBorder>
            <Group justify="space-between" mb="md">
              <Text fw={600}>Credits Balance</Text>
              <TrendingUp size={20} />
            </Group>
            <Text size="xl" fw={700} mb="xs">
              {profile?.credit_balance || 0}
            </Text>
            <Text size="sm" c="dimmed">
              Available for queue submissions
            </Text>
          </Card>
        </Grid.Col>

        <Grid.Col span={{ base: 12, md: 8 }}>
          <Card withBorder>
            <Group justify="space-between" mb="md">
              <Text fw={600}>Recent Extensions</Text>
              <Button variant="light" size="xs" component="a" href="/extensions">
                View All
              </Button>
            </Group>
            <Stack gap="sm">
              {extensions.length === 0 ? (
                <Text c="dimmed" size="sm">
                  No extensions yet. Add your first extension to get started!
                </Text>
              ) : (
                extensions.map((extension) => (
                  <Group key={extension.id} justify="space-between" wrap="wrap">
                    <Stack>
                      <Text fw={500}>{extension.name}</Text>
                      <Text size="sm" c="dimmed" maw={300} truncate>
                        {extension.description || 'No description'}
                      </Text>
                      {extension.status === 'pending_verification' && extension.submitted_to_queue_at && (
                        <Text size="xs" c="blue">
                          In queue since {new Date(extension.submitted_to_queue_at).toLocaleDateString()}
                        </Text>
                      )}
                      {extension.status === 'assigned' && (
                        <Text size="xs" c="purple">
                          Currently being reviewed
                        </Text>
                      )}
                    </Stack>
                    <Group position="apart" gap="xs" wrap="wrap">
                      <Badge color={getStatusColor(extension.status)} size="sm">
                        {getStatusLabel(extension.status)}
                      </Badge>
                      <Group>
                        {extension.status === 'verified' && profile?.credit_balance > 0 && (
                          <Button
                            size="xs"
                            onClick={() => handleSubmitToQueue(extension)}
                          >
                            Submit to Queue
                          </Button>
                        )}
                        {extension.status === 'rejected' && profile?.credit_balance > 0 && (
                          <Button
                            size="xs"
                            color="orange"
                            onClick={() => handleSubmitToQueue(extension)}
                          >
                            Re-submit to Queue
                          </Button>
                        )}
                        {extension.status === 'reviewed' && (
                          <Button
                            size="xs"
                            color="green"
                            onClick={() => handleMoveToLibrary(extension)}
                          >
                            Add to Library
                          </Button>
                        )}
                      </Group>
                    </Group>
                  </Group>
                ))
              )}
            </Stack>
          </Card>
        </Grid.Col>

        <Grid.Col span={{ base: 12, md: 4 }}>
          <Card withBorder>
            <Group justify="space-between" mb="md">
              <Text fw={600}>Pending Reviews</Text>
              <Clock size={20} />
            </Group>
            <Stack gap="sm">
              {assignments.length === 0 ? (
                <Text c="dimmed" size="sm">
                  No pending reviews. Great job staying on top of your assignments!
                </Text>
              ) : (
                assignments.map((assignment) => (
                  <div key={assignment.id}>
                    <Text size="sm" fw={500}>
                      Review Assignment #{assignment.assignment_number}
                    </Text>
                    <Text size="xs" c="dimmed">
                      Due: {new Date(assignment.due_at).toLocaleDateString()}
                    </Text>
                    <Progress
                      value={Math.max(0, 100 - ((new Date(assignment.due_at).getTime() - Date.now()) / (7 * 24 * 60 * 60 * 1000)) * 100)}
                      size="xs"
                      mt="xs"
                    />
                  </div>
                ))
              )}
            </Stack>
            {assignments.length > 0 && (
              <Button variant="light" size="xs" fullWidth mt="md" component="a" href="/reviews">
                View All Reviews
              </Button>
            )}
          </Card>
        </Grid.Col>
      </Grid>
    </Container>
  )
}