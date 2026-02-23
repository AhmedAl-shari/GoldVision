import React from "react";

interface AuthShellProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}

const AuthShell: React.FC<AuthShellProps> = ({ title, subtitle, children }) => (
  <div className="min-h-screen bg-gray-100 dark:bg-slate-900 flex items-center justify-center py-10 px-4">
    <div className="max-w-5xl w-full grid grid-cols-1 lg:grid-cols-2 gap-0 rounded-3xl overflow-hidden shadow-2xl bg-white border border-gray-200 dark:border-transparent dark:ring-1 dark:ring-white/10 dark:bg-white/5 dark:backdrop-blur">
      <div className="bg-white lg:border-r lg:border-gray-200 dark:border-transparent dark:bg-slate-900/30 p-8 sm:p-12">
        <div className="max-w-md mx-auto space-y-8">
          <header>
            <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              {title}
            </h1>
            <p className="mt-2 text-slate-600 dark:text-slate-300">{subtitle}</p>
          </header>
          {children}
        </div>
      </div>

      <div className="relative hidden lg:block">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 via-purple-600 to-fuchsia-600" />
        <div className="absolute inset-0 mix-blend-screen opacity-80 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.35),_transparent_55%),radial-gradient(circle_at_bottom,_rgba(255,255,255,0.15),_transparent_55%)]" />
        <div className="relative h-full flex flex-col justify-between p-12 text-white space-y-6">
          <div>
            <p className="inline-flex items-center gap-2 bg-white/20 px-4 py-2 rounded-full text-sm mb-6">
              Trusted gold intelligence platform
            </p>
            <h2 className="text-3xl font-semibold">GoldVision Copilot</h2>
            <p className="mt-4 text-white/80 leading-relaxed">
              Real-time insights, AI forecasts, and alerting—tailored for gold traders
              in Yemen and beyond.
            </p>
          </div>
          <div className="bg-white/10 backdrop-blur rounded-2xl p-6 space-y-4">
            <h3 className="text-lg font-semibold">Why GoldVision?</h3>
            <ul className="space-y-2 text-sm text-white/75">
              <li>✓ 7-day Prophet forecasts with residual CSVs.</li>
              <li>✓ Yemen-specific price breakdowns & alerting.</li>
              <li>✓ Push, Alerts, and calendar exports.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  </div>
);

export default AuthShell;

