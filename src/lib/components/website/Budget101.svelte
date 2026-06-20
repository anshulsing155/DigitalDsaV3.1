<script>
	let {
		blogData,
		budgetBlogs
	} = $props();


  import { goto } from "$app/navigation";
  import NewPageLayout from "$lib/components/website/NewPageLayout.svelte";
  import Seo from "$lib/components/Seo.svelte";

  //
  //
  //   console.log("blog data", blogData);
  //   console.log("blog blogs", budgetBlogs);
</script>

<Seo
  type="WebPage"
  title="Cybersecurity Tips for Indian Businesses: Protect & Prevent"
  image="/images/cyber-security-tips-blog.jpg"
  description="Learn how Indian businesses can fight cyber threats with smart tips, real cases & free tools from the Govt of India."
  keywords="Cybersecurity for Indian businesses, Data protection in India, Cyber threat prevention India, Ransomware protection India, Business email compromise India, Phishing scams India, Cybersecurity best practices, Secure your business online India, Government cybersecurity tips India, Small business data security India"
/>

<section>
  <NewPageLayout
    pageData={{
      coverImage: "/images/cyber-security-tips-blog.jpg",
      coverAlt: "hero-cover",
      heading: `Budgeting 101`,
      para: ` As cyber threats surge across India, protecting your business from data breaches, financial losses, and operational disruptions is no longer optional—it's essential for long-term success!.`,
      paraStyle: "p-[1rem] bg-gray-200 italic",
      sourceName: "",
      originalSource: "",
    }}
  >
    <div
      class="py-[4rem] lg:py-0 lg:pt-[4rem] lg:pb-[8rem] px-[0.5rem] lg:px-[4rem] w-full divide-y relative"
    >
      <div class="grid grid-cols-12 gap-4">
        <div class="col-span-12 md:col-span-9 mx-auto">
          <div class="space-y-4 pt-[2rem] pb-[6rem]">
            <h2 class="typography-h2 text-text-main">
              Why This Matters
            </h2>
            <p class="typography-body-md text-text-main">
              Imagine discovering that your customers’ financial data has been
              leaked online . <span class="underline underline-offset-4">
                Could your business recover from the damage?
              </span><br />
              For businesses relying on digital platforms, where they share financial
              data, cybersecurity is essential. A single breach could compromise
              sensitive information, leading to financial losses and reputational
              damage.
            </p>
          </div>

          <div class="space-y-4 pt-[4rem] pb-[6rem]">
            <h2 class="typography-h2 text-text-main">
              Protect, Prevent, Prevail:
            </h2>

            <ul
              class="pl-2 typography-body-md space-y-2 text-text-main"
            >
              <li>✅ Identify Key Cyber Threats Targeting Indian Businesses</li>
              <li>
                ✅ Implement Robust Security Measures to Safeguard Your Data
              </li>
              <li>
                ✅ Stay One Step Ahead of Hackers with Proactive Cyber Defense
              </li>
            </ul>
          </div>

          <div class="space-y-4 pt-[4rem] pb-[6rem]">
            <ul class="list-decimal pl-6">
              <li>
                <h3 class="typography-h3 font-semibold text-text-main">
                  Ransomware Attacks – The Digital Hostage Situation
                </h3>
                <div class="typography-body-md text-[var(--form-text-secondary)]">
                  <br />
                  <div class="typography-body-sm py-[.5rem] px-2 italic text-[var(--form-text-secondary)]">
                    <span class="font-semibold">💡 Real Story:</span> In
                    November 2022, AIIMS Delhi suffered a ransomware attack that
                    wiped outpatient and research data from both primary and
                    backup servers, disrupting services for over a month.
                  </div>
                </div>
              </li>

              <li>
                <h3 class="typography-h3 font-semibold text-text-main">
                  Business Email Compromise (BEC) – The CEO Fraud
                </h3>
                <div class="typography-body-md text-[var(--form-text-secondary)]">
                  <br />
                  <div class="typography-body-sm py-[.5rem] px-2 italic text-[var(--form-text-secondary)]">
                    <span class="font-semibold">💡 Real Story:</span> A
                    Mumbai-based chemicals trading firm lost ₹10 lakh when
                    cybercriminals spoofed a supplier’s email. The accounts team
                    processed the payment, realizing the scam only after it was
                    too late.
                  </div>
                </div>
              </li>

              <li>
                <h3 class="typography-h3 font-semibold text-text-main">
                  Phishing Scams – The Fake But Convincing Trap
                </h3>
                <div class="typography-body-md text-[var(--form-text-secondary)]">
                  <br />
                  <div class="typography-body-sm py-[.5rem] px-2 italic text-[var(--form-text-secondary)]">
                    <span class="font-semibold">💡 Real Story:</span> Across
                    Indian organizations, phishing scams have led to significant
                    financial losses as attackers impersonate bosses, urging
                    employees to transfer funds or share confidential data.
                  </div>
                </div>
              </li>
            </ul>
          </div>

          <div class="space-y-4 pt-[4rem] pb-[6rem]">
            <h2 class="typography-h2 text-text-main">
              🛡️ Steps to Safeguard Your Business Today
            </h2>
            <ul class="list-decimal pl-8 space-y-8">
              <li class="space-y-3">
                <h3 class="typography-h3 font-semibold text-text-main">
                  Educate Your Team
                </h3>
                <ul
                  class="list-disc pl-4 space-y-3 typography-body-md text-[var(--form-text-secondary)]"
                >
                  <li>
                    Teach employees how to spot suspicious emails and scams.
                  </li>
                  <li>
                    Hold quick monthly training sessions using real-life
                    examples.
                  </li>
                  <li>
                    Share cybersecurity tips in local languages for better
                    understanding.
                  </li>
                </ul>
              </li>
              <li class="space-y-3">
                <h3 class="typography-h3 font-semibold text-text-main">
                  Lock Down Data & Devices
                </h3>
                <ul
                  class="list-disc pl-4 space-y-3 typography-body-md text-[var(--form-text-secondary)]"
                >
                  <li>
                    Always back up important files using <span
                      class="font-semibold"
                    >
                      Google Drive, OneDrive,
                    </span>
                    or
                    <span class="font-semibold"> Zoho WorkDrive</span> .
                  </li>
                  <li>Keep devices updated to block security loopholes.</li>
                  <li>
                    Avoid public Wi-Fi—use secure hotspots like <span
                      class="font-semibold">JioFi</span
                    >
                    or <span class="font-semibold">Airtel</span>
                    Hotspot when working remotely.
                  </li>
                </ul>
              </li>
              <li class="space-y-3">
                <h3 class="typography-h3 font-semibold text-text-main">
                  Secure Passwords & Accounts
                </h3>
                <ul
                  class="list-disc pl-4 space-y-3 typography-body-md text-[var(--form-text-secondary)]"
                >
                  <li>
                    Use strong, unique passwords—no birthdays or common words!
                  </li>
                  <li>
                    Store passwords safely with tools like <span
                      class="font-semibold"
                    >
                      Bitwarden</span
                    >
                    or <span class="font-semibold">Zoho Vault </span>.
                  </li>
                  <li>
                    Turn on two-step verification (2FA) with free apps like <span
                      class="font-semibold"
                    >
                      Google Authenticator</span
                    >.
                  </li>
                </ul>
              </li>
              <li class="space-y-3">
                <h3 class="typography-h3 font-semibold text-text-main">
                  Stay Vigilant
                </h3>
                <ul
                  class="list-disc pl-4 space-y-3 typography-body-md text-[var(--form-text-secondary)]"
                >
                  <li>
                    Always verify unexpected financial requests through a phone
                    call.
                  </li>
                  <li>
                    Double-check email addresses before sharing sensitive
                    information.
                  </li>
                  <li>
                    Watch your bank account and software logs for unusual
                    activity.
                  </li>
                </ul>
              </li>
            </ul>
          </div>

          <div class="space-y-4 pt-[4rem] pb-[2rem]">
            <div class="space-y-10 text-center">
              <h2 class="typography-h2 text-text-main">
                💪 Take Action Now 💪
              </h2>

              <div class="space-y-4">
                <p class="typography-body-md text-[var(--form-text-secondary)]">
                  Cybersecurity isn’t a luxury—it’s a necessity. By taking
                  simple proactive measures today, you can protect your business
                  from costly disruptions tomorrow.
                </p>

                <div
                  class="typography-body-sm text-text-main text-start space-y-4"
                >
                  <p>
                    ✅ Best Practices for Digital Nagriks and Enterprises from
                    govt of India <a
                      class="font-semibold"
                      href="https://www.csk.gov.in/documents/CERT-In_Safe_Internet-Best_Practices_Booklet.pdf"
                      ><i class="fa-solid fa-file-arrow-down"></i> download PDF</a
                    >
                  </p>
                  <p>
                    ✅ Mobile Phone Security instruction from govt of India
                    <a
                      class="font-semibold"
                      href="https://www.csk.gov.in/documents/Mobile_phone_Security.pdf"
                      ><i class="fa-solid fa-file-arrow-down"></i> download PDF
                    </a>
                  </p>
                </div>
              </div>

              <div class="pt-[2rem]">
                <p class="typography-body-md text-[var(--form-text-secondary)]">
                  Review your cybersecurity measures and educate your team
                  today. Not sure where to start?
                </p>
                <p class="typography-body-sm text-[var(--form-text-secondary)]">
                  💡 Visit <span class="font-semibold"
                    >Cyber Swachhta Kendra,</span
                  >
                  Government of India’s cybersecurity hub (<span
                    class="underline underline-offset-4"
                  >
                    www.csk.gov.in
                  </span>) for free tools to scan and clean your devices.
                </p>
              </div>
            </div>
          </div>
        </div>
        
      </div>
    </div>
  </NewPageLayout>
</section>
