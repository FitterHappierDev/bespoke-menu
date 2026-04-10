import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'Bespoke Menu Planner'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          height: '100%',
          background: 'linear-gradient(135deg, #faf5f0 0%, #f0e6d9 100%)',
          fontFamily: 'Georgia, serif',
        }}
      >
        <div style={{ fontSize: 96, marginBottom: 16, display: 'flex' }}>👨‍🍳</div>
        <div
          style={{
            fontSize: 64,
            fontWeight: 700,
            color: '#2d2017',
            marginBottom: 12,
            display: 'flex',
          }}
        >
          Bespoke Menu Planner
        </div>
        <div
          style={{
            fontSize: 28,
            color: '#8b7355',
            display: 'flex',
          }}
        >
          Private weekly meal planning for your family
        </div>
      </div>
    ),
    { ...size }
  )
}
