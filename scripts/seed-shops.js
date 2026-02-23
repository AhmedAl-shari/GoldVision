#!/usr/bin/env node

/**
 * Seed script for Gold Shops
 * Populates the database with initial shop data
 */

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const MOCK_SHOPS = [
  {
    name: "Al-Noor Gold Shop",
    nameAr: "محل النور للذهب",
    region: "SANAA",
    lat: 15.3694,
    lng: 44.191,
    address: "Old City, Sanaa",
    addressAr: "البلدة القديمة، صنعاء",
    rating: 4.5,
    reviewCount: 127,
    certified: true,
    verified: true,
    trustScore: 92,
    phone: "+967 1 234 567",
    email: "info@alnoor-gold.ye",
    openingHours: "9:00 AM - 8:00 PM",
    openingHoursAr: "9:00 صباحاً - 8:00 مساءً",
    description: "Trusted gold shop with certified gold and professional service",
    descriptionAr: "محل ذهب موثوق مع ذهب معتمد وخدمة احترافية",
    priceMin: 25000,
    priceMax: 28000,
    services: ["buy_gold", "sell_gold", "jewelry_repair", "custom_design", "appraisal"],
    photos: [
      {
        url: "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=400",
        thumbnail: "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=200",
        caption: "Shop exterior",
      },
    ],
    reviews: [
      {
        userName: "Ahmed Ali",
        rating: 5,
        comment: "Excellent service and fair prices",
        verified: true,
      },
      {
        userName: "Fatima Hassan",
        rating: 4,
        comment: "Good quality gold, professional staff",
        verified: true,
      },
    ],
  },
  {
    name: "Yemen Gold Market",
    nameAr: "سوق اليمن للذهب",
    region: "SANAA",
    lat: 15.3522,
    lng: 44.2065,
    address: "Hadda Street, Sanaa",
    addressAr: "شارع حدة، صنعاء",
    rating: 4.8,
    reviewCount: 89,
    certified: false,
    verified: true,
    trustScore: 88,
    phone: "+967 1 234 568",
    openingHours: "8:00 AM - 9:00 PM",
    openingHoursAr: "8:00 صباحاً - 9:00 مساءً",
    description: "Large gold market with competitive prices",
    descriptionAr: "سوق ذهب كبير بأسعار تنافسية",
    priceMin: 24500,
    priceMax: 27500,
    services: ["buy_gold", "sell_gold", "gold_exchange"],
    reviews: [
      {
        userName: "Mohammed Saleh",
        rating: 5,
        comment: "Best prices in the area",
        verified: true,
      },
    ],
  },
  {
    name: "Al-Sabah Gold Center",
    nameAr: "مركز الصباح للذهب",
    region: "SANAA",
    lat: 15.3856,
    lng: 44.2198,
    address: "Zubairy Street, Sanaa",
    addressAr: "شارع الزبيري، صنعاء",
    rating: 4.6,
    reviewCount: 203,
    certified: true,
    verified: true,
    trustScore: 95,
    phone: "+967 1 345 679",
    openingHours: "8:30 AM - 8:30 PM",
    openingHoursAr: "8:30 صباحاً - 8:30 مساءً",
    description: "Premium gold center with certified products",
    descriptionAr: "مركز ذهب متميز مع منتجات معتمدة",
    priceMin: 25500,
    priceMax: 28500,
    services: ["buy_gold", "sell_gold", "jewelry_repair", "custom_design"],
  },
  {
    name: "Aden Gold Center",
    nameAr: "مركز عدن للذهب",
    region: "ADEN",
    lat: 12.7855,
    lng: 45.0187,
    address: "Al-Mansoura, Aden",
    addressAr: "المنصورة، عدن",
    rating: 4.3,
    reviewCount: 156,
    certified: true,
    verified: true,
    trustScore: 85,
    phone: "+967 2 345 678",
    email: "contact@aden-gold.ye",
    openingHours: "9:00 AM - 7:00 PM",
    openingHoursAr: "9:00 صباحاً - 7:00 مساءً",
    description: "Certified gold center with professional appraisal services",
    descriptionAr: "مركز ذهب معتمد مع خدمات تقييم احترافية",
    priceMin: 24800,
    priceMax: 28200,
    services: ["buy_gold", "sell_gold", "jewelry_repair", "certification"],
    photos: [
      {
        url: "https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=400",
        thumbnail: "https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=200",
        caption: "Shop interior",
      },
    ],
    reviews: [
      {
        userName: "Sara Ahmed",
        rating: 4,
        comment: "Certified gold, trustworthy",
        verified: true,
      },
      {
        userName: "Omar Khaled",
        rating: 5,
        comment: "Professional service, highly recommended",
        verified: true,
      },
    ],
  },
  {
    name: "Aden Gold Souk",
    nameAr: "سوق عدن للذهب",
    region: "ADEN",
    lat: 12.7923,
    lng: 45.0098,
    address: "Crater District, Aden",
    addressAr: "حي كريتر، عدن",
    rating: 4.7,
    reviewCount: 178,
    certified: false,
    verified: true,
    trustScore: 87,
    phone: "+967 2 456 789",
    openingHours: "8:00 AM - 8:00 PM",
    openingHoursAr: "8:00 صباحاً - 8:00 مساءً",
    description: "Traditional gold souk with wide variety",
    descriptionAr: "سوق ذهب تقليدي مع تنوع واسع",
    priceMin: 24000,
    priceMax: 27000,
    services: ["buy_gold", "sell_gold", "gold_exchange"],
  },
  {
    name: "Taiz Gold Exchange",
    nameAr: "صيرفة تعز للذهب",
    region: "TAIZ",
    lat: 13.5779,
    lng: 44.017,
    address: "City Center, Taiz",
    addressAr: "وسط المدينة، تعز",
    rating: 4.6,
    reviewCount: 94,
    certified: true,
    verified: true,
    trustScore: 90,
    phone: "+967 4 456 789",
    openingHours: "8:30 AM - 8:00 PM",
    openingHoursAr: "8:30 صباحاً - 8:00 مساءً",
    description: "Reliable gold exchange with fair rates",
    descriptionAr: "صيرفة ذهب موثوقة بأسعار عادلة",
    priceMin: 25000,
    priceMax: 27500,
    services: ["buy_gold", "sell_gold", "gold_exchange", "appraisal"],
  },
  {
    name: "Al-Madina Gold Shop",
    nameAr: "محل المدينة للذهب",
    region: "TAIZ",
    lat: 13.5687,
    lng: 44.0256,
    address: "Al-Madina Street, Taiz",
    addressAr: "شارع المدينة، تعز",
    rating: 4.4,
    reviewCount: 112,
    certified: false,
    verified: false,
    trustScore: 82,
    phone: "+967 4 567 890",
    openingHours: "9:00 AM - 7:30 PM",
    openingHoursAr: "9:00 صباحاً - 7:30 مساءً",
    description: "Local gold shop with good reputation",
    descriptionAr: "محل ذهب محلي بسمعة جيدة",
    priceMin: 24500,
    priceMax: 27000,
    services: ["buy_gold", "sell_gold"],
  },
  {
    name: "Hodeidah Gold Shop",
    nameAr: "محل الحديدة للذهب",
    region: "HODEIDAH",
    lat: 14.7978,
    lng: 42.9545,
    address: "Port Road, Hodeidah",
    addressAr: "طريق الميناء، الحديدة",
    rating: 4.2,
    reviewCount: 67,
    certified: false,
    verified: false,
    trustScore: 78,
    phone: "+967 3 567 890",
    openingHours: "9:00 AM - 7:30 PM",
    openingHoursAr: "9:00 صباحاً - 7:30 مساءً",
    description: "Port area gold shop",
    descriptionAr: "محل ذهب في منطقة الميناء",
    priceMin: 24000,
    priceMax: 26500,
    services: ["buy_gold", "sell_gold"],
  },
  {
    name: "Al-Khair Gold Market",
    nameAr: "سوق الخير للذهب",
    region: "HODEIDAH",
    lat: 14.8023,
    lng: 42.9612,
    address: "City Center, Hodeidah",
    addressAr: "وسط المدينة، الحديدة",
    rating: 4.5,
    reviewCount: 145,
    certified: true,
    verified: true,
    trustScore: 88,
    phone: "+967 3 678 901",
    openingHours: "8:00 AM - 8:00 PM",
    openingHoursAr: "8:00 صباحاً - 8:00 مساءً",
    description: "Trusted gold market in city center",
    descriptionAr: "سوق ذهب موثوق في وسط المدينة",
    priceMin: 25000,
    priceMax: 28000,
    services: ["buy_gold", "sell_gold", "jewelry_repair", "appraisal"],
  },
  {
    name: "Sanaa Gold Souk",
    nameAr: "سوق صنعاء للذهب",
    region: "SANAA",
    lat: 15.3547,
    lng: 44.2156,
    address: "Bab Al-Yemen, Sanaa",
    addressAr: "باب اليمن، صنعاء",
    rating: 4.9,
    reviewCount: 312,
    certified: true,
    verified: true,
    trustScore: 98,
    phone: "+967 1 456 789",
    openingHours: "8:00 AM - 9:00 PM",
    openingHoursAr: "8:00 صباحاً - 9:00 مساءً",
    description: "Historic gold souk with excellent reputation",
    descriptionAr: "سوق ذهب تاريخي بسمعة ممتازة",
    priceMin: 26000,
    priceMax: 29000,
    services: ["buy_gold", "sell_gold", "jewelry_repair", "custom_design", "appraisal", "certification"],
  },
];

