#!/usr/bin/env node

/**
 * Add demo shops for cities that don't have any shops
 * Usage: node scripts/add-demo-shops.js
 */

const { PrismaClient, YemenRegion, ShopService } = require("@prisma/client");
const prisma = new PrismaClient();

async function addDemoShops() {
  console.log("🎨 Adding demo shops for cities without shops...\n");

  // Check which regions have 0 shops
  const counts = await prisma.goldShop.groupBy({
    by: ["region"],
    _count: true,
  });

  const regionCounts = {};
  counts.forEach((c) => {
    regionCounts[c.region] = c._count;
  });

  console.log("Current shop counts:");
  Object.values(YemenRegion).forEach((region) => {
    const count = regionCounts[region] || 0;
    console.log(`  ${region}: ${count}`);
  });

  const regionsNeedingShops = Object.values(YemenRegion).filter(
    (region) => !regionCounts[region] || regionCounts[region] === 0
  );

  if (regionsNeedingShops.length === 0) {
    console.log("\n✅ All regions have shops!");
    await prisma.$disconnect();
    return;
  }

  console.log(
    `\n📝 Adding demo shops for: ${regionsNeedingShops.join(", ")}\n`
  );

  // Demo shop data for each region
  const demoShops = {
    [YemenRegion.ADEN]: {
      name: "Al-Aden Gold & Jewelry",
      nameAr: "ذهب ومجوهرات عدن",
      region: YemenRegion.ADEN,
      lat: 12.7855,
      lng: 45.0187,
      address: "Crater Street, Aden",
      addressAr: "شارع كريتر، عدن",
      phone: "+967 2 234 567",
      email: "info@aden-gold.ye",
      openingHours: "9:00 AM - 8:00 PM",
      openingHoursAr: "9:00 صباحاً - 8:00 مساءً",
      description: "Premium gold and jewelry shop in Aden",
      descriptionAr: "محل ذهب ومجوهرات متميز في عدن",
      rating: 4.5,
      reviewCount: 25,
      certified: true,
      verified: true,
      trustScore: 85,
      priceMin: 25000,
      priceMax: 28000,
      services: [
        ShopService.buy_gold,
        ShopService.sell_gold,
        ShopService.jewelry_repair,
      ],
    },
    [YemenRegion.TAIZ]: {
      name: "Al-Taiz Gold Center",
      nameAr: "مركز تعز للذهب",
      region: YemenRegion.TAIZ,
      lat: 13.5779,
      lng: 44.017,
      address: "Al-Qahira Street, Taiz",
      addressAr: "شارع القاهرة، تعز",
      phone: "+967 4 345 678",
      email: "info@taiz-gold.ye",
      openingHours: "9:00 AM - 7:00 PM",
      openingHoursAr: "9:00 صباحاً - 7:00 مساءً",
      description: "Trusted gold and jewelry shop in Taiz",
      descriptionAr: "محل ذهب ومجوهرات موثوق في تعز",
      rating: 4.3,
      reviewCount: 18,
      certified: true,
      verified: true,
      trustScore: 80,
      priceMin: 24500,
      priceMax: 27500,
      services: [ShopService.buy_gold, ShopService.sell_gold],
    },
    [YemenRegion.HODEIDAH]: {
      name: "Al-Hodeidah Gold Market",
      nameAr: "سوق الحديدة للذهب",
      region: YemenRegion.HODEIDAH,
      lat: 14.7978,
      lng: 42.9545,
      address: "Al-Mina Street, Hodeidah",
      addressAr: "شارع الميناء، الحديدة",
      phone: "+967 3 456 789",
      email: "info@hodeidah-gold.ye",
      openingHours: "8:00 AM - 8:00 PM",
      openingHoursAr: "8:00 صباحاً - 8:00 مساءً",
      description: "Leading gold and jewelry shop in Hodeidah",
      descriptionAr: "محل ذهب ومجوهرات رائد في الحديدة",
      rating: 4.4,
      reviewCount: 22,
      certified: true,
      verified: true,
      trustScore: 82,
      priceMin: 24800,
      priceMax: 27800,
      services: [
        ShopService.buy_gold,
        ShopService.sell_gold,
        ShopService.jewelry_repair,
      ],
    },
  };

  let created = 0;
  let skipped = 0;

  for (const region of regionsNeedingShops) {
    const demoShop = demoShops[region];
    if (!demoShop) {
      console.log(`⚠️  No demo shop data for ${region}`);
      skipped++;
      continue;
    }

    // Check if demo shop already exists
    const existing = await prisma.goldShop.findFirst({
      where: {
        name: demoShop.name,
        region: region,
      },
    });

    if (existing) {
      console.log(
        `⏭️  Demo shop already exists for ${region}: ${demoShop.name}`
      );
      skipped++;
      continue;
    }

    try {
      await prisma.goldShop.create({
        data: demoShop,
      });
      console.log(`✅ Created demo shop for ${region}: ${demoShop.name}`);
      created++;
    } catch (error) {
      console.error(
        `❌ Error creating demo shop for ${region}:`,
        error.message
      );
    }
  }

  console.log(`\n✨ Done!`);
  console.log(`   Created: ${created}`);
  console.log(`   Skipped: ${skipped}`);

  // Show updated counts
  const updatedCounts = await prisma.goldShop.groupBy({
    by: ["region"],
    _count: true,
  });

  console.log("\nUpdated shop counts:");
  updatedCounts.forEach((c) => console.log(`  ${c.region}: ${c._count}`));

  await prisma.$disconnect();
}

addDemoShops().catch((error) => {
  console.error("💥 Error:", error);
  process.exit(1);
});

