import dotenv from 'dotenv'
dotenv.config()

import Stripe from 'stripe'
import ws from 'ws'

// Set WebSocket globally for Supabase
globalThis.WebSocket = ws

import { createClient } from '@supabase/supabase-js'

if (!process.env.STRIPE_SECRET_KEY) {
  console.error('❌ STRIPE_SECRET_KEY not found in .env')
  process.exit(1)
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false }
})

// ============================================================================
// STRIPE SERVICE - Reusable payment operations
// ============================================================================

export const stripeService = {
  /**
   * Create or get Stripe customer
   * @param {string} userId - Supabase user ID
   * @param {string} email - User email
   * @returns {Promise<string>} Stripe customer ID
   */
  async getOrCreateCustomer(userId, email) {
    try {
      // Check if customer already exists
      const { data: user } = await supabase
        .from('users')
        .select('stripe_customer_id')
        .eq('id', userId)
        .single()

      if (user?.stripe_customer_id) {
        return user.stripe_customer_id
      }

      // Create new customer
      const customer = await stripe.customers.create({
        email,
        metadata: {
          supabase_user_id: userId,
          created_at: new Date().toISOString()
        }
      })

      // Save to database
      await supabase
        .from('users')
        .update({ stripe_customer_id: customer.id })
        .eq('id', userId)

      console.log(`✅ Stripe customer created: ${customer.id} for user ${userId}`)
      return customer.id
    } catch (err) {
      console.error('❌ Error creating Stripe customer:', err)
      throw err
    }
  },

  /**
   * Create checkout session for subscription
   * @param {string} customerId - Stripe customer ID
   * @param {string} priceId - Stripe price ID
   * @param {object} options - Additional options
   * @returns {Promise<object>} Checkout session
   */
  async createCheckoutSession(customerId, priceId, options = {}) {
    try {
      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        payment_method_types: ['card'],
        line_items: [
          {
            price: priceId,
            quantity: 1
          }
        ],
        mode: 'subscription',
        success_url: options.successUrl || `${process.env.APP_URL}/premium?success=true`,
        cancel_url: options.cancelUrl || `${process.env.APP_URL}/premium?cancelled=true`,
        billing_address_collection: 'auto',
        customer_update: {
          address: 'auto',
          name: 'auto'
        },
        locale: 'auto'
      })

      console.log(`✅ Checkout session created: ${session.id}`)
      return session
    } catch (err) {
      console.error('❌ Error creating checkout session:', err)
      throw new Error(`Failed to create checkout: ${err.message}`)
    }
  },

  /**
   * Get subscription details
   * @param {string} subscriptionId - Stripe subscription ID
   * @returns {Promise<object>} Subscription details
   */
  async getSubscription(subscriptionId) {
    try {
      const subscription = await stripe.subscriptions.retrieve(subscriptionId)
      return subscription
    } catch (err) {
      console.error('❌ Error getting subscription:', err)
      throw err
    }
  },

  /**
   * Cancel subscription
   * @param {string} subscriptionId - Stripe subscription ID
   * @param {boolean} atPeriodEnd - Cancel at period end (true) or immediately (false)
   * @returns {Promise<object>} Cancelled subscription
   */
  async cancelSubscription(subscriptionId, atPeriodEnd = true) {
    try {
      const subscription = await stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: atPeriodEnd
      })

      console.log(`✅ Subscription ${subscriptionId} cancelled at period end: ${atPeriodEnd}`)
      return subscription
    } catch (err) {
      console.error('❌ Error cancelling subscription:', err)
      throw err
    }
  },

  /**
   * Handle subscription event
   * @param {object} subscription - Stripe subscription object
   * @param {string} eventType - Event type (created, updated, deleted)
   */
  async handleSubscriptionEvent(subscription, eventType) {
    try {
      const customerId = subscription.customer
      const subscriptionId = subscription.id

      // Get Stripe customer metadata
      const customer = await stripe.customers.retrieve(customerId)
      const supabaseUserId = customer.metadata?.supabase_user_id

      if (!supabaseUserId) {
        console.warn(`⚠️  No Supabase user ID found for customer ${customerId}`)
        return
      }

      // Handle different event types
      switch (eventType) {
        case 'created':
        case 'updated':
          if (subscription.status === 'active') {
            // Subscription is active
            await supabase.from('users').update({
              premium: true,
              stripe_subscription_id: subscriptionId,
              stripe_subscription_status: subscription.status,
              stripe_current_period_end: subscription.current_period_end * 1000 // Convert to ms
            }).eq('id', supabaseUserId)

            console.log(`✅ User ${supabaseUserId} upgraded to premium`)
          } else if (subscription.status === 'past_due') {
            // Payment failed, but subscription is retained
            await supabase.from('users').update({
              stripe_subscription_status: 'past_due'
            }).eq('id', supabaseUserId)

            console.warn(`⚠️  User ${supabaseUserId} has past_due subscription`)
          }
          break

        case 'deleted':
          // Subscription cancelled
          await supabase.from('users').update({
            premium: false,
            stripe_subscription_id: null,
            stripe_subscription_status: 'canceled'
          }).eq('id', supabaseUserId)

          console.log(`✅ User ${supabaseUserId} cancelled premium`)
          break
      }
    } catch (err) {
      console.error('❌ Error handling subscription event:', err)
      throw err
    }
  },

  /**
   * Verify webhook signature
   * @param {object} body - Raw request body
   * @param {string} signature - Stripe signature header
   * @returns {object} Verified event
   */
  verifyWebhookSignature(body, signature) {
    try {
      const event = stripe.webhooks.constructEvent(
        body,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET
      )

      console.log(`✅ Webhook verified: ${event.type}`)
      return event
    } catch (err) {
      console.error('❌ Webhook signature verification failed:', err)
      throw new Error(`Webhook Error: ${err.message}`)
    }
  },

  /**
   * Handle payment failure
   * @param {string} subscriptionId - Stripe subscription ID
   * @param {string} userId - Supabase user ID
   */
  async handlePaymentFailure(subscriptionId, userId) {
    try {
      // Update user in database
      await supabase.from('users').update({
        stripe_subscription_status: 'past_due'
      }).eq('id', userId)

      console.warn(`⚠️  Payment failed for user ${userId}, subscription: ${subscriptionId}`)

      // TODO: Send email notification to user
      // TODO: Create support ticket
    } catch (err) {
      console.error('❌ Error handling payment failure:', err)
    }
  },

  /**
   * Get customer invoices
   * @param {string} customerId - Stripe customer ID
   * @returns {Promise<array>} List of invoices
   */
  async getCustomerInvoices(customerId, limit = 10) {
    try {
      const invoices = await stripe.invoices.list({
        customer: customerId,
        limit
      })

      return invoices.data
    } catch (err) {
      console.error('❌ Error getting invoices:', err)
      throw err
    }
  },

  /**
   * Get billing portal URL
   * @param {string} customerId - Stripe customer ID
   * @param {string} returnUrl - URL to return to after
   * @returns {Promise<string>} Portal URL
   */
  async getBillingPortalUrl(customerId, returnUrl) {
    try {
      const session = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: returnUrl || process.env.APP_URL
      })

      console.log(`✅ Billing portal URL created for customer ${customerId}`)
      return session.url
    } catch (err) {
      console.error('❌ Error creating billing portal:', err)
      throw err
    }
  },

  /**
   * Update payment method
   * @param {string} customerId - Stripe customer ID
   * @param {string} paymentMethodId - New payment method ID
   */
  async updatePaymentMethod(customerId, paymentMethodId) {
    try {
      // Attach payment method to customer
      await stripe.paymentMethods.attach(paymentMethodId, {
        customer: customerId
      })

      // Set as default payment method
      await stripe.customers.update(customerId, {
        invoice_settings: {
          default_payment_method: paymentMethodId
        }
      })

      console.log(`✅ Payment method updated for customer ${customerId}`)
    } catch (err) {
      console.error('❌ Error updating payment method:', err)
      throw err
    }
  }
}

