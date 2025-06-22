import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Confetti from 'react-confetti'
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
  Alert,
  Checkbox,
  Divider
} from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { 
  CheckCircle, 
  Star, 
  Shield, 
  AlertTriangle, 
  BookOpen,
  ArrowRight,
  Award,
  Clock,
  Users
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

// Custom hook to get window dimensions
function useWindowSize() {
  const [windowSize, setWindowSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  })

  React.useEffect(() => {
    function handleResize() {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      })
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return windowSize
}

export function QualificationPage() {
  const { profile, updateProfile } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [acknowledged, setAcknowledged] = useState(false)
  const [showConfetti, setShowConfetti] = useState(false)
  const { width, height } = useWindowSize()

  const handleCompleteQualification = async () => {
    if (!acknowledged) {
      notifications.show({
        title: 'Acknowledgment Required',
        message: 'Please acknowledge that you understand the review guidelines.',
        color: 'orange'
      })
      return
    }

    setLoading(true)
    try {
      await updateProfile({ has_completed_qualification: true })
      
      // Trigger MailerLite event for qualification completion
      if (profile?.email) {
        try {
          await triggerMailerLiteEvent(profile.email, 'qualification_completed', {
            user_name: profile.name || 'Developer',
            completion_date: new Date().toISOString()
          })
        } catch (mailerLiteError) {
          console.error('Failed to trigger MailerLite qualification event:', mailerLiteError)
          // Don't fail the qualification process if MailerLite fails
        }
      }
      
      // Show confetti celebration
      setShowConfetti(true)
      
      // Set flag for welcome modal on dashboard
      localStorage.setItem('showWelcomeModal', 'true')
      
      notifications.show({
        title: 'Qualification Complete!',
        message: 'You can now participate in the review exchange program.',
        color: 'green',
        icon: <Award size={16} />
      })
      
      // Stop confetti after 5 seconds and navigate
      setTimeout(() => {
        setShowConfetti(false)
        navigate('/dashboard')
      }, 5000)
    } catch (error: any) {
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to complete qualification',
        color: 'red'
      })
    } finally {
      setLoading(false)
    }
  }

  const guidelines = [
    {
      icon: Star,
      title: 'Provide Honest Reviews',
      description: 'Write genuine, helpful reviews based on your actual experience with the extension.'
    },
    {
      icon: Clock,
      title: 'Use Extensions for 1+ Hours',
      description: 'Install and actively use extensions for at least an hour before reviewing to provide meaningful feedback.'
    },
    {
      icon: BookOpen,
      title: 'Follow Chrome Web Store Policies',
      description: 'All reviews must comply with Google\'s Chrome Web Store review policies and guidelines.'
    },
    {
      icon: Shield,
      title: 'Maintain Quality Standards',
      description: 'Write detailed reviews (minimum 50 characters) that help other users make informed decisions.'
    },
    {
      icon: Users,
      title: 'Respect the Community',
      description: 'Treat fellow developers with respect and provide constructive feedback that helps improve their extensions.'
    }
  ]

  const requirements = [
    'Write reviews in clear, understandable English',
    'Provide specific feedback about functionality, usability, and value',
    'Rate extensions fairly based on their actual performance',
    'Include both positive aspects and areas for improvement when applicable',
    'Never write fake, misleading, or spam reviews',
    'Complete all assigned reviews within the given timeframe (7 days)',
    'Provide proof of your Chrome Web Store review submission'
  ]

  const benefits = [
    'Earn 1 credit for each completed review',
    'Get authentic reviews for your own extensions',
    'Connect with a community of Chrome extension developers',
    'Improve your own extensions through feedback exchange',
    'Build your reputation in the developer community'
  ]

  return (
    <Box bg="linear-gradient(135deg, #667eea 0%, #764ba2 100%)" mih="100vh">
      {showConfetti && (
        <Confetti
          width={width}
          height={height}
          recycle={false}
          numberOfPieces={500}
          gravity={0.3}
          colors={['#667eea', '#764ba2', '#10b981', '#ffd700', '#ff6b6b', '#4ecdc4']}
        />
      )}
      <Container size="md" py={60}>
        <Stack align="center" gap="xl">
          {/* Logo */}
          <Group mb="xl">
            <img 
              src="https://i.imgur.com/PL0Syo1.png" 
              alt="ChromeExDev Logo" 
              style={{ width: 200, height: 'auto' }}
            />
          </Group>

          {/* Header Card */}
          <Card 
            shadow="xl" 
            radius="lg" 
            p="xl" 
            maw={700}
            style={{ 
              background: 'rgba(255,255,255,0.95)',
              backdropFilter: 'blur(10px)'
            }}
          >
            <Stack align="center" gap="lg">
              <Badge size="lg" variant="light" color="blue">
                Reviewer Qualification
              </Badge>
              
              <Title order={1} ta="center" c="dark.8">
                Become a Qualified Reviewer
              </Title>
              
              <Text size="lg" ta="center" c="dimmed" lh={1.6}>
                To maintain the quality and integrity of our review exchange program, 
                all reviewers must understand and agree to follow our community guidelines.
              </Text>
            </Stack>
          </Card>

          {/* Guidelines Card */}
          <Card 
            shadow="lg" 
            radius="lg" 
            p="xl" 
            maw={700}
            style={{ 
              background: 'rgba(255,255,255,0.95)',
              backdropFilter: 'blur(10px)'
            }}
          >
            <Stack gap="lg">
              <Title order={2} ta="center" c="dark.8">
                Review Guidelines
              </Title>
              
              <Stack gap="md">
                {guidelines.map((guideline, index) => (
                  <Group key={index} align="flex-start" gap="md">
                    <ThemeIcon color="blue" size={40} radius="xl">
                      <guideline.icon size={20} />
                    </ThemeIcon>
                    <Stack gap={4} flex={1}>
                      <Text fw={600} size="md">{guideline.title}</Text>
                      <Text size="sm" c="dimmed" lh={1.4}>
                        {guideline.description}
                      </Text>
                    </Stack>
                  </Group>
                ))}
              </Stack>
            </Stack>
          </Card>

          {/* Requirements Card */}
          <Card 
            shadow="lg" 
            radius="lg" 
            p="xl" 
            maw={700}
            style={{ 
              background: 'rgba(255,255,255,0.95)',
              backdropFilter: 'blur(10px)'
            }}
          >
            <Stack gap="lg">
              <Title order={2} ta="center" c="dark.8">
                Reviewer Requirements
              </Title>
              
              <List
                spacing="sm"
                size="sm"
                center
                icon={
                  <ThemeIcon color="green" size={20} radius="xl">
                    <CheckCircle size={12} />
                  </ThemeIcon>
                }
              >
                {requirements.map((requirement, index) => (
                  <List.Item key={index}>
                    <Text size="sm">{requirement}</Text>
                  </List.Item>
                ))}
              </List>
            </Stack>
          </Card>

          {/* Benefits Card */}
          <Card 
            shadow="lg" 
            radius="lg" 
            p="xl" 
            maw={700}
            style={{ 
              background: 'rgba(255,255,255,0.95)',
              backdropFilter: 'blur(10px)'
            }}
          >
            <Stack gap="lg">
              <Title order={2} ta="center" c="dark.8">
                What You Get
              </Title>
              
              <List
                spacing="sm"
                size="sm"
                center
                icon={
                  <ThemeIcon color="orange" size={20} radius="xl">
                    <Award size={12} />
                  </ThemeIcon>
                }
              >
                {benefits.map((benefit, index) => (
                  <List.Item key={index}>
                    <Text size="sm">{benefit}</Text>
                  </List.Item>
                ))}
              </List>
            </Stack>
          </Card>

          {/* Important Notice */}
          <Card 
            shadow="lg" 
            radius="lg" 
            p="xl" 
            maw={700}
            style={{ 
              background: 'rgba(255,255,255,0.95)',
              backdropFilter: 'blur(10px)'
            }}
          >
            <Alert
              icon={<AlertTriangle size={16} />}
              title="Important Notice"
              color="orange"
              mb="lg"
            >
              Violating these guidelines may result in suspension from the review program. 
              We monitor all reviews for quality and compliance with Chrome Web Store policies.
            </Alert>

            <Divider my="lg" />

            <Stack gap="lg">
              <Checkbox
                checked={acknowledged}
                onChange={(event) => setAcknowledged(event.currentTarget.checked)}
                label={
                  <Text size="sm">
                    I have read and understand the review guidelines and requirements. 
                    I agree to follow all policies and provide honest, quality reviews.
                  </Text>
                }
                size="md"
              />

              <Button 
                size="xl" 
                radius="md"
                rightSection={<ArrowRight size={20} />}
                onClick={handleCompleteQualification}
                loading={loading}
                disabled={!acknowledged}
                styles={{
                  root: {
                    background: acknowledged 
                      ? 'linear-gradient(45deg, #10b981, #059669)' 
                      : undefined,
                    fontSize: '1.1rem',
                    fontWeight: 600,
                    padding: '16px 32px',
                    boxShadow: acknowledged 
                      ? '0 4px 16px rgba(16, 185, 129, 0.3)' 
                      : undefined,
                    '&:hover': acknowledged ? {
                      transform: 'translateY(-2px)',
                      boxShadow: '0 6px 20px rgba(16, 185, 129, 0.4)'
                    } : undefined
                  }
                }}
              >
                Complete Qualification
              </Button>
              
              <Text size="sm" c="dimmed" ta="center">
                Once qualified, you'll be eligible to receive review assignments and start earning credits.
              </Text>
            </Stack>
          </Card>
        </Stack>
      </Container>
    </Box>
  )
}