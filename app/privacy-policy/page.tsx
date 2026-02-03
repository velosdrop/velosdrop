// app/privacy-policy/page.tsx
export default function PrivacyPolicy() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-4xl font-bold mb-4">Privacy Policy for Velosdrop Delivery Service</h1>
      <p className="text-gray-600 mb-2">For Customers and Delivery Drivers</p>
      
      <p className="text-gray-600 mb-8">
        <strong>Last Updated:</strong> February 3, 2026
      </p>

      <div className="bg-yellow-50 border-l-4 border-yellow-500 p-6 mb-8 rounded-lg">
        <p className="text-yellow-800 font-semibold text-lg">
          ⚠️ IMPORTANT: This app is for users 18 years and older only. By using this app, 
          you confirm you meet this age requirement.
        </p>
      </div>

      {/* Introduction with both user types */}
      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">1. Introduction</h2>
        <p className="text-gray-700 leading-relaxed mb-4">
          Velosdrop Inc ("we," "our," or "us") operates the Velosdrop delivery service 
          mobile applications for both customers and delivery drivers. This Privacy Policy 
          explains how we collect, use, disclose, and safeguard information for all users 
          of our platform.
        </p>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-blue-800 font-medium">
            This Privacy Policy applies to:
          </p>
          <ul className="list-disc list-inside text-blue-700 space-y-1 ml-4 mt-2">
            <li><strong>Customers</strong> - Users who order delivery services</li>
            <li><strong>Delivery Drivers</strong> - Users who provide delivery services</li>
          </ul>
        </div>
      </section>

      {/* Information We Collect - FIXED VERSION */}
      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-6">2. Information We Collect</h2>
        
        <div className="space-y-8">
          {/* Customer Information */}
          <div>
            <h3 className="text-xl font-semibold text-blue-700 mb-4 flex items-center">
              <span className="mr-2">👤</span> Customer Information
            </h3>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
              <ul className="space-y-3 text-gray-700">
                <li><strong>Account Details:</strong> Name, phone, email, profile photo</li>
                <li><strong>Delivery Addresses:</strong> Home, work, favorites</li>
                <li><strong>Payment Info:</strong> Mobile money details, wallet balance</li>
                <li><strong>Order History:</strong> Past deliveries, preferences</li>
                <li><strong>Location Data:</strong> For finding nearby services</li>
                <li><strong>Ratings & Reviews:</strong> Feedback for drivers</li>
              </ul>
            </div>
          </div>

          {/* Driver Information */}
          <div>
            <h3 className="text-xl font-semibold text-green-700 mb-4 flex items-center">
              <span className="mr-2">🚗</span> Driver Information
            </h3>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
              <ul className="space-y-3 text-gray-700">
                <li><strong>Personal Details:</strong> Name, phone, email, profile photo</li>
                <li><strong>Verification Data:</strong> Driver's license, vehicle info, ID</li>
                <li><strong>Payment Info:</strong> Mobile money, earnings, payout history</li>
                <li><strong>Performance Data:</strong> Delivery history, ratings, metrics</li>
                <li><strong>Location Data:</strong> Real-time tracking during deliveries</li>
                <li><strong>Background Check:</strong> For platform safety and compliance</li>
              </ul>
            </div>
          </div>

        {/* Common Information for Both */}
<div className="mt-8">
  <h3 className="text-xl font-semibold text-purple-800 mb-4">Common Information We Collect</h3>
  <div className="bg-purple-50 border border-purple-200 rounded-lg p-6">
    <div className="space-y-3">
      <div className="flex items-start">
        <span className="text-purple-600 mr-2 mt-1">•</span>
        <span className="text-gray-800"><strong>App Performance:</strong> Crash reports, error logs</span>
      </div>
    </div>
  </div>
