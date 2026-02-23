import React from "react";

const Disclaimer: React.FC = () => {
  const [expanded, setExpanded] = React.useState(false);

  return (
    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6 rounded-md">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-shrink-0">
          <svg
            className="h-5 w-5 text-yellow-400"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
        </div>
        <div className="ml-3 flex-1">
          <h3 className="text-sm font-medium text-yellow-800">
            Important Disclaimer
          </h3>
          {expanded ? (
            <div className="mt-2 text-sm text-yellow-700">
              <p>
                <strong>
                  This application is for informational purposes only and does
                  not constitute financial advice.
                </strong>
              </p>
              <ul className="mt-2 list-disc list-inside space-y-1">
                <li>
                  Gold price forecasts are based on historical data and
                  mathematical models
                </li>
                <li>Past performance does not guarantee future results</li>
                <li>
                  Data freshness may vary and should be verified independently
                </li>
                <li>
                  Users are responsible for their own investment decisions
                </li>
                <li>
                  Always consult with qualified financial advisors before making
                  investment decisions
                </li>
              </ul>
            </div>
          ) : (
            <p className="mt-2 text-sm text-yellow-700">
              This application is for informational purposes only and does not
              constitute financial advice.
            </p>
          )}
        </div>
        <button
          onClick={() => setExpanded((v) => !v)}
          className="text-xs px-2 py-1 rounded border border-yellow-300 text-yellow-800 hover:bg-yellow-100"
          aria-expanded={expanded}
        >
          {expanded ? "Hide" : "Show"} details
        </button>
      </div>
    </div>
  );
};

export default Disclaimer;
