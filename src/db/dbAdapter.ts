/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  Category,
  Product,
  Supplier,
  Customer,
  StockTransaction,
  StockTransactionDetail,
} from '../types';

/**
 * 1. UNIFIED DATABASE ADAPTER INTERFACE
 * Defines standard data access methods required by the ERP system.
 */
export interface IDatabaseAdapter {
  connect(): Promise<void>;
  disconnect(): Promise<void>;

  // --- Category Operations ---
  getCategories(): Promise<Category[]>;
  createCategory(category: Omit<Category, 'id'> & { id: string }): Promise<Category>;

  // --- Product Operations ---
  getProducts(): Promise<Product[]>;
  updateProductStock(productId: string, qtyDelta: number, avgCost?: number): Promise<void>;

  // --- Supplier & Customer Operations ---
  getSuppliers(): Promise<Supplier[]>;
  getCustomers(): Promise<Customer[]>;

  // --- Stock Transactions ---
  getStockTransactions(): Promise<StockTransaction[]>;
  createStockTransaction(
    tx: StockTransaction,
    details: StockTransactionDetail[]
  ): Promise<void>;
}

/**
 * 2. POSTGRESQL IMPLEMENTATION
 * Connects to the real PostgreSQL service via `/api/db/*` backend routes.
 * When connected, zero mock data is used.
 */
export class PostgresDatabaseAdapter implements IDatabaseAdapter {
  private connectionString: string;
  private isConnected = false;

  constructor(connectionString = '') {
    this.connectionString = connectionString;
  }

  async connect(): Promise<void> {
    if (this.connectionString) {
      const res = await fetch('/api/db/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ connectionString: this.connectionString }),
      });
      const text = await res.text();
      let data: any = {};
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error('Máy chủ phản hồi HTML thay vì JSON.');
      }
      if (!res.ok || !data.connected) {
        throw new Error(data.error || data.message || 'Failed to connect to database');
      }
      this.isConnected = true;
      return;
    }

    const res = await fetch('/api/db/status');
    const data = await res.json();
    this.isConnected = Boolean(data.connected);
  }

  async disconnect(): Promise<void> {
    if (this.isConnected) {
      await fetch('/api/db/disconnect', { method: 'POST' });
      this.isConnected = false;
    }
  }

  private async fetchState(): Promise<Record<string, any>> {
    const res = await fetch('/api/db/state');
    if (!res.ok) {
      throw new Error('Failed to fetch state from PostgreSQL');
    }
    const json = await res.json();
    return json.data || {};
  }

  async getCategories(): Promise<Category[]> {
    const state = await this.fetchState();
    return Array.isArray(state.categories) ? state.categories : [];
  }

  async createCategory(category: Category): Promise<Category> {
    const categories = await this.getCategories();
    const updated = [...categories.filter((c) => c.id !== category.id), category];
    await fetch('/api/db/collection/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value: updated }),
    });
    return category;
  }

  async getProducts(): Promise<Product[]> {
    const state = await this.fetchState();
    return Array.isArray(state.products) ? state.products : [];
  }

  async updateProductStock(productId: string, qtyDelta: number, avgCost?: number): Promise<void> {
    const products = await this.getProducts();
    const updated = products.map((p) => {
      if (p.id !== productId) return p;
      return {
        ...p,
        currentQty: Number(p.currentQty || 0) + qtyDelta,
        averageCost: avgCost !== undefined ? avgCost : p.averageCost,
      };
    });
    await fetch('/api/db/collection/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value: updated }),
    });
  }

  async getSuppliers(): Promise<Supplier[]> {
    const state = await this.fetchState();
    return Array.isArray(state.suppliers) ? state.suppliers : [];
  }

  async getCustomers(): Promise<Customer[]> {
    const state = await this.fetchState();
    return Array.isArray(state.customers) ? state.customers : [];
  }

  async getStockTransactions(): Promise<StockTransaction[]> {
    const state = await this.fetchState();
    return Array.isArray(state.stockTransactions) ? state.stockTransactions : [];
  }

  async createStockTransaction(tx: StockTransaction, details: StockTransactionDetail[]): Promise<void> {
    const state = await this.fetchState();
    const stockTransactions = Array.isArray(state.stockTransactions) ? state.stockTransactions : [];
    const stockTransactionDetails = Array.isArray(state.stockTransactionDetails)
      ? state.stockTransactionDetails
      : [];

    await fetch('/api/db/sync-all', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        collections: {
          stockTransactions: [...stockTransactions, tx],
          stockTransactionDetails: [...stockTransactionDetails, ...details],
        },
      }),
    });
  }
}

export class DatabaseFactory {
  static getAdapter(connectionString?: string): IDatabaseAdapter {
    return new PostgresDatabaseAdapter(connectionString);
  }
}
