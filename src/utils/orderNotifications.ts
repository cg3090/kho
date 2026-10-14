/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { WebshopOrder } from '../types';
import { soundManager } from './sound';

const CHANNEL_NAME = 'wms_webshop_orders_broadcast';
const STORAGE_KEY = 'wms_latest_webshop_order_event';

let broadcastChannel: BroadcastChannel | null = null;
if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
  try {
    broadcastChannel = new BroadcastChannel(CHANNEL_NAME);
  } catch {
    broadcastChannel = null;
  }
}

/**
 * Dispatch an event when a customer places an order
 */
export function broadcastNewOrder(order: WebshopOrder) {
  // 1. Play sound
  soundManager.playNewOrderChime();

  // 2. Dispatch in current window
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('wms_new_order_event', { detail: order }));
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          order,
          timestamp: Date.now(),
        })
      );
    } catch {
      // ignore quota errors
    }
  }

  // 3. Dispatch across tabs
  if (broadcastChannel) {
    try {
      broadcastChannel.postMessage({ type: 'NEW_ORDER', order });
    } catch {
      // ignore
    }
  }
}

/**
 * Subscribe to order events across the app and tabs
 */
export function subscribeToNewOrders(onNewOrder: (order: WebshopOrder) => void): () => void {
  if (typeof window === 'undefined') return () => {};

  // Window event listener
  const handleLocalEvent = (e: Event) => {
    const customEvent = e as CustomEvent<WebshopOrder>;
    if (customEvent.detail) {
      onNewOrder(customEvent.detail);
    }
  };
  window.addEventListener('wms_new_order_event', handleLocalEvent);

  // Broadcast channel listener (other tabs)
  const handleBroadcast = (event: MessageEvent) => {
    if (event.data?.type === 'NEW_ORDER' && event.data.order) {
      soundManager.playNewOrderChime();
      onNewOrder(event.data.order);
    }
  };
  if (broadcastChannel) {
    broadcastChannel.addEventListener('message', handleBroadcast);
  }

  // Storage listener fallback (for browsers without BroadcastChannel or background tabs)
  const handleStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY && e.newValue) {
      try {
        const parsed = JSON.parse(e.newValue);
        if (parsed.order) {
          soundManager.playNewOrderChime();
          onNewOrder(parsed.order);
        }
      } catch {
        // ignore
      }
    }
  };
  window.addEventListener('storage', handleStorage);

  return () => {
    window.removeEventListener('wms_new_order_event', handleLocalEvent);
    if (broadcastChannel) {
      broadcastChannel.removeEventListener('message', handleBroadcast);
    }
    window.removeEventListener('storage', handleStorage);
  };
}
