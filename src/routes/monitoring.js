const express = require("express");
const { PrismaClient } = require("@prisma/client");

const router = express.Router();
const prisma = new PrismaClient();

// System monitoring endpoint
router.get("/system", async (req, res) => {
  try {
    const memUsage = process.memoryUsage();
    const uptime = process.uptime();

    // Get database stats
    const userCount = await prisma.user.count();
    const priceCount = await prisma.goldPrice.count();
    const newsCount = await prisma.news.count();

    // Get recent activity
    const recentPrices = await prisma.goldPrice.findMany({
      orderBy: { ds: "desc" },
      take: 5,
    });

    const recentNews = await prisma.news.findMany({
      orderBy: { publishedAt: "desc" },
      take: 5,
    });

    res.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      system: {
        uptime: uptime,
        memory: {
          rss: Math.round(memUsage.rss / 1024 / 1024) + " MB",
          heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024) + " MB",
          heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024) + " MB",
          external: Math.round(memUsage.external / 1024 / 1024) + " MB",
        },
        cpu: process.cpuUsage(),
      },
      database: {
        users: userCount,
        prices: priceCount,
        news: newsCount,
      },
      recent: {
        prices: recentPrices,
        news: recentNews,
      },
    });
  } catch (error) {
    console.error("Monitoring error:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to get system metrics",
      error: error.message,
    });
  }
});

// Health check endpoint
router.get("/health", async (req, res) => {
  try {
    // Check database connection
    await prisma.$queryRaw`SELECT 1`;

    res.json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      services: {
        database: "connected",
        redis: process.env.REDIS_URL ? "configured" : "not configured",
        websocket: "enabled",
      },
    });
  } catch (error) {
    res.status(503).json({
      status: "unhealthy",
      timestamp: new Date().toISOString(),
      error: error.message,
    });
  }
});

// Performance metrics endpoint
router.get("/performance", async (req, res) => {
  try {
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();

    res.json({
      timestamp: new Date().toISOString(),
      performance: {
        memory: {
          rss: memUsage.rss,
          heapTotal: memUsage.heapTotal,
          heapUsed: memUsage.heapUsed,
          external: memUsage.external,
        },
        cpu: {
          user: cpuUsage.user,
          system: cpuUsage.system,
        },
        uptime: process.uptime(),
      },
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Failed to get performance metrics",
      error: error.message,
    });
  }
});

module.exports = router;
