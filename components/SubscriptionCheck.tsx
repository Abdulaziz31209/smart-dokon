'use client'
import React from 'react'

// userId xatosini yo'qotish uchun uni interface-ga qo'shdik
interface Props {
  children: React.ReactNode;
  userId?: string; 
}

export default function SubscriptionCheck({ children }: Props) {
  // Hech qanday tekshiruvsiz kontentni qaytaramiz
  return <>{children}</>
}