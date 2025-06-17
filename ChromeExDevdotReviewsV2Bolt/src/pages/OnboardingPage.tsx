import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Container,
  Title,
  Text,
  Button,
  Stack,
  Card,
  Group,
  Badge,
  List,
  ThemeIcon,
  Box,
  Progress
} from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { 
  CheckCircle, 
  Star, 
  Shield, 
  Users, 
  Package,
  ArrowRight,
  Sparkles
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

export function OnboardingPage() {
  const { profile, updateProfile } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)

  const handleCompleteOnboarding = async () => {
    setLoading(true)
    try {
      await updateProfile({ onboarding_complete: true })
      notifications.show({
        title: 'Welcome to ChromeExDev.reviews!',
        message: 'Your account is now set up and ready to use.',
        color: 'green',
        icon: <Sparkles size={16} />
      })
      navigate('/dashboard')
    } catch (error: any) {
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to complete onboarding',
        color: 'red'
      })
    } finally {
      setLoading(false)
    }
  }

  const features = [
    {
      icon: Package,
      title: 'Add Your Extensions',
      description: 'Upload your Chrome extensions to our secure library and manage them easily.'
    },
    {
      icon: Star,
      title: 'Get Authentic Reviews',
      description: 'Receive genuine reviews from fellow developers who understand Chrome extensions.'
    },
    {
      icon: Users,
      title: 'Review Others',
      description: 'Help other developers by reviewing their extensions and earn credits.'
    },
    {
      icon: Shield,
      title: '100% Policy Compliant',
      description: 'All reviews follow Chrome Web Store policies - no risk to your account.'
    }
  ]

  const steps = [
    'Create your developer profile',
    'Add your first Chrome extension',
    'Complete the qualification process',
    'Start exchanging reviews with the community'
  ]

  return (
    <Box bg="linear-gradient(135deg, #667eea 0%, #764ba2 100%)" mih="100vh">
      <Container size="md" py={60}>
        <Stack align="center" gap="xl">
          {/* Logo */}
          <Group mb="xl">
            <img 
              src="https://i.imgur.com/3xrcCgv.png" 
              alt="ChromeExDev Logo" 
              style={{ width: 200, height: 'auto' }}
            />
          </Group>

          {/* Welcome Card */}
          <Card 
            shadow="xl" 
            radius="lg" 
            p="xl" 
            maw={600}
            style={{ 
              background: 'rgba(255,255,255,0.95)',
              backdropFilter: 'blur(10px)'
            }}
          >
            <Stack align="center" gap="lg">
              <Badge size="lg" variant="light" color="blue">
                Welcome to the Community
              </Badge>
              
              <Title order={1} ta="center" c="dark.8">
                Welcome, {profile?.name}! 🎉
              </Title>
              
              <Text size="lg" ta="center" c="dimmed" lh={1.6}>
                You're now part of an exclusive community of Chrome extension developers 
                who help each other grow through authentic review exchanges.
              </Text>

              {/* Progress */}
              <Box w="100%">
                <Group justify="space-between" mb="xs">
                  <Text size="sm" fw={600}>Setup Progress</Text>
                  <Text size="sm" c="dimmed">1 of 4 steps</Text>
                </Group>
                <Progress value={25} size="lg" radius="xl" />
              </Box>
            </Stack>
          </Card>

          {/* How It Works */}
          <Card 
            shadow="lg" 
            radius="lg" 
            p="xl" 
            maw={600}
            style={{ 
              background: 'rgba(255,255,255,0.95)',
              backdropFilter: 'blur(10px)'
            }}
          >
            <Stack gap="lg">
              <Title order={2} ta="center" c="dark.8">
                How ChromeExDev.reviews Works
              </Title>
              
              <List
                spacing="md"
                size="md"
                center
                icon={
                  <ThemeIcon color="blue" size={24} radius="xl">
                    <CheckCircle size={16} />
                  </ThemeIcon>
                }
              >
                {steps.map((step, index) => (
                  <List.Item key={index}>
                    <Text fw={500}>{step}</Text>
                  </List.Item>
                ))}
              </List>
            </Stack>
          </Card>

          {/* Features Grid */}
          <Card 
            shadow="lg" 
            radius="lg" 
            p="xl" 
            maw={600}
            style={{ 
              background: 'rgba(255,255,255,0.95)',
              backdropFilter: 'blur(10px)'
            }}
          >
            <Stack gap="lg">
              <Title order={2} ta="center" c="dark.8">
                What You Get Access To
              </Title>
              
              <Stack gap="md">
                {features.map((feature, index) => (
                  <Group key={index} align="flex-start" gap="md">
                    <ThemeIcon color="blue" size={40} radius="xl">
                      <feature.icon size={20} />
                    </ThemeIcon>
                    <Stack gap={4} flex={1}>
                      <Text fw={600} size="md">{feature.title}</Text>
                      <Text size="sm" c="dimmed" lh={1.4}>
                        {feature.description}
                      </Text>
                    </Stack>
                  </Group>
                ))}
              </Stack>
            </Stack>
          </Card>

          {/* CTA */}
          <Card 
            shadow="lg" 
            radius="lg" 
            p="xl" 
            maw={600}
            style={{ 
              background: 'linear-gradient(45deg, #ff6b6b, #ee5a24)',
              color: 'white'
            }}
          >
            <Stack align="center" gap="lg">
              <Title order={2} ta="center" c="white">
                Ready to Get Started?
              </Title>
              
              <Text ta="center" c="rgba(255,255,255,0.9)" lh={1.6}>
                Complete your setup and join thousands of developers who are 
                growing their Chrome extensions through authentic reviews.
              </Text>
              
              <Button 
                size="xl" 
                variant="white"
                color="dark"
                radius="md"
                rightSection={<ArrowRight size={20} />}
                onClick={handleCompleteOnboarding}
                loading={loading}
                styles={{
                  root: {
                    fontSize: '1.1rem',
                    fontWeight: 600,
                    padding: '16px 32px',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
                    '&:hover': {
                      transform: 'translateY(-2px)',
                      boxShadow: '0 6px 20px rgba(0,0,0,0.15)'
                    }
                  }
                }}
              >
                Complete Setup & Continue
              </Button>
              
              <Group gap="xl" c="rgba(255,255,255,0.8)">
                <Text size="sm">✓ Free to Start</Text>
                <Text size="sm">✓ 1 Welcome Credit</Text>
                <Text size="sm">✓ Instant Access</Text>
              </Group>
            </Stack>
          </Card>
        </Stack>
      </Container>
    </Box>
  )
}