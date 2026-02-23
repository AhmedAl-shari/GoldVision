import React, { useState, useEffect } from "react";
import { QrCode, Copy, Check, Wifi } from "lucide-react";
import QRCode from "qrcode";
import { copyToClipboard } from "../lib/clipboard";

interface QRCodeGeneratorProps {
  url: string;
  size?: number;
  className?: string;
}

const QRCodeGenerator: React.FC<QRCodeGeneratorProps> = ({
  url,
  size = 200,
  className = "",
}) => {
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const generateQRCode = async () => {
      try {
        // Generate real QR code using the qrcode library
        const dataUrl = await QRCode.toDataURL(url, {
          width: size,
          margin: 2,
          color: {
            dark: "#000000",
            light: "#FFFFFF",
          },
        });
        setQrCodeDataUrl(dataUrl);
      } catch (error) {
        console.error("Error generating QR code:", error);
        // Fallback to a simple placeholder if QR generation fails
        const svg = `
          <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
            <rect width="${size}" height="${size}" fill="white"/>
            <rect x="10" y="10" width="20" height="20" fill="black"/>
            <rect x="40" y="10" width="20" height="20" fill="black"/>
            <rect x="70" y="10" width="20" height="20" fill="black"/>
            <rect x="10" y="40" width="20" height="20" fill="black"/>
            <rect x="40" y="40" width="20" height="20" fill="black"/>
            <rect x="70" y="40" width="20" height="20" fill="black"/>
            <rect x="10" y="70" width="20" height="20" fill="black"/>
            <rect x="40" y="70" width="20" height="20" fill="black"/>
            <rect x="70" y="70" width="20" height="20" fill="black"/>
            <text x="${size / 2}" y="${
          size - 10
        }" text-anchor="middle" font-family="monospace" font-size="12" fill="black">QR Code Error</text>
          </svg>
        `;
        const dataUrl = `data:image/svg+xml;base64,${btoa(svg)}`;
        setQrCodeDataUrl(dataUrl);
      }
    };

    generateQRCode();
  }, [url, size]);

  const handleCopyUrl = async () => {
    const result = await copyToClipboard(url);
    if (result.success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className={`${className}`}>
      <div className="text-center space-y-6">
        {/* QR Code Display */}
        <div className="flex justify-center">
          {qrCodeDataUrl ? (
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500/20 to-blue-500/20 rounded-2xl blur opacity-75 group-hover:opacity-100 transition duration-300"></div>
              <div className="relative bg-white dark:bg-slate-800 p-4 rounded-xl border-2 border-emerald-200/50 dark:border-emerald-700/50 shadow-lg">
                <img
                  src={qrCodeDataUrl}
                  alt="QR Code for LAN access"
                  className="w-48 h-48 rounded-lg"
                />
              </div>
            </div>
          ) : (
            <div className="w-48 h-48 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-800 rounded-xl flex items-center justify-center border-2 border-dashed border-slate-300 dark:border-slate-600">
              <QrCode className="w-16 h-16 text-slate-400 animate-pulse" />
            </div>
          )}
        </div>

        {/* Instructions */}
        <div className="space-y-3">
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Scan with your phone to access GoldVision
          </p>

          {/* URL Display with Copy */}
          <div className="flex items-center justify-center gap-2 bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3 border border-slate-200/60 dark:border-slate-700/60">
            <code className="text-xs font-mono text-slate-700 dark:text-slate-300 flex-1 text-center break-all">
              {url}
            </code>
            <button
              onClick={handleCopyUrl}
              className={`flex-shrink-0 p-2 rounded-lg transition-all ${
                copied
                  ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400"
                  : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600"
              }`}
              title="Copy URL"
            >
              {copied ? (
                <Check className="w-4 h-4" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        {/* Tips */}
        <div className="bg-emerald-50/50 dark:bg-emerald-900/10 rounded-xl p-4 border border-emerald-200/50 dark:border-emerald-800/50">
          <div className="space-y-2 text-left">
            <div className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-400">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 flex-shrink-0"></div>
              <span>Make sure your phone is on the same WiFi network</span>
            </div>
            <div className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-400">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 flex-shrink-0"></div>
              <span>QR code updates automatically with current IP address</span>
            </div>
            <div className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-400">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 flex-shrink-0"></div>
              <span>If scanning fails, manually enter the URL above</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QRCodeGenerator;
