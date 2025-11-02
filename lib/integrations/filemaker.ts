import type { Order, FileMakerOrder, DecorationMethod } from '@/types';

const FILEMAKER_SERVER_URL = process.env.FILEMAKER_SERVER_URL || '';
const FILEMAKER_DATABASE = process.env.FILEMAKER_DATABASE || 'Shopworks';
const FILEMAKER_USERNAME = process.env.FILEMAKER_USERNAME || '';
const FILEMAKER_PASSWORD = process.env.FILEMAKER_PASSWORD || '';

let cachedToken: string | null = null;
let tokenExpiry: number = 0;

// Get FileMaker authentication token
async function getFileMakerToken(): Promise<string> {
  // Return cached token if still valid
  if (cachedToken && Date.now() < tokenExpiry) {
    return cachedToken;
  }

  try {
    const response = await fetch(
      `${FILEMAKER_SERVER_URL}/fmi/data/v1/databases/${FILEMAKER_DATABASE}/sessions`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${Buffer.from(`${FILEMAKER_USERNAME}:${FILEMAKER_PASSWORD}`).toString('base64')}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`FileMaker authentication failed: ${response.statusText}`);
    }

    const data = await response.json();
    cachedToken = data.response.token;
    tokenExpiry = Date.now() + (14 * 60 * 1000); // Token valid for 15 minutes, cache for 14

    return cachedToken as string;
  } catch (error) {
    console.error('Error getting FileMaker token:', error);
    throw error;
  }
}

// Fetch orders from FileMaker
export async function fetchFileMakerOrders(): Promise<Partial<Order>[]> {
  try {
    if (!FILEMAKER_SERVER_URL || !FILEMAKER_USERNAME) {
      console.warn('FileMaker credentials not configured');
      return [];
    }

    const token = await getFileMakerToken();

    // Find orders (you may need to adjust the layout name based on your FileMaker database)
    const response = await fetch(
      `${FILEMAKER_SERVER_URL}/fmi/data/v1/databases/${FILEMAKER_DATABASE}/layouts/Orders/_find`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: [
            {
              // Fetch orders from last 30 days
              DueDate: `>=${new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}`,
            },
          ],
          limit: 1000,
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`FileMaker API error: ${response.statusText}`);
    }

    const data = await response.json();
    const records: FileMakerOrder[] = data.response.data || [];

    return records.map(normalizeFileMakerOrder);
  } catch (error) {
    console.error('Error fetching FileMaker orders:', error);
    throw error;
  }
}

function normalizeFileMakerOrder(fmOrder: FileMakerOrder): Partial<Order> {
  const fieldData = fmOrder.fieldData;

  // Map FileMaker status to our status
  const statusMap: Record<string, any> = {
    'Pending': 'pending',
    'In Production': 'printing',
    'Embroidering': 'embroidery',
    'QC': 'qc',
    'Packing': 'packing',
    'Shipped': 'shipped',
    'Complete': 'completed',
  };

  // Map decoration method
  const decorationMap: Record<string, DecorationMethod> = {
    'Screen Print': 'screen_print',
    'Embroidery': 'embroidery',
    'DTG': 'dtg',
    'Sublimation': 'sublimation',
    'Heat Transfer': 'heat_transfer',
  };

  return {
    order_number: fieldData.OrderNumber,
    platform: 'shopworks',
    customer_name: fieldData.CustomerName,
    quantity: fieldData.Quantity,
    decoration_method: decorationMap[fieldData.DecorationMethod] || 'other',
    due_date: new Date(fieldData.DueDate),
    status: statusMap[fieldData.Status] || 'pending',
    priority: false,
    order_details: fieldData,
  };
}

// Test FileMaker connection
export async function testFileMakerConnection(): Promise<boolean> {
  try {
    if (!FILEMAKER_SERVER_URL || !FILEMAKER_USERNAME) {
      return false;
    }

    await getFileMakerToken();
    return true;
  } catch (error) {
    return false;
  }
}

// Close FileMaker session (cleanup)
export async function closeFileMakerSession(): Promise<void> {
  if (!cachedToken) return;

  try {
    await fetch(
      `${FILEMAKER_SERVER_URL}/fmi/data/v1/databases/${FILEMAKER_DATABASE}/sessions/${cachedToken}`,
      {
        method: 'DELETE',
      }
    );
  } catch (error) {
    console.error('Error closing FileMaker session:', error);
  } finally {
    cachedToken = null;
    tokenExpiry = 0;
  }
}

