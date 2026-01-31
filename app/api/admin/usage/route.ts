import { NextRequest, NextResponse } from 'next/server';
import { getUsageStats } from '@/lib/usage-tracker';

export async function GET(request: NextRequest) {
  try {
    // Check owner password
    const password = request.nextUrl.searchParams.get('password');
    const ownerPassword = process.env.OWNER_PASSWORD;

    if (password !== ownerPassword) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get usage stats for last 30 days
    const friendsStats = await getUsageStats('friends', 30);
    const ownerStats = await getUsageStats('owner', 30);

    return NextResponse.json({
      friends: friendsStats,
      owner: ownerStats,
    });
  } catch (error: any) {
    console.error('Error in usage route:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
