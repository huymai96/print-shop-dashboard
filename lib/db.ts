import { sql } from '@vercel/postgres';
import type { Order, User, OrderFilters, SyncLog } from '@/types';

// Database client utilities
export const db = {
  // User operations
  async getUser(email: string): Promise<User | null> {
    try {
      const result = await sql<User>`
        SELECT * FROM users WHERE email = ${email}
      `;
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error fetching user:', error);
      return null;
    }
  },

  async getUserById(id: string): Promise<User | null> {
    try {
      const result = await sql<User>`
        SELECT * FROM users WHERE id = ${id}
      `;
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error fetching user by id:', error);
      return null;
    }
  },

  async createUser(email: string, name: string, passwordHash: string, role: string): Promise<User | null> {
    try {
      const result = await sql<User>`
        INSERT INTO users (email, name, password_hash, role)
        VALUES (${email}, ${name}, ${passwordHash}, ${role})
        RETURNING id, email, name, role, created_at, last_login
      `;
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error creating user:', error);
      return null;
    }
  },

  async updateLastLogin(userId: string): Promise<void> {
    try {
      await sql`
        UPDATE users SET last_login = NOW() WHERE id = ${userId}
      `;
    } catch (error) {
      console.error('Error updating last login:', error);
    }
  },

  async getAllUsers(): Promise<User[]> {
    try {
      const result = await sql<User>`
        SELECT id, email, name, role, created_at, last_login FROM users
        ORDER BY name
      `;
      return result.rows;
    } catch (error) {
      console.error('Error fetching users:', error);
      return [];
    }
  },

  // Order operations
  async getOrders(filters?: OrderFilters, limit = 1000, offset = 0): Promise<Order[]> {
    try {
      let query = `SELECT * FROM orders WHERE 1=1`;
      const params: any[] = [];
      let paramIndex = 1;

      if (filters?.platform) {
        query += ` AND platform = $${paramIndex}`;
        params.push(filters.platform);
        paramIndex++;
      }

      if (filters?.status) {
        query += ` AND status = $${paramIndex}`;
        params.push(filters.status);
        paramIndex++;
      }

      if (filters?.decoration_method) {
        query += ` AND decoration_method = $${paramIndex}`;
        params.push(filters.decoration_method);
        paramIndex++;
      }

      if (filters?.assigned_to) {
        query += ` AND assigned_to = $${paramIndex}`;
        params.push(filters.assigned_to);
        paramIndex++;
      }

      if (filters?.priority !== undefined) {
        query += ` AND priority = $${paramIndex}`;
        params.push(filters.priority);
        paramIndex++;
      }

      if (filters?.date_from) {
        query += ` AND due_date >= $${paramIndex}`;
        params.push(filters.date_from);
        paramIndex++;
      }

      if (filters?.date_to) {
        query += ` AND due_date <= $${paramIndex}`;
        params.push(filters.date_to);
        paramIndex++;
      }

      if (filters?.search) {
        query += ` AND (order_number ILIKE $${paramIndex} OR customer_name ILIKE $${paramIndex})`;
        params.push(`%${filters.search}%`);
        paramIndex++;
      }

      query += ` ORDER BY priority DESC, due_date ASC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      params.push(limit, offset);

      const result = await sql.query(query, params);
      return result.rows as Order[];
    } catch (error) {
      console.error('Error fetching orders:', error);
      return [];
    }
  },

  async getOrderById(id: string): Promise<Order | null> {
    try {
      const result = await sql<Order>`
        SELECT * FROM orders WHERE id = ${id}
      `;
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error fetching order:', error);
      return null;
    }
  },

  async upsertOrder(order: Partial<Order>): Promise<Order | null> {
    try {
      const dueDate = order.due_date ? (order.due_date instanceof Date ? order.due_date.toISOString() : order.due_date) : new Date().toISOString();
      
      const result = await sql<Order>`
        INSERT INTO orders (
          order_number, platform, customer_name, customer_email, quantity,
          decoration_method, due_date, status, priority, notes, order_details, synced_at
        )
        VALUES (
          ${order.order_number}, ${order.platform}, ${order.customer_name || null},
          ${order.customer_email || null}, ${order.quantity}, ${order.decoration_method},
          ${dueDate}, ${order.status || 'pending'}, ${order.priority || false},
          ${order.notes || null}, ${order.order_details ? JSON.stringify(order.order_details) : null},
          NOW()
        )
        ON CONFLICT (order_number, platform)
        DO UPDATE SET
          customer_name = EXCLUDED.customer_name,
          customer_email = EXCLUDED.customer_email,
          quantity = EXCLUDED.quantity,
          decoration_method = EXCLUDED.decoration_method,
          due_date = EXCLUDED.due_date,
          status = EXCLUDED.status,
          notes = EXCLUDED.notes,
          order_details = EXCLUDED.order_details,
          synced_at = NOW(),
          updated_at = NOW()
        RETURNING *
      `;
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error upserting order:', error);
      return null;
    }
  },

  async updateOrder(id: string, updates: Partial<Order>): Promise<Order | null> {
    try {
      const setClauses: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      if (updates.status !== undefined) {
        setClauses.push(`status = $${paramIndex}`);
        values.push(updates.status);
        paramIndex++;
      }

      if (updates.assigned_to !== undefined) {
        setClauses.push(`assigned_to = $${paramIndex}`);
        values.push(updates.assigned_to);
        paramIndex++;
      }

      if (updates.priority !== undefined) {
        setClauses.push(`priority = $${paramIndex}`);
        values.push(updates.priority);
        paramIndex++;
      }

      if (updates.notes !== undefined) {
        setClauses.push(`notes = $${paramIndex}`);
        values.push(updates.notes);
        paramIndex++;
      }

      if (setClauses.length === 0) {
        return null;
      }

      setClauses.push(`updated_at = NOW()`);
      values.push(id);

      const query = `
        UPDATE orders
        SET ${setClauses.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING *
      `;

      const result = await sql.query(query, values);
      return result.rows[0] as Order || null;
    } catch (error) {
      console.error('Error updating order:', error);
      return null;
    }
  },

  async getOrderStats(): Promise<any> {
    try {
      const result = await sql`
        SELECT
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE status = 'pending') as pending,
          COUNT(*) FILTER (WHERE status IN ('printing', 'embroidery')) as in_production,
          COUNT(*) FILTER (WHERE status = 'qc') as in_qc,
          COUNT(*) FILTER (WHERE status = 'packing') as packing,
          COUNT(*) FILTER (WHERE status = 'shipped') as shipped,
          COUNT(*) FILTER (WHERE priority = true) as priority,
          COUNT(*) FILTER (WHERE due_date < NOW()) as overdue
        FROM orders
        WHERE status NOT IN ('completed', 'cancelled')
      `;
      return result.rows[0];
    } catch (error) {
      console.error('Error fetching order stats:', error);
      return {};
    }
  },

  // Sync log operations
  async createSyncLog(log: Omit<SyncLog, 'id' | 'synced_at'>): Promise<void> {
    try {
      await sql`
        INSERT INTO sync_logs (platform, status, orders_synced, error_message)
        VALUES (${log.platform}, ${log.status}, ${log.orders_synced}, ${log.error_message || null})
      `;
    } catch (error) {
      console.error('Error creating sync log:', error);
    }
  },

  async getRecentSyncLogs(limit = 20): Promise<SyncLog[]> {
    try {
      const result = await sql<SyncLog>`
        SELECT * FROM sync_logs
        ORDER BY synced_at DESC
        LIMIT ${limit}
      `;
      return result.rows;
    } catch (error) {
      console.error('Error fetching sync logs:', error);
      return [];
    }
  },
};

