import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const { passcode } = await request.json()
  let role: string | null = null
  if (passcode === process.env.FAMILY_CODE) role = 'family'
  else if (passcode === process.env.CHEF_CODE) role = 'chef'
  if (!role) return NextResponse.json({ error: 'Invalid passcode' }, { status: 401 })
  const response = NextResponse.json({ role, success: true })
  response.cookies.set('bespoke_role', role, {
    httpOnly: true,
    sameSite: 'strict',
    maxAge: 60 * 60 * 24 * 30,
    path: '/',
  })
  return response
}

export async function DELETE() {
  const response = NextResponse.json({ success: true })
  response.cookies.delete('bespoke_role')
  return response
}
