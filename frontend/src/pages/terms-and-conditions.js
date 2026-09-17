import React from "react";
import { FiUser, FiMail, FiPhone, FiMapPin } from "react-icons/fi";
import LegalPageLayout from "@components/legal/LegalPageLayout";
import PlaceholderBadge from "@components/legal/PlaceholderBadge";

const sections = [
  { id: "introduction-acceptance", title: "1. Introduction & Acceptance of Terms" },
  { id: "definitions", title: "2. Definitions" },
  { id: "eligibility-account-registration", title: "3. Eligibility & Account Registration" },
  { id: "use-of-platform-payments", title: "4. Use of the Platform & Payments" },
  { id: "intellectual-property", title: "5. Intellectual Property Rights" },
  { id: "disclaimer-of-warranties", title: "6. Disclaimer of Warranties" },
  { id: "limitation-of-liability", title: "7. Limitation of Liability" },
  { id: "indemnification", title: "8. Indemnification" },
  { id: "third-party-links", title: "9. Third-Party Links" },
  { id: "force-majeure", title: "10. Force Majeure" },
  { id: "governing-law-jurisdiction", title: "11. Governing Law & Jurisdiction" },
  { id: "contact-us", title: "12. Contact Us" },
];

const summaryItems = [
  { title: "Acceptance of Terms", description: "Using the Platform constitutes agreement to these Terms, which may be modified periodically." },
  { title: "Account Responsibility", description: "You are responsible for providing true account information and for all activity conducted under your account." },
  { title: "Intellectual Property", description: "All content, layout, and graphics are proprietary to the Company; no rights are transferred to users." },
  { title: "Liability & Limitations", description: "Services are provided 'as is' with total liability limited strictly to fees paid or ₹100, whichever is less." },
  { title: "Governing Law", description: "Governed by the laws of India and subject to exclusive court jurisdiction." },
];

