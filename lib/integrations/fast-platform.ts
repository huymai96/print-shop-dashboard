import type { Order, FastPlatformOrder, DecorationMethod } from '@/types';

const FAST_PLATFORM_API_URL = process.env.FAST_PLATFORM_API_URL || 'https://api.fastplatform.com/v1';
const FAST_PLATFORM_API_KEY = process.env.FAST_PLATFORM_API_KEY || '';

export async function fetchFastPlatformOrders(): Promise<Partial<Order>[]> {
  try {
    if (!FAST_PLATFORM_API_KEY) {
      console.warn('Fast Platform API key not configured');
      return [];
    }

    const response = await fetch(`${FAST_PLATFORM_API_URL}/orders`, {
      headers: {
        'X-API-Key': FAST_PLATFORM_API_KEY,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Fast Platform API error: ${response.statusText}`);
    }

    const data = await response.json();
    const orders: FastPlatformOrder[] = data.data || [];

    return orders.map(normalizeFastPlatformOrder);
  } catch (error) {
    console.error('Error fetching Fast Platform orders:', error);
    throw error;
  }
}

function normalizeFastPlatformOrder(fpOrder: FastPlatformOrder): Partial<Order> {
  // Map Fast Platform status to our status
  const statusMap: Record<string, any> = {
    'new': 'pending',
    'in_production': 'printing',
    'quality_check': 'qc',
    'packing': 'packing',
    'shipped': 'shipped',
    'completed': 'completed',
  };

  // Map decoration type
  const decorationMap: Record<string, DecorationMethod> = {
    'screen_printing': 'screen_print',
    'embroidery': 'embroidery',
    'dtg': 'dtg',
    'sublimation': 'sublimation',
    'heat_transfer': 'heat_transfer',
  };

  return {
    order_number: fpOrder.order_number,
    platform: 'fast_platform',
    customer_name: fpOrder.customer_info?.name,
    customer_email: fpOrder.customer_info?.email,
    quantity: fpOrder.quantity,
    decoration_method: decorationMap[fpOrder.decoration_type] || 'other',
    due_date: new Date(fpOrder.delivery_date),
    status: statusMap[fpOrder.status] || 'pending',
    priority: false,
    order_details: fpOrder,
  };
}

// Test Fast Platform connection
export async function testFastPlatformConnection(): Promise<boolean> {
  try {
    if (!FAST_PLATFORM_API_KEY) {
      return false;
    }

    const response = await fetch(`${FAST_PLATFORM_API_URL}/status`, {
      headers: {
        'X-API-Key': FAST_PLATFORM_API_KEY,
      },
    });

    return response.ok;
  } catch (error) {
    return false;
  }
}

