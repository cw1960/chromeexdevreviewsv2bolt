import React, { useEffect, useState } from 'react'
import {
  Container,
  Title,
  Button,
  Table,
  Badge,
  Group,
  ActionIcon,
  Text,
  Modal,
  TextInput,
  Textarea,
  Select,
  MultiSelect,
  Stack,
  Alert,
  Avatar
} from '@mantine/core'
import { useForm } from '@mantine/form'
import { notifications } from '@mantine/notifications'
import { Plus, Edit, Trash2, Upload, AlertCircle } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import type { Database } from '../types/database'

type Extension = Database['public']['Tables']['extensions']['Row']

const CATEGORIES = [
  'Productivity',
  'Developer Tools',
  'Shopping',
  'Communication',
  'Entertainment',
  'News & Weather',
  'Social & Fun',
  'Accessibility',
  'Photos'
]

const FEEDBACK_TYPES = [
  'General Feedback',
  'UI/UX Review',
  'Bug Testing',
  'Feature Suggestions',
  'Performance Review'
]

const ACCESS_TYPES = [
  { value: 'free', label: 'Free' },
  { value: 'freemium', label: 'Freemium' },
  { value: 'free_trial', label: 'Free Trial' },
  { value: 'promo_code', label: 'Promo Code Required' }
]