// ============================================================================
// ANALYTICS & MONITORING
// ============================================================================

export const stripeAnalytics = {
  /**
   * Log payment event
   */
  logPaymentEvent(eventType, data) {
    const timestamp = new Date().toISOString()
    console.log(`📊 [${timestamp}] ${eventType}:`, data)

    // TODO: Send to analytics service (Mixpanel, Segment, etc)
  },

  /**
   * Get subscription metrics
   */
  async getMetrics() {
    try {
      const { data: users } = await supabase
        .from('users')
        .select('id, premium, stripe_subscription_status')

      const metrics = {
        total_users: users.length,
        premium_users: users.filter(u => u.premium).length,
        active_subscriptions: users.filter(u => u.stripe_subscription_status === 'active').length,
        past_due: users.filter(u => u.stripe_subscription_status === 'past_due').length,
        cancelled: users.filter(u => u.stripe_subscription_status === 'canceled').length,
        conversion_rate: ((users.filter(u => u.premium).length / users.length) * 100).toFixed(2) + '%',
        mrr: (users.filter(u => u.premium).length * 9.99).toFixed(2)
      }

      console.log('📈 Subscription Metrics:', metrics)
      return metrics
    } catch (err) {
      console.error('❌ Error getting metrics:', err)
      throw err
    }
  }
}

export default stripeService
