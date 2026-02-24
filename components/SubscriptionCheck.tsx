'use client'
import React from 'react'

interface SubscriptionCheckProps {
  children: React.ReactNode;
  userId?: string; // userId ixtiyoriy qilib qo'shildi
}

export default function SubscriptionCheck({ children }: SubscriptionCheckProps) {
  // Obunani tekshirmasdan hamma narsani ko'rsatib yuboramiz
  return <>{children}</>
}