const TermsAndConditions = () => {
  return (
    <LegalPageLayout
      pageTitle="Terms & Conditions"
      pageDescription="Terms and Conditions governing the use of FarmacyKart."
      lastUpdated="18.09.2026"
      appliesTo="farmacykart.com"
      summaryItems={summaryItems}
      sections={sections}
      noIndex={false}
    >
      {/* 1. Introduction & Acceptance of Terms */}
      <section id="introduction-acceptance" className="scroll-mt-32">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 pb-3 border-b border-gray-100 font-serif">
          1. Introduction & Acceptance of Terms
        </h2>
        <div className="mt-4 text-gray-700 text-sm sm:text-base leading-relaxed max-w-3xl space-y-4">
          <p>
            This document is an electronic record under the Information Technology Act, 2000 and does not require any physical or digital signature. It is published in accordance with Rule 3(1) of the Information Technology (Intermediaries Guidelines) Rules, 2011, which requires publishing the rules, privacy policy, and terms of use for a platform.
          </p>
          <p>
            The Platform is owned by FarmacyKart, a company incorporated under the Companies Act, with its registered office at 987 Andre Plain Suite High Street 838, Lake Hestertown, USA ("Platform Owner," "we," "us," "our"). By accessing, browsing, or otherwise using the Platform, you indicate your agreement to all the terms and conditions in these Terms of Use — please read them carefully before proceeding. Any additional or conflicting terms you propose are expressly rejected. These Terms may be modified at any time without prior notice; it's your responsibility to review them periodically.
          </p>
        </div>
      </section>

      {/* 2. Definitions */}
      <section id="definitions" className="scroll-mt-32 pt-4">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 pb-3 border-b border-gray-100 font-serif">
          2. Definitions
        </h2>
        <div className="mt-4 text-gray-700 text-sm sm:text-base leading-relaxed max-w-3xl space-y-4">
          <p>
            "You," "your," or "user" means any natural or legal person who has agreed to become a user or buyer on the Platform. "Services" refers collectively to the Platform's website, goods, and services. If you transact on the Platform, you're also subject to the specific policies applicable to that transaction.
          </p>
        </div>
      </section>

      {/* 3. Eligibility & Account Registration */}
      <section id="eligibility-account-registration" className="scroll-mt-32 pt-4">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 pb-3 border-b border-gray-100 font-serif">
          3. Eligibility & Account Registration
        </h2>
        <div className="mt-4 text-gray-700 text-sm sm:text-base leading-relaxed max-w-3xl space-y-4">
          <p>
            To access and use the Services, you agree to provide true, accurate, and complete information during and after registration, and you're responsible for all activity conducted through your registered account.
          </p>
        </div>
      </section>

      {/* 4. Use of the Platform & Payments */}
      <section id="use-of-platform-payments" className="scroll-mt-32 pt-4">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 pb-3 border-b border-gray-100 font-serif">
          4. Use of the Platform & Payments
        </h2>
        <div className="mt-4 text-gray-700 text-sm sm:text-base leading-relaxed max-w-3xl space-y-4">
          <p>
            By initiating a transaction on the Platform, you enter into a legally binding contract with the Platform Owner for that Service. You agree to pay all charges associated with the Services you use. You agree not to use the Platform or Services for any purpose that is unlawful or forbidden by these Terms or by applicable Indian or local law.
          </p>
        </div>
      </section>

      {/* 5. Intellectual Property Rights */}
      <section id="intellectual-property" className="scroll-mt-32 pt-4">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 pb-3 border-b border-gray-100 font-serif">
          5. Intellectual Property Rights
        </h2>
        <div className="mt-4 text-gray-700 text-sm sm:text-base leading-relaxed max-w-3xl space-y-4">
          <p>
            All content on the Platform — including its design, layout, look, and graphics — is proprietary to the Platform Owner or licensed to it. You have no authority to claim any intellectual property rights, title, or interest in this content. Unauthorized use of the Platform or Services may lead to action under these Terms and/or applicable law.
          </p>
        </div>
      </section>

      {/* 6. Disclaimer of Warranties */}
      <section id="disclaimer-of-warranties" className="scroll-mt-32 pt-4">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 pb-3 border-b border-gray-100 font-serif">
          6. Disclaimer of Warranties
        </h2>
        <div className="mt-4 text-gray-700 text-sm sm:text-base leading-relaxed max-w-3xl space-y-4">
          <p>
            Neither we nor any third parties provide any warranty as to the accuracy, timeliness, performance, completeness, or suitability of the information and materials on the Platform for any specific purpose. You acknowledge that this information may contain inaccuracies or errors, and we expressly exclude liability for these to the fullest extent permitted by law. Your use of the Platform and Services is entirely at your own risk and discretion.
          </p>
        </div>
      </section>

      {/* 7. Limitation of Liability */}
      <section id="limitation-of-liability" className="scroll-mt-32 pt-4">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 pb-3 border-b border-gray-100 font-serif">
          7. Limitation of Liability
        </h2>
        <div className="mt-4 text-gray-700 text-sm sm:text-base leading-relaxed max-w-3xl space-y-4">
          <p>
            In no event will the Platform Owner be liable for any indirect, consequential, incidental, special, or punitive damages — including loss of profits, revenue, business opportunities, or data — arising from the use of or inability to use the Services. This applies whether the claim arises in contract, negligence, tort, warranty, or otherwise, and total liability will not exceed the amount you paid for the Service giving rise to the claim, or ₹100, whichever is less.
          </p>
        </div>
      </section>

      {/* 8. Indemnification */}
      <section id="indemnification" className="scroll-mt-32 pt-4">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 pb-3 border-b border-gray-100 font-serif">
          8. Indemnification
        </h2>
        <div className="mt-4 text-gray-700 text-sm sm:text-base leading-relaxed max-w-3xl space-y-4">
          <p>
            You agree to indemnify and hold harmless the Platform Owner, its affiliates, group companies, and their officers, directors, agents, and employees from any claim, demand, or action — including reasonable attorneys' fees — arising from your breach of these Terms, the Privacy Policy, or other policies, or from your violation of any law or third-party rights (including intellectual property rights).
          </p>
        </div>
      </section>

      {/* 9. Third-Party Links */}
      <section id="third-party-links" className="scroll-mt-32 pt-4">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 pb-3 border-b border-gray-100 font-serif">
          9. Third-Party Links
        </h2>
        <div className="mt-4 text-gray-700 text-sm sm:text-base leading-relaxed max-w-3xl space-y-4">
          <p>
            The Platform may contain links to third-party websites. Accessing these links means you're governed by that third party's own terms of use and privacy policy. These links are provided for your convenience and to provide further information; we aren't responsible for third-party content or practices.
          </p>
        </div>
      </section>

      {/* 10. Force Majeure */}
      <section id="force-majeure" className="scroll-mt-32 pt-4">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 pb-3 border-b border-gray-100 font-serif">
          10. Force Majeure
        </h2>
        <div className="mt-4 text-gray-700 text-sm sm:text-base leading-relaxed max-w-3xl space-y-4">
          <p>
            Neither party will be liable for any failure to perform an obligation under these Terms if that performance is prevented or delayed by a force majeure event beyond their reasonable control.
          </p>
        </div>
      </section>

      {/* 11. Governing Law & Jurisdiction */}
      <section id="governing-law-jurisdiction" className="scroll-mt-32 pt-4">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 pb-3 border-b border-gray-100 font-serif">
          11. Governing Law & Jurisdiction
        </h2>
        <div className="mt-4 text-gray-700 text-sm sm:text-base leading-relaxed max-w-3xl space-y-4">
          <p>
            These Terms, and any dispute or claim relating to them or their enforceability, are governed by and construed in accordance with the laws of India. All disputes are subject to the exclusive jurisdiction of the courts in Lake Hestertown, USA.
          </p>
        </div>
      </section>

      {/* 12. Contact Us */}
      <section id="contact-us" className="scroll-mt-32 pt-4">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 pb-3 border-b border-gray-100 font-serif mb-6">
          12. Contact Us
        </h2>
        <div className="bg-store-50/50 border border-store-200 rounded-2xl p-6 sm:p-8 max-w-3xl shadow-sm">
          <p className="text-sm text-gray-700 mb-6 font-medium">
            For any concerns or communications relating to these Terms, please contact us at:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-gray-800">
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

            <div className="sm:col-span-2 flex items-start gap-3 bg-white p-3.5 rounded-xl border border-gray-200">
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

export default TermsAndConditions;
