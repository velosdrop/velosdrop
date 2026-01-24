import Link from 'next/link'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Delete Account - VelosDrop',
  description: 'Request account deletion for VelosDrop driver and customer accounts',
}

export default function DeleteAccountPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-dark-950 to-dark-900">
      <div className="padding-container max-container py-20">
        <div className="max-w-4xl mx-auto bg-dark-900 rounded-2xl border border-gray-800 p-8 md:p-12">
          {/* Header */}
          <div className="mb-8">
            <h1 className="bold-32 md:bold-40 text-white mb-4">
              Account Deletion Request
            </h1>
            <p className="regular-16 text-gray-400">
              VelosDrop Account Deletion Policy and Instructions
            </p>
          </div>

          {/* Important Notice */}
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-6 mb-8">
            <h2 className="bold-20 text-red-400 mb-3">⚠️ Important Notice</h2>
            <p className="regular-14 text-gray-300">
              Account deletion is permanent and cannot be undone. All your data will be removed from our systems as described below.
            </p>
          </div>

          {/* How to Request Deletion */}
          <section className="mb-10">
            <h2 className="bold-24 text-white mb-4">How to Request Account Deletion</h2>
            <p className="regular-16 text-gray-300 mb-6">
              VelosDrop drivers and customers cannot delete accounts directly. To request account deletion, please follow these steps:
            </p>

            <div className="space-y-4">
              <div className="flex gap-4 bg-dark-800 rounded-lg p-5 border border-gray-700">
                <div className="flex-shrink-0 w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center text-white bold-16">
                  1
                </div>
                <div>
                  <h3 className="bold-18 text-white mb-2">Contact Support</h3>
                  <p className="regular-14 text-gray-300">
                    Send an email to{' '}
                    <a href="mailto:support@velosdrop.com" className="text-purple-400 hover:text-purple-300 underline">
                      support@velosdrop.com
                    </a>
                    {' '}with the subject line "Account Deletion Request"
                  </p>
                </div>
              </div>

              <div className="flex gap-4 bg-dark-800 rounded-lg p-5 border border-gray-700">
                <div className="flex-shrink-0 w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center text-white bold-16">
                  2
                </div>
                <div>
                  <h3 className="bold-18 text-white mb-2">Include Required Information</h3>
                  <p className="regular-14 text-gray-300 mb-3">Your email must include:</p>
                  <ul className="list-disc list-inside regular-14 text-gray-300 space-y-1 ml-4">
                    <li>Registered phone number</li>
                    <li>Full name on the account</li>
                    <li>Driver ID or Customer ID (if known)</li>
                    <li>Reason for deletion (optional)</li>
                  </ul>
                </div>
              </div>

              <div className="flex gap-4 bg-dark-800 rounded-lg p-5 border border-gray-700">
                <div className="flex-shrink-0 w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center text-white bold-16">
                  3
                </div>
                <div>
                  <h3 className="bold-18 text-white mb-2">Wait for Confirmation</h3>
                  <p className="regular-14 text-gray-300">
                    We will process your request within <span className="text-purple-400 bold-14">7 business days</span> and send you a confirmation email once your account has been deleted.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* What Gets Deleted */}
          <section className="mb-10">
            <h2 className="bold-24 text-white mb-4">What Data Gets Deleted</h2>
            <div className="bg-dark-800 rounded-lg p-6 border border-gray-700">
              <p className="regular-14 text-gray-300 mb-4">
                Upon account deletion, the following data will be permanently removed:
              </p>
              <ul className="list-disc list-inside regular-14 text-gray-300 space-y-2 ml-4">
                <li>Profile information (name, photo)</li>
                <li>Contact details (email, phone number)</li>
                <li>Delivery history and trip logs</li>
                <li>Location history and GPS data</li>
                <li>App preferences and settings</li>
                <li>Chat messages and support tickets</li>
              </ul>
            </div>
          </section>

          {/* What Gets Retained */}
          <section className="mb-10">
            <h2 className="bold-24 text-white mb-4">What Data Gets Retained</h2>
            <div className="bg-dark-800 rounded-lg p-6 border border-gray-700">
              <p className="regular-14 text-gray-300 mb-4">
                For legal, tax, and compliance purposes, we retain the following data for{' '}
                <span className="text-purple-400 bold-14">7 years</span>:
              </p>
              <ul className="list-disc list-inside regular-14 text-gray-300 space-y-2 ml-4">
                <li>Transaction records and payment history</li>
                <li>Tax documents and invoices</li>
                <li>Fraud prevention logs</li>
                <li>Records required by local regulations</li>
              </ul>
              <p className="regular-14 text-gray-400 mt-4 italic">
                This data is anonymized where possible and stored securely in compliance with data protection laws.
              </p>
            </div>
          </section>

          {/* Alternative Options */}
          <section className="mb-10">
            <h2 className="bold-24 text-white mb-4">Alternative Options</h2>
            <p className="regular-16 text-gray-300 mb-4">
              Before deleting your account, consider these alternatives:
            </p>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-dark-800 rounded-lg p-5 border border-gray-700">
                <h3 className="bold-16 text-purple-400 mb-2">📴 Deactivate Account</h3>
                <p className="regular-14 text-gray-300">
                  Temporarily disable your account without losing your data. Contact{' '}
                  <a href="mailto:admin@velosdrop.com" className="text-purple-400 hover:text-purple-300 underline">
                    admin@velosdrop.com
                  </a>
                  {' '}to request deactivation or reactivation.
                </p>
              </div>
              <div className="bg-dark-800 rounded-lg p-5 border border-gray-700">
                <h3 className="bold-16 text-purple-400 mb-2">🔒 Update Privacy Settings</h3>
                <p className="regular-14 text-gray-300">
                  Control what data is shared and how your account is used without deletion.
                </p>
              </div>
            </div>
          </section>

          {/* Contact Section */}
          <section className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-6">
            <h2 className="bold-20 text-purple-400 mb-3">Need Help?</h2>
            <p className="regular-14 text-gray-300 mb-4">
              If you have questions about account deletion or need assistance, our support team is here to help.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <a
                href="mailto:admin@velosdrop.com"
                className="btn_purple flex-1 text-center"
              >
                Email Support
              </a>
            </div>
          </section>

          {/* Back Button */}
          <div className="mt-8 text-center">
            <Link
              href="/"
              className="regular-14 text-purple-400 hover:text-purple-300 transition-colors"
            >
              ← Back to Home
            </Link>
          </div>
        </div>
      </div>
    </main>
  )
}