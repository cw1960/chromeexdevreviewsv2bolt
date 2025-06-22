import { createTheme, MantineColorsTuple } from '@mantine/core'

const primaryColor: MantineColorsTuple = [
  '#e3f2fd',
  '#bbdefb',
  '#90caf9',
  '#64b5f6',
  '#42a5f5',
  '#2196f3',
  '#1e88e5',
  '#1976d2',
  '#1565c0',
  '#0d47a1'
]

const secondaryColor: MantineColorsTuple = [
  '#e0f2f1',
  '#b2dfdb',
  '#80cbc4',
  '#4db6ac',
  '#26a69a',
  '#009688',
  '#00897b',
  '#00796b',
  '#00695c',
  '#004d40'
]

export const theme = createTheme({
  primaryColor: 'blue',
  colors: {
    blue: primaryColor,
    teal: secondaryColor
  },
  fontFamily: 'Inter, system-ui, sans-serif',
  headings: {
    fontFamily: 'Inter, system-ui, sans-serif',
    sizes: {
      h1: { fontSize: '2rem', lineHeight: '1.4' },
      h2: { fontSize: '1.75rem', lineHeight: '1.4' },
      h3: { fontSize: '1.5rem', lineHeight: '1.4' }
    }
  },
  spacing: {
    xs: '0.5rem',
    sm: '0.75rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem'
  },
  radius: {
    xs: '0.25rem',
    sm: '0.375rem',
    md: '0.5rem',
    lg: '0.75rem',
    xl: '1rem'
  }
})