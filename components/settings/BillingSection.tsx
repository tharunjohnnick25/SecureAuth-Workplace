'use client'

import React, { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useAuthStore } from '@/store/useAuthStore'
import { CreditCard, Loader2, ExternalLink } from 'lucide-react'
import Link from 'next/link'

interface Subscription {
  plan_id: string
  status: string
  current_period_end: string
}

export function BillingSection() {
  const { user } = useAuthStore()
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchSubscription()
  }, [])

  const fetchSubscription = async () => {
    setLoading(true)
    try {
      const { data } = await supabase
        .from('subscriptions')
        .select('plan_id, status, current_period_end')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (data) setSubscription(data)
    } catch {} finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
      </div>
    )
  }

  if (!subscription) {
    return (
      <div className="space-y-6">
        <div className="p-4 bg-white/5 rounded-xl border border-white/5">
          <p className="text-sm text-gray-400">No active subscription found.</p>
        </div>
        <Link href="/pricing">
          <button className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-500 rounded-xl font-bold text-sm transition-all">
            View Plans & Subscribe
          </button>
        </Link>
      </div>
    )
  }

  const planLabels: Record<string, string> = {
    basic: 'Basic Protection',
    pro: 'Professional',
    enterprise: 'Enterprise',
  }

  return (
    <div className="space-y-6">
      <div className="p-4 bg-white/5 rounded-xl border border-white/5 flex justify-between items-center">
        <div>
          <p className="text-sm font-semibold text-white">Current Plan</p>
          <p className="text-lg font-bold text-blue-400 mt-1">
            {planLabels[subscription.plan_id] || subscription.plan_id}
          </p>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
          subscription.status === 'active'
            ? 'bg-green-500/10 text-green-400 border border-green-500/20'
            : 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
        }`}>
          {subscription.status === 'active' ? 'Active' : subscription.status}
        </span>
      </div>
      <div className="text-sm text-gray-400">
        Renews on {new Date(subscription.current_period_end).toLocaleDateString()}
      </div>
      <Link href="/pricing">
        <button className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl font-bold text-sm transition-all">
          Upgrade Plan <ExternalLink className="w-4 h-4" />
        </button>
      </Link>
    </div>
  )
}