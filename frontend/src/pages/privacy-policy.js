import React from "react";
import { FiUser, FiMail, FiPhone, FiMapPin, FiAlertTriangle } from "react-icons/fi";
import LegalPageLayout from "@components/legal/LegalPageLayout";
import PlaceholderBadge from "@components/legal/PlaceholderBadge";

const sections = [
  { id: "introduction-scope", title: "1. Introduction & Scope" },
  { id: "information-we-collect", title: "2. Information We Collect" },
  { id: "how-we-use-your-information", title: "3. How We Use Your Information" },
  { id: "how-we-share-your-information", title: "4. How We Share Your Information" },
  { id: "third-party-links-partners", title: "5. Third-Party Links & Partners" },
  { id: "data-security", title: "6. Data Security" },
  { id: "data-retention-deletion", title: "7. Data Retention & Deletion" },
  { id: "your-rights-choices", title: "8. Your Rights & Choices" },
  { id: "consent", title: "9. Consent" },
  { id: "changes-to-this-policy", title: "10. Changes to This Policy" },
  { id: "contact-us", title: "11. Contact Us" },
];

const summaryItems = [
  { title: "Data Collection", description: "Identity, contact, and transaction details collected for order fulfillment and platform services." },
  { title: "Data Sharing", description: "Shared only with essential partners (logistics, payment processors) and legal authorities as required by Indian law." },
  { title: "Your Control", description: "You can update preferences, opt out of marketing, or withdraw consent by contacting our Grievance Officer." },
];

