#!/usr/bin/env node

const { PrismaClient, YemenRegion } = require("@prisma/client");
const prisma = new PrismaClient();

async function revertTaizReassignments() {
  console.log(
    "🔄 Reverting TAIZ reassignments to restore Sana'a to 97 shops...\n"
  );

  const taizShops = await prisma.goldShop.findMany({
    where: { region: YemenRegion.TAIZ },
    select: {
      id: true,
      name: true,
      nameAr: true,
      lat: true,
      lng: true,
    },
  });

  console.log(`Found ${taizShops.length} TAIZ shops to revert\n`);

  const args = process.argv.slice(2);
  const fix = args.includes("--fix");

  if (fix) {
    console.log(
      `🔧 Reverting ${taizShops.length} shops from TAIZ to SANAA...\n`
    );
    const result = await prisma.goldShop.updateMany({
      where: { region: YemenRegion.TAIZ },
      data: { region: YemenRegion.SANAA },
    });

    console.log(`✅ Reverted ${result.count} shops from TAIZ to SANAA\n`);

    const counts = await prisma.goldShop.groupBy({
      by: ["region"],
      _count: true,
    });

    console.log("Updated shop counts:");
    counts.forEach((c) => console.log(`  ${c.region}: ${c._count}`));
  } else {
    console.log(`💡 Run with --fix to apply these changes`);
    taizShops.forEach((s, i) => {
      console.log(`${i + 1}. ${s.name || s.nameAr} (${s.lat}, ${s.lng})`);
    });
  }

  await prisma.$disconnect();
}

revertTaizReassignments().catch(console.error);

