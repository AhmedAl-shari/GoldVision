import { Shield, AlertTriangle, Info, Clock } from "lucide-react";

const ProFooter = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="w-full bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950 border-t border-gray-200 dark:border-gray-800 mt-auto">
      {/* Risk Disclaimer Banner */}
      <div className="bg-amber-50 dark:bg-amber-900/20 border-y border-amber-200 dark:border-amber-800 py-3 px-4">
        <div className="max-w-7xl mx-auto flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-semibold text-amber-900 dark:text-amber-100 text-sm mb-1">
              Risk Disclosure
            </h3>
            <p className="text-xs text-amber-800 dark:text-amber-200 leading-relaxed">
              <strong>
                Trading and investing in commodities, currencies, and
                derivatives carries a high level of risk and may not be suitable
                for all investors.
              </strong>{" "}
              The high degree of leverage can work against you as well as for
              you. Before deciding to trade, you should carefully consider your
              investment objectives, level of experience, and risk appetite.
              There is a possibility that you may sustain a loss of some or all
              of your initial investment. You should not invest money that you
              cannot afford to lose. You should be aware of all the risks
              associated with trading and investing and seek advice from an
              independent financial advisor if you have any doubts.
            </p>
          </div>
        </div>
      </div>

      {/* Main Footer Content */}
      <div className="max-w-7xl mx-auto py-8 px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* About Section */}
          <div>
            <h4 className="font-bold text-gray-900 dark:text-gray-100 mb-3 text-sm">
              About GoldVision
            </h4>
            <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed mb-3">
              Professional gold market analysis platform powered by advanced AI
              and machine learning technologies.
            </p>
            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-500">
              <Shield className="w-3 h-3" />
              <span>Regulated Financial Data Provider</span>
            </div>
          </div>

          {/* Data & Compliance */}
          <div>
            <h4 className="font-bold text-gray-900 dark:text-gray-100 mb-3 text-sm">
              Data & Compliance
            </h4>
            <ul className="space-y-2 text-xs text-gray-600 dark:text-gray-400">
              <li className="flex items-start gap-2">
                <Clock className="w-3 h-3 mt-0.5 flex-shrink-0" />
                <span>Market data delayed by 15 minutes</span>
              </li>
              <li className="flex items-start gap-2">
                <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
                <span>Data sourced from licensed providers</span>
              </li>
              <li className="flex items-start gap-2">
                <Shield className="w-3 h-3 mt-0.5 flex-shrink-0" />
                <span>GDPR & SOC 2 Type II Compliant</span>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="font-bold text-gray-900 dark:text-gray-100 mb-3 text-sm">
              Legal Information
            </h4>
            <ul className="space-y-2 text-xs text-gray-600 dark:text-gray-400">
              <li>
                <a 
                  href="/docs/data_sources.md" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                >
                  Data Sources & Providers
                </a>
              </li>
              <li>
                <a 
                  href="/docs/ethics.md" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                >
                  Ethics & Responsible Use
                </a>
              </li>
              <li>
                <button className="hover:text-primary-600 dark:hover:text-primary-400 transition-colors">
                  Terms of Service
                </button>
              </li>
              <li>
                <button className="hover:text-primary-600 dark:hover:text-primary-400 transition-colors">
                  Privacy Policy
                </button>
              </li>
              <li>
                <button className="hover:text-primary-600 dark:hover:text-primary-400 transition-colors">
                  Risk Disclosure Statement
                </button>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="font-bold text-gray-900 dark:text-gray-100 mb-3 text-sm">
              Support & Resources
            </h4>
            <ul className="space-y-2 text-xs text-gray-600 dark:text-gray-400">
              <li>
                <button className="hover:text-primary-600 dark:hover:text-primary-400 transition-colors">
                  Help Center
                </button>
              </li>
              <li>
                <button className="hover:text-primary-600 dark:hover:text-primary-400 transition-colors">
                  API Documentation
                </button>
              </li>
              <li>
                <button className="hover:text-primary-600 dark:hover:text-primary-400 transition-colors">
                  System Status
                </button>
              </li>
              <li>
                <button className="hover:text-primary-600 dark:hover:text-primary-400 transition-colors">
                  Contact Support
                </button>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-gray-200 dark:border-gray-800 pt-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-gray-500 dark:text-gray-500">
            <div className="flex flex-col items-center md:items-start gap-1">
              <p>© {currentYear} GoldVision Markets. All rights reserved.</p>
              <p className="text-[10px]">
                GoldVision™ is a registered trademark. Patent Pending.
              </p>
            </div>
            <div className="flex flex-col items-center md:items-end gap-1">
              <p className="text-[10px]">
                Powered by Prophet AI, Facebook Research & Advanced Machine
                Learning
              </p>
              <p className="text-[10px] text-gray-400 dark:text-gray-600">
                Version 2.5.1 • Build 20251003.1 • Node v20.11.0
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Regulatory Notices */}
      <div className="bg-gray-100 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 py-4 px-4">
        <div className="max-w-7xl mx-auto">
          <p className="text-[9px] text-gray-500 dark:text-gray-600 leading-relaxed text-center">
            <strong>IMPORTANT NOTICE:</strong> This website is operated by
            GoldVision Markets LLC, a registered financial data provider. The
            information provided on this website is for informational and
            educational purposes only and should not be construed as investment
            advice, financial advice, trading advice, or any other type of
            advice. Any statements about profits or income, expressed or
            implied, do not represent a guarantee. Your actual trading may
            result in losses as no trading system is guaranteed. You accept full
            responsibilities for your actions, trades, profit or loss, and agree
            to hold GoldVision Markets and any authorized distributors of this
            information harmless in any and all ways. The use of this website
            and its content, including all information, data, tools, and
            services, does not constitute the provision of investment or
            financial advice of any kind. We do not provide personalized
            recommendations or views as to whether a stock or investment
            approach is suited to the financial needs of a specific individual.
            All investments involve risk, and the past performance of a
            security, industry, sector, market, financial product, trading
            strategy, or individual's trading does not guarantee future results
            or returns. Investors are fully responsible for any investment
            decisions they make. Such decisions should be based solely on an
            evaluation of their financial circumstances, investment objectives,
            risk tolerance, and liquidity needs.
            <br />
            <br />
            <strong>REGULATORY DISCLAIMER:</strong> GoldVision Markets is not a
            registered investment advisor, broker-dealer, or exchange. We do not
            provide investment advice, execute trades, or hold customer funds.
            Market data may be delayed and should not be relied upon for
            time-sensitive trading decisions. All content on this site is
            protected by copyright and intellectual property laws. Unauthorized
            reproduction or distribution is strictly prohibited. By using this
            site, you agree to our Terms of Service and Privacy Policy.
            California residents: See our California Privacy Notice. EU
            residents: GDPR rights apply.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default ProFooter;