async function seedShops() {
  console.log("🌱 Starting shop seeding...");

  try {
    let created = 0;
    let skipped = 0;

    for (const shopData of MOCK_SHOPS) {
      // Check if shop already exists
      const existing = await prisma.goldShop.findFirst({
        where: {
          name: shopData.name,
          region: shopData.region,
        },
      });

      if (existing) {
        console.log(`⏭️  Skipping ${shopData.name} (already exists)`);
        skipped++;
        continue;
      }

      // Create shop with related data
      const shop = await prisma.goldShop.create({
        data: {
          name: shopData.name,
          nameAr: shopData.nameAr,
          region: shopData.region,
          lat: shopData.lat,
          lng: shopData.lng,
          address: shopData.address,
          addressAr: shopData.addressAr,
          rating: shopData.rating,
          reviewCount: shopData.reviewCount,
          certified: shopData.certified,
          verified: shopData.verified,
          trustScore: shopData.trustScore,
          phone: shopData.phone,
          email: shopData.email,
          openingHours: shopData.openingHours,
          openingHoursAr: shopData.openingHoursAr,
          description: shopData.description,
          descriptionAr: shopData.descriptionAr,
          priceMin: shopData.priceMin,
          priceMax: shopData.priceMax,
          services: shopData.services,
          photos: shopData.photos
            ? {
                create: shopData.photos.map((photo) => ({
                  url: photo.url,
                  thumbnail: photo.thumbnail,
                  caption: photo.caption,
                })),
              }
            : undefined,
          reviews: shopData.reviews
            ? {
                create: shopData.reviews.map((review) => ({
                  userName: review.userName,
                  rating: review.rating,
                  comment: review.comment,
                  verified: review.verified,
                })),
              }
            : undefined,
          lastUpdated: new Date(),
        },
      });

      console.log(`✅ Created ${shop.name} (${shop.region})`);
      created++;
    }

    console.log(`\n✨ Seeding complete!`);
    console.log(`   Created: ${created} shops`);
    console.log(`   Skipped: ${skipped} shops`);
  } catch (error) {
    console.error("❌ Error seeding shops:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seed
if (require.main === module) {
  seedShops()
    .then(() => {
      console.log("🎉 Seed script completed successfully");
      process.exit(0);
    })
    .catch((error) => {
      console.error("💥 Seed script failed:", error);
      process.exit(1);
    });
}

module.exports = { seedShops, MOCK_SHOPS };
