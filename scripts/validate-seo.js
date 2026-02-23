#!/usr/bin/env node

const axios = require("axios");
const { DOMParser } = require("xmldom");

async function validateRSS() {
  try {
    console.log("🔍 Validating RSS feed...");
    const response = await axios.get("http://localhost:8000/news/rss");

    console.log("✅ RSS feed accessible");
    console.log(`📊 Status: ${response.status}`);
    console.log(`📋 Content-Type: ${response.headers["content-type"]}`);
    console.log(`⏰ Cache-Control: ${response.headers["cache-control"]}`);

    // Parse XML
    const parser = new DOMParser();
    const doc = parser.parseFromString(response.data, "application/xml");

    // Validate structure
    const feed = doc.getElementsByTagName("feed")[0];
    const entries = doc.getElementsByTagName("entry");

    console.log(
      `📰 Feed title: ${feed.getElementsByTagName("title")[0]?.textContent}`
    );
    console.log(`📄 Number of entries: ${entries.length}`);

    if (entries.length > 0) {
      const firstEntry = entries[0];
      console.log(
        `📝 First entry title: ${
          firstEntry.getElementsByTagName("title")[0]?.textContent
        }`
      );
    }

    console.log("✅ RSS feed validation passed!");
  } catch (error) {
    console.error("❌ RSS validation failed:", error.message);
    process.exit(1);
  }
}

async function validateSitemap() {
  try {
    console.log("\n🔍 Validating sitemap...");
    const response = await axios.get("http://localhost:8000/sitemap.xml");

    console.log("✅ Sitemap accessible");
    console.log(`📊 Status: ${response.status}`);
    console.log(`📋 Content-Type: ${response.headers["content-type"]}`);
    console.log(`⏰ Cache-Control: ${response.headers["cache-control"]}`);

    // Parse XML
    const parser = new DOMParser();
    const doc = parser.parseFromString(response.data, "application/xml");

    // Validate structure
    const urls = doc.getElementsByTagName("url");
    console.log(`🔗 Number of URLs: ${urls.length}`);

    // Check for main pages
    const locations = Array.from(urls)
      .map((url) => {
        const loc = url.getElementsByTagName("loc")[0];
        return loc ? loc.textContent : null;
      })
      .filter(Boolean);

    const requiredPages = ["/", "/dashboard", "/trends", "/alerts", "/news"];
    const foundPages = requiredPages.filter((page) =>
      locations.some((loc) => loc.includes(page))
    );

    console.log(`📄 Found main pages: ${foundPages.join(", ")}`);
    console.log("✅ Sitemap validation passed!");
  } catch (error) {
    console.error("❌ Sitemap validation failed:", error.message);
    process.exit(1);
  }
}

async function main() {
  console.log("🚀 Starting SEO validation...\n");

  await validateRSS();
  await validateSitemap();

  console.log("\n🎉 All validations passed!");
}

main().catch(console.error);
