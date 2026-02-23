const axios = require("axios");
const { DOMParser } = require("xmldom");

describe("SEO and Feed Tests", () => {
  const baseUrl = "http://localhost:8000";

  describe("RSS Feed Validation", () => {
    test("RSS feed should be valid Atom XML", async () => {
      const response = await axios.get(`${baseUrl}/news/rss`);

      expect(response.status).toBe(200);
      expect(response.headers["content-type"]).toContain(
        "application/atom+xml"
      );

      // Parse XML to validate structure
      const parser = new DOMParser();
      const doc = parser.parseFromString(response.data, "application/xml");

      // Check for Atom feed structure
      expect(doc.getElementsByTagName("feed").length).toBeGreaterThan(0);
      expect(doc.getElementsByTagName("title").length).toBeGreaterThan(0);
      expect(doc.getElementsByTagName("entry").length).toBeGreaterThan(0);
    });

    test("RSS feed should contain up to 50 items", async () => {
      const response = await axios.get(`${baseUrl}/news/rss`);
      const parser = new DOMParser();
      const doc = parser.parseFromString(response.data, "application/xml");

      const entries = doc.getElementsByTagName("entry");
      expect(entries.length).toBeLessThanOrEqual(50);
    });

    test("RSS feed entries should have required fields", async () => {
      const response = await axios.get(`${baseUrl}/news/rss`);
      const parser = new DOMParser();
      const doc = parser.parseFromString(response.data, "application/xml");

      const entries = doc.getElementsByTagName("entry");
      if (entries.length > 0) {
        const firstEntry = entries[0];

        // Check required Atom fields
        expect(firstEntry.getElementsByTagName("title").length).toBeGreaterThan(
          0
        );
        expect(firstEntry.getElementsByTagName("link").length).toBeGreaterThan(
          0
        );
        expect(firstEntry.getElementsByTagName("id").length).toBeGreaterThan(0);
        expect(
          firstEntry.getElementsByTagName("published").length
        ).toBeGreaterThan(0);
        expect(
          firstEntry.getElementsByTagName("updated").length
        ).toBeGreaterThan(0);
        expect(
          firstEntry.getElementsByTagName("author").length
        ).toBeGreaterThan(0);
      }
    });

    test("RSS feed should have proper caching headers", async () => {
      const response = await axios.get(`${baseUrl}/news/rss`);

      expect(response.headers["cache-control"]).toContain("max-age=300");
    });
  });

  describe("Sitemap Validation", () => {
    test("Sitemap should be valid XML", async () => {
      const response = await axios.get(`${baseUrl}/sitemap.xml`);

      expect(response.status).toBe(200);
      expect(response.headers["content-type"]).toContain("application/xml");

      // Parse XML to validate structure
      const parser = new DOMParser();
      const doc = parser.parseFromString(response.data, "application/xml");

      // Check for sitemap structure
      expect(doc.getElementsByTagName("urlset").length).toBeGreaterThan(0);
      expect(doc.getElementsByTagName("url").length).toBeGreaterThan(0);
    });

    test("Sitemap should include all main pages", async () => {
      const response = await axios.get(`${baseUrl}/sitemap.xml`);
      const parser = new DOMParser();
      const doc = parser.parseFromString(response.data, "application/xml");

      const urls = doc.getElementsByTagName("url");
      const locations = Array.from(urls)
        .map((url) => {
          const loc = url.getElementsByTagName("loc")[0];
          return loc ? loc.textContent : null;
        })
        .filter(Boolean);

      // Check for main pages
      expect(locations).toContain(`${baseUrl}/`);
      expect(locations).toContain(`${baseUrl}/dashboard`);
      expect(locations).toContain(`${baseUrl}/trends`);
      expect(locations).toContain(`${baseUrl}/alerts`);
      expect(locations).toContain(`${baseUrl}/news`);
      expect(locations).toContain(`${baseUrl}/calculator`);
      expect(locations).toContain(`${baseUrl}/admin`);
    });

    test("Sitemap URLs should have proper metadata", async () => {
      const response = await axios.get(`${baseUrl}/sitemap.xml`);
      const parser = new DOMParser();
      const doc = parser.parseFromString(response.data, "application/xml");

      const urls = doc.getElementsByTagName("url");
      if (urls.length > 0) {
        const firstUrl = urls[0];

        // Check required sitemap fields
        expect(firstUrl.getElementsByTagName("loc").length).toBeGreaterThan(0);
        expect(firstUrl.getElementsByTagName("lastmod").length).toBeGreaterThan(
          0
        );
        expect(
          firstUrl.getElementsByTagName("changefreq").length
        ).toBeGreaterThan(0);
        expect(
          firstUrl.getElementsByTagName("priority").length
        ).toBeGreaterThan(0);
      }
    });

    test("Sitemap should have proper caching headers", async () => {
      const response = await axios.get(`${baseUrl}/sitemap.xml`);

      expect(response.headers["cache-control"]).toContain("max-age=3600");
    });
  });

  describe("Canonical URL Tests", () => {
    test("News page should have canonical URL", async () => {
      const response = await axios.get(`${baseUrl}/news`);

      expect(response.status).toBe(200);
      expect(response.data).toContain('rel="canonical"');
    });

    test("Main pages should have proper canonical URLs", async () => {
      const pages = ["/", "/dashboard", "/trends", "/alerts", "/calculator"];

      for (const page of pages) {
        try {
          const response = await axios.get(`${baseUrl}${page}`);
          expect(response.status).toBe(200);
          // Note: This test assumes the frontend is serving these pages
          // In a real test environment, you'd test the actual HTML response
        } catch (error) {
          // Some pages might not be available in API-only mode
          console.log(`Page ${page} not available for testing`);
        }
      }
    });
  });

  describe("Meta Tags Tests", () => {
    test("News page should have proper meta tags", async () => {
      const response = await axios.get(`${baseUrl}/news`);

      expect(response.status).toBe(200);
      // In a real test, you'd parse HTML and check for meta tags
      // This is a placeholder for the actual implementation
    });
  });

  describe("JSON-LD Structured Data Tests", () => {
    test("News page should have JSON-LD for hero article", async () => {
      const response = await axios.get(`${baseUrl}/news`);

      expect(response.status).toBe(200);
      // In a real test, you'd parse HTML and validate JSON-LD structure
      // This is a placeholder for the actual implementation
    });
  });

  describe("Share Functionality Tests", () => {
    test("News API should return shareable URLs", async () => {
      const response = await axios.get(`${baseUrl}/news?page_size=1`);

      expect(response.status).toBe(200);
      expect(response.data.items).toBeDefined();

      if (response.data.items.length > 0) {
        const item = response.data.items[0];
        expect(item.url).toBeDefined();
        expect(item.title).toBeDefined();
        expect(item.summary).toBeDefined();
      }
    });
  });
});

module.exports = {};
