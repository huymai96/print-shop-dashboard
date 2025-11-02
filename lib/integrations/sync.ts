import { db } from '../db';
import { fetchGelatoOrders } from './gelato';
import { fetchFastPlatformOrders } from './fast-platform';
import { fetchFileMakerOrders } from './filemaker';
import type { Platform } from '@/types';

// Sync all platforms
export async function syncAllPlatforms(): Promise<{
  success: boolean;
  results: Record<Platform, { success: boolean; count: number; error?: string }>;
}> {
  const results: Record<string, { success: boolean; count: number; error?: string }> = {};

  // Sync Gelato
  try {
    const gelatoOrders = await fetchGelatoOrders();
    let synced = 0;
    
    for (const order of gelatoOrders) {
      const result = await db.upsertOrder(order);
      if (result) synced++;
    }

    results.gelato = { success: true, count: synced };
    await db.createSyncLog({
      platform: 'gelato',
      status: 'success',
      orders_synced: synced,
    });
  } catch (error: any) {
    results.gelato = { success: false, count: 0, error: error.message };
    await db.createSyncLog({
      platform: 'gelato',
      status: 'error',
      orders_synced: 0,
      error_message: error.message,
    });
  }

  // Sync Fast Platform
  try {
    const fastOrders = await fetchFastPlatformOrders();
    let synced = 0;
    
    for (const order of fastOrders) {
      const result = await db.upsertOrder(order);
      if (result) synced++;
    }

    results.fast_platform = { success: true, count: synced };
    await db.createSyncLog({
      platform: 'fast_platform',
      status: 'success',
      orders_synced: synced,
    });
  } catch (error: any) {
    results.fast_platform = { success: false, count: 0, error: error.message };
    await db.createSyncLog({
      platform: 'fast_platform',
      status: 'error',
      orders_synced: 0,
      error_message: error.message,
    });
  }

  // Sync FileMaker (Shopworks)
  try {
    const filemakerOrders = await fetchFileMakerOrders();
    let synced = 0;
    
    for (const order of filemakerOrders) {
      const result = await db.upsertOrder(order);
      if (result) synced++;
    }

    results.shopworks = { success: true, count: synced };
    await db.createSyncLog({
      platform: 'shopworks',
      status: 'success',
      orders_synced: synced,
    });
  } catch (error: any) {
    results.shopworks = { success: false, count: 0, error: error.message };
    await db.createSyncLog({
      platform: 'shopworks',
      status: 'error',
      orders_synced: 0,
      error_message: error.message,
    });
  }

  const allSuccess = Object.values(results).every(r => r.success);

  return {
    success: allSuccess,
    results: results as any,
  };
}

// Sync single platform
export async function syncPlatform(platform: Platform): Promise<{ success: boolean; count: number; error?: string }> {
  try {
    let orders: any[] = [];

    switch (platform) {
      case 'gelato':
        orders = await fetchGelatoOrders();
        break;
      case 'fast_platform':
        orders = await fetchFastPlatformOrders();
        break;
      case 'shopworks':
        orders = await fetchFileMakerOrders();
        break;
      default:
        throw new Error(`Platform ${platform} not yet supported for syncing`);
    }

    let synced = 0;
    for (const order of orders) {
      const result = await db.upsertOrder(order);
      if (result) synced++;
    }

    await db.createSyncLog({
      platform,
      status: 'success',
      orders_synced: synced,
    });

    return { success: true, count: synced };
  } catch (error: any) {
    await db.createSyncLog({
      platform,
      status: 'error',
      orders_synced: 0,
      error_message: error.message,
    });

    return { success: false, count: 0, error: error.message };
  }
}

