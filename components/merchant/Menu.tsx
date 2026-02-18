// components/merchant/Menu.tsx
'use client';

import { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2, Star, Image as ImageIcon, X, Upload, AlertCircle } from 'lucide-react';

interface Product {
  id: number;
  name: string;
  price: number;
  category: string | null;
  description: string | null;
  imageUrl: string | null;
  isAvailable: boolean;
  isPopular: boolean;
}

interface Category {
  id: number;
  name: string;
  imageUrl: string | null;
  description: string | null;
}

export default function MenuComponent() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Product form states
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    category: '',
    description: '',
    isAvailable: true,
    isPopular: false,
    imageUrl: ''
  });

  // Category form states
  const [categoryName, setCategoryName] = useState('');
  const [categoryImage, setCategoryImage] = useState<File | null>(null);
  const [categoryImagePreview, setCategoryImagePreview] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('merchantToken');
      if (!token) return;

      const [productsRes, categoriesRes] = await Promise.all([
        fetch('/api/merchant/products', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('/api/merchant/categories', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      const productsData = await productsRes.json();
      const categoriesData = await categoriesRes.json();

      setProducts(productsData.products || []);
      setCategories(categoriesData.categories || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Failed to load menu data');
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (file: File): Promise<string> => {
    setUploading(true);
    setError('');
    
    try {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        throw new Error('Please upload an image file');
      }

      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        throw new Error('Image must be less than 10MB');
      }

      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET!);

      // Add HD quality parameters
      formData.append('quality', 'auto');
      formData.append('fetch_format', 'auto');
      formData.append('width', '1200');
      formData.append('crop', 'limit');

      const res = await fetch(
        `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`,
        { method: 'POST', body: formData }
      );
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error?.message || 'Upload failed');
      }
      
      const data = await res.json();
      return data.secure_url;
    } catch (error: any) {
      setError(error.message);
      throw error;
    } finally {
      setUploading(false);
    }
  };

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    const token = localStorage.getItem('merchantToken');
    if (!token) {
      setError('Not authenticated');
      return;
    }

    try {
      const response = await fetch('/api/merchant/products', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...formData,
          price: parseFloat(formData.price)
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to add product');
      }

      setShowAddModal(false);
      setFormData({ name: '', price: '', category: '', description: '', isAvailable: true, isPopular: false, imageUrl: '' });
      fetchData();
    } catch (error: any) {
      setError(error.message);
    }
  };

  const handleEditProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    const token = localStorage.getItem('merchantToken');
    if (!token || !editingProduct) {
      setError('Not authenticated');
      return;
    }

    try {
      const response = await fetch(`/api/merchant/products/${editingProduct.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...formData,
          price: parseFloat(formData.price)
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update product');
      }

      setShowEditModal(false);
      setEditingProduct(null);
      setFormData({ name: '', price: '', category: '', description: '', isAvailable: true, isPopular: false, imageUrl: '' });
      fetchData();
    } catch (error: any) {
      setError(error.message);
    }
  };

  const handleDeleteProduct = async (productId: number) => {
    if (!confirm('Are you sure you want to delete this product?')) return;

    const token = localStorage.getItem('merchantToken');
    if (!token) {
      setError('Not authenticated');
      return;
    }

    try {
      const response = await fetch(`/api/merchant/products/${productId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete product');
      }

      fetchData();
    } catch (error: any) {
      setError(error.message);
    }
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    const token = localStorage.getItem('merchantToken');
    if (!token) {
      setError('Not authenticated');
      return;
    }

    try {
      let imageUrl = '';
      if (categoryImage) {
        imageUrl = await handleImageUpload(categoryImage);
      }

      const response = await fetch('/api/merchant/categories', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: categoryName,
          imageUrl
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to add category');
      }

      setShowCategoryModal(false);
      setCategoryName('');
      setCategoryImage(null);
      setCategoryImagePreview('');
      fetchData();
    } catch (error: any) {
      setError(error.message);
    }
  };

  const openEditModal = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      price: product.price.toString(),
      category: product.category || '',
      description: product.description || '',
      isAvailable: product.isAvailable,
      isPopular: product.isPopular,
      imageUrl: product.imageUrl || ''
    });
    setShowEditModal(true);
  };

  const filteredProducts = products.filter(p => 
    (selectedCategory === 'All' || p.category === selectedCategory) &&
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Professional DoorDash-style loading state
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <div className="relative">
          <div className="w-12 h-12 rounded-full border-2 border-gray-100"></div>
          <div className="w-12 h-12 rounded-full border-2 border-purple-600 border-t-transparent animate-spin absolute top-0 left-0"></div>
        </div>
        <p className="mt-4 text-sm text-gray-500 font-medium">Loading menu...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Menu</h1>
        <div className="flex gap-3">
          <button
            onClick={() => setShowCategoryModal(true)}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Add Category
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Product
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Search & Categories */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search products..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 text-gray-900 placeholder:text-gray-400"
          />
        </div>
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 text-gray-900"
        >
          <option value="All">All Categories</option>
          {categories.map(cat => (
            <option key={cat.id} value={cat.name}>{cat.name}</option>
          ))}
        </select>
      </div>

      {/* Products Grid */}
      {filteredProducts.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
          <ImageIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-500">No products found</p>
          <button
            onClick={() => setShowAddModal(true)}
            className="mt-4 text-purple-600 hover:text-purple-700 text-sm font-medium"
          >
            Add your first product
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProducts.map((product) => (
            <div key={product.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
              <div className="aspect-video bg-gray-100 relative">
                {product.imageUrl ? (
                  <img 
                    src={product.imageUrl} 
                    alt={product.name} 
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ImageIcon className="w-8 h-8 text-gray-400" />
                  </div>
                )}
                {product.isPopular && (
                  <div className="absolute top-2 left-2 bg-purple-600 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                    <Star className="w-3 h-3" /> Popular
                  </div>
                )}
                <div className="absolute top-2 right-2 flex gap-1">
                  <button 
                    onClick={() => openEditModal(product)}
                    className="p-1.5 bg-white rounded-lg shadow-sm hover:bg-gray-50 transition-colors"
                  >
                    <Edit2 className="w-4 h-4 text-gray-600" />
                  </button>
                  <button 
                    onClick={() => handleDeleteProduct(product.id)}
                    className="p-1.5 bg-white rounded-lg shadow-sm hover:bg-red-50 transition-colors"
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </button>
                </div>
              </div>
              <div className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="font-medium text-gray-900">{product.name}</h3>
                    <p className="text-sm text-gray-500">{product.category || 'Uncategorized'}</p>
                  </div>
                  <span className="text-lg font-bold text-gray-900">${product.price}</span>
                </div>
                {product.description && (
                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">{product.description}</p>
                )}
                <div className="flex items-center justify-between">
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    product.isAvailable 
                      ? 'bg-green-100 text-green-700' 
                      : 'bg-red-100 text-red-700'
                  }`}>
                    {product.isAvailable ? 'Available' : 'Out of stock'}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Product Modal */}
      {showAddModal && (
        <ProductModal
          title="Add Product"
          formData={formData}
          setFormData={setFormData}
          categories={categories}
          uploading={uploading}
          onImageUpload={handleImageUpload}
          onSubmit={handleAddProduct}
          onClose={() => setShowAddModal(false)}
        />
      )}

      {/* Edit Product Modal */}
      {showEditModal && editingProduct && (
        <ProductModal
          title="Edit Product"
          formData={formData}
          setFormData={setFormData}
          categories={categories}
          uploading={uploading}
          onImageUpload={handleImageUpload}
          onSubmit={handleEditProduct}
          onClose={() => {
            setShowEditModal(false);
            setEditingProduct(null);
            setFormData({ name: '', price: '', category: '', description: '', isAvailable: true, isPopular: false, imageUrl: '' });
          }}
        />
      )}

      {/* Add Category Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-900">Add Category</h2>
              <button onClick={() => setShowCategoryModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleAddCategory} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category Name *</label>
                <input
                  type="text"
                  required
                  value={categoryName}
                  onChange={(e) => setCategoryName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 text-gray-900"
                  placeholder="e.g. Pizzas, Burgers, Drinks"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category Image</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setCategoryImage(file);
                      setCategoryImagePreview(URL.createObjectURL(file));
                    }
                  }}
                  className="w-full text-sm text-gray-900 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100"
                />
                {categoryImagePreview && (
                  <img src={categoryImagePreview} alt="Preview" className="mt-2 h-20 w-20 object-cover rounded-lg border border-gray-200" />
                )}
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={uploading}
                  className="flex-1 bg-purple-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-purple-700 disabled:bg-purple-300"
                >
                  {uploading ? 'Uploading...' : 'Add Category'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowCategoryModal(false)}
                  className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-lg text-sm font-medium hover:bg-gray-200"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// Product Modal Component
interface ProductModalProps {
  title: string;
  formData: any;
  setFormData: (data: any) => void;
  categories: Category[];
  uploading: boolean;
  onImageUpload: (file: File) => Promise<string>;
  onSubmit: (e: React.FormEvent) => Promise<void>;
  onClose: () => void;
}

function ProductModal({ 
  title, 
  formData, 
  setFormData, 
  categories, 
  uploading, 
  onImageUpload, 
  onSubmit, 
  onClose 
}: ProductModalProps) {
  const [imagePreview, setImagePreview] = useState(formData.imageUrl);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={onSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Product Name *</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 text-gray-900"
              placeholder="e.g. Margherita Pizza"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Price *</label>
              <input
                type="number"
                step="0.01"
                required
                value={formData.price}
                onChange={(e) => setFormData({...formData, price: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 text-gray-900"
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({...formData, category: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 text-gray-900"
              >
                <option value="">Select category</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.name}>{cat.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              rows={2}
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 text-gray-900"
              placeholder="Brief description of the item..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Image (HD recommended)</label>
            <input
              type="file"
              accept="image/*"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (file) {
                  try {
                    const url = await onImageUpload(file);
                    setFormData({...formData, imageUrl: url});
                    setImagePreview(url);
                  } catch (error) {
                    // Error already set in handleImageUpload
                  }
                }
              }}
              className="w-full text-sm text-gray-900 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100"
            />
            {uploading && <p className="text-xs text-purple-600 mt-1">Uploading HD image...</p>}
            {imagePreview && (
              <img src={imagePreview} alt="Preview" className="mt-2 h-20 w-20 object-cover rounded-lg border border-gray-200" />
            )}
          </div>

          <div className="flex items-center gap-4 pt-2">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.isAvailable}
                onChange={(e) => setFormData({...formData, isAvailable: e.target.checked})}
                className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
              />
              <span className="text-sm text-gray-700">Available</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.isPopular}
                onChange={(e) => setFormData({...formData, isPopular: e.target.checked})}
                className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
              />
              <span className="text-sm text-gray-700">Mark as popular</span>
            </label>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={uploading}
              className="flex-1 bg-purple-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-purple-700 disabled:bg-purple-300"
            >
              {uploading ? 'Uploading...' : title}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-lg text-sm font-medium hover:bg-gray-200"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}