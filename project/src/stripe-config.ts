export interface StripeProduct {
  id: string
  priceId: string
  name: string
  description: string
  mode: 'payment' | 'subscription'
  price: number
  currency: string
  interval?: 'month' | 'year'
}

export const stripeProducts: StripeProduct[] = [
  {
    id: 'prod_SXdFNgdKCvjgWJ',
    priceId: 'price_1RcXz7EREJXnOif62V2u3kux',
    name: 'Premium Tier (Monthly)',
    description: 'Unlimited extensions, priority reviews, and advanced features',
    mode: 'subscription',
    price: 19.99,
    currency: 'usd',
    interval: 'month'
  },
  {
    id: 'prod_SXdGhmQV0M412A',
    priceId: 'price_1RcXzeEREJXnOif6qNEy2ES9',
    name: 'Premium Tier (Yearly)',
    description: 'Unlimited extensions, priority reviews, and advanced features - Save 17%',
    mode: 'subscription',
    price: 149.99,
    currency: 'usd',
    interval: 'year'
  }
]

export function getProductByPriceId(priceId: string): StripeProduct | undefined {
  return stripeProducts.find(product => product.priceId === priceId)
}

export function getProductById(id: string): StripeProduct | undefined {
  return stripeProducts.find(product => product.id === id)
}