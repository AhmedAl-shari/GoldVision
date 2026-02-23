import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import axios from "axios";
import { PrismaClient } from "@prisma/client";

// Mock axios
vi.mock("axios");
const mockedAxios = vi.mocked(axios);

// Mock Prisma
const mockPrisma = {
  news: {
    findUnique: vi.fn(),
    create: vi.fn(),
    findMany: vi.fn(),
  },
};

vi.mock("@prisma/client", () => ({
  PrismaClient: vi.fn(() => mockPrisma),
}));

describe("News API Endpoints", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("GET /news", () => {
    it("should return news items with pagination", async () => {
      const mockNewsItems = [
        {
          id: 1,
          title: "Gold prices surge amid market volatility",
          summary: "Gold prices reached new highs today...",
          url: "https://example.com/news/1",
          source: "Financial Times",
          publishedAt: new Date("2025-01-01T10:00:00Z"),
          tickers: '["XAU"]',
          tags: '["gold", "market"]',
          image: "https://example.com/image1.jpg",
          sentiment: "positive",
          createdAt: new Date("2025-01-01T10:00:00Z"),
        },
      ];

      mockPrisma.news.findMany.mockResolvedValue(mockNewsItems);

      const response = await fetch("http://127.0.0.1:8000/news?limit=10");
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.items).toHaveLength(1);
      expect(data.items[0].title).toBe(
        "Gold prices surge amid market volatility"
      );
      expect(data.items[0].tickers).toEqual(["XAU"]);
      expect(data.items[0].tags).toEqual(["gold", "market"]);
    });

    it("should filter news by query parameter", async () => {
      const mockNewsItems = [
        {
          id: 1,
          title: "Gold prices surge amid market volatility",
          summary: "Gold prices reached new highs today...",
          url: "https://example.com/news/1",
          source: "Financial Times",
          publishedAt: new Date("2025-01-01T10:00:00Z"),
          tickers: '["XAU"]',
          tags: '["gold", "market"]',
          image: "https://example.com/image1.jpg",
          sentiment: "positive",
          createdAt: new Date("2025-01-01T10:00:00Z"),
        },
      ];

      mockPrisma.news.findMany.mockResolvedValue(mockNewsItems);

      const response = await fetch("http://127.0.0.1:8000/news?query=gold");
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(mockPrisma.news.findMany).toHaveBeenCalledWith({
        where: {
          OR: [
            { title: { contains: "gold" } },
            { summary: { contains: "gold" } },
            { source: { contains: "gold" } },
          ],
        },
        orderBy: { publishedAt: "desc" },
        take: 50,
      });
    });

    it("should filter news by sentiment", async () => {
      const mockNewsItems = [
        {
          id: 1,
          title: "Gold prices surge amid market volatility",
          summary: "Gold prices reached new highs today...",
          url: "https://example.com/news/1",
          source: "Financial Times",
          publishedAt: new Date("2025-01-01T10:00:00Z"),
          tickers: '["XAU"]',
          tags: '["gold", "market"]',
          image: "https://example.com/image1.jpg",
          sentiment: "positive",
          createdAt: new Date("2025-01-01T10:00:00Z"),
        },
      ];

      mockPrisma.news.findMany.mockResolvedValue(mockNewsItems);

      const response = await fetch(
        "http://127.0.0.1:8000/news?sentiment=positive"
      );
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(mockPrisma.news.findMany).toHaveBeenCalledWith({
        where: {
          sentiment: "positive",
        },
        orderBy: { publishedAt: "desc" },
        take: 50,
      });
    });

    it("should limit results to maximum 100 items", async () => {
      const response = await fetch("http://127.0.0.1:8000/news?limit=150");
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(mockPrisma.news.findMany).toHaveBeenCalledWith({
        where: {},
        orderBy: { publishedAt: "desc" },
        take: 100, // Should be clamped to 100
      });
    });
  });

  describe("POST /news/fetcher", () => {
    it("should fetch news from provider and insert new items", async () => {
      const mockProviderResponse = {
        data: {
          data: [
            {
              title: "Gold prices surge amid market volatility",
              description: "Gold prices reached new highs today...",
              url: "https://example.com/news/1",
              source: "Financial Times",
              published_at: "2025-01-01T10:00:00Z",
              symbols: ["XAU"],
              tags: ["gold", "market"],
              image_url: "https://example.com/image1.jpg",
              sentiment: "positive",
            },
          ],
        },
      };

      mockedAxios.get.mockResolvedValue(mockProviderResponse);
      mockPrisma.news.findUnique.mockResolvedValue(null); // No existing item
      mockPrisma.news.create.mockResolvedValue({
        id: 1,
        title: "Gold prices surge amid market volatility",
        summary: "Gold prices reached new highs today...",
        url: "https://example.com/news/1",
        source: "Financial Times",
        publishedAt: new Date("2025-01-01T10:00:00Z"),
        tickers: '["XAU"]',
        tags: '["gold", "market"]',
        image: "https://example.com/image1.jpg",
        sentiment: "positive",
        createdAt: new Date("2025-01-01T10:00:00Z"),
      });

      const response = await fetch("http://127.0.0.1:8000/news/fetcher", {
        method: "POST",
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe("News fetch completed");
    });

    it("should skip duplicate news items", async () => {
      const mockProviderResponse = {
        data: {
          data: [
            {
              title: "Gold prices surge amid market volatility",
              description: "Gold prices reached new highs today...",
              url: "https://example.com/news/1",
              source: "Financial Times",
              published_at: "2025-01-01T10:00:00Z",
              symbols: ["XAU"],
              tags: ["gold", "market"],
              image_url: "https://example.com/image1.jpg",
              sentiment: "positive",
            },
          ],
        },
      };

      mockedAxios.get.mockResolvedValue(mockProviderResponse);
      mockPrisma.news.findUnique.mockResolvedValue({
        id: 1,
        title: "Gold prices surge amid market volatility",
        url: "https://example.com/news/1",
      }); // Existing item found

      const response = await fetch("http://127.0.0.1:8000/news/fetcher", {
        method: "POST",
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockPrisma.news.create).not.toHaveBeenCalled(); // Should not create duplicate
    });
  });

  describe("GET /api/og", () => {
    it("should extract OpenGraph image from URL", async () => {
      const mockHtmlResponse = `
        <html>
          <head>
            <meta property="og:image" content="https://example.com/image.jpg" />
          </head>
        </html>
      `;

      mockedAxios.get.mockResolvedValue({ data: mockHtmlResponse });

      const response = await fetch(
        "http://127.0.0.1:8000/api/og?url=https://example.com/article"
      );
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.url).toBe("https://example.com/article");
      expect(data.image).toBe("https://example.com/image.jpg");
    });

    it("should return null image if no OpenGraph meta found", async () => {
      const mockHtmlResponse = `
        <html>
          <head>
            <title>Article Title</title>
          </head>
        </html>
      `;

      mockedAxios.get.mockResolvedValue({ data: mockHtmlResponse });

      const response = await fetch(
        "http://127.0.0.1:8000/api/og?url=https://example.com/article"
      );
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.url).toBe("https://example.com/article");
      expect(data.image).toBeNull();
    });

    it("should return 400 if URL parameter is missing", async () => {
      const response = await fetch("http://127.0.0.1:8000/api/og");
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.title).toBe("Bad Request");
      expect(data.detail).toBe("URL parameter is required");
    });
  });

  describe("News Deduplication", () => {
    it("should prevent duplicate news items by URL", async () => {
      const existingNews = {
        id: 1,
        title: "Gold prices surge amid market volatility",
        url: "https://example.com/news/1",
        source: "Financial Times",
        publishedAt: new Date("2025-01-01T10:00:00Z"),
        tickers: '["XAU"]',
        tags: '["gold", "market"]',
        image: "https://example.com/image1.jpg",
        sentiment: "positive",
        createdAt: new Date("2025-01-01T10:00:00Z"),
      };

      mockPrisma.news.findUnique.mockResolvedValue(existingNews);

      const response = await fetch("http://127.0.0.1:8000/news/fetcher", {
        method: "POST",
      });

      expect(response.status).toBe(200);
      expect(mockPrisma.news.create).not.toHaveBeenCalled();
    });
  });

  describe("SSE Endpoint", () => {
    it("should establish SSE connection", async () => {
      const response = await fetch("http://127.0.0.1:8000/news/stream");

      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toBe("text/event-stream");
      expect(response.headers.get("cache-control")).toBe("no-cache");
      expect(response.headers.get("connection")).toBe("keep-alive");
    });
  });
});
