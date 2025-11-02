import { sql } from '@vercel/postgres';
import bcrypt from 'bcryptjs';

async function initDatabase() {
  try {
    console.log('🚀 Initializing database...');

    // Create users table
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        password_hash TEXT NOT NULL,
        role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'manager', 'operator')),
        created_at TIMESTAMP DEFAULT NOW(),
        last_login TIMESTAMP
      )
    `;
    console.log('✅ Users table created');

    // Create orders table
    await sql`
      CREATE TABLE IF NOT EXISTS orders (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        order_number VARCHAR(255) NOT NULL,
        platform VARCHAR(50) NOT NULL CHECK (platform IN ('gelato', 'fast_platform', 'shopworks', 'custom_ink', 'ooshirts', 'samedaycustom')),
        customer_name VARCHAR(255),
        customer_email VARCHAR(255),
        quantity INTEGER NOT NULL,
        decoration_method VARCHAR(50) NOT NULL CHECK (decoration_method IN ('screen_print', 'embroidery', 'dtg', 'sublimation', 'heat_transfer', 'other')),
        due_date TIMESTAMP NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'printing', 'embroidery', 'qc', 'packing', 'shipped', 'completed', 'cancelled')),
        priority BOOLEAN DEFAULT FALSE,
        assigned_to UUID REFERENCES users(id),
        notes TEXT,
        order_details JSONB,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        synced_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(order_number, platform)
      )
    `;
    console.log('✅ Orders table created');

    // Create indexes
    await sql`
      CREATE INDEX IF NOT EXISTS idx_orders_platform ON orders(platform)
    `;
    await sql`
      CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status)
    `;
    await sql`
      CREATE INDEX IF NOT EXISTS idx_orders_due_date ON orders(due_date)
    `;
    await sql`
      CREATE INDEX IF NOT EXISTS idx_orders_assigned_to ON orders(assigned_to)
    `;
    await sql`
      CREATE INDEX IF NOT EXISTS idx_orders_priority ON orders(priority)
    `;
    console.log('✅ Indexes created');

    // Create sync_logs table
    await sql`
      CREATE TABLE IF NOT EXISTS sync_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        platform VARCHAR(50) NOT NULL,
        status VARCHAR(20) NOT NULL CHECK (status IN ('success', 'error')),
        orders_synced INTEGER DEFAULT 0,
        error_message TEXT,
        synced_at TIMESTAMP DEFAULT NOW()
      )
    `;
    console.log('✅ Sync logs table created');

    // Create default admin user
    const adminEmail = 'admin@printshop.com';
    const existingAdmin = await sql`SELECT id FROM users WHERE email = ${adminEmail}`;
    
    if (existingAdmin.rows.length === 0) {
      const passwordHash = await bcrypt.hash('admin123', 10);
      await sql`
        INSERT INTO users (email, name, password_hash, role)
        VALUES (${adminEmail}, 'Admin User', ${passwordHash}, 'admin')
      `;
      console.log('✅ Default admin user created');
      console.log('   Email: admin@printshop.com');
      console.log('   Password: admin123');
      console.log('   ⚠️  Please change the password after first login!');
    } else {
      console.log('ℹ️  Admin user already exists');
    }

    console.log('🎉 Database initialization complete!');
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    throw error;
  }
}

initDatabase();

