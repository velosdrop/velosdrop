//app/admin/customers/page.tsx
'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Users, 
  Search, 
  Filter, 
  MoreHorizontal, 
  Eye, 
  Edit, 
  Trash2,
  User,
  Phone,
  MapPin,
  Calendar,
  Shield,
  CheckCircle,
  XCircle,
  Mail,
  ArrowUpDown,
  Download,
  Plus,
  RefreshCw
} from 'lucide-react';

interface Customer {
  id: number;
  username: string;
  phoneNumber: string;
  profilePictureUrl?: string;
  isVerified: boolean;
  status: 'active' | 'inactive' | 'suspended';
  homeAddress?: string;
  workAddress?: string;
  lastLogin?: string;
  createdAt: string;
  totalOrders: number;
  totalSpent: number;
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<keyof Customer>('createdAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [selectedCustomers, setSelectedCustomers] = useState<number[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/admin/customers');
      
      if (!response.ok) {
        throw new Error(`Failed to fetch customers: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Handle case where API returns an error object
      if (data.error) {
        throw new Error(data.error);
      }
      
      // Ensure data is an array
      if (!Array.isArray(data)) {
        throw new Error('Invalid data format received from server');
      }
      
      setCustomers(data);
    } catch (error) {
      console.error('Error loading customers:', error);
      setError(error instanceof Error ? error.message : 'Failed to load customers');
      setCustomers([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
  };

  // Safe filtering - ensure customers is always an array
  const filteredCustomers = (customers || [])
    .filter(customer => {
      const matchesSearch = 
        customer.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.phoneNumber.includes(searchTerm) ||
        customer.homeAddress?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || customer.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      const aValue = a[sortField];
      const bValue = b[sortField];
      
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortDirection === 'asc' 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }
      
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
      }
      
      return 0;
    });

  const handleSort = (field: keyof Customer) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleSelectCustomer = (id: number) => {
    setSelectedCustomers(prev =>
      prev.includes(id) 
        ? prev.filter(customerId => customerId !== id)
        : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedCustomers.length === filteredCustomers.length) {
      setSelectedCustomers([]);
    } else {
      setSelectedCustomers(filteredCustomers.map(c => c.id));
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
      case 'inactive': return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      case 'suspended': return 'bg-red-500/20 text-red-400 border-red-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <CheckCircle className="w-3 h-3" />;
      case 'inactive': return <User className="w-3 h-3" />;
      case 'suspended': return <XCircle className="w-3 h-3" />;
      default: return <User className="w-3 h-3" />;
    }
  };

  // Calculate statistics safely
  const totalCustomers = customers.length;
  const activeCustomers = customers.filter(c => c.status === 'active').length;
  const verifiedCustomers = customers.filter(c => c.isVerified).length;
  const totalOrders = customers.reduce((acc, c) => acc + c.totalOrders, 0);
  const totalSpent = customers.reduce((acc, c) => acc + c.totalSpent, 0);
  const avgOrdersPerCustomer = totalCustomers > 0 ? Math.round(totalOrders / totalCustomers) : 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="p-4 bg-red-500/20 rounded-xl mb-4">
            <XCircle className="w-12 h-12 text-red-400 mx-auto" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Error Loading Customers</h2>
          <p className="text-purple-300 mb-4">{error}</p>
          <button 
            onClick={loadCustomers}
            className="px-6 py-2 bg-purple-600 rounded-xl text-white hover:bg-purple-700 transition-all duration-200"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-2">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-purple-500/20 rounded-lg">
              <Users className="w-6 h-6 text-purple-400" />
            </div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-purple-200 bg-clip-text text-transparent">
              Customer Management
            </h1>
          </div>
          <p className="text-purple-300 text-lg">
            Manage and monitor all customer accounts ({filteredCustomers.length} total)
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button 
            onClick={loadCustomers}
            className="flex items-center space-x-2 px-4 py-2 bg-gray-800 rounded-xl border border-purple-500/20 text-purple-300 hover:border-purple-500/40 hover:text-purple-200 transition-all duration-200"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Refresh</span>
          </button>
          <button className="flex items-center space-x-2 px-4 py-2 bg-purple-600 rounded-xl text-white hover:bg-purple-700 transition-all duration-200">
            <Download className="w-4 h-4" />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gray-800 rounded-2xl border border-purple-500/20 p-6 hover:border-purple-500/40 transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-300 text-sm font-medium">Total Customers</p>
              <p className="text-white font-bold text-2xl">{totalCustomers}</p>
            </div>
            <div className="p-3 bg-purple-500/20 rounded-lg">
              <Users className="w-6 h-6 text-purple-400" />
            </div>
          </div>
          <div className="mt-2 flex items-center space-x-2 text-emerald-400 text-sm">
            <span>All registered users</span>
          </div>
        </div>

        <div className="bg-gray-800 rounded-2xl border border-purple-500/20 p-6 hover:border-purple-500/40 transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-300 text-sm font-medium">Active Customers</p>
              <p className="text-white font-bold text-2xl">
                {activeCustomers}
              </p>
            </div>
            <div className="p-3 bg-emerald-500/20 rounded-lg">
              <CheckCircle className="w-6 h-6 text-emerald-400" />
            </div>
          </div>
          <div className="mt-2 text-purple-300 text-sm">
            {totalCustomers > 0 ? Math.round((activeCustomers / totalCustomers) * 100) : 0}% of total
          </div>
        </div>

        <div className="bg-gray-800 rounded-2xl border border-purple-500/20 p-6 hover:border-purple-500/40 transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-300 text-sm font-medium">Verified Accounts</p>
              <p className="text-white font-bold text-2xl">
                {verifiedCustomers}
              </p>
            </div>
            <div className="p-3 bg-blue-500/20 rounded-lg">
              <Shield className="w-6 h-6 text-blue-400" />
            </div>
          </div>
          <div className="mt-2 text-purple-300 text-sm">
            {totalCustomers > 0 ? Math.round((verifiedCustomers / totalCustomers) * 100) : 0}% verified
          </div>
        </div>

        <div className="bg-gray-800 rounded-2xl border border-purple-500/20 p-6 hover:border-purple-500/40 transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-300 text-sm font-medium">Avg. Orders</p>
              <p className="text-white font-bold text-2xl">
                {avgOrdersPerCustomer}
              </p>
            </div>
            <div className="p-3 bg-cyan-500/20 rounded-lg">
              <Mail className="w-6 h-6 text-cyan-400" />
            </div>
          </div>
          <div className="mt-2 text-purple-300 text-sm">
            Total orders: {totalOrders}
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-gray-800 rounded-2xl border border-purple-500/20 p-6">
        <div className="flex flex-col lg:flex-row gap-4 justify-between items-start lg:items-center">
          <div className="flex flex-col sm:flex-row gap-4 flex-1 w-full">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-purple-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search customers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-purple-500/20 rounded-xl text-white placeholder-purple-300 focus:border-purple-500/40 focus:outline-none transition-all duration-200"
              />
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 bg-gray-700 border border-purple-500/20 rounded-xl text-white focus:border-purple-500/40 focus:outline-none transition-all duration-200"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>

          <div className="flex items-center space-x-3">
            {selectedCustomers.length > 0 && (
              <div className="text-purple-300 text-sm">
                {selectedCustomers.length} selected
              </div>
            )}
            <button className="flex items-center space-x-2 px-4 py-2 bg-red-600 rounded-xl text-white hover:bg-red-700 transition-all duration-200">
              <Trash2 className="w-4 h-4" />
              <span>Delete Selected</span>
            </button>
          </div>
        </div>
      </div>

      {/* Customers Table */}
      <div className="bg-gray-800 rounded-2xl border border-purple-500/20 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-purple-500/20">
                <th className="px-6 py-4 text-left">
                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={selectedCustomers.length === filteredCustomers.length && filteredCustomers.length > 0}
                      onChange={handleSelectAll}
                      className="rounded border-purple-500/20 bg-gray-700 text-purple-500 focus:ring-purple-500"
                    />
                    <button
                      onClick={() => handleSort('username')}
                      className="flex items-center space-x-1 text-purple-300 hover:text-purple-200 transition-colors duration-200"
                    >
                      <span>Customer</span>
                      <ArrowUpDown className="w-4 h-4" />
                    </button>
                  </div>
                </th>
                <th className="px-6 py-4 text-left">
                  <button
                    onClick={() => handleSort('phoneNumber')}
                    className="flex items-center space-x-1 text-purple-300 hover:text-purple-200 transition-colors duration-200"
                  >
                    <span>Contact</span>
                    <ArrowUpDown className="w-4 h-4" />
                  </button>
                </th>
                <th className="px-6 py-4 text-left">
                  <button
                    onClick={() => handleSort('status')}
                    className="flex items-center space-x-1 text-purple-300 hover:text-purple-200 transition-colors duration-200"
                  >
                    <span>Status</span>
                    <ArrowUpDown className="w-4 h-4" />
                  </button>
                </th>
                <th className="px-6 py-4 text-left">
                  <button
                    onClick={() => handleSort('totalOrders')}
                    className="flex items-center space-x-1 text-purple-300 hover:text-purple-200 transition-colors duration-200"
                  >
                    <span>Orders</span>
                    <ArrowUpDown className="w-4 h-4" />
                  </button>
                </th>
                <th className="px-6 py-4 text-left">
                  <button
                    onClick={() => handleSort('createdAt')}
                    className="flex items-center space-x-1 text-purple-300 hover:text-purple-200 transition-colors duration-200"
                  >
                    <span>Joined</span>
                    <ArrowUpDown className="w-4 h-4" />
                  </button>
                </th>
                <th className="px-6 py-4 text-left">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-purple-500/10">
              {filteredCustomers.map((customer) => (
                <tr 
                  key={customer.id}
                  className="hover:bg-gray-700/50 transition-colors duration-200 group"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={selectedCustomers.includes(customer.id)}
                        onChange={() => handleSelectCustomer(customer.id)}
                        className="rounded border-purple-500/20 bg-gray-700 text-purple-500 focus:ring-purple-500"
                      />
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-purple-500/20 rounded-xl flex items-center justify-center">
                          {customer.profilePictureUrl ? (
                            <img 
                              src={customer.profilePictureUrl} 
                              alt={customer.username}
                              className="w-10 h-10 rounded-xl object-cover"
                            />
                          ) : (
                            <User className="w-5 h-5 text-purple-400" />
                          )}
                        </div>
                        <div>
                          <div className="text-white font-medium flex items-center space-x-2">
                            <span>{customer.username}</span>
                            {customer.isVerified && (
                              <Shield className="w-4 h-4 text-blue-400" />
                            )}
                          </div>
                          <div className="text-purple-300 text-sm flex items-center space-x-1">
                            <MapPin className="w-3 h-3" />
                            <span>{customer.homeAddress || 'No address'}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-white flex items-center space-x-2">
                      <Phone className="w-4 h-4 text-purple-400" />
                      <span>{customer.phoneNumber}</span>
                    </div>
                    <div className="text-purple-300 text-sm">
                      Last login: {customer.lastLogin ? new Date(customer.lastLogin).toLocaleDateString() : 'Never'}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className={`inline-flex items-center space-x-2 px-3 py-1 rounded-full border text-sm font-medium ${getStatusColor(customer.status)}`}>
                      {getStatusIcon(customer.status)}
                      <span className="capitalize">{customer.status}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-white font-medium">{customer.totalOrders}</div>
                    <div className="text-purple-300 text-sm">${customer.totalSpent.toFixed(2)} spent</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-white">
                      {new Date(customer.createdAt).toLocaleDateString()}
                    </div>
                    <div className="text-purple-300 text-sm flex items-center space-x-1">
                      <Calendar className="w-3 h-3" />
                      <span>{new Date(customer.createdAt).toLocaleTimeString()}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-2">
                      <button className="p-2 text-purple-400 hover:text-purple-300 hover:bg-purple-500/20 rounded-lg transition-all duration-200">
                        <Eye className="w-4 h-4" />
                      </button>
                      <button className="p-2 text-blue-400 hover:text-blue-300 hover:bg-blue-500/20 rounded-lg transition-all duration-200">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/20 rounded-lg transition-all duration-200">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredCustomers.length === 0 && (
          <div className="text-center py-12">
            <Users className="w-12 h-12 text-purple-400 mx-auto mb-4 opacity-50" />
            <p className="text-purple-300 text-lg">No customers found</p>
            <p className="text-purple-400 text-sm">
              {customers.length === 0 ? 'No customers in database' : 'Try adjusting your search or filters'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}