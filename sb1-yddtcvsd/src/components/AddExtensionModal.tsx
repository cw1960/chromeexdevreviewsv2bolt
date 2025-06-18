import React from 'react'
import {
  Modal,
  TextInput,
  Textarea,
  Select,
  MultiSelect,
  Stack,
  Group,
  Button
} from '@mantine/core'
import { useForm } from '@mantine/form'
import { notifications } from '@mantine/notifications'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import type { Database } from '../types/database'

type Extension = Database['public']['Tables']['extensions']['Row']

const CATEGORIES = [
  'Accessibility',
  'Art & Design',
  'Communication',
  'Developer Tools',
  'Education',
  'Entertainment',
  'Functionality & UI',
  'Games',
  'Household',
  'Just for Fun',
  'News & Weather',
  'Privacy & Security',
  'Shopping',
  'Social Media & Networking',
  'Tools',
  'Travel',
  'Well-being',
  'Workflow & Planning'
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

interface AddExtensionModalProps {
  opened: boolean
  onClose: () => void
  onSuccess: (extension: Extension) => void
  initialExtensionData?: Partial<Extension>
}

export function AddExtensionModal({ 
  opened, 
  onClose, 
  onSuccess, 
  initialExtensionData 
}: AddExtensionModalProps) {
  const { profile } = useAuth()

  const form = useForm({
    initialValues: {
      name: initialExtensionData?.name || '',
      chrome_store_url: initialExtensionData?.chrome_store_url || '',
      description: initialExtensionData?.description || '',
      category: initialExtensionData?.category || [],
      feedback_type: initialExtensionData?.feedback_type || [],
      access_type: (initialExtensionData?.access_type as 'free' | 'freemium' | 'free_trial' | 'promo_code') || 'free',
      promo_code: initialExtensionData?.promo_code || '',
      promo_code_expires_at: initialExtensionData?.promo_code_expires_at || ''
    },
    validate: {
      name: (value) => (value.length < 2 ? 'Name must be at least 2 characters' : null),
      chrome_store_url: (value) => {
        const urlRegex = /^(https?:\/\/)?(www\.)?chromewebstore\.google\.com\/detail\/[a-zA-Z0-9_-]+(\/[a-zA-Z0-9_-]+)?$/
        if (!urlRegex.test(value)) {
          return 'Please provide a valid Chrome Web Store URL'
        }
        return null
      }
    }
  })

  const handleSubmit = async (values: typeof form.values) => {
    if (!profile) return

    try {
      const extensionData = {
        ...values,
        owner_id: profile.id,
        status: 'verified' as const,
        promo_code_expires_at: values.promo_code_expires_at || null
      }

      let result
      if (initialExtensionData?.id) {
        // Update existing extension
        const { data, error } = await supabase
          .from('extensions')
          .update(extensionData)
          .eq('id', initialExtensionData.id)
          .select()
          .single()

        if (error) throw error
        result = data

        notifications.show({
          title: 'Success',
          message: 'Extension updated successfully',
          color: 'green'
        })
      } else {
        // Create new extension
        const { data, error } = await supabase
          .from('extensions')
          .insert(extensionData)
          .select()
          .single()

        if (error) throw error
        result = data

        notifications.show({
          title: 'Success',
          message: 'Extension added successfully',
          color: 'green'
        })
      }

      onSuccess(result)
      onClose()
      form.reset()
    } catch (error: any) {
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to save extension',
        color: 'red'
      })
    }
  }

  const handleClose = () => {
    form.reset()
    onClose()
  }

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title={initialExtensionData?.id ? 'Edit Extension' : 'Add Extension'}
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
          <MultiSelect
            label="Categories"
            placeholder="Select categories"
            data={CATEGORIES}
            {...form.getInputProps('category')}
          />
          <Textarea
            label="Description"
            placeholder="Brief description of your extension..."
            rows={3}
            {...form.getInputProps('description')}
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
            <Button variant="light" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit">
              {initialExtensionData?.id ? 'Update' : 'Add'} Extension
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  )
}