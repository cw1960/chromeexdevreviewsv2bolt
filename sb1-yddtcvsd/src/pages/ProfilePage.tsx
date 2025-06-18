import React from 'react'
import {
  Container,
  Title,
  Card,
  TextInput,
  Button,
  Stack,
  Group,
  Text,
  Badge,
  Grid
} from '@mantine/core'
import { useForm } from '@mantine/form'
import { notifications } from '@mantine/notifications'
import { User, Mail, Globe, Star } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

export function ProfilePage() {
  const { profile, updateProfile } = useAuth()

  const form = useForm({
    initialValues: {
      name: profile?.name || '',
      chrome_store_profile_url: profile?.chrome_store_profile_url || ''
    },
    validate: {
      name: (value) => (value.length < 2 ? 'Name must be at least 2 characters' : null)
    }
  })

  const handleSubmit = async (values: typeof form.values) => {
    try {
      await updateProfile(values)
      notifications.show({
        title: 'Success',
        message: 'Profile updated successfully',
        color: 'green'
      })
    } catch (error: any) {
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to update profile',
        color: 'red'
      })
    }
  }

  return (
    <Container size="md">
      <Title order={1} mb="xl">Profile Settings</Title>

      <Grid>
        <Grid.Col span={{ base: 12, md: 8 }}>
          <Card withBorder p="lg">
            <Title order={3} mb="md">
              Personal Information
            </Title>
            <form onSubmit={form.onSubmit(handleSubmit)}>
              <Stack>
                <TextInput
                  label="Full Name"
                  placeholder="Your full name"
                  leftSection={<User size={16} />}
                  required
                  {...form.getInputProps('name')}
                />
                <TextInput
                  label="Email"
                  value={profile?.email || ''}
                  leftSection={<Mail size={16} />}
                  disabled
                  description="Email cannot be changed"
                />
                <TextInput
                  label="Chrome Web Store Profile URL"
                  placeholder="https://chrome.google.com/webstore/developer/..."
                  leftSection={<Globe size={16} />}
                  description="Link to your Chrome Web Store developer profile (optional)"
                  {...form.getInputProps('chrome_store_profile_url')}
                />
                <Group justify="flex-end">
                  <Button type="submit">
                    Update Profile
                  </Button>
                </Group>
              </Stack>
            </form>
          </Card>
        </Grid.Col>

        <Grid.Col span={{ base: 12, md: 4 }}>
          <Stack>
            <Card withBorder p="lg">
              <Group justify="space-between" mb="md">
                <Text fw={600}>Account Status</Text>
                <Badge color="green">Active</Badge>
              </Group>
              <Stack gap="sm">
                <Group justify="space-between">
                  <Text size="sm">Member Since</Text>
                  <Text size="sm" c="dimmed">
                    {profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : 'N/A'}
                  </Text>
                </Group>
                <Group justify="space-between">
                  <Text size="sm">Role</Text>
                  <Badge size="sm" variant="light">
                    {profile?.role || 'user'}
                  </Badge>
                </Group>
                <Group justify="space-between">
                  <Text size="sm">Qualification</Text>
                  <Badge 
                    size="sm" 
                    color={profile?.has_completed_qualification ? 'green' : 'yellow'}
                  >
                    {profile?.has_completed_qualification ? 'Completed' : 'Pending'}
                  </Badge>
                </Group>
              </Stack>
            </Card>

            <Card withBorder p="lg">
              <Group justify="space-between" mb="md">
                <Text fw={600}>Credits</Text>
                <Star size={20} />
              </Group>
              <Text size="xl" fw={700} c="blue">
                {profile?.credit_balance || 0}
              </Text>
              <Text size="sm" c="dimmed">
                Available credits for queue submissions
              </Text>
            </Card>

            <Card withBorder p="lg">
              <Text fw={600} mb="md">Quick Actions</Text>
              <Stack gap="xs">
                <Button variant="light" fullWidth component="a" href="/extensions">
                  Manage Extensions
                </Button>
                <Button variant="light" fullWidth component="a" href="/reviews">
                  View Reviews
                </Button>
              </Stack>
            </Card>
          </Stack>
        </Grid.Col>
      </Grid>
    </Container>
  )
}