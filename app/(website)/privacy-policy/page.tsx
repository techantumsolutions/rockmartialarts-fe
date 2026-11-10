export const metadata = {
  title: "Privacy Policy | Rock Martial Arts",
  description:
    "Learn how Rock Martial Arts collects, uses, and protects your personal information.",
}

const LAST_UPDATED = "May 28, 2026"

const sections = [
  {
    title: "1. Information We Collect",
    intro: "We may collect the following information:",
    items: [
      "Full Name",
      "Email Address",
      "Mobile Number",
      "Address",
      "Date of Birth",
      "Student Registration Details",
      "Payment Information (processed through secure payment gateways)",
      "Attendance and Training Records",
      "Website Usage Information",
    ],
  },
  {
    title: "2. How We Use Your Information",
    intro: "We use your information to:",
    items: [
      "Manage student registrations",
      "Process payments",
      "Maintain attendance records",
      "Provide course and event information",
      "Send notifications and updates",
      "Improve our services and website experience",
      "Respond to inquiries and support requests",
    ],
  },
  {
    title: "3. Information Sharing",
    paragraphs: [
      "We do not sell, rent, or trade personal information to third parties.",
      "Information may only be shared with:",
    ],
    items: [
      "Authorized staff and coaches",
      "Payment gateway providers",
      "Legal authorities when required by law",
    ],
  },
  {
    title: "4. Data Security",
    paragraphs: [
      "We implement reasonable technical and organizational measures to protect your personal information from unauthorized access, disclosure, alteration, or destruction.",
    ],
  },
  {
    title: "5. Cookies",
    paragraphs: [
      "Our website may use cookies and similar technologies to improve user experience, analyze website traffic, and enhance functionality.",
      "Users may disable cookies through their browser settings.",
    ],
  },
  {
    title: "6. Third-Party Services",
    intro: "Our website may integrate with third-party services including:",
    items: [
      "Payment gateways",
      "Attendance systems",
      "Analytics tools",
      "Communication services",
    ],
    outro: "These services have their own privacy policies and practices.",
  },
  {
    title: "7. Children's Privacy",
    paragraphs: [
      "As our services are primarily used by students, parents or guardians may provide information on behalf of minors. We take reasonable measures to protect children's information.",
    ],
  },
  {
    title: "8. Your Rights",
    intro: "You may request to:",
    items: [
      "Access your personal information",
      "Correct inaccurate information",
      "Update your details",
      "Request deletion of your data where legally permissible",
    ],
  },
  {
    title: "9. Policy Updates",
    paragraphs: [
      "We may update this Privacy Policy from time to time. Changes will be published on this page with the revised update date.",
    ],
  },
  {
    title: "10. Contact Us",
    paragraphs: [
      "For privacy-related questions, please contact us through the website contact page or official communication channels.",
    ],
  },
]

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen bg-[#171A26]">
      <section
        className="relative py-20 md:py-28 bg-cover bg-center"
        style={{ backgroundImage: "url(/assets/img/banner.jpg)" }}
      >
        <div className="absolute inset-0 bg-black/60" />
        <div className="site-content relative z-10 px-0 sm:px-1">
          <div className="max-w-2xl">
            <h1 className="text-4xl md:text-5xl font-bold text-white uppercase mb-4">
              Privacy Policy
            </h1>
            <p className="text-gray-200 text-lg">Last Updated: {LAST_UPDATED}</p>
          </div>
        </div>
      </section>

      <section className="py-16 md:py-20 bg-[#171A26]">
        <div className="container mx-auto px-4 max-w-3xl">
          <p className="text-gray-300 text-lg leading-relaxed mb-12">
            Welcome to Rock Martial Arts. We value your privacy and are committed to protecting
            your personal information.
          </p>

          <div className="space-y-10">
            {sections.map((section) => (
              <article key={section.title}>
                <h2 className="text-xl md:text-2xl font-semibold text-[#FFB70F] mb-4">
                  {section.title}
                </h2>
                {section.paragraphs?.map((paragraph) => (
                  <p key={paragraph} className="text-gray-300 leading-relaxed mb-4">
                    {paragraph}
                  </p>
                ))}
                {section.intro && (
                  <p className="text-gray-300 leading-relaxed mb-3">{section.intro}</p>
                )}
                {section.items && (
                  <ul className="list-disc list-inside space-y-2 text-gray-300 mb-4">
                    {section.items.map((item) => (
                      <li key={item} className="leading-relaxed">
                        {item}
                      </li>
                    ))}
                  </ul>
                )}
                {section.outro && (
                  <p className="text-gray-300 leading-relaxed">{section.outro}</p>
                )}
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  )
}
