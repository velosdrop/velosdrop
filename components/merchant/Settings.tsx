// components/merchant/Settings.tsx
'use client';

import { useState } from 'react';
import { 
  Bell, Moon, Sun, Globe, CreditCard, 
  Truck, Percent, DollarSign, Shield,
  Mail, Phone, Smartphone, Save, Bike,
  ToggleLeft, ToggleRight, ChevronRight
} from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';

interface SettingsProps {
  merchant: any;
  onSettingsUpdate?: (updatedSettings: any) => void;
}

export default function SettingsComponent({ merchant, onSettingsUpdate }: SettingsProps) {
  const { theme, setTheme } = useTheme();
  const [activeSection, setActiveSection] = useState('notifications');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  
  // Delivery Settings (matches your schema)
  const [delivery, setDelivery] = useState({
    deliveryRadius: merchant?.deliveryRadius || 5,
    minimumOrder: merchant?.minimumOrder || 0,
    deliveryFee: merchant?.deliveryFee || 0,
    commission: merchant?.commission || 15,
    autoAcceptOrders: false,
    estimatedTime: '25-35',
    useOwnBikers: false  // Simple toggle for "Do you have your own bikers?"
  });

  // Notification settings
  const [notifications, setNotifications] = useState({
    emailOrders: true,
    smsOrders: false,
    pushNotifications: true,
    orderUpdates: true,
    marketingEmails: false,
    weeklyReports: true
  });

  // Payment settings
  const [payment, setPayment] = useState({
    cashOnDelivery: true,
    cardPayments: true,
    ecocash: true,
    invoicePayment: false,
    bankName: merchant?.bankName || '',
    bankAccountName: merchant?.bankAccountName || '',
    bankAccountNumber: merchant?.bankAccountNumber || ''
  });

  // Notification sections for sidebar
  const sections = [
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'appearance', label: 'Appearance', icon: Sun },
    { id: 'delivery', label: 'Delivery', icon: Truck },
    { id: 'payments', label: 'Payments', icon: CreditCard },
    { id: 'privacy', label: 'Privacy', icon: Shield },
  ];

  const handleSave = async () => {
    setSaving(true);
    
    try {
      const token = localStorage.getItem('merchantToken');
      
      const settingsData = {
        deliveryRadius: delivery.deliveryRadius,
        minimumOrder: delivery.minimumOrder,
        deliveryFee: delivery.deliveryFee,
        commission: delivery.commission,
        bankName: payment.bankName,
        bankAccountName: payment.bankAccountName,
        bankAccountNumber: payment.bankAccountNumber,
      };

      const response = await fetch('/api/merchant/settings', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(settingsData)
      });

      if (response.ok) {
        setSuccess('Settings saved successfully!');
        if (onSettingsUpdate) {
          onSettingsUpdate(settingsData);
        }
      }
    } catch (error) {
      console.error('Error saving settings:', error);
    } finally {
      setSaving(false);
      setTimeout(() => setSuccess(''), 3000);
    }
  };

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Settings</h1>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 flex items-center gap-2 disabled:bg-purple-300"
        >
          {saving ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              Save Changes
            </>
          )}
        </button>
      </div>

      {/* Success Message */}
      {success && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-sm text-green-600">{success}</p>
        </div>
      )}

      <div className="flex gap-6">
        {/* Settings Sidebar */}
        <div className="w-64 flex-shrink-0">
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            {sections.map((section) => {
              const Icon = section.icon;
              return (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                    activeSection === section.id
                      ? 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 border-l-4 border-purple-600'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 border-l-4 border-transparent'
                  }`}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  <span className="text-sm font-medium flex-1">{section.label}</span>
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                </button>
              );
            })}
          </div>
        </div>

        {/* Settings Content */}
        <div className="flex-1">
          {/* Notifications Section */}
          {activeSection === 'notifications' && (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Notification Preferences</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Choose how you want to receive updates</p>
              
              <div className="space-y-6">
                {/* Email Notifications */}
                <div>
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                    <Mail className="w-4 h-4 text-gray-400" />
                    Email Notifications
                  </h3>
                  <div className="space-y-3 pl-6">
                    {[
                      { key: 'emailOrders', label: 'New order notifications' },
                      { key: 'weeklyReports', label: 'Weekly sales reports' },
                      { key: 'marketingEmails', label: 'Marketing & promotions' }
                    ].map((item) => (
                      <label key={item.key} className="flex items-center justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">{item.label}</span>
                        <button
                          onClick={() => setNotifications({...notifications, [item.key]: !notifications[item.key as keyof typeof notifications]})}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                            notifications[item.key as keyof typeof notifications] ? 'bg-purple-600' : 'bg-gray-200 dark:bg-gray-700'
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              notifications[item.key as keyof typeof notifications] ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </label>
                    ))}
                  </div>
                </div>

                {/* SMS Notifications */}
                <div>
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                    <Smartphone className="w-4 h-4 text-gray-400" />
                    SMS Notifications
                  </h3>
                  <div className="space-y-3 pl-6">
                    <label className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Order updates via SMS</span>
                      <button
                        onClick={() => setNotifications({...notifications, smsOrders: !notifications.smsOrders})}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          notifications.smsOrders ? 'bg-purple-600' : 'bg-gray-200 dark:bg-gray-700'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            notifications.smsOrders ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </label>
                  </div>
                </div>

                {/* Push Notifications */}
                <div>
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                    <Bell className="w-4 h-4 text-gray-400" />
                    Push Notifications
                  </h3>
                  <div className="space-y-3 pl-6">
                    {[
                      { key: 'pushNotifications', label: 'Enable push notifications' },
                      { key: 'orderUpdates', label: 'Order status changes' }
                    ].map((item) => (
                      <label key={item.key} className="flex items-center justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">{item.label}</span>
                        <button
                          onClick={() => setNotifications({...notifications, [item.key]: !notifications[item.key as keyof typeof notifications]})}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                            notifications[item.key as keyof typeof notifications] ? 'bg-purple-600' : 'bg-gray-200 dark:bg-gray-700'
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              notifications[item.key as keyof typeof notifications] ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Appearance Section */}
          {activeSection === 'appearance' && (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Appearance</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Customize how the dashboard looks</p>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Theme Preference</label>
                  <div className="flex gap-4">
                    <button
                      onClick={() => setTheme('light')}
                      className={`flex-1 p-4 rounded-lg border-2 transition-colors ${
                        theme === 'light' 
                          ? 'border-purple-600 bg-purple-50 dark:bg-purple-900/20' 
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                      }`}
                    >
                      <Sun className={`w-6 h-6 mx-auto mb-2 ${
                        theme === 'light' ? 'text-purple-600' : 'text-gray-400'
                      }`} />
                      <span className={`text-sm font-medium ${
                        theme === 'light' ? 'text-purple-600' : 'text-gray-600 dark:text-gray-400'
                      }`}>Light</span>
                    </button>
                    <button
                      onClick={() => setTheme('dark')}
                      className={`flex-1 p-4 rounded-lg border-2 transition-colors ${
                        theme === 'dark' 
                          ? 'border-purple-600 bg-purple-50 dark:bg-purple-900/20' 
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                      }`}
                    >
                      <Moon className={`w-6 h-6 mx-auto mb-2 ${
                        theme === 'dark' ? 'text-purple-600' : 'text-gray-400'
                      }`} />
                      <span className={`text-sm font-medium ${
                        theme === 'dark' ? 'text-purple-600' : 'text-gray-600 dark:text-gray-400'
                      }`}>Dark</span>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Language</label>
                  <select className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:border-purple-500 text-gray-900 dark:text-white dark:bg-gray-700">
                    <option>English (US)</option>
                    <option>English (UK)</option>
                    <option>Shona (Zimbabwe)</option>
                    <option>Ndebele (Zimbabwe)</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Delivery Settings Section */}
          {activeSection === 'delivery' && (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Delivery Settings</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Configure your delivery preferences</p>
              
              <div className="space-y-4">
                {/* Simple Use Own Bikers Toggle - NO biker management */}
                <label className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Bike className="w-5 h-5 text-purple-600" />
                    <div>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">I have my own bikers</span>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Toggle on if you have your own delivery team</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setDelivery({...delivery, useOwnBikers: !delivery.useOwnBikers})}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      delivery.useOwnBikers ? 'bg-purple-600' : 'bg-gray-200 dark:bg-gray-700'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        delivery.useOwnBikers ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </label>

                {/* Auto-accept orders */}
                <label className="flex items-center justify-between">
                  <div>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Auto-accept orders</span>
                    <p className="text-xs text-gray-500">Automatically accept new orders</p>
                  </div>
                  <button
                    onClick={() => setDelivery({...delivery, autoAcceptOrders: !delivery.autoAcceptOrders})}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      delivery.autoAcceptOrders ? 'bg-purple-600' : 'bg-gray-200 dark:bg-gray-700'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        delivery.autoAcceptOrders ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </label>

                {/* Delivery Settings from Schema */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Delivery Radius (km)
                  </label>
                  <input
                    type="number"
                    value={delivery.deliveryRadius}
                    onChange={(e) => setDelivery({...delivery, deliveryRadius: parseInt(e.target.value)})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:border-purple-500 text-gray-900 dark:text-white dark:bg-gray-700"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Minimum Order Amount ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={delivery.minimumOrder}
                    onChange={(e) => setDelivery({...delivery, minimumOrder: parseFloat(e.target.value)})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:border-purple-500 text-gray-900 dark:text-white dark:bg-gray-700"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Delivery Fee ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={delivery.deliveryFee}
                    onChange={(e) => setDelivery({...delivery, deliveryFee: parseFloat(e.target.value)})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:border-purple-500 text-gray-900 dark:text-white dark:bg-gray-700"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Commission Rate (%)
                  </label>
                  <input
                    type="number"
                    value={delivery.commission}
                    onChange={(e) => setDelivery({...delivery, commission: parseInt(e.target.value)})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:border-purple-500 text-gray-900 dark:text-white dark:bg-gray-700"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Estimated delivery time
                  </label>
                  <select
                    value={delivery.estimatedTime}
                    onChange={(e) => setDelivery({...delivery, estimatedTime: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:border-purple-500 text-gray-900 dark:text-white dark:bg-gray-700"
                  >
                    <option>15-25 minutes</option>
                    <option>25-35 minutes</option>
                    <option>35-45 minutes</option>
                    <option>45-60 minutes</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Payments Section */}
          {activeSection === 'payments' && (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Payment Methods</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Accept payments from your customers</p>
              
              <div className="space-y-6">
                {/* Payment Methods Toggles */}
                <div className="space-y-3">
                  {[
                    { key: 'cashOnDelivery', label: 'Cash on Delivery', icon: DollarSign },
                    { key: 'cardPayments', label: 'Card Payments', icon: CreditCard },
                    { key: 'ecocash', label: 'EcoCash (Zimbabwe)', icon: Smartphone }
                  ].map((item) => {
                    const Icon = item.icon;
                    return (
                      <label key={item.key} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Icon className="w-5 h-5 text-gray-400" />
                          <span className="text-sm text-gray-700 dark:text-gray-300">{item.label}</span>
                        </div>
                        <button
                          onClick={() => setPayment({...payment, [item.key]: !payment[item.key as keyof typeof payment]})}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                            payment[item.key as keyof typeof payment] ? 'bg-purple-600' : 'bg-gray-200 dark:bg-gray-700'
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              payment[item.key as keyof typeof payment] ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </label>
                    );
                  })}
                </div>

                {/* Bank Details (from schema) */}
                <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Bank Account Details</h3>
                  <div className="space-y-3">
                    <input
                      type="text"
                      placeholder="Bank Name"
                      value={payment.bankName}
                      onChange={(e) => setPayment({...payment, bankName: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:border-purple-500 text-gray-900 dark:text-white dark:bg-gray-700"
                    />
                    <input
                      type="text"
                      placeholder="Account Name"
                      value={payment.bankAccountName}
                      onChange={(e) => setPayment({...payment, bankAccountName: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:border-purple-500 text-gray-900 dark:text-white dark:bg-gray-700"
                    />
                    <input
                      type="text"
                      placeholder="Account Number"
                      value={payment.bankAccountNumber}
                      onChange={(e) => setPayment({...payment, bankAccountNumber: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:border-purple-500 text-gray-900 dark:text-white dark:bg-gray-700"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Privacy Section */}
          {activeSection === 'privacy' && (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Privacy & Security</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Manage your account security</p>
              
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Change Password</h3>
                  <div className="space-y-3">
                    <input
                      type="password"
                      placeholder="Current password"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:border-purple-500 text-gray-900 dark:text-white dark:bg-gray-700"
                    />
                    <input
                      type="password"
                      placeholder="New password"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:border-purple-500 text-gray-900 dark:text-white dark:bg-gray-700"
                    />
                    <input
                      type="password"
                      placeholder="Confirm new password"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:border-purple-500 text-gray-900 dark:text-white dark:bg-gray-700"
                    />
                    <button className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700">
                      Update Password
                    </button>
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Two-Factor Authentication</h3>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Add extra security to your account</p>
                      <p className="text-xs text-gray-400">Protect your account with 2FA</p>
                    </div>
                    <button className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">
                      Enable
                    </button>
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Data & Privacy</h3>
                  <div className="space-y-2">
                    <button className="text-sm text-purple-600 hover:text-purple-700">Download my data</button>
                    <br />
                    <button className="text-sm text-red-600 hover:text-red-700">Delete account</button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}