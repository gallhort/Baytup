'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Link
            href="/"
            className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Terms of Service</h1>
          <p className="mt-2 text-sm text-gray-600">Last updated: January 2026</p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-lg shadow-sm p-8 space-y-8">

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">1. Acceptance of Terms</h2>
            <p className="text-gray-700 leading-relaxed">
              By accessing and using Baytup, you accept and agree to be bound by the terms and provision
              of this agreement. If you do not agree to these Terms of Service, please do not use our platform.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">2. Use of Service</h2>
            <p className="text-gray-700 leading-relaxed mb-3">
              Baytup provides a platform for property and vehicle rentals. You agree to:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
              <li>Provide accurate and complete information when creating an account</li>
              <li>Maintain the security of your password and account</li>
              <li>Notify us immediately of any unauthorized use of your account</li>
              <li>Use the service only for lawful purposes</li>
              <li>Not impersonate any person or entity</li>
              <li>Not interfere with or disrupt the service</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">3. Host Responsibilities</h2>
            <p className="text-gray-700 leading-relaxed mb-3">
              If you are a host on Baytup, you agree to:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
              <li>Provide accurate descriptions of your properties/vehicles</li>
              <li>Honor confirmed bookings</li>
              <li>Maintain your listings in good condition</li>
              <li>Comply with all applicable laws and regulations</li>
              <li>Obtain all necessary permits and licenses</li>
              <li>Pay applicable taxes</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">4. Guest Responsibilities</h2>
            <p className="text-gray-700 leading-relaxed mb-3">
              If you are a guest on Baytup, you agree to:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
              <li>Leave properties/vehicles in the same condition as received</li>
              <li>Follow house rules and property guidelines</li>
              <li>Respect neighbors and the local community</li>
              <li>Pay for any damages you cause</li>
              <li>Be truthful in reviews</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">5. Payments and Fees</h2>
            <p className="text-gray-700 leading-relaxed">
              Baytup charges service fees for the use of the platform. Hosts pay a service fee when a booking
              is confirmed. Guests may also be charged a service fee. All fees are non-refundable except
              as required by law or as specified in our cancellation policy.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">6. Cancellation Policy</h2>
            <p className="text-gray-700 leading-relaxed">
              Cancellation policies vary by listing. Please review the specific cancellation policy for each
              booking before confirming your reservation. Cancellation fees may apply depending on the timing
              of the cancellation and the host's policy.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">7. Liability</h2>
            <p className="text-gray-700 leading-relaxed">
              Baytup acts as a marketplace and is not responsible for the conduct of hosts or guests.
              We do not endorse any listings or users. You acknowledge that Baytup has no control over
              the quality, safety, or legality of listings or the truth or accuracy of content provided by users.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">8. Dispute Resolution</h2>
            <p className="text-gray-700 leading-relaxed">
              In the event of a dispute between hosts and guests, we encourage direct communication.
              Baytup may provide support in resolving disputes but is not obligated to mediate or resolve conflicts.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">9. Changes to Terms</h2>
            <p className="text-gray-700 leading-relaxed">
              We reserve the right to modify these terms at any time. We will notify users of significant
              changes via email or platform notification. Your continued use of the service after changes
              constitutes acceptance of the new terms.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">10. Contact Information</h2>
            <p className="text-gray-700 leading-relaxed">
              If you have questions about these Terms of Service, please contact us:
            </p>
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <p className="text-gray-900 font-medium">Baytup Legal Team</p>
              <p className="text-gray-600 mt-1">Email: legal@baytup.com</p>
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}