export function ExtensionLibraryPage() {
  const { profile, refreshProfile } = useAuth()
  const [extensions, setExtensions] = useState<Extension[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingExtension, setEditingExtension] = useState<Extension | null>(null)

  const form = useForm({
    initialValues: {
      name: '',
      chrome_store_url: '',
      description: '',
      category: [] as string[],
      feedback_type: [] as string[],
      access_type: 'free' as const,
      promo_code: '',
      promo_code_expires_at: ''
    },
    validate: {
      name: (value) => (value.length < 2 ? 'Name must be at least 2 characters' : null),
      chrome_store_url: (value) => {
        // Regular expression for Chrome Web Store URL validation
        const urlRegex = /^(https?:\/\/)?(www\.)?chromewebstore\.google\.com\/detail\/[a-zA-Z0-9_-]+(\/[a-zA-Z0-9_-]+)?$/
        if (!urlRegex.test(value)) {
          return 'Please provide a valid Chrome Web Store URL'
        }
        return null
      }
    }
  })

  useEffect(() => {
    fetchExtensions()
  }, [])

  const fetchExtensions = async () => {
    try {
      const { data, error } = await supabase
        .from('extensions')
        .select('*')
        .eq('owner_id', profile?.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setExtensions(data || [])
    } catch (error) {
      console.error('Error fetching extensions:', error)
      notifications.show({
        title: 'Error',
        message: 'Failed to load extensions',
        color: 'red'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (values: typeof form.values) => {
    try {
      const extensionData = {
        ...values,
        owner_id: profile!.id,
        status: editingExtension ? 'verified' : 'verified' 
      }

      // Fix: Convert empty string to null
      if (extensionData.promo_code_expires_at === '') {
        extensionData.promo_code_expires_at = null;
      }


      if (editingExtension) {
        const { error } = await supabase
          .from('extensions')
          .update(extensionData)
          .eq('id', editingExtension.id)

        if (error) throw error
        notifications.show({
          title: 'Success',
          message: 'Extension updated successfully',
          color: 'green'
        })
      } else {
        const { error } = await supabase
          .from('extensions')
          .insert(extensionData)

        if (error) throw error
        notifications.show({
          title: 'Success',
          message: 'Extension added successfully',
          color: 'green'
        })
      }

      setModalOpen(false)
      setEditingExtension(null)
      form.reset()
      fetchExtensions()
    } catch (error: any) {
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to save extension',
        color: 'red'
      })
    }
  }

  const handleEdit = (extension: Extension) => {
    setEditingExtension(extension)
    form.setValues({
      name: extension.name,
      chrome_store_url: extension.chrome_store_url,
      description: extension.description || '',
      category: extension.category || [],
      feedback_type: extension.feedback_type || [],
      access_type: extension.access_type,
      promo_code: extension.promo_code || '',
      promo_code_expires_at: extension.promo_code_expires_at || ''
    })
    setModalOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this extension?')) return

    try {
      const { error } = await supabase
        .from('extensions')
        .delete()
        .eq('id', id)

      if (error) throw error
      notifications.show({
        title: 'Success',
        message: 'Extension deleted successfully',
        color: 'green'
      })
      fetchExtensions()
    } catch (error: any) {
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to delete extension',
        color: 'red'
      })
    }
  }

  const handleSubmitToQueue = async (extension: Extension) => {
    if (!profile || profile.credit_balance < 1) {
      notifications.show({
        title: 'Insufficient Credits',
        message: 'You need at least 1 credit to submit an extension to the review queue',
        color: 'red'
      })
      return
    }

    try {
      // Update extension status and deduct credit
      const { error: extensionError } = await supabase
        .from('extensions')
        .update({ 
          status: 'pending_verification',
          submitted_to_queue_at: new Date().toISOString()
        })
        .eq('id', extension.id)

      if (extensionError) throw extensionError

      // Deduct credit
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
      refreshProfile() // Added to refresh profile after credit deduction.
      fetchExtensions()
    } catch (error: any) {
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to submit extension',
        color: 'red'
      })
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
      fetchExtensions()
    } catch (error: any) {
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to move extension to library',
        color: 'red'
      })
    }
  }

  const openModal = () => {
    setEditingExtension(null)
    form.reset()
    setModalOpen(true)
  }

  if (loading) {
    return (
      <Container size="lg">
        <Text>Loading extensions...</Text>
      </Container>
    )
  }

  return (
    <Container size="lg">
      <Group justify="space-between" mb="xl">
        <div>
          <Title order={1}>Extension Library</Title>
          <Text c="dimmed">
            Manage your Chrome extensions and submit them for review
          </Text>
        </div>
        <Button leftSection={<Plus size={16} />} onClick={openModal}>
          Add Extension
        </Button>
      </Group>

      {extensions.length === 0 ? (
        <Alert
          icon={<AlertCircle size={16} />}
          title="No extensions yet"
          color="blue"
        >
          Start by adding your first Chrome extension to get authentic reviews from the developer community.
        </Alert>
      ) : (
        <Table>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Extension</Table.Th>
              <Table.Th>Status</Table.Th>
              <Table.Th>Category</Table.Th>
              <Table.Th>Actions</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {extensions.map((extension) => (
              <Table.Tr key={extension.id}>
                <Table.Td>
                  <Group>
                    <Avatar size="sm" src={extension.logo_url} />
                    <div>
                      <Text fw={500}>{extension.name}</Text>
                      <Text size="sm" c="dimmed" truncate maw={300}>
                        {extension.description}
                      </Text>
                    </div>
                  </Group>
                </Table.Td>
                <Table.Td>
                  <Badge color={getStatusColor(extension.status)}>
                    {getStatusLabel(extension.status)}
                  </Badge>
                </Table.Td>
                <Table.Td>
                  <Text size="sm">
                    {extension.category?.join(', ') || 'No category'}
                  </Text>
                </Table.Td>
                <Table.Td>
                  <Group gap="xs">
                    <ActionIcon
                      variant="light"
                      onClick={() => handleEdit(extension)}
                      disabled={!['library', 'verified', 'rejected'].includes(extension.status)} 
                    >
                      <Edit size={16} />
                    </ActionIcon>
                    <ActionIcon
                      variant="light"
                      color="red"
                      onClick={() => handleDelete(extension.id)}
                      disabled={!['library', 'verified', 'rejected'].includes(extension.status)} 
                    >
                      <Trash2 size={16} />
                    </ActionIcon>
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
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      )}

      <Modal
        opened={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingExtension ? 'Edit Extension' : 'Add Extension'}
        size="lg"
      >
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Stack>
            <TextInput
              label="Extension Name"
              placeholder="My Awesome Extension"
              required
              {...form.getInputProps('name')}
            />
            <TextInput
              label="Chrome Web Store URL"
              placeholder="https://chromewebstore.google.com/detail/..."
              required
              {...form.getInputProps('chrome_store_url')}
            />
            <Textarea
              label="Description"
              placeholder="Brief description of your extension..."
              rows={3}
              {...form.getInputProps('description')}
            />
            <MultiSelect
              label="Categories"
              placeholder="Select categories"
              data={CATEGORIES}
              {...form.getInputProps('category')}
            />
            <MultiSelect
              label="Feedback Types"
              placeholder="What kind of feedback do you want?"
              data={FEEDBACK_TYPES}
              {...form.getInputProps('feedback_type')}
            />
            <Select
              label="Access Type"
              data={ACCESS_TYPES}
              {...form.getInputProps('access_type')}
            />
            <Textarea
              label="Access Details"
              placeholder="Instructions for reviewers to access your extension..."
              rows={2}
              {...form.getInputProps('access_details')}
            />
            {form.values.access_type === 'promo_code' && (
              <>
                <TextInput
                  label="Promo Code"
                  placeholder="REVIEW2024"
                  {...form.getInputProps('promo_code')}
                />
                <TextInput
                  label="Promo Code Expires At"
                  type="date"
                  {...form.getInputProps('promo_code_expires_at')}
                />
              </>
            )}
            <Group justify="flex-end">
              <Button variant="light" onClick={() => setModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">
                {editingExtension ? 'Update' : 'Add'} Extension
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>
    </Container>
  )
}