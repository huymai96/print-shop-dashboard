'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Download, RefreshCw, Search, LogOut } from 'lucide-react';
import { exportOrdersToExcel, exportProductionSheetByStation } from '@/lib/export';
import { formatDate, isOverdue, getDaysUntilDue } from '@/lib/utils';
import type { Order, OrderStatus, Platform, DecorationMethod, User } from '@/types';

export default function DashboardPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState<any>({});
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [platformFilter, setPlatformFilter] = useState<Platform | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>('all');
  const [decorationFilter, setDecorationFilter] = useState<DecorationMethod | 'all'>('all');
  const [priorityFilter, setPriorityFilter] = useState<'all' | 'priority'>('all');

  useEffect(() => {
    loadOrders();
    loadStats();
    loadUsers();
    // Auto-refresh every 5 minutes
    const interval = setInterval(() => {
      loadOrders();
      loadStats();
    }, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    loadOrders();
  }, [searchTerm, platformFilter, statusFilter, decorationFilter, priorityFilter]);

  async function loadOrders() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (platformFilter !== 'all') params.append('platform', platformFilter);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (decorationFilter !== 'all') params.append('decoration_method', decorationFilter);
      if (priorityFilter === 'priority') params.append('priority', 'true');

      const response = await fetch(`/api/orders?${params.toString()}`);
      const data = await response.json();
      setOrders(data.orders || []);
    } catch (error) {
      console.error('Error loading orders:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadStats() {
    try {
      const response = await fetch('/api/orders/stats');
      const data = await response.json();
      setStats(data.stats || {});
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  }

  async function loadUsers() {
    try {
      const response = await fetch('/api/users');
      const data = await response.json();
      setUsers(data.users || []);
    } catch (error) {
      console.error('Error loading users:', error);
    }
  }

  async function syncAllPlatforms() {
    setSyncing(true);
    try {
      await fetch('/api/sync', { method: 'POST' });
      await loadOrders();
      await loadStats();
      alert('Sync completed successfully!');
    } catch (error) {
      alert('Sync failed. Please try again.');
    } finally {
      setSyncing(false);
    }
  }

  async function updateOrder(id: string, updates: Partial<Order>) {
    try {
      await fetch(`/api/orders/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      await loadOrders();
      await loadStats();
    } catch (error) {
      console.error('Error updating order:', error);
      alert('Failed to update order');
    }
  }

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/login';
  }

  function handleExportAll() {
    exportOrdersToExcel(orders);
  }

  function handleExportByStation() {
    exportProductionSheetByStation(orders);
  }

  function getStatusColor(status: OrderStatus): string {
    const colors = {
      pending: 'bg-gray-500',
      printing: 'bg-blue-500',
      embroidery: 'bg-purple-500',
      qc: 'bg-yellow-500',
      packing: 'bg-orange-500',
      shipped: 'bg-green-500',
      completed: 'bg-green-700',
      cancelled: 'bg-red-500',
    };
    return colors[status] || 'bg-gray-500';
  }

  function getPlatformColor(platform: Platform): string {
    const colors = {
      gelato: 'bg-indigo-100 text-indigo-800',
      fast_platform: 'bg-blue-100 text-blue-800',
      shopworks: 'bg-green-100 text-green-800',
      custom_ink: 'bg-purple-100 text-purple-800',
      ooshirts: 'bg-orange-100 text-orange-800',
      samedaycustom: 'bg-red-100 text-red-800',
    };
    return colors[platform] || 'bg-gray-100 text-gray-800';
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-[1800px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Print Shop Dashboard</h1>
              <p className="text-sm text-gray-600">Unified Order Management System</p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                onClick={syncAllPlatforms}
                disabled={syncing}
                variant="outline"
                size="sm"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
                {syncing ? 'Syncing...' : 'Sync All'}
              </Button>
              <Button onClick={logout} variant="ghost" size="sm">
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-[1800px] mx-auto px-6 py-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="text-xs">Total Active</CardDescription>
              <CardTitle className="text-2xl">{stats.total || 0}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="text-xs">Pending</CardDescription>
              <CardTitle className="text-2xl">{stats.pending || 0}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="text-xs">In Production</CardDescription>
              <CardTitle className="text-2xl">{stats.in_production || 0}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="text-xs">QC</CardDescription>
              <CardTitle className="text-2xl">{stats.in_qc || 0}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="text-xs">Packing</CardDescription>
              <CardTitle className="text-2xl">{stats.packing || 0}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="text-xs">Shipped</CardDescription>
              <CardTitle className="text-2xl">{stats.shipped || 0}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="border-red-200">
            <CardHeader className="pb-2">
              <CardDescription className="text-xs text-red-600">Priority</CardDescription>
              <CardTitle className="text-2xl text-red-600">{stats.priority || 0}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="border-orange-200">
            <CardHeader className="pb-2">
              <CardDescription className="text-xs text-orange-600">Overdue</CardDescription>
              <CardTitle className="text-2xl text-orange-600">{stats.overdue || 0}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Filters & Actions */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search order # or customer..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <Select value={platformFilter} onValueChange={(value) => setPlatformFilter(value as any)}>
                <SelectTrigger>
                  <SelectValue placeholder="Platform" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Platforms</SelectItem>
                  <SelectItem value="gelato">Gelato</SelectItem>
                  <SelectItem value="fast_platform">Fast Platform</SelectItem>
                  <SelectItem value="shopworks">Shopworks</SelectItem>
                  <SelectItem value="custom_ink">Custom Ink</SelectItem>
                  <SelectItem value="ooshirts">Ooshirts</SelectItem>
                  <SelectItem value="samedaycustom">Same Day Custom</SelectItem>
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as any)}>
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="printing">Printing</SelectItem>
                  <SelectItem value="embroidery">Embroidery</SelectItem>
                  <SelectItem value="qc">QC</SelectItem>
                  <SelectItem value="packing">Packing</SelectItem>
                  <SelectItem value="shipped">Shipped</SelectItem>
                </SelectContent>
              </Select>

              <Select value={decorationFilter} onValueChange={(value) => setDecorationFilter(value as any)}>
                <SelectTrigger>
                  <SelectValue placeholder="Decoration" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Methods</SelectItem>
                  <SelectItem value="screen_print">Screen Print</SelectItem>
                  <SelectItem value="embroidery">Embroidery</SelectItem>
                  <SelectItem value="dtg">DTG</SelectItem>
                  <SelectItem value="sublimation">Sublimation</SelectItem>
                  <SelectItem value="heat_transfer">Heat Transfer</SelectItem>
                </SelectContent>
              </Select>

              <Select value={priorityFilter} onValueChange={(value) => setPriorityFilter(value as any)}>
                <SelectTrigger>
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Orders</SelectItem>
                  <SelectItem value="priority">Priority Only</SelectItem>
                </SelectContent>
              </Select>

              <div className="flex gap-2">
                <Button onClick={handleExportAll} variant="outline" size="sm" className="flex-1">
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
                <Button onClick={handleExportByStation} variant="outline" size="sm" className="flex-1">
                  <Download className="h-4 w-4 mr-2" />
                  By Station
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Orders Table */}
        <Card>
          <CardHeader>
            <CardTitle>Orders ({orders.length})</CardTitle>
            <CardDescription>
              {loading ? 'Loading orders...' : 'View and manage all orders from connected platforms'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b">
                  <tr className="text-left text-xs text-gray-500 uppercase">
                    <th className="pb-3 font-medium">Order #</th>
                    <th className="pb-3 font-medium">Platform</th>
                    <th className="pb-3 font-medium">Customer</th>
                    <th className="pb-3 font-medium">Qty</th>
                    <th className="pb-3 font-medium">Decoration</th>
                    <th className="pb-3 font-medium">Due Date</th>
                    <th className="pb-3 font-medium">Status</th>
                    <th className="pb-3 font-medium">Priority</th>
                    <th className="pb-3 font-medium">Assigned</th>
                    <th className="pb-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {loading ? (
                    <tr>
                      <td colSpan={10} className="py-8 text-center text-gray-500">
                        Loading orders...
                      </td>
                    </tr>
                  ) : orders.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-8 text-center text-gray-500">
                        No orders found. Try adjusting your filters or sync platforms.
                      </td>
                    </tr>
                  ) : (
                    orders.map((order) => (
                      <tr key={order.id} className="hover:bg-gray-50">
                        <td className="py-3 font-mono text-sm">{order.order_number}</td>
                        <td className="py-3">
                          <Badge className={getPlatformColor(order.platform)}>
                            {order.platform.replace('_', ' ').toUpperCase()}
                          </Badge>
                        </td>
                        <td className="py-3 text-sm">{order.customer_name || 'N/A'}</td>
                        <td className="py-3 text-sm font-medium">{order.quantity}</td>
                        <td className="py-3 text-sm capitalize">{order.decoration_method.replace('_', ' ')}</td>
                        <td className="py-3">
                          <div className={`text-sm ${isOverdue(order.due_date) ? 'text-red-600 font-medium' : ''}`}>
                            {formatDate(order.due_date)}
                            <div className="text-xs text-gray-500">
                              {getDaysUntilDue(order.due_date)} days
                            </div>
                          </div>
                        </td>
                        <td className="py-3">
                          <Select
                            value={order.status}
                            onValueChange={(value) => updateOrder(order.id, { status: value as OrderStatus })}
                          >
                            <SelectTrigger className="w-32 h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pending">Pending</SelectItem>
                              <SelectItem value="printing">Printing</SelectItem>
                              <SelectItem value="embroidery">Embroidery</SelectItem>
                              <SelectItem value="qc">QC</SelectItem>
                              <SelectItem value="packing">Packing</SelectItem>
                              <SelectItem value="shipped">Shipped</SelectItem>
                              <SelectItem value="completed">Completed</SelectItem>
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="py-3">
                          <Button
                            onClick={() => updateOrder(order.id, { priority: !order.priority })}
                            variant={order.priority ? 'destructive' : 'outline'}
                            size="sm"
                          >
                            {order.priority ? '🔥 RUSH' : 'Normal'}
                          </Button>
                        </td>
                        <td className="py-3">
                          <Select
                            value={order.assigned_to || 'unassigned'}
                            onValueChange={(value) => 
                              updateOrder(order.id, { assigned_to: value === 'unassigned' ? undefined : value })
                            }
                          >
                            <SelectTrigger className="w-32 h-8">
                              <SelectValue placeholder="Assign..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="unassigned">Unassigned</SelectItem>
                              {users.map(user => (
                                <SelectItem key={user.id} value={user.id}>
                                  {user.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="py-3">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              const notes = prompt('Add notes:', order.notes || '');
                              if (notes !== null) {
                                updateOrder(order.id, { notes });
                              }
                            }}
                          >
                            Notes
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

