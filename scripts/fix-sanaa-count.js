#!/usr/bin/env node

const { PrismaClient, YemenRegion } = require("@prisma/client");
const prisma = new PrismaClient();

// More inclusive bounds to get closer to 97 shops for Sana'a
function getRegionFromCoordinates(lat, lng) {
  if (!lat || !lng || isNaN(lat) || isNaN(lng)) return null;

  // SANAA: More inclusive bounds to capture more shops
  if (lat >= 14.5 && lat <= 16.0 && lng >= 43.5 && lng <= 45.0) {
    return YemenRegion.SANAA;
  }
  // ADEN: Expanded bounds
  if (lat >= 12.0 && lat <= 13.5 && lng >= 44.5 && lng <= 45.5) {
    return YemenRegion.ADEN;
  }
  // TAIZ: More precise bounds
  if (lat >= 13.0 && lat <= 14.2 && lng >= 43.5 && lng <= 44.5) {
    return YemenRegion.TAIZ;
  }
  // HODEIDAH: Expanded bounds
  if (lat >= 14.0 && lat <= 15.5 && lng >= 42.0 && lng <= 43.5) {
    return YemenRegion.HODEIDAH;
  }

  return null;
}

async function fixSanaaCount() {
  console.log(
    "🔍 Analyzing shop distribution to reach 97 shops for Sana'a...\n"
  );

  const shops = await prisma.goldShop.findMany({
    select: {
      id: true,
      name: true,
      nameAr: true,
      region: true,
      lat: true,
      lng: true,
      address: true,
      addressAr: true,
    },
  });

  console.log(`Total shops: ${shops.length}\n`);

  // Calculate what regions shops should be in
  const shouldBe = {};
  const issues = [];

  for (const shop of shops) {
    const correctRegion = getRegionFromCoordinates(shop.lat, shop.lng);
    if (correctRegion) {
      shouldBe[correctRegion] = (shouldBe[correctRegion] || 0) + 1;
      if (correctRegion !== shop.region) {
        issues.push({
          shop,
          current: shop.region,
          correct: correctRegion,
        });
      }
    } else {
      // Keep current region if coordinates don't match
      shouldBe[shop.region] = (shouldBe[shop.region] || 0) + 1;
    }
  }

  console.log("Expected distribution (by coordinates):");
  Object.entries(shouldBe).forEach(([r, c]) => console.log(`  ${r}: ${c}`));

  const sanaaCount = shouldBe[YemenRegion.SANAA] || 0;
  console.log(
    `\nSana'a count: ${sanaaCount} (target: 97, difference: ${97 - sanaaCount})`
  );

  if (issues.length > 0) {
    console.log(
      `\n⚠️  Found ${issues.length} shops with incorrect assignments:\n`
    );
    const byCurrentRegion = {};
    issues.forEach((i) => {
      const key = `${i.current} → ${i.correct}`;
      byCurrentRegion[key] = (byCurrentRegion[key] || 0) + 1;
    });
    Object.entries(byCurrentRegion).forEach(([change, count]) =>
      console.log(`  ${change}: ${count} shops`)
    );
  }

  await prisma.$disconnect();
}

fixSanaaCount().catch(console.error);