</div>
        </div>
      </section>

      {/* How We Use Information - FIXED VERSION */}
      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-6">3. How We Use Your Information</h2>
        
        <div className="space-y-6">
          <div className="bg-white border border-gray-300 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">For Service Delivery</h3>
            <div className="space-y-3">
              <div className="flex items-start">
                <span className="text-green-600 mr-2 mt-1">✓</span>
                <span className="text-gray-700">Match customers with drivers for deliveries</span>
              </div>
              <div className="flex items-start">
                <span className="text-green-600 mr-2 mt-1">✓</span>
                <span className="text-gray-700">Process payments and manage wallets</span>
              </div>
              <div className="flex items-start">
                <span className="text-green-600 mr-2 mt-1">✓</span>
                <span className="text-gray-700">Provide real-time tracking and updates</span>
              </div>
              <div className="flex items-start">
                <span className="text-green-600 mr-2 mt-1">✓</span>
                <span className="text-gray-700">Calculate fares and delivery estimates</span>
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-300 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">For Safety and Security</h3>
            <div className="space-y-3">
              <div className="flex items-start">
                <span className="text-green-600 mr-2 mt-1">✓</span>
                <span className="text-gray-700">Verify identities and credentials</span>
              </div>
              <div className="flex items-start">
                <span className="text-green-600 mr-2 mt-1">✓</span>
                <span className="text-gray-700">Prevent fraud and ensure platform integrity</span>
              </div>
              <div className="flex items-start">
                <span className="text-green-600 mr-2 mt-1">✓</span>
                <span className="text-gray-700">Conduct background checks (drivers)</span>
              </div>
              <div className="flex items-start">
                <span className="text-green-600 mr-2 mt-1">✓</span>
                <span className="text-gray-700">Maintain delivery quality standards</span>
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-300 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">For Communication and Support</h3>
            <div className="space-y-3">
              <div className="flex items-start">
                <span className="text-green-600 mr-2 mt-1">✓</span>
                <span className="text-gray-700">Send order/delivery updates</span>
              </div>
              <div className="flex items-start">
                <span className="text-green-600 mr-2 mt-1">✓</span>
                <span className="text-gray-700">Provide customer/driver support</span>
              </div>
              <div className="flex items-start">
                <span className="text-green-600 mr-2 mt-1">✓</span>
                <span className="text-gray-700">Send important platform announcements</span>
              </div>
              <div className="flex items-start">
                <span className="text-green-600 mr-2 mt-1">✓</span>
                <span className="text-gray-700">Handle disputes and complaints</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How We Share Information - Clear separation */}
      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-6">4. How We Share Your Information</h2>
        
        <div className="space-y-6">
          {/* Between Users */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-blue-800 mb-3">Between Customers and Drivers</h3>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <p className="font-medium text-blue-700 mb-2">Customer → Driver:</p>
                <ul className="text-sm text-blue-600 space-y-1">
                  <li>• Name for order confirmation</li>
                  <li>• Delivery address for pickup/drop-off</li>
                  <li>• Contact number for coordination</li>
                  <li>• Delivery instructions</li>
                </ul>
              </div>
              <div>
                <p className="font-medium text-green-700 mb-2">Driver → Customer:</p>
                <ul className="text-sm text-green-600 space-y-1">
                  <li>• Name and profile photo</li>
                  <li>• Vehicle information</li>
                  <li>• Real-time location during delivery</li>
                  <li>• Driver rating and reviews</li>
                </ul>
              </div>
            </div>
          </div>

          {/* With Service Providers */}
          <div className="bg-gray-50 border border-gray-300 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">With Service Providers</h3>
            <ul className="grid md:grid-cols-2 gap-4">
              <li>
                <strong>Payment Processors:</strong>
                <p className="text-sm text-gray-600">Mobile money transactions, payout processing</p>
              </li>
              <li>
                <strong>Mapping Services:</strong>
                <p className="text-sm text-gray-600">Navigation, route optimization, location services</p>
              </li>
              <li>
                <strong>Cloud Services:</strong>
                <p className="text-sm text-gray-600">Data storage, backup, app hosting</p>
              </li>
              <li>
                <strong>Verification Services:</strong>
                <p className="text-sm text-gray-600">Background checks, ID verification (drivers)</p>
              </li>
            </ul>
          </div>

          {/* Legal Requirements */}
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-red-800 mb-3">Legal Requirements</h3>
            <p className="text-red-700">
              We may disclose information when required by law, to protect rights and safety, 
              or in connection with business transfers like mergers or acquisitions.
            </p>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-6">
            <p className="text-green-800 font-semibold text-center">
              ✅ We do NOT sell your personal information to third parties for marketing purposes.
            </p>
          </div>
        </div>
      </section>

      {/* Data Security - Same for both */}
      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">5. Data Security</h2>
        <p className="text-gray-700 leading-relaxed mb-4">
          We implement robust security measures to protect information for all users:
        </p>
        <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
          <li><strong>Encryption:</strong> All data is encrypted in transit and at rest</li>
          <li><strong>Access Controls:</strong> Strict role-based access to user data</li>
          <li><strong>Secure Storage:</strong> Data stored on secure servers with limited access</li>
          <li><strong>Regular Audits:</strong> Security assessments and vulnerability testing</li>
          <li><strong>Staff Training:</strong> Privacy and security training for all employees</li>
          <li><strong>Background Checks:</strong> For employees handling sensitive data</li>
        </ul>
        <p className="text-gray-700 leading-relaxed mt-4">
          While we implement industry-standard security measures, no system is completely 
          secure. We cannot guarantee absolute security of your data.
        </p>
      </section>

      {/* Your Rights - Same for both */}
      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-6">6. Your Rights and Choices</h2>
        
        <div className="grid md:grid-cols-3 gap-4 mb-8">
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-semibold text-gray-800 mb-2 flex items-center">
              <span className="mr-2">📱</span> In-App Controls
            </h3>
            <ul className="text-sm text-gray-700 space-y-1">
              <li>• Update profile information</li>
              <li>• Manage notifications</li>
              <li>• Control location permissions</li>
              <li>• Delete saved addresses</li>
            </ul>
          </div>
          
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-semibold text-gray-800 mb-2 flex items-center">
              <span className="mr-2">📧</span> Contact Us For
            </h3>
            <ul className="text-sm text-gray-700 space-y-1">
              <li>• Access your personal data</li>
              <li>• Correct inaccurate information</li>
              <li>• Delete your account</li>
              <li>• Export your data</li>
            </ul>
          </div>
          
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-semibold text-gray-800 mb-2 flex items-center">
              <span className="mr-2">⚖️</span> Your Rights
            </h3>
            <ul className="text-sm text-gray-700 space-y-1">
              <li>• Right to access</li>
              <li>• Right to correction</li>
              <li>• Right to deletion</li>
              <li>• Right to object</li>
            </ul>
          </div>
        </div>

        <div className="bg-purple-50 border border-purple-200 rounded-lg p-6">
          <p className="text-purple-800 text-center">
            <strong>To exercise your rights:</strong> Email us at admin@velosdrop.com
          </p>
        </div>
      </section>

      {/* Age Restrictions - Important for both */}
      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">7. Age Restrictions (18+)</h2>
        <div className="bg-red-50 border-2 border-red-300 rounded-lg p-6 mb-6">
          <p className="text-red-800 font-bold text-xl mb-2 text-center">🚫 STRICTLY 18+ ONLY</p>
          <p className="text-red-700 leading-relaxed text-center">
            The Velosdrop platform is exclusively for users 18 years and older.
            This applies to both customers and delivery drivers.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-white border border-gray-300 rounded-lg p-5">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">For Customers</h3>
            <ul className="list-disc list-inside text-gray-700 space-y-2">
              <li>Must confirm age during registration</li>
              <li>May be asked for age verification</li>
              <li>Using false age information violates Terms</li>
            </ul>
          </div>
          
          <div className="bg-white border border-gray-300 rounded-lg p-5">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">For Drivers</h3>
            <ul className="list-disc list-inside text-gray-700 space-y-2">
              <li>Must be 18+ and legally eligible to work</li>
              <li>Government ID verification required</li>
              <li>Valid driver's license mandatory</li>
            </ul>
          </div>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mt-6">
          <p className="text-yellow-800 font-semibold">
            ⚠️ Underage use results in immediate account termination, data deletion, 
            and may include notification to authorities.
          </p>
        </div>
      </section>

      {/* Third-Party Services - Updated table */}
      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-6">8. Third-Party Services</h2>
        <p className="text-gray-700 leading-relaxed mb-6">
          Our app integrates with third-party services for various functionalities:
        </p>
        
        <div className="border border-gray-300 rounded-lg overflow-hidden mb-6">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-300">
              <thead className="bg-gray-100">
                <tr>
                  <th className="py-3 px-4 text-left text-sm font-semibold text-gray-900">Service</th>
                  <th className="py-3 px-4 text-left text-sm font-semibold text-gray-900">Purpose</th>
                  <th className="py-3 px-4 text-left text-sm font-semibold text-gray-900">Data Shared</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                <tr>
                  <td className="py-3 px-4 text-sm text-gray-900">Payment Processors</td>
                  <td className="py-3 px-4 text-sm text-gray-700">Mobile money transactions</td>
                  <td className="py-3 px-4 text-sm text-gray-700">Payment details, reference numbers</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 text-sm text-gray-900">Mapping Services</td>
                  <td className="py-3 px-4 text-sm text-gray-700">Navigation and location</td>
                  <td className="py-3 px-4 text-sm text-gray-700">Addresses, GPS coordinates</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 text-sm text-gray-900">Cloud Storage</td>
                  <td className="py-3 px-4 text-sm text-gray-700">Data hosting and backup</td>
                  <td className="py-3 px-4 text-sm text-gray-700">App data, user content</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 text-sm text-gray-900">Verification Services</td>
                  <td className="py-3 px-4 text-sm text-gray-700">Driver background checks</td>
                  <td className="py-3 px-4 text-sm text-gray-700">ID documents, license info</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 text-sm text-gray-900">Analytics</td>
                  <td className="py-3 px-4 text-sm text-gray-700">App improvement</td>
                  <td className="py-3 px-4 text-sm text-gray-700">Usage statistics, crash reports</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        
        <p className="text-gray-700 leading-relaxed">
          These services have their own privacy policies. We recommend reviewing them 
          for information about their data practices.
        </p>
      </section>

      {/* Continue with other sections, keeping them combined */}
      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">9. Data Retention</h2>
        <div className="grid md:grid-cols-2 gap-6 mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-3">General Retention</h3>
            <ul className="list-disc list-inside text-gray-700 space-y-2">
              <li><strong>Active Accounts:</strong> While account is active</li>
              <li><strong>Financial Records:</strong> 7 years (tax compliance)</li>
              <li><strong>Delivery History:</strong> 2 years</li>
              <li><strong>Inactive Accounts:</strong> 2 years then deletion</li>
            </ul>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-3">Driver-Specific</h3>
            <ul className="list-disc list-inside text-gray-700 space-y-2">
              <li><strong>Verification Data:</strong> 7 years (legal requirement)</li>
              <li><strong>Performance Metrics:</strong> 2 years</li>
              <li><strong>Background Checks:</strong> 7 years</li>
              <li><strong>Earnings Records:</strong> 7 years (tax purposes)</li>
            </ul>
          </div>
        </div>
        <p className="text-gray-700 leading-relaxed">
          When we no longer need information, it is securely deleted or anonymized.
        </p>
      </section>

      {/* Contact Section */}
      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">10. Contact Us</h2>
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-8">
          <h3 className="text-xl font-semibold text-gray-800 mb-6">We're Here to Help</h3>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-gray-700 mb-2">Customer Support</h4>
              <p className="text-blue-600 text-lg">admin@velosdrop.com</p>
              <p className="text-gray-600 text-sm mt-1">For delivery issues, complaints, general inquiries</p>
            </div>
            
            <div>
              <h4 className="font-medium text-gray-700 mb-2">Driver Support</h4>
              <p className="text-blue-600 text-lg">admin@velosdrop.com</p>
              <p className="text-gray-600 text-sm mt-1">For driver issues, earnings, account management</p>
            </div>
            
            <div>
              <h4 className="font-medium text-gray-700 mb-2">Privacy Inquiries</h4>
              <p className="text-blue-600 text-lg">admin@velosdrop.com</p>
              <p className="text-gray-600 text-sm mt-1">For data access, deletion requests, privacy questions</p>
            </div>
            
            <div>
              <h4 className="font-medium text-gray-700 mb-2">Website</h4>
              <a 
                href="https://www.velosdrop.com" 
                className="text-blue-600 hover:underline text-lg"
              >
                https://www.velosdrop.com
              </a>
            </div>
          </div>
          
          <div className="mt-6 pt-6 border-t border-gray-300">
            <p className="text-sm text-gray-600">
              We aim to respond to all inquiries within 48 hours.
            </p>
          </div>
        </div>
      </section>

      {/* Final Acknowledgment */}
      <div className="border-t-2 border-gray-300 pt-12 mt-12 bg-gray-50 p-8 rounded-lg">
        <h3 className="text-2xl font-bold text-gray-900 mb-6 text-center">
          Your Acknowledgment and Consent
        </h3>
        
        <div className="bg-white border border-gray-300 rounded-lg p-6 mb-6">
          <p className="text-gray-700 leading-relaxed mb-4">
            By downloading, installing, or using the Velosdrop app (as customer or driver), 
            you acknowledge that:
          </p>
          <ul className="list-disc list-inside text-gray-700 space-y-3 ml-4">
            <li>You have read and understood this Privacy Policy in its entirety</li>
            <li>You consent to the collection, use, and sharing of your information as described</li>
            <li>You confirm you are at least 18 years of age</li>
            <li>You understand your rights and how to exercise them</li>
            <li>You agree to receive communications about your account and services</li>
            <li>For drivers: You consent to background checks and verification processes</li>
          </ul>
        </div>

        <div className="bg-red-50 border-2 border-red-300 rounded-lg p-6">
          <p className="text-red-800 font-bold text-lg mb-2 text-center">
            ⚠️ IMPORTANT NOTICE
          </p>
          <p className="text-red-700 text-center">
            If you do not agree with any part of this Privacy Policy, 
            you must not download, install, or use the Velosdrop app.
          </p>
        </div>
      </div>
    </div>
  );
}