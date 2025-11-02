import type { Order, GelatoOrder, DecorationMethod } from '@/types';

const GELATO_API_URL = process.env.GELATO_CONNECT_API_URL || 'https://api.gelato.com/v1';
const GELATO_API_KEY = process.env.GELATO_CONNECT_API_KEY || '';

export async function fetchGelatoOrders(): Promise<Partial<Order>[]> {
  try {
    if (!GELATO_API_KEY) {
      console.warn('Gelato API key not configured');
      return [];
    }

    const response = await fetch(`${GELATO_API_URL}/orders`, {
      headers: {
        'Authorization': `Bearer ${GELATO_API_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Gelato API error: ${response.statusText}`);
    }

    const data = await response.json();
    const orders: GelatoOrder[] = data.orders || [];

    return orders.map(normalizeGelatoOrder);
  } catch (error) {
    console.error('Error fetching Gelato orders:', error);
    throw error;
  }
}

function normalizeGelatoOrder(gelatoOrder: GelatoOrder): Partial<Order> {
  // Map Gelato status to our status
  const statusMap: Record<string, any> = {
    'pending': 'pending',
    'processing': 'printing',
    'shipped': 'shipped',
    'delivered': 'completed',
  };

  // Infer decoration method (you might need to adjust based on Gelato's actual data structure)
  const decorationMethod: DecorationMethod = 'screen_print'; // Default

  return {
    order_number: gelatoOrder.orderReferenceId,
    platform: 'gelato',
    customer_name: gelatoOrder.customer?.name,
    customer_email: gelatoOrder.customer?.email,
    quantity: gelatoOrder.quantity,
    decoration_method: decorationMethod,
    due_date: new Date(gelatoOrder.dueDate),
    status: statusMap[gelatoOrder.status?.toLowerCase()] || 'pending',
    priority: false,
    order_details: gelatoOrder,
  };
}

// Test Gelato connection
export async function testGelatoConnection(): Promise<boolean> {
  try {
    if (!GELATO_API_KEY) {
      return false;
    }

    const response = await fetch(`${GELATO_API_URL}/health`, {
      headers: {
        'Authorization': `Bearer ${GELATO_API_KEY}`,
      },
    });

    return response.ok;
  } catch (error) {
    return false;
  }
}

