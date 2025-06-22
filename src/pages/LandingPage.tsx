import React from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Container,
  Title,
  Text,
  Button,
  Stack,
  Group,
  Card,
  Grid,
  Badge,
  Avatar,
  Box,
  Center
} from '@mantine/core'
import { 
  Play, 
  Star, 
  TrendingUp, 
  Shield, 
  Users, 
  CheckCircle,
  ArrowRight,
  Quote
} from 'lucide-react'

export function LandingPage() {
  const navigate = useNavigate()

  const handleGetStarted = () => {
    navigate('/auth')
  }

  const handleLogin = () => {
    navigate('/auth');
  }

  const testimonials = [
    {
      name: "Sarah Chen",
      role: "Chrome Extension Developer",
      avatar: "https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop",
      content: "Went from 3 reviews to 47 reviews in just 2 weeks. My extension finally started showing up in search results and organic installs increased by 340%.",
      rating: 5,
      result: "340% increase in organic installs"
    },
    {
      name: "Marcus Rodriguez",
      role: "SaaS Founder & Extension Developer",
      avatar: "https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop",
      content: "The quality of reviews is incredible. These are developers who actually understand extensions, not random users. Got detailed feedback that helped improve my product too.",
      rating: 5,
      result: "47 high-quality reviews in 3 weeks"
    },
    {
      name: "Jennifer Park",
      role: "Productivity Tools Developer",
      avatar: "https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop",
      content: "Finally broke through the visibility barrier. My extension went from page 8 to page 1 in search results. The algorithm really does reward consistent review activity.",
      rating: 5,
      result: "Moved from page 8 to page 1 in search"
    }
  ]

  const trustBadges = [
    { icon: Shield, text: "100% Chrome Web Store Compliant" },
    { icon: Users, text: "Trusted by 2,500+ Developers" },
    { icon: CheckCircle, text: "30-Day Money-Back Guarantee" },
    { icon: Star, text: "4.9/5 Average Rating" }
  ]

  const stats = [
    { number: "2,500+", label: "Active Developers" },
    { number: "15,000+", label: "Reviews Exchanged" },
    { number: "340%", label: "Avg. Install Increase" },
    { number: "100%", label: "Policy Compliant" }
  ]

  return (
    <Box>
      {/* Hero Section */}
      <Box bg="linear-gradient(135deg, #667eea 0%, #764ba2 100%)">
        <Container size="lg">
          {/* Logo Header */}
          <Group justify="space-between" mb="xl">
            <img 
              src="https://i.imgur.com/PL0Syo1.png" 
              alt="ChromeExDev Logo" 
              style={{ width: 300, height: 'auto' }}
            />
            <Group>
              <Button variant="subtle" color="white" onClick={handleLogin}>Login</Button>
            </Group>
          </Group>
          
          <Grid align="center">
            <Grid.Col span={{ base: 12, md: 6 }}>
              <Stack gap="xl">
                <Badge size="lg" variant="light" color="white" c="blue">
                  Chrome Web Store Compliant
                </Badge>
                <Title 
                  order={1} 
                  size="3rem" 
                  fw={800} 
                  lh={1.1} 
                  c="white"
                  style={{ textShadow: '0 2px 4px rgba(0,0,0,0.1)' }}
                >
                  Get Steady Chrome Extension Reviews + Higher Ratings + More Installs in Days
                </Title>
                <Title order={2} size="1.5rem" fw={400} c="rgba(255,255,255,0.9)" lh={1.4}>
                  Using Our Chrome Web Store Compliant Developer Network
                </Title>
                <Text size="lg" c="rgba(255,255,255,0.8)" lh={1.6}>
                  Finally escape the zero-visibility trap new extensions face. Trade reviews with other Chrome developers through our algorithm that ensures 100% compliance with Google's policies.
                </Text>
                <Text size="md" c="rgba(255,255,255,0.7)" lh={1.5}>
                  ChromeExDev.Reviews solves the biggest problem Chrome extension developers face: getting those crucial first reviews and installs without violating Google's policies or spending months on manual outreach.
                </Text>
                <Button 
                  size="xl" 
                  radius="md" 
                  onClick={handleGetStarted}
                  rightSection={<ArrowRight size={20} />}
                  styles={{
                    root: {
                      background: 'linear-gradient(45deg, #ff6b6b, #ee5a24)',
                      border: 'none',
                      fontSize: '1.1rem',
                      fontWeight: 600,
                      padding: '16px 32px',
                      boxShadow: '0 8px 32px rgba(238, 90, 36, 0.3)',
                      '&:hover': {
                        transform: 'translateY(-2px)',
                        boxShadow: '0 12px 40px rgba(238, 90, 36, 0.4)'
                      }
                    }
                  }}
                >
                  Start Your Free Trial
                </Button>
              </Stack>
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 6 }}>
              <Card 
                shadow="xl" 
                radius="lg" 
                p={0}
                style={{ 
                  background: 'rgba(255,255,255,0.1)',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255,255,255,0.2)'
                }}
              >
                <Center p="xl">
                  <Stack align="center" gap="md">
                    <Box 
                      w={80} 
                      h={80} 
                      bg="rgba(255,255,255,0.2)" 
                      style={{ borderRadius: '50%' }}
                      display="flex"
                      style={{ alignItems: 'center', justifyContent: 'center' }}
                    >
                      <Play size={32} color="white" />
                    </Box>
                    <Text c="white" fw={600} size="lg">
                      Watch 3-Minute Demo
                    </Text>
                    <Text c="rgba(255,255,255,0.8)" size="sm" ta="center">
                      See how developers are getting 50+ reviews in their first month
                    </Text>
                  </Stack>
                </Center>
              </Card>
            </Grid.Col>
          </Grid>
        </Container>
      </Box>

      {/* Stats Section */}
      <Box py={60} bg="gray.0">
        <Container size="lg">
          <Grid>
            {stats.map((stat, index) => (
              <Grid.Col key={index} span={{ base: 6, md: 3 }}>
                <Stack align="center" gap="xs">
                  <Text size="2.5rem" fw={800} c="blue.6">
                    {stat.number}
                  </Text>
                  <Text size="sm" c="dimmed" ta="center">
                    {stat.label}
                  </Text>
                </Stack>
              </Grid.Col>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* Benefits Sections */}
      <Container size="lg" py={80}>
        <Stack gap={80}>
          {/* Section 1: Break the Visibility Barrier */}
          <Grid align="center">
            <Grid.Col span={{ base: 12, md: 6 }}>
              <Stack gap="lg">
                <Badge size="lg" variant="light" color="blue">
                  Visibility Problem Solved
                </Badge>
                <Title order={2} size="2.5rem" fw={700} c="dark.8">
                  Break the Visibility Barrier
                </Title>
                <Text size="lg" c="dimmed" lh={1.6}>
                  Instead of being buried on page 10 of search results with zero downloads... You'll get steady visibility as your review count and ratings climb, pushing your extension higher in Chrome Web Store rankings every week.
                </Text>
                <Text size="md" c="blue.6" fw={600} style={{ fontStyle: 'italic' }}>
                  "Watch your extension move from invisible to discoverable as authentic reviews from fellow developers signal quality to Google's algorithm."
                </Text>
              </Stack>
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 6 }}>
              <Card shadow="lg" radius="lg" p="xl" bg="blue.0">
                <Stack align="center" gap="md">
                  <TrendingUp size={48} color="#2196f3" />
                  <Text fw={600} size="lg" ta="center">
                    Average Ranking Improvement
                  </Text>
                  <Text size="3rem" fw={800} c="blue.6">
                    8.3x
                  </Text>
                  <Text size="sm" c="dimmed" ta="center">
                    Higher in search results within 30 days
                  </Text>
                </Stack>
              </Card>
            </Grid.Col>
          </Grid>

          {/* Section 2: Escape the Review Catch-22 */}
          <Grid align="center">
            <Grid.Col span={{ base: 12, md: 6 }} order={{ base: 2, md: 1 }}>
              <Card shadow="lg" radius="lg" p="xl" bg="green.0">
                <Stack align="center" gap="md">
                  <Star size={48} color="#10b981" />
                  <Text fw={600} size="lg" ta="center">
                    Reviews in First Month
                  </Text>
                  <Text size="3rem" fw={800} c="green.6">
                    47
                  </Text>
                  <Text size="sm" c="dimmed" ta="center">
                    Average for new extensions
                  </Text>
                </Stack>
              </Card>
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 6 }} order={{ base: 1, md: 2 }}>
              <Stack gap="lg">
                <Badge size="lg" variant="light" color="green">
                  Review Catch-22 Solved
                </Badge>
                <Title order={2} size="2.5rem" fw={700} c="dark.8">
                  Escape the Review Catch-22
                </Title>
                <Text size="lg" c="dimmed" lh={1.6}>
                  Instead of waiting months for users to maybe leave a review (if you're lucky)... You'll get a consistent stream of detailed, helpful reviews from developers who actually understand and use Chrome extensions.
                </Text>
                <Text size="md" c="green.6" fw={600} style={{ fontStyle: 'italic' }}>
                  "Finally get those crucial first 10-50 reviews that make new users trust your extension enough to install it."
                </Text>
              </Stack>
            </Grid.Col>
          </Grid>

          {/* Section 3: Compete with Established Extensions */}
          <Grid align="center">
            <Grid.Col span={{ base: 12, md: 6 }}>
              <Stack gap="lg">
                <Badge size="lg" variant="light" color="purple">
                  Level Playing Field
                </Badge>
                <Title order={2} size="2.5rem" fw={700} c="dark.8">
                  Compete with Established Extensions
                </Title>
                <Text size="lg" c="dimmed" lh={1.6}>
                  Instead of being crushed by million-download giants in your category... You'll get the social proof and momentum needed to compete, as higher ratings and review velocity signal freshness to the algorithm.
                </Text>
                <Text size="md" c="purple.6" fw={600} style={{ fontStyle: 'italic' }}>
                  "Level the playing field with extensions that have been around for years - quality and recent activity matter more than age."
                </Text>
              </Stack>
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 6 }}>
              <Card shadow="lg" radius="lg" p="xl" bg="purple.0">
                <Stack align="center" gap="md">
                  <Shield size={48} color="#8b5cf6" />
                  <Text fw={600} size="lg" ta="center">
                    Compete Successfully
                  </Text>
                  <Text size="3rem" fw={800} c="purple.6">
                    89%
                  </Text>
                  <Text size="sm" c="dimmed" ta="center">
                    Of users outrank established competitors
                  </Text>
                </Stack>
              </Card>
            </Grid.Col>
          </Grid>

          {/* Section 4: Skip Risky Manual Outreach */}
          <Grid align="center">
            <Grid.Col span={{ base: 12, md: 6 }} order={{ base: 2, md: 1 }}>
              <Card shadow="lg" radius="lg" p="xl" bg="orange.0">
                <Stack align="center" gap="md">
                  <CheckCircle size={48} color="#f59e0b" />
                  <Text fw={600} size="lg" ta="center">
                    Time Saved Weekly
                  </Text>
                  <Text size="3rem" fw={800} c="orange.6">
                    15h
                  </Text>
                  <Text size="sm" c="dimmed" ta="center">
                    No more manual outreach needed
                  </Text>
                </Stack>
              </Card>
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 6 }} order={{ base: 1, md: 2 }}>
              <Stack gap="lg">
                <Badge size="lg" variant="light" color="orange">
                  No More Manual Work
                </Badge>
                <Title order={2} size="2.5rem" fw={700} c="dark.8">
                  Skip Risky Manual Outreach
                </Title>
                <Text size="lg" c="dimmed" lh={1.6}>
                  Instead of spending hours hunting down developers to beg for reviews (and risking policy violations)... You'll get automatic connections with motivated reviewers through our compliant algorithm - no awkward asks, no policy risks.
                </Text>
                <Text size="md" c="orange.6" fw={600} style={{ fontStyle: 'italic' }}>
                  "Focus on building great extensions while we handle getting them discovered safely and efficiently."
                </Text>
              </Stack>
            </Grid.Col>
          </Grid>

          {/* Section 5: Build Unstoppable Momentum */}
          <Grid align="center">
            <Grid.Col span={{ base: 12, md: 6 }}>
              <Stack gap="lg">
                <Badge size="lg" variant="light" color="red">
                  Unstoppable Growth
                </Badge>
                <Title order={2} size="2.5rem" fw={700} c="dark.8">
                  Build Unstoppable Momentum
                </Title>
                <Text size="lg" c="dimmed" lh={1.6}>
                  Instead of watching your extension stagnate after initial excitement dies down... You'll get consistent growth that compounds - more reviews lead to more visibility, which leads to more organic installs and reviews.
                </Text>
                <Text size="md" c="red.6" fw={600} style={{ fontStyle: 'italic' }}>
                  "Create the upward spiral successful extensions need: steady reviews → better rankings → more organic discovery → sustained growth."
                </Text>
                <Button 
                  size="lg" 
                  radius="md" 
                  onClick={handleGetStarted}
                  rightSection={<ArrowRight size={18} />}
                  styles={{
                    root: {
                      background: 'linear-gradient(45deg, #ff6b6b, #ee5a24)',
                      border: 'none',
                      fontSize: '1rem',
                      fontWeight: 600,
                      boxShadow: '0 4px 16px rgba(238, 90, 36, 0.3)',
                      '&:hover': {
                        transform: 'translateY(-1px)',
                        boxShadow: '0 6px 20px rgba(238, 90, 36, 0.4)'
                      }
                    }
                  }}
                >
                  Start Your Free Trial
                </Button>
              </Stack>
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 6 }}>
              <Card shadow="lg" radius="lg" p="xl" bg="red.0">
                <Stack align="center" gap="md">
                  <TrendingUp size={48} color="#ef4444" />
                  <Text fw={600} size="lg" ta="center">
                    Growth Momentum
                  </Text>
                  <Text size="3rem" fw={800} c="red.6">
                    340%
                  </Text>
                  <Text size="sm" c="dimmed" ta="center">
                    Average install increase in 60 days
                  </Text>
                </Stack>
              </Card>
            </Grid.Col>
          </Grid>
        </Stack>
      </Container>

      {/* Testimonials Section */}
      <Box py={80} bg="gray.0">
        <Container size="lg">
          <Stack gap="xl" align="center">
            <Stack gap="md" align="center">
              <Title order={2} size="2.5rem" fw={700} ta="center">
                Real Results from Real Developers
              </Title>
              <Text size="lg" c="dimmed" ta="center" maw={600}>
                See how Chrome extension developers are breaking through the visibility barrier and growing their user base
              </Text>
            </Stack>
            <Grid>
              {testimonials.map((testimonial, index) => (
                <Grid.Col key={index} span={{ base: 12, md: 4 }}>
                  <Card shadow="md" radius="lg" p="xl" h="100%">
                    <Stack gap="md">
                      <Group gap="xs">
                        {[...Array(testimonial.rating)].map((_, i) => (
                          <Star key={i} size={16} fill="#ffd43b" color="#ffd43b" />
                        ))}
                      </Group>
                      <Quote size={24} color="#e9ecef" />
                      <Text size="md" lh={1.6}>
                        {testimonial.content}
                      </Text>
                      <Badge variant="light" color="green" size="sm">
                        {testimonial.result}
                      </Badge>
                      <Group gap="sm" mt="auto">
                        <Avatar src={testimonial.avatar} size="md" radius="xl" />
                        <Stack gap={0}>
                          <Text fw={600} size="sm">
                            {testimonial.name}
                          </Text>
                          <Text size="xs" c="dimmed">
                            {testimonial.role}
                          </Text>
                        </Stack>
                      </Group>
                    </Stack>
                  </Card>
                </Grid.Col>
              ))}
            </Grid>
          </Stack>
        </Container>
      </Box>

      {/* Trust Badges Section */}
      <Container size="lg" py={60}>
        <Grid>
          {trustBadges.map((badge, index) => (
            <Grid.Col key={index} span={{ base: 6, md: 3 }}>
              <Stack align="center" gap="sm">
                <badge.icon size={32} color="#2196f3" />
                <Text size="sm" fw={600} ta="center">
                  {badge.text}
                </Text>
              </Stack>
            </Grid.Col>
          ))}
        </Grid>
      </Container>

      {/* Final CTA Section */}
      <Box py={80} bg="linear-gradient(135deg, #667eea 0%, #764ba2 100%)">
        <Container size="md">
          <Stack align="center" gap="xl">
            <Stack align="center" gap="md">
              <Title order={2} size="2.5rem" fw={700} c="white" ta="center">
                Ready to Break Through the Visibility Barrier?
              </Title>
              <Text size="lg" c="rgba(255,255,255,0.9)" ta="center" maw={500}>
                Join 2,500+ Chrome extension developers who are getting steady reviews and growing their user base every week.
              </Text>
            </Stack>
            <Button 
              size="xl" 
              radius="md" 
              onClick={handleGetStarted}
              rightSection={<ArrowRight size={20} />}
              styles={{
                root: {
                  background: 'linear-gradient(45deg, #ff6b6b, #ee5a24)',
                  border: 'none',
                  fontSize: '1.2rem',
                  fontWeight: 600,
                  padding: '20px 40px',
                  boxShadow: '0 8px 32px rgba(238, 90, 36, 0.3)',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: '0 12px 40px rgba(238, 90, 36, 0.4)'
                  }
                }
              }}
            >
              Start Your Free Trial - No Credit Card Required
            </Button>
            <Group gap="xl" c="rgba(255,255,255,0.8)">
              <Text size="sm">✓ 30-Day Money-Back Guarantee</Text>
              <Text size="sm">✓ Setup in Under 5 Minutes</Text>
              <Text size="sm">✓ 100% Policy Compliant</Text>
            </Group>
          </Stack>
        </Container>
      </Box>
    </Box>
  )
}