const PrivacyPolicy = () => {
  return (
    <LegalPageLayout
      pageTitle="Privacy Policy"
      pageDescription="Legal & Privacy Policy information for FarmacyKart users."
      lastUpdated="18.09.2026"
      appliesTo="farmacykart.com"
      summaryItems={summaryItems}
      sections={sections}
      noIndex={false}
    >
      {/* 1. Introduction & Scope */}
      <section id="introduction-scope" className="scroll-mt-32">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 pb-3 border-b border-gray-100 font-serif">
          1. Introduction & Scope
        </h2>
        <div className="mt-4 text-gray-700 text-sm sm:text-base leading-relaxed max-w-3xl space-y-4">
          <p>
            This Privacy Policy describes how FarmacyKart and its affiliates ("Company," "we," "our," "us") collect, use, share, protect, and otherwise process your personal data through farmacykart.com (the "Platform").
          </p>
          <p>
            You may browse certain sections of the Platform without registering. We do not offer products or services under this Platform outside India, and your personal data is primarily stored and processed in India.
          </p>
          <p>
            By visiting the Platform, providing your information, or availing any product or service offered on it, you agree to be bound by this Privacy Policy, our Terms of Use, and applicable product/service terms, and to be governed by the laws of India, including data protection and privacy law. If you do not agree, please do not use or access the Platform.
          </p>
        </div>
      </section>

      {/* 2. Information We Collect */}
      <section id="information-we-collect" className="scroll-mt-32 pt-4">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 pb-3 border-b border-gray-100 font-serif">
          2. Information We Collect
        </h2>
        <div className="mt-4 text-gray-700 text-sm sm:text-base leading-relaxed max-w-3xl space-y-4">
          <p>
            We collect personal data when you use the Platform, our services, or otherwise interact with us. This may include:
          </p>
          <ul className="list-disc pl-6 space-y-2 text-gray-700">
            <li>Identity and contact details provided during sign-up — name, date of birth, address, phone number, and email.</li>
            <li>Proof of identity or address documents you choose to share.</li>
            <li>Sensitive personal data, collected only with your consent, such as bank account, card, or other payment instrument details, or biometric information (e.g. facial features) used to enable specific features.</li>
            <li>Behavioral and preference data, compiled and analysed on an aggregated basis.</li>
            <li>Transaction data from your activity on the Platform and with our third-party business partners.</li>
          </ul>
          <p>
            You may always choose not to provide certain information by not using the related feature — though this may limit your access to that feature. When a third-party partner collects data directly from you, their own privacy policy governs that collection, and we recommend reviewing it before sharing information.
          </p>

          {/* Safety Note Callout Box */}
          <div className="my-5 p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs sm:text-sm flex items-start gap-3">
            <FiAlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <strong className="font-bold text-amber-950 block mb-1">A Safety Note:</strong>
              We will never ask you for your debit/credit card PIN or net-banking password by email or phone. If you're asked for this, don't provide it, and report it to law enforcement immediately.
            </div>
          </div>
        </div>
      </section>

      {/* 3. How We Use Your Information */}
      <section id="how-we-use-your-information" className="scroll-mt-32 pt-4">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 pb-3 border-b border-gray-100 font-serif">
          3. How We Use Your Information
        </h2>
        <div className="mt-4 text-gray-700 text-sm sm:text-base leading-relaxed max-w-3xl space-y-4">
          <p>
            We use your personal data to provide the services you request, including to:
          </p>
          <ul className="list-disc pl-6 space-y-2 text-gray-700">
            <li>Assist sellers and business partners in handling and fulfilling orders.</li>
            <li>Enhance your experience and personalise the Platform.</li>
            <li>Resolve disputes and troubleshoot problems.</li>
            <li>Share relevant offers, products, and updates.</li>
            <li>Detect and prevent fraud, error, and other criminal activity.</li>
            <li>Enforce our Terms of Use.</li>
            <li>Conduct research, analysis, and surveys.</li>
          </ul>
          <p>
            Where we use your data for marketing, we'll always give you the option to opt out. Some features may not be available if related permissions aren't granted.
          </p>
        </div>
      </section>

      {/* 4. How We Share Your Information */}
      <section id="how-we-share-your-information" className="scroll-mt-32 pt-4">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 pb-3 border-b border-gray-100 font-serif">
          4. How We Share Your Information
        </h2>
        <div className="mt-4 text-gray-700 text-sm sm:text-base leading-relaxed max-w-3xl space-y-4">
          <p>
            We may share personal data within our group entities and affiliates so they can provide you services — these entities may market to you unless you opt out. We may also disclose data to:
          </p>
          <ul className="list-disc pl-6 space-y-2 text-gray-700">
            <li>Sellers, business partners, and service providers (logistics, payment processors, reward programs) needed to deliver our services.</li>
            <li>Government or law enforcement agencies, when required by law or in good-faith belief it's necessary to comply with legal process.</li>
            <li>Third parties, where necessary to enforce our terms, respond to rights-infringement claims, or protect the safety of our users and the public.</li>
          </ul>
        </div>
      </section>

      {/* 5. Third-Party Links & Partners */}
      <section id="third-party-links-partners" className="scroll-mt-32 pt-4">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 pb-3 border-b border-gray-100 font-serif">
          5. Third-Party Links & Partners
        </h2>
        <div className="mt-4 text-gray-700 text-sm sm:text-base leading-relaxed max-w-3xl space-y-4">
          <p>
            The Platform may contain links to third-party websites. Accessing them means you're governed by that site's own terms and privacy policy. We recommend reviewing those policies, as we aren't responsible for third-party practices or content.
          </p>
        </div>
      </section>

      {/* 6. Data Security */}
      <section id="data-security" className="scroll-mt-32 pt-4">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 pb-3 border-b border-gray-100 font-serif">
          6. Data Security
        </h2>
        <div className="mt-4 text-gray-700 text-sm sm:text-base leading-relaxed max-w-3xl space-y-4">
          <p>
            We adopt reasonable security practices to protect your data from unauthorized access, disclosure, loss, or misuse, and use secure servers to safeguard account information. That said, no transmission over the internet is completely secure, and by using the Platform you accept the inherent risks of online data transmission. You're responsible for keeping your login credentials confidential.
          </p>
        </div>
      </section>

      {/* 7. Data Retention & Deletion */}
      <section id="data-retention-deletion" className="scroll-mt-32 pt-4">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 pb-3 border-b border-gray-100 font-serif">
          7. Data Retention & Deletion
        </h2>
        <div className="mt-4 text-gray-700 text-sm sm:text-base leading-relaxed max-w-3xl space-y-4">
          <p>
            You can delete your account any time from your profile settings, or by writing to us using the contact details below. We may delay deletion if you have a pending grievance, claim, or shipment. Once deleted, you lose access to your account.
          </p>
          <p>
            We retain personal data only as long as needed for the purpose it was collected, or as required by law — except where we believe retention is necessary to prevent fraud or abuse. We may keep anonymised data indefinitely for research and analytics.
          </p>
        </div>
      </section>

      {/* 8. Your Rights & Choices */}
      <section id="your-rights-choices" className="scroll-mt-32 pt-4">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 pb-3 border-b border-gray-100 font-serif">
          8. Your Rights & Choices
        </h2>
        <div className="mt-4 text-gray-700 text-sm sm:text-base leading-relaxed max-w-3xl space-y-4">
          <p>
            You can access, correct, and update your personal data directly through your account on the Platform. You may also opt out of marketing communications at any time, and withdraw previously given consent (see below).
          </p>
        </div>
      </section>

      {/* 9. Consent */}
      <section id="consent" className="scroll-mt-32 pt-4">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 pb-3 border-b border-gray-100 font-serif">
          9. Consent
        </h2>
        <div className="mt-4 text-gray-700 text-sm sm:text-base leading-relaxed max-w-3xl space-y-4">
          <p>
            By visiting the Platform or providing your information, you consent to the collection, use, storage, and disclosure of your data as described in this Policy. If you share someone else's personal data with us, you confirm you're authorised to do so.
          </p>
          <p>
            You can withdraw consent at any time by writing to our Grievance Officer (contact below) with the subject line "Withdrawal of consent for processing personal data." We may verify such requests before acting on them. Withdrawal isn't retroactive, and we reserve the right to limit services that depend on the withdrawn data.
          </p>
        </div>
      </section>

      {/* 10. Changes to This Policy */}
      <section id="changes-to-this-policy" className="scroll-mt-32 pt-4">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 pb-3 border-b border-gray-100 font-serif">
          10. Changes to This Policy
        </h2>
        <div className="mt-4 text-gray-700 text-sm sm:text-base leading-relaxed max-w-3xl space-y-4">
          <p>
            We may update this Privacy Policy periodically to reflect changes in our practices. Please check back regularly — we'll notify you of significant changes as required by applicable law.
          </p>
        </div>
      </section>

      {/* 11. Contact Us */}
      <section id="contact-us" className="scroll-mt-32 pt-4">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 pb-3 border-b border-gray-100 font-serif mb-6">
          11. Contact Us
        </h2>
        <div className="bg-store-50/50 border border-store-200 rounded-2xl p-6 sm:p-8 max-w-3xl shadow-sm">
          <p className="text-sm text-gray-700 mb-6 font-medium">
            For questions, requests, or to reach our Grievance Officer:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-gray-800">
            <div className="flex items-start gap-3 bg-white p-3.5 rounded-xl border border-gray-200">
              <FiUser className="w-5 h-5 text-store-600 flex-shrink-0 mt-0.5" />
              <div>
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block">Grievance Officer</span>
                <span className="font-semibold text-gray-900">Grievance Officer</span>
              </div>
            </div>

            <div className="flex items-start gap-3 bg-white p-3.5 rounded-xl border border-gray-200">
              <FiMail className="w-5 h-5 text-store-600 flex-shrink-0 mt-0.5" />
              <div>
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block">Email Address</span>
                <a href="mailto:info.farmacykart@gmail.com" className="font-semibold text-store-600 hover:underline break-all">info.farmacykart@gmail.com</a>
              </div>
            </div>

            <div className="flex items-start gap-3 bg-white p-3.5 rounded-xl border border-gray-200">
              <FiPhone className="w-5 h-5 text-store-600 flex-shrink-0 mt-0.5" />
              <div>
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block">Phone Number</span>
                <a href="tel:02.356.1666" className="font-semibold text-store-600 hover:underline">02.356.1666</a>
              </div>
            </div>

            <div className="flex items-start gap-3 bg-white p-3.5 rounded-xl border border-gray-200">
              <FiMapPin className="w-5 h-5 text-store-600 flex-shrink-0 mt-0.5" />
              <div>
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block">Registered Address</span>
                <span className="font-semibold text-gray-900 leading-snug block">987 Andre Plain Suite High Street 838, Lake Hestertown, USA</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </LegalPageLayout>
  );
};

export default PrivacyPolicy;
