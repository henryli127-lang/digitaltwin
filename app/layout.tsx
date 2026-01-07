import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: '数字分身',
  description: '创建并与你的数字分身对话',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  )
}

