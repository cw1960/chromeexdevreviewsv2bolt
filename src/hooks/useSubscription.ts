import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { getProductByPriceId } from '../stripe-config'

interface SubscriptionData {
  customer_id: string | null
  subscription_id: string | null
  subscription_status: string | null
  price_id: string | null
  current_period_start: number | null
  current_period_end: number | null
  cancel_at_period_end: boolean | null
  payment_method_brand: string | null
  payment_method_last4: string | null
}

export function useSubscription() {
  const { user } = useAuth()
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user) {
      setSubscription(null)
      setLoading(false)
      return
    }

    fetchSubscription()
  }, [user])

  const fetchSubscription = async () => {
    try {
      setLoading(true)
      setError(null)

      const { data, error: fetchError } = await supabase
        .from('stripe_user_subscriptions')
        .select('*')
        .maybeSingle()

      if (fetchError) {
        console.error('Error fetching subscription:', fetchError)
        setError(fetchError.message)
        return
      }

      setSubscription(data)
    } catch (err: any) {
      console.error('Subscription fetch error:', err)
      setError(err.message || 'Failed to fetch subscription data')
    } finally {
      setLoading(false)
    }
  }

  const refreshSubscription = () => {
    if (user) {
      fetchSubscription()
    }
  }

  // Helper functions
  const isActive = subscription?.subscription_status === 'active'
  const isPremium = isActive && subscription?.price_id
  const product = subscription?.price_id ? getProductByPriceId(subscription.price_id) : null
  const planName = product?.name || (isPremium ? 'Review Fast Track' : 'Free')

  return {
    subscription,
    loading,
    error,
    refreshSubscription,
    isActive,
    isPremium,
    planName,
    product
  }
}