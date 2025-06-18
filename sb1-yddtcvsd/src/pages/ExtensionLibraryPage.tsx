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
  Alert,
  Avatar
} from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { Plus, Edit, Trash2, Upload, AlertCircle } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { AddExtensionModal } from '../components/AddExtensionModal'
import type { Database } from '../types/database'

type Extension = Database['public']['Tables']['extensions']['Row']

export function ExtensionLibraryPage() {
  const { profile, refreshProfile } = useAuth()
  const [extensions, setExtensions] = useState<Extension[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingExtension, setEditingExtension] = useState<Extension | null>(null)

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

  const handleExtensionSuccess = () => {
    setModalOpen(false)
    setEditingExtension(null)
    fetchExtensions()
  }

  const handleEdit = (extension: Extension) => {
    setEditingExtension(extension)
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
          submitted_to_queue_at: new Date().toISOString(),
          admin_verified: true
        })
        .eq('id', extension.id)

      if (extensionError) throw extensionError;

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
      refreshProfile() 
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

      <AddExtensionModal
        opened={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={handleExtensionSuccess}
        initialExtensionData={editingExtension || undefined}
      />
    </Container>
  )
}