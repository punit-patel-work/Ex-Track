import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { generateMockDataForUser } from '@/utils/mock-data'

export async function POST(request: NextRequest) {
  try {
    // Validate authenticated session
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { userId } = await request.json()

    // Ensure the authenticated user can only seed their own data
    if (!userId || userId !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden: userId must match authenticated user' },
        { status: 403 }
      )
    }

    const seeded = await generateMockDataForUser(userId)
    return NextResponse.json({ success: true, seeded })
  } catch (error: any) {
    console.error('Failed to seed mock database data:', error)
    return NextResponse.json(
      { error: 'Failed to seed user database: ' + error.message },
      { status: 500 }
    )
  }
}
