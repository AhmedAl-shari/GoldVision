import { Link } from "react-router-dom";
import { Check, TrendingUp, Bell, Zap, Star, ArrowRight } from "lucide-react";
import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import StripeCheckout from "../components/StripeCheckout";

function Home() {
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<{ 
    name: string; 
    price: number;
    isEnterprise?: boolean;
  } | null>(null);
  // Handle hash scrolling on mount and hash change
  useEffect(() => {
    const handleHashScroll = () => {
      const hash = window.location.hash.slice(1);
      if (hash) {
        const element = document.getElementById(hash);
        if (element) {
          setTimeout(() => {
            element.scrollIntoView({ behavior: "smooth", block: "start" });
          }, 100);
        }
      }
    };

    // Handle initial hash
    handleHashScroll();

    // Handle hash changes
    window.addEventListener("hashchange", handleHashScroll);
    return () => window.removeEventListener("hashchange", handleHashScroll);
  }, []);

  // Lightweight CTA tracking
  const track = (event: string, props?: Record<string, unknown>) => {
    try {
      // gtag or GTM if present
      // @ts-expect-error gtag may exist on window from Google Analytics
      if (window.gtag) window.gtag("event", event, props || {});
      // @ts-expect-error dataLayer may exist on window from GTM
      else if (window.dataLayer) window.dataLayer.push({ event, ...props });
    } catch { /* ignore */ }
  };

  return (
    <>
      <Helmet>
        <title>GoldVision — Real-time Gold Price Alerts & AI Forecasts</title>
        <meta
          name="description"
          content="Set AI-powered alerts, track gold prices in real time (USD/YER), and get instant email notifications. Built for traders in fast-moving markets."
        />
        <meta
          property="og:title"
          content="GoldVision — Gold Price Alerts & AI Forecasts"
        />
        <meta
          property="og:description"
          content="Real-time tracking, AI alerts, and market insights. Start free."
        />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://goldvision.app/" />
        <meta
          property="og:image"
          content="https://goldvision.app/og-card.png"
        />
        <meta name="twitter:card" content="summary_large_image" />
        <meta
          name="twitter:title"
          content="GoldVision — Gold Price Alerts & AI Forecasts"
        />
        <meta
          name="twitter:description"
          content="Real-time tracking, AI alerts, market insights. Start free."
        />
        <meta
          name="twitter:image"
          content="https://goldvision.app/og-card.png"
        />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            name: "GoldVision",
            applicationCategory: "FinanceApplication",
            operatingSystem: "Web",
            offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
          })}
        </script>
      </Helmet>
      <div className="min-h-screen bg-white dark:bg-gray-900">
        {/* Skip to content link for accessibility */}
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 bg-blue-600 text-white px-3 py-2 rounded z-50"
        >
          Skip to content
        </a>
        {/* Header */}
        <header className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <div className="mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-12 xl:px-16">
            <div
              className="flex items-center justify-between"
              style={{
                height: "5rem",
                minHeight: "5rem",
              }}
            >
              {/* Logo */}
              <Link to="/" className="flex items-center gap-2">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                  <span className="text-white font-bold text-lg">GV</span>
                </div>
                <span className="text-xl font-bold text-gray-900 dark:text-white">
                  GoldVision
                </span>
              </Link>

              {/* Navigation */}
              <nav
                aria-label="Primary navigation"
                className="hidden md:flex items-center gap-6"
              >
                <a
                  href="#features"
                  onClick={(e) => {
                    e.preventDefault();
                    document
                      .getElementById("features")
                      ?.scrollIntoView({ behavior: "smooth" });
                  }}
                  className="text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition"
                >
                  Features
                </a>
                <a
                  href="#pricing"
                  onClick={(e) => {
                    e.preventDefault();
                    document
                      .getElementById("pricing")
                      ?.scrollIntoView({ behavior: "smooth" });
                  }}
                  className="text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition"
                >
                  Pricing
                </a>
                <a
                  href="#about"
                  onClick={(e) => {
                    e.preventDefault();
                    document
                      .getElementById("about")
                      ?.scrollIntoView({ behavior: "smooth" });
                  }}
                  className="text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition"
                >
                  About
                </a>
              </nav>

              {/* Action Buttons */}
              <div className="flex items-center gap-3">
                <Link
                  to="/login"
                  className="text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition"
                >
                  Sign in
                </Link>
                <Link
                  to="/signup"
                  aria-label="Sign up and get started"
                  className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition shadow-sm hover:shadow"
                >
                  Get Started
                </Link>
              </div>
            </div>
          </div>
        </header>

        {/* Hero Section */}
        <section id="main" className="py-20 lg:py-32">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <h1 className="text-5xl lg:text-6xl font-extrabold tracking-tight text-gray-900 dark:text-white">
                <span className="text-gray-900 dark:text-white">
                  Track Intelligent
                </span>{" "}
                <span className="text-blue-600">Gold Prices</span>{" "}
                <span className="text-gray-900 dark:text-white">with AI</span>
              </h1>
              <p className="mt-6 text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
                Transform your gold trading into powerful automation with
                real-time price monitoring. Our platform understands market
                dynamics and delivers instant alerts to your inbox.
              </p>

              {/* Live Example Box */}
              <div className="mt-12 max-w-4xl mx-auto bg-gray-50 dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Live Example
                  </span>
                </div>
                <div className="text-left space-y-4">
                  <div>
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      User Request:
                    </p>
                    <div className="bg-white dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                      <p className="text-gray-900 dark:text-white">
                        "Alert me when gold price goes above $4100 or below
                        $3800"
                      </p>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      AI Generated Alert:
                    </p>
                    <div className="bg-white dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                          <Bell className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div className="flex items-center justify-center w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-lg">
                          <TrendingUp className="w-6 h-6 text-green-600 dark:text-green-400" />
                        </div>
                        <div className="flex items-center justify-center w-12 h-12 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                          <Check className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
                        </div>
                        <ArrowRight className="w-5 h-5 text-gray-400" />
                        <div className="px-4 py-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
                          <span className="text-sm font-medium text-green-700 dark:text-green-300">
                            Email Sent ✓
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Trust Logos Section */}
              <div className="mt-12">
                <p className="text-sm uppercase tracking-wider text-gray-500 dark:text-gray-400 text-center">
                  Trusted by traders and analysts worldwide
                </p>
                <div className="mt-6 flex flex-wrap items-center justify-center gap-8 opacity-60">
                  <div className="px-6 py-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
                    <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">
                      Gold Traders Network
                    </span>
                  </div>
                  <div className="px-6 py-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
                    <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">
                      Market Insights Pro
                    </span>
                  </div>
                  <div className="px-6 py-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
                    <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">
                      Trading Analytics
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Why Choose Section */}
        <section id="features" className="py-20 bg-gray-50 dark:bg-gray-800">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white">
                Why Choose GoldVision?
              </h2>
              <p className="mt-4 text-lg text-gray-600 dark:text-gray-300">
                Powerful features designed to make gold price monitoring
                effortless and intelligent.
              </p>
            </div>
            <div className="mt-16 grid md:grid-cols-3 gap-8">
              {[
                {
                  title: "AI-Powered Alerts",
                  desc: "Describe your price thresholds in plain English and get instant email notifications when conditions are met.",
                  icon: (
                    <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                      <Bell className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                    </div>
                  ),
                },
                {
                  title: "Yemen Gold Prices",
                  desc: "Trained on real-world gold prices covering local units (ounce, gram, kilogram, tola) with USD/YER conversion.",
                  icon: (
                    <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                      <TrendingUp className="w-6 h-6 text-green-600 dark:text-green-400" />
                    </div>
                  ),
                },
                {
                  title: "Instant Notifications",
                  desc: "Generated alerts are ready to deliver directly to your inbox with zero configuration needed.",
                  icon: (
                    <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg flex items-center justify-center">
                      <Zap className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
                    </div>
                  ),
                },
              ].map((feature) => (
                <div
                  key={feature.title}
                  className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-sm hover:shadow-md transition border border-gray-200 dark:border-gray-700"
                >
                  {feature.icon}
                  <h3 className="mt-4 text-xl font-semibold text-gray-900 dark:text-white">
                    {feature.title}
                  </h3>
                  <p className="mt-3 text-gray-600 dark:text-gray-300">
                    {feature.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Testimonials Section */}
        <section id="about" className="py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white">
                Loved by Gold Traders
              </h2>
              <p className="mt-4 text-lg text-gray-600 dark:text-gray-300">
                See what our users say about transforming their gold price
                tracking process
              </p>
            </div>
            <div className="mt-16 grid md:grid-cols-3 gap-8">
              {[
                {
                  quote:
                    "GoldVision has completely transformed how I monitor gold prices. What used to take hours of manual checking now takes minutes with automated alerts.",
                  author: "Ahmed Al-Shari",
                  role: "Gold Trader",
                  company: "Yemen Market",
                  avatar: "AS",
                  color: "blue",
                },
                {
                  quote:
                    "The AI understands market dynamics and creates alerts that actually work. It's like having an expert gold analyst on my team 24/7.",
                  author: "Sarah Martinez",
                  role: "Investment Advisor",
                  company: "Wealth Management",
                  avatar: "SM",
                  color: "green",
                },
                {
                  quote:
                    "We've reduced our price monitoring time by 80%. The quality and accuracy of alerts is consistently impressive.",
                  author: "Mohammed Hassan",
                  role: "Portfolio Manager",
                  company: "Finance Corp",
                  avatar: "MH",
                  color: "purple",
                },
              ].map((testimonial, idx) => (
                <div
                  key={idx}
                  className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700"
                >
                  <div className="flex items-center gap-1 mb-4">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className="w-5 h-5 fill-yellow-400 text-yellow-400"
                      />
                    ))}
                  </div>
                  <p className="text-gray-700 dark:text-gray-300 italic mb-4">
                    "{testimonial.quote}"
                  </p>
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold ${
                        testimonial.color === "blue"
                          ? "bg-blue-500"
                          : testimonial.color === "green"
                          ? "bg-green-500"
                          : "bg-purple-500"
                      }`}
                    >
                      {testimonial.avatar}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {testimonial.author}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {testimonial.role}, {testimonial.company}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Statistics */}
            <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-8">
              {[
                { number: "10,000+", label: "Alerts Created" },
                { number: "500+", label: "Active Users" },
                { number: "80%", label: "Time Saved" },
                { number: "99.9%", label: "Uptime" },
              ].map((stat, idx) => (
                <div key={idx} className="text-center">
                  <div className="text-3xl lg:text-4xl font-bold text-blue-600 dark:text-blue-400">
                    {stat.number}
                  </div>
                  <div className="mt-2 text-sm font-medium text-gray-600 dark:text-gray-400">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section id="pricing" className="py-20 bg-gray-50 dark:bg-gray-800">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white">
                Simple, Transparent Pricing
              </h2>
              <p className="mt-4 text-lg text-gray-600 dark:text-gray-300">
                Choose the plan that fits your gold tracking needs
              </p>
            </div>
            <div className="mt-16 grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              {[
                {
                  name: "Starter",
                  price: "$0",
                  period: "month",
                  desc: "Perfect for trying out the platform",
                  features: [
                    "10 alerts/month",
                    "Basic notifications",
                    "Community support",
                  ],
                  button: "Get Started Free",
                  buttonStyle:
                    "bg-white border-2 border-blue-600 text-blue-600 hover:bg-blue-50",
                  highlighted: false,
                  onClick: () => {
                    window.location.href = "/signup";
                  },
                },
                {
                  name: "Professional",
                  price: "$9",
                  period: "month",
                  desc: "For serious gold traders",
                  features: [
                    "Unlimited alerts",
                    "Email notifications",
                    "Priority support",
                    "Advanced analytics",
                  ],
                  button: "Start Free Trial",
                  buttonStyle: "bg-white text-blue-600 hover:bg-gray-50",
                  highlighted: true,
                  onClick: () => {
                    setSelectedPlan({ name: "Professional", price: 9 });
                    setCheckoutOpen(true);
                  },
                },
                {
                  name: "Enterprise",
                  price: "$29",
                  period: "month",
                  desc: "For teams and organizations",
                  features: [
                    "Unlimited everything",
                    "Custom integrations",
                    "24/7 dedicated support",
                    "Team collaboration",
                  ],
                  button: "Contact Sales",
                  buttonStyle:
                    "bg-white border-2 border-blue-600 text-blue-600 hover:bg-blue-50",
                  highlighted: false,
                  onClick: () => {
                    setSelectedPlan({ name: "Enterprise", price: 29, isEnterprise: true });
                    setCheckoutOpen(true);
                  },
                },
              ].map((plan) => (
                <div
                  key={plan.name}
                  className={`rounded-xl p-8 shadow-sm border-2 transition ${
                    plan.highlighted
                      ? "bg-blue-600 border-blue-600"
                      : "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700"
                  }`}
                >
                  {plan.highlighted && (
                    <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold text-white bg-orange-500 mb-4">
                      Most Popular
                    </div>
                  )}
                  <h3
                    className={`text-xl font-bold ${
                      plan.highlighted
                        ? "text-white"
                        : "text-gray-900 dark:text-white"
                    }`}
                  >
                    {plan.name}
                  </h3>
                  <div className="mt-4">
                    <span
                      className={`text-4xl font-bold ${
                        plan.highlighted
                          ? "text-white"
                          : "text-gray-900 dark:text-white"
                      }`}
                    >
                      {plan.price}
                    </span>
                    <span
                      className={`text-gray-600 ml-2 ${
                        plan.highlighted
                          ? "text-blue-100"
                          : "dark:text-gray-400"
                      }`}
                    >
                      /{plan.period}
                    </span>
                  </div>
                  <p
                    className={`mt-2 text-sm ${
                      plan.highlighted
                        ? "text-blue-100"
                        : "text-gray-600 dark:text-gray-400"
                    }`}
                  >
                    {plan.desc}
                  </p>
                  <ul className="mt-6 space-y-3">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-3">
                        <Check
                          className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                            plan.highlighted ? "text-white" : "text-green-500"
                          }`}
                        />
                        <span
                          className={`text-sm ${
                            plan.highlighted
                              ? "text-white"
                              : "text-gray-700 dark:text-gray-300"
                          }`}
                        >
                          {feature}
                        </span>
                      </li>
                    ))}
                  </ul>
                  {plan.name === "Starter" ? (
                    <Link
                      to="/signup"
                      className={`mt-8 block w-full py-3 px-4 text-center font-semibold rounded-lg transition ${plan.buttonStyle}`}
                    >
                      {plan.button}
                    </Link>
                  ) : (
                    <button
                      onClick={plan.onClick}
                      className={`mt-8 block w-full py-3 px-4 text-center font-semibold rounded-lg transition ${plan.buttonStyle}`}
                    >
                      {plan.button}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section aria-labelledby="faq-heading" className="py-16">
          <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
            <h2
              id="faq-heading"
              className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white text-center"
            >
              Frequently Asked Questions
            </h2>
            <div className="mt-8 space-y-4">
              {[
                {
                  q: "Is there a free plan?",
                  a: "Yes, the Starter plan is free with 10 alerts/month and perfect for trying out the platform.",
                },
                {
                  q: "Do alerts work for YER and USD?",
                  a: "Absolutely! We support USD/YER conversions and local units (ounce, gram, kilogram, tola) for Yemen gold prices.",
                },
                {
                  q: "Can I cancel anytime?",
                  a: "Yes, you can cancel or change plans at any time with no long-term commitments.",
                },
                {
                  q: "How fast are the alerts?",
                  a: "Alerts are sent instantly when price conditions are met, typically within seconds of the market change.",
                },
              ].map((item, idx) => (
                <details
                  key={idx}
                  className="group bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-sm transition"
                >
                  <summary className="cursor-pointer font-semibold text-gray-900 dark:text-white list-none flex items-center justify-between">
                    <span>{item.q}</span>
                    <span className="text-blue-600 dark:text-blue-400 group-open:rotate-180 transition-transform">
                      ▼
                    </span>
                  </summary>
                  <p className="mt-2 text-gray-600 dark:text-gray-300">
                    {item.a}
                  </p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* Footer CTA */}
        <section className="py-20 bg-blue-600">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl lg:text-4xl font-bold text-white">
              Ready to Transform Your Gold Tracking?
            </h2>
            <p className="mt-4 text-xl text-blue-100">
              Join thousands of traders who are already monitoring gold prices
              with intelligent alerts
            </p>
            <div className="mt-10 flex items-center justify-center gap-4 flex-wrap">
              <Link
                to="/signup"
                onClick={() =>
                  track("cta_click", { location: "footer_cta_signup" })
                }
                className="inline-flex items-center px-6 py-3 text-base font-semibold text-blue-600 bg-white hover:bg-gray-50 rounded-lg transition shadow-md hover:shadow-lg"
              >
                Start Free Today
              </Link>
              <Link
                to="/login"
                onClick={() =>
                  track("cta_click", { location: "footer_cta_demo" })
                }
                className="inline-flex items-center px-6 py-3 text-base font-semibold text-white border-2 border-white hover:bg-blue-700 rounded-lg transition"
              >
                Book a Demo
              </Link>
            </div>
          </div>
        </section>

        {/* Simple Footer */}
        <footer className="border-t border-gray-200 dark:border-gray-800 py-8">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center text-sm text-gray-600 dark:text-gray-400">
              © 2026 GoldVision. All rights reserved.
            </div>
          </div>
        </footer>
      </div>

      {/* Stripe Checkout Modal */}
      {checkoutOpen && selectedPlan && (
        <StripeCheckout
          planName={selectedPlan.name}
          price={selectedPlan.price}
          isEnterprise={selectedPlan.isEnterprise}
          onClose={() => {
            setCheckoutOpen(false);
            setSelectedPlan(null);
          }}
        />
      )}
    </>
  );
}

export default Home;
