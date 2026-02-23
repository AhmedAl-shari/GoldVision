import React, { useEffect } from "react";
import { Helmet } from "react-helmet-async";

export interface SEOProps {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  type?: "website" | "article";
  publishedTime?: string;
  modifiedTime?: string;
  author?: string;
  section?: string;
  tags?: string[];
  canonical?: string;
  jsonLd?: object;
}

const SEO: React.FC<SEOProps> = ({
  title = "GoldVision - Gold Price Forecasting & Market Analysis",
  description = "Real-time gold price tracking, AI-powered forecasting, and comprehensive market analysis. Stay ahead with accurate predictions and live market data.",
  image = "/og-image.jpg",
  url,
  type = "website",
  publishedTime,
  modifiedTime,
  author,
  section,
  tags = [],
  canonical,
  jsonLd,
}) => {
  const siteUrl =
    typeof window !== "undefined"
      ? window.location.origin
      : "https://goldvision.app";
  const fullUrl = url ? `${siteUrl}${url}` : siteUrl;
  const fullImage = image.startsWith("http") ? image : `${siteUrl}${image}`;
  const canonicalUrl = canonical ? `${siteUrl}${canonical}` : fullUrl;

  useEffect(() => {
    // Update document title for accessibility
    document.title = title;
  }, [title]);

  return (
    <Helmet>
      {/* Basic Meta Tags */}
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={canonicalUrl} />

      {/* Open Graph Tags */}
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={fullImage} />
      <meta property="og:url" content={fullUrl} />
      <meta property="og:type" content={type} />
      <meta property="og:site_name" content="GoldVision" />
      <meta property="og:locale" content="en_US" />

      {/* Twitter Card Tags */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={fullImage} />
      <meta name="twitter:site" content="@goldvision" />
      <meta name="twitter:creator" content="@goldvision" />

      {/* Article-specific tags */}
      {type === "article" && (
        <>
          {publishedTime && (
            <meta property="article:published_time" content={publishedTime} />
          )}
          {modifiedTime && (
            <meta property="article:modified_time" content={modifiedTime} />
          )}
          {author && <meta property="article:author" content={author} />}
          {section && <meta property="article:section" content={section} />}
          {tags.map((tag, index) => (
            <meta key={index} property="article:tag" content={tag} />
          ))}
        </>
      )}

      {/* Additional SEO Tags */}
      <meta name="robots" content="index, follow" />
      <meta name="googlebot" content="index, follow" />
      <meta name="theme-color" content="#1e40af" />
      <meta name="msapplication-TileColor" content="#1e40af" />
      <meta
        name="keywords"
        content="gold price, gold forecast, market analysis, precious metals, investment, trading, Yemen gold, Aden gold, Sanaa gold"
      />
      <meta name="author" content="GoldVision" />
      <meta
        name="viewport"
        content="width=device-width, initial-scale=1.0, maximum-scale=5.0"
      />

      {/* PWA Meta Tags */}
      <meta name="apple-mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      <meta name="apple-mobile-web-app-title" content="GoldVision" />
      <meta name="mobile-web-app-capable" content="yes" />
      <meta name="application-name" content="GoldVision" />

      {/* JSON-LD Structured Data */}
      {jsonLd && (
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      )}
    </Helmet>
  );
};

export default SEO;
