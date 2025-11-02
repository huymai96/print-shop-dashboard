import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, hasPermission } from '@/lib/auth';
import { syncAllPlatforms, syncPlatform } from '@/lib/integrations/sync';
import type { Platform } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || !hasPermission(user, 'manager')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { platform } = await request.json().catch(() => ({}));

    if (platform) {
      // Sync specific platform
      const result = await syncPlatform(platform as Platform);
      return NextResponse.json({ result });
    } else {
      // Sync all platforms
      const result = await syncAllPlatforms();
      return NextResponse.json({ result });
    }
  } catch (error) {
    console.error('Error syncing:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

