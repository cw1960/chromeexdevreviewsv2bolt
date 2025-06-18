import React, { useEffect, useState } from 'react'
import {
  Container,
  Title,
  Card,
  Text,
  Group,
  Badge,
  Stack,
  Button,
  Grid,
  Avatar,
  Progress,
  Alert,
  Modal,
  Textarea,
  Rating,
  TextInput,
  Divider,
  ActionIcon,
  Tooltip,
  Box
} from '@mantine/core'
import { useForm } from '@mantine/form'
import { notifications } from '@mantine/notifications'
import { 
  Clock, 
  Star, 
  CheckCircle, 
  AlertTriangle, 
  ExternalLink,
  Calendar,
  Timer,
  Package,
  Eye,
  MessageSquare,
  Upload,
  Award
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import type { Database } from '../types/database'

type ReviewAssignment = Database['public']['Tables']['review_assignments']['Row']
type Extension = Database['public']['Tables']['extensions']['Row']

interface AssignmentWithExtension extends ReviewAssignment {
  extension: Extension
}

export function ReviewQueuePage() {
  const { profile } = useAuth()
  const [assignments, setAssignments] = useState<AssignmentWithExtension[]>([])
  const [loading, setLoading] = useState(true)
  const [submissionModalOpen, setSubmissionModalOpen] = useState(false)
  const [selectedAssignment, setSelectedAssignment] = useState<AssignmentWithExtension | null>(null)

  const submissionForm = useForm({
    initialValues: {
      review_text: '',
      rating: 5,
      chrome_store_proof: ''
    },
    validate: {
      review_text: (value) => (value.length < 50 ? 'Review must be at least 50 characters' : null),
      rating: (value) => (value < 1 || value > 5 ? 'Rating must be between 1 and 5' : null),
      chrome_store_proof: (value) => (!value ? 'Chrome Store proof URL is required' : null)
    }
  })

  useEffect(() => {
    fetchAssignments()
  }, [])

  const fetchAssignments = async () => {
    try {
      const { data, error } = await supabase
        .from('review_assignments')
        .select(`
          *,
          extension:extensions(*)
        `)
        .eq('reviewer_id', profile?.id)
        .order('due_at', { ascending: true })

      if (error) throw error
      setAssignments(data as AssignmentWithExtension[] || [])
    } catch (error) {
      console.error('Error fetching assignments:', error)
      notifications.show({
        title: 'Error',
        message: 'Failed to load review assignments',
        color: 'red'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleMarkInstalled = async (assignment: AssignmentWithExtension) => {
    try {
      const { error } = await supabase
        .from('review_assignments')
        .update({
          installed_at: new Date().toISOString(),
          earliest_review_time: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours from now
        })
        .eq('id', assignment.id)

      if (error) throw error

      notifications.show({
        title: 'Success',
        message: 'Extension marked as installed. You can submit your review in 24 hours.',
        color: 'green'
      })
      fetchAssignments()
    } catch (error: any) {
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to mark extension as installed',
        color: 'red'
      })
    }
  }

  const handleSubmitReview = async (values: typeof submissionForm.values) => {
    if (!selectedAssignment) return

    try {
      // Call the process-submitted-review Edge Function
      const { data, error } = await supabase.functions.invoke('process-submitted-review', {
        body: {
          assignment_id: selectedAssignment.id,
          review_text: values.review_text,
          rating: values.rating,
          chrome_store_proof: values.chrome_store_proof
        }
      })

      if (error) {
        console.error('Edge function error:', error)
        throw error
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Failed to process review submission')
      }

      notifications.show({
        title: 'Review Submitted and Approved!',
        message: `Your review has been approved and you've earned ${data.credits_earned || 1} credit!`,
        color: 'green'
      })

      setSubmissionModalOpen(false)
      setSelectedAssignment(null)
      submissionForm.reset()
      fetchAssignments()
      
      // Refresh user profile to update credit balance
      if (typeof window !== 'undefined') {
        window.location.reload()
      }
    } catch (error: any) {
      console.error('Review submission error:', error)
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to process review submission',
        color: 'red'
      })
    }
  }

  const openSubmissionModal = (assignment: AssignmentWithExtension) => {
    setSelectedAssignment(assignment)
    submissionForm.reset()
    setSubmissionModalOpen(true)
  }

  const getStatusColor = (assignment: AssignmentWithExtension) => {
    if (assignment.status === 'submitted') return 'orange'
    if (assignment.status === 'approved') return 'green'
    if (!assignment.installed_at) return 'blue'
    if (assignment.earliest_review_time && new Date(assignment.earliest_review_time) > new Date()) return 'yellow'
    return 'purple'
  }

  const getStatusLabel = (assignment: AssignmentWithExtension) => {
    if (assignment.status === 'submitted') return 'Review Submitted'
    if (assignment.status === 'approved') return 'Review Approved'
    if (!assignment.installed_at) return 'Install Required'
    if (assignment.earliest_review_time && new Date(assignment.earliest_review_time) > new Date()) return 'Waiting Period'
    return 'Ready to Review'
  }

  const canSubmitReview = (assignment: AssignmentWithExtension) => {
    return assignment.installed_at && 
           assignment.earliest_review_time && 
           new Date(assignment.earliest_review_time) <= new Date() &&
           assignment.status === 'assigned'
  }

  const getDaysUntilDue = (dueDate: string) => {
    const days = Math.ceil((new Date(dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    return days
  }

  const getTimeUntilReviewable = (earliestTime: string) => {
    const hours = Math.ceil((new Date(earliestTime).getTime() - Date.now()) / (1000 * 60 * 60))
    if (hours <= 0) return 'Now'
    if (hours < 24) return `${hours}h`
    return `${Math.ceil(hours / 24)}d`
  }

  if (loading) {
    return (
      <Container size="lg">
        <Text>Loading review assignments...</Text>
      </Container>
    )
  }

  const activeAssignments = assignments.filter(a => a.status === 'assigned')
  const submittedAssignments = assignments.filter(a => a.status === 'submitted')
  const approvedAssignments = assignments.filter(a => a.status === 'approved')

  return (
    <Container size="lg">
      <Group justify="space-between" mb="xl">
        <div>
          <Title order={1}>Review Queue</Title>
          <Text c="dimmed" size="lg">
            Complete your assigned reviews to earn credits
          </Text>
        </div>
        <Group>
          <Badge size="lg" variant="light" color="blue">
            {activeAssignments.length} Active
          </Badge>
          <Badge size="lg" variant="light" color="orange">
            {submittedAssignments.length} Pending
          </Badge>
        </Group>
      </Group>

      {assignments.length === 0 ? (
        <Alert
          icon={<Package size={16} />}
          title="No Review Assignments"
          color="blue"
        >
          You don't have any review assignments yet. {!profile?.has_completed_qualification ? (
            <>
              <Button 
                component="a" 
                href="/qualification" 
                variant="light" 
                size="sm" 
                mt="sm"
              >
                Complete Qualification
              </Button>
              <Text size="sm" mt="xs">
                Complete your reviewer qualification to start receiving assignments and earning credits.
              </Text>
            </>
          ) : (
            'Review assignments will appear here when available.'
          )}
        </Alert>
      ) : (
        <Stack gap="xl">
          {/* Active Assignments */}
          {activeAssignments.length > 0 && (
            <div>
              <Title order={2} size="h3" mb="md">
                Active Assignments ({activeAssignments.length})
              </Title>
              <Grid>
                {activeAssignments.map((assignment) => (
                  <Grid.Col key={assignment.id} span={{ base: 12, md: 6 }}>
                    <Card withBorder h="100%">
                      <Stack gap="md">
                        <Group justify="space-between" align="flex-start">
                          <Group>
                            <Avatar 
                              src={assignment.extension.logo_url} 
                              size="md"
                              radius="sm"
                            />
                            <div>
                              <Text fw={600} size="lg">
                                {assignment.extension.name}
                              </Text>
                              <Text size="sm" c="dimmed">
                                Assignment #{assignment.assignment_number}
                              </Text>
                            </div>
                          </Group>
                          <Badge color={getStatusColor(assignment)} size="sm">
                            {getStatusLabel(assignment)}
                          </Badge>
                        </Group>

                        <Text size="sm" lineClamp={2}>
                          {assignment.extension.description || 'No description available'}
                        </Text>

                        <Group gap="xs">
                          {assignment.extension.category?.map((cat) => (
                            <Badge key={cat} size="xs" variant="light">
                              {cat}
                            </Badge>
                          ))}
                        </Group>

                        <Divider />

                        <Group justify="space-between" align="center">
                          <Group gap="xs">
                            <Calendar size={14} />
                            <Text size="xs" c="dimmed">
                              Due in {getDaysUntilDue(assignment.due_at)} days
                            </Text>
                          </Group>
                          {assignment.earliest_review_time && new Date(assignment.earliest_review_time) > new Date() && (
                            <Group gap="xs">
                              <Timer size={14} />
                              <Text size="xs" c="dimmed">
                                Review in {getTimeUntilReviewable(assignment.earliest_review_time)}
                              </Text>
                            </Group>
                          )}
                        </Group>

                        <Group justify="space-between">
                          <Button
                            variant="light"
                            size="sm"
                            leftSection={<ExternalLink size={16} />}
                            onClick={() => window.open(assignment.extension.chrome_store_url, '_blank')}
                          >
                            View Extension
                          </Button>
                          
                          {!assignment.installed_at ? (
                            <Button
                              size="sm"
                              onClick={() => handleMarkInstalled(assignment)}
                            >
                              Mark as Installed
                            </Button>
                          ) : canSubmitReview(assignment) ? (
                            <Button
                              size="sm"
                              color="green"
                              leftSection={<MessageSquare size={16} />}
                              onClick={() => openSubmissionModal(assignment)}
                            >
                              Submit Review
                            </Button>
                          ) : (
                            <Tooltip label="Complete 24-hour waiting period before reviewing">
                              <Button size="sm" disabled>
                                Waiting Period
                              </Button>
                            </Tooltip>
                          )}
                        </Group>

                        {getDaysUntilDue(assignment.due_at) <= 2 && (
                          <Alert
                            icon={<AlertTriangle size={16} />}
                            color="orange"
                            size="sm"
                          >
                            Due soon! Complete this review to avoid penalties.
                          </Alert>
                        )}
                      </Stack>
                    </Card>
                  </Grid.Col>
                ))}
              </Grid>
            </div>
          )}

          {/* Submitted Assignments */}
          {submittedAssignments.length > 0 && (
            <div>
              <Title order={2} size="h3" mb="md">
                Submitted Reviews ({submittedAssignments.length})
              </Title>
              <Stack gap="sm">
                {submittedAssignments.map((assignment) => (
                  <Card key={assignment.id} withBorder>
                    <Group justify="space-between">
                      <Group>
                        <Avatar 
                          src={assignment.extension.logo_url} 
                          size="sm"
                          radius="sm"
                        />
                        <div>
                          <Text fw={500}>{assignment.extension.name}</Text>
                          <Text size="sm" c="dimmed">
                            Submitted {assignment.submitted_at ? new Date(assignment.submitted_at).toLocaleDateString() : 'Recently'}
                          </Text>
                        </div>
                      </Group>
                      <Group>
                        <Group gap="xs">
                          {[...Array(assignment.rating || 0)].map((_, i) => (
                            <Star key={i} size={14} fill="#ffd43b" color="#ffd43b" />
                          ))}
                        </Group>
                        <Badge color="orange" size="sm">
                          Pending Approval
                        </Badge>
                      </Group>
                    </Group>
                  </Card>
                ))}
              </Stack>
            </div>
          )}

          {/* Approved Assignments */}
          {approvedAssignments.length > 0 && (
            <div>
              <Title order={2} size="h3" mb="md">
                Completed Reviews ({approvedAssignments.length})
              </Title>
              <Stack gap="sm">
                {approvedAssignments.map((assignment) => (
                  <Card key={assignment.id} withBorder>
                    <Group justify="space-between">
                      <Group>
                        <Avatar 
                          src={assignment.extension.logo_url} 
                          size="sm"
                          radius="sm"
                        />
                        <div>
                          <Text fw={500}>{assignment.extension.name}</Text>
                          <Text size="sm" c="dimmed">
                            Completed {assignment.submitted_at ? new Date(assignment.submitted_at).toLocaleDateString() : 'Recently'}
                          </Text>
                        </div>
                      </Group>
                      <Group>
                        <Group gap="xs">
                          {[...Array(assignment.rating || 0)].map((_, i) => (
                            <Star key={i} size={14} fill="#ffd43b" color="#ffd43b" />
                          ))}
                        </Group>
                        <Badge color="green" size="sm" leftSection={<Award size={12} />}>
                          Credits Earned
                        </Badge>
                      </Group>
                    </Group>
                  </Card>
                ))}
              </Stack>
            </div>
          )}
        </Stack>
      )}

      {/* Review Submission Modal */}
      <Modal
        opened={submissionModalOpen}
        onClose={() => setSubmissionModalOpen(false)}
        title="Submit Review"
        size="lg"
      >
        {selectedAssignment && (
          <form onSubmit={submissionForm.onSubmit(handleSubmitReview)}>
            <Stack>
              <Card withBorder p="md">
                <Group>
                  <Avatar 
                    src={selectedAssignment.extension.logo_url} 
                    size="md"
                    radius="sm"
                  />
                  <div>
                    <Text fw={600}>{selectedAssignment.extension.name}</Text>
                    <Text size="sm" c="dimmed">
                      Assignment #{selectedAssignment.assignment_number}
                    </Text>
                  </div>
                </Group>
              </Card>

              <div>
                <Text fw={500} mb="xs">Rating</Text>
                <Rating
                  value={submissionForm.values.rating}
                  onChange={(value) => submissionForm.setFieldValue('rating', value)}
                  size="lg"
                />
              </div>

              <Textarea
                label="Review Text"
                placeholder="Write your detailed review here... (minimum 50 characters)"
                required
                rows={6}
                {...submissionForm.getInputProps('review_text')}
              />

              <TextInput
                label="Chrome Store Proof URL"
                placeholder="https://chromewebstore.google.com/detail/..."
                description="Link to your review on the Chrome Web Store"
                required
                {...submissionForm.getInputProps('chrome_store_proof')}
              />

              <Alert
                icon={<CheckCircle size={16} />}
                color="blue"
              >
                Make sure your review follows Chrome Web Store guidelines and provides genuine feedback about the extension.
              </Alert>

              <Group justify="flex-end">
                <Button variant="light" onClick={() => setSubmissionModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" leftSection={<Upload size={16} />}>
                  Submit Review
                </Button>
              </Group>
            </Stack>
          </form>
        )}
      </Modal>
    </Container>
  )
}