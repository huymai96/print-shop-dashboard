import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import type { OrderFilters } from '@/types';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    
    const filters: OrderFilters = {
      platform: searchParams.get('platform') as any,
      status: searchParams.get('status') as any,
      decoration_method: searchParams.get('decoration_method') as any,
      assigned_to: searchParams.get('assigned_to') || undefined,
      priority: searchParams.get('priority') === 'true' ? true : undefined,
      search: searchParams.get('search') || undefined,
    };

    // Date filters
    if (searchParams.get('date_from')) {
      filters.date_from = new Date(searchParams.get('date_from')!);
    }
    if (searchParams.get('date_to')) {
      filters.date_to = new Date(searchParams.get('date_to')!);
    }

    // Remove undefined values
    Object.keys(filters).forEach(key => {
      if (filters[key as keyof OrderFilters] === undefined || filters[key as keyof OrderFilters] === null) {
        delete filters[key as keyof OrderFilters];
      }
    });

    const limit = parseInt(searchParams.get('limit') || '1000');
    const offset = parseInt(searchParams.get('offset') || '0');

    const orders = await db.getOrders(filters, limit, offset);

    return NextResponse.json({ orders });
  } catch (error) {
    console.error('Error fetching orders:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

