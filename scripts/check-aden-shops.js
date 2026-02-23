#!/usr/bin/env node

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function checkAdenShops() {
  const shops = await prisma.goldShop.findMany({
    select: {
      id: true,
      name: true,
      region: true,
      lat: true,
      lng: true,
    },
  });

  // Aden is at ~12.7855, 45.0187
  const adenLat = 12.7855;
  const adenLng = 45.0187;

  // Check shops near Aden (within ~0.5 degrees, roughly 50km)
  const shopsNearAden = shops
    .map((s) => {
      const dist = Math.sqrt(
        Math.pow(s.lat - adenLat, 2) + Math.pow(s.lng - adenLng, 2)
      );
      return { ...s, distance: dist };
    })
    .filter((s) => s.distance < 0.5)
    .sort((a, b) => a.distance - b.distance);

  console.log(`Shops near Aden (within ~0.5 degrees): ${shopsNearAden.length}`);
  console.log("\nClosest 20 shops to Aden:");
  shopsNearAden.slice(0, 20).forEach((s) => {
    console.log(
      `  ${s.name}: lat=${s.lat}, lng=${s.lng}, region=${
        s.region
      }, distance=${s.distance.toFixed(3)}`
    );
  });

  // Check current region distribution
  const byRegion = {};
  shops.forEach((s) => {
    byRegion[s.region] = (byRegion[s.region] || 0) + 1;
  });
  console.log("\n\nCurrent shop counts by region:");
  Object.entries(byRegion).forEach(([r, c]) => console.log(`  ${r}: ${c}`));

  await prisma.$disconnect();
}

checkAdenShops().catch(console.error);

