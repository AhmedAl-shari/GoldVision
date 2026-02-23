# Gold Shops Management Guide

This guide explains how to add and manage real gold shops in the GoldVision system.

## Table of Contents

1. [Quick Start](#quick-start)
2. [Adding Shops - Methods](#adding-shops---methods)
3. [API Endpoints](#api-endpoints)
4. [Bulk Import](#bulk-import)
5. [Shop Verification](#shop-verification)

## Quick Start

### 1. Run Database Migration

First, create the database tables:

```bash
cd goldvision
npx prisma migrate dev --name add_gold_shops
```

### 2. Seed Initial Data

Populate the database with sample shops:

```bash
npm run db:seed:shops
```

This will add 10 sample shops to get you started.

## Adding Shops - Methods

### Method 1: Using the Seed Script (Initial Setup)

The seed script adds the default 10 shops:

```bash
npm run db:seed:shops
# or
node scripts/seed-shops.js
```

### Method 2: Using API Endpoints (Recommended for Real Shops)

#### Create a Shop via API

```bash
curl -X POST http://localhost:8000/api/shops \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Real Gold Shop Name",
    "nameAr": "اسم المحل بالعربية",
    "region": "SANAA",
    "lat": 15.3694,
    "lng": 44.191,
    "address": "Street Address, City",
    "addressAr": "العنوان بالعربية",
    "phone": "+967 1 234 567",
    "email": "shop@example.com",
    "openingHours": "9:00 AM - 8:00 PM",
    "description": "Shop description",
    "priceMin": 25000,
    "priceMax": 28000,
    "services": ["buy_gold", "sell_gold", "jewelry_repair"],
    "certified": true
  }'
```

#### Update a Shop

```bash
curl -X PUT http://localhost:8000/api/shops/{shop-id} \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+967 1 999 999",
    "priceMin": 26000,
    "priceMax": 29000
  }'
```

#### Add Photos

```bash
curl -X POST http://localhost:8000/api/shops/{shop-id}/photos \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example.com/photo.jpg",
    "thumbnail": "https://example.com/thumb.jpg",
    "caption": "Shop exterior"
  }'
```

### Method 3: Bulk Import from CSV/JSON

#### CSV Format

Create a file `shops.csv`:

```csv
name,nameAr,region,lat,lng,address,addressAr,phone,email,openingHours,priceMin,priceMax,services,certified
Real Shop 1,محل حقيقي 1,SANAA,15.3694,44.191,Address 1,العنوان 1,+967 1 111 111,shop1@example.com,9:00 AM - 8:00 PM,25000,28000,"buy_gold,sell_gold",true
Real Shop 2,محل حقيقي 2,ADEN,12.7855,45.0187,Address 2,العنوان 2,+967 2 222 222,shop2@example.com,8:00 AM - 9:00 PM,24000,27000,"buy_gold,sell_gold,jewelry_repair",false
```

Import:

```bash
node scripts/import-shops.js shops.csv
```

#### JSON Format

Create a file `shops.json`:

```json
[
  {
    "name": "Real Shop 1",
    "nameAr": "محل حقيقي 1",
    "region": "SANAA",
    "lat": 15.3694,
    "lng": 44.191,
    "address": "Address 1",
    "addressAr": "العنوان 1",
    "phone": "+967 1 111 111",
    "email": "shop1@example.com",
    "openingHours": "9:00 AM - 8:00 PM",
    "priceMin": 25000,
    "priceMax": 28000,
    "services": ["buy_gold", "sell_gold"],
    "certified": true
  }
]
```

Import:

```bash
node scripts/import-shops.js shops.json
```

### Method 4: Direct Database (Advanced)

Use Prisma Studio:

```bash
npx prisma studio
```

Navigate to `GoldShop` table and add shops manually.

## API Endpoints

### Public Endpoints

- `GET /api/shops` - List shops with filters
  - Query params: `region`, `maxDistance`, `minRating`, `certifiedOnly`, `searchQuery`, `services`, `priceMin`, `priceMax`, `lat`, `lng`
- `GET /api/shops/:id` - Get shop details

- `POST /api/shops/:id/reviews` - Create review (auth optional)
  ```json
  {
    "rating": 5,
    "comment": "Great service!",
    "userName": "Ahmed Ali"
  }
  ```

### Authenticated Endpoints

> Favorites feature removed: endpoints deleted.

### Management Endpoints

- `POST /api/shops` - Create new shop
- `PUT /api/shops/:id` - Update shop
- `POST /api/shops/:id/photos` - Add photo
- `POST /api/shops/:id/verify` - Verify/certify shop (admin)

## Bulk Import

The import script supports both CSV and JSON formats.

### CSV Requirements

**Required columns:**

- `name` - Shop name (English)
- `region` - One of: SANAA, ADEN, TAIZ, HODEIDAH
- `lat` - Latitude (decimal)
- `lng` - Longitude (decimal)
- `address` - Street address

**Optional columns:**

- `nameAr` - Shop name (Arabic)
- `addressAr` - Address (Arabic)
- `phone` - Phone number
- `email` - Email address
- `website` - Website URL
- `openingHours` - Opening hours
- `openingHoursAr` - Opening hours (Arabic)
- `description` - Description
- `descriptionAr` - Description (Arabic)
- `priceMin` - Minimum price (YER per gram)
- `priceMax` - Maximum price (YER per gram)
- `services` - Comma-separated services: `buy_gold,sell_gold,jewelry_repair`
- `certified` - true/false
- `verified` - true/false
- `trustScore` - 0-100

### Example CSV

```csv
name,nameAr,region,lat,lng,address,addressAr,phone,email,openingHours,priceMin,priceMax,services,certified,verified
Al-Noor Gold Shop,محل النور للذهب,SANAA,15.3694,44.191,Old City Sanaa,البلدة القديمة صنعاء,+967 1 234 567,info@shop.ye,9:00 AM - 8:00 PM,25000,28000,"buy_gold,sell_gold,jewelry_repair",true,true
```

## Shop Verification

Shops can be verified and certified by admins:

```bash
curl -X POST http://localhost:8000/api/shops/{shop-id}/verify \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {admin-token}" \
  -d '{
    "verified": true,
    "certified": true
  }'
```

**Verification Levels:**

- **Unverified** - New shop, not yet checked
- **Verified** - Shop information confirmed by GoldVision
- **Certified** - Shop has official certifications/licenses

## Services Available

Shops can offer these services:

- `buy_gold` - Buy gold
- `sell_gold` - Sell gold
- `jewelry_repair` - Jewelry repair
- `custom_design` - Custom jewelry design
- `appraisal` - Gold/jewelry appraisal
- `gold_exchange` - Gold exchange
- `certification` - Provide certifications

## Price Ranges

Price ranges are in **Yemeni Rial (YER) per gram**.

Example:

- `priceMin: 25000` = 25,000 YER per gram minimum
- `priceMax: 28000` = 28,000 YER per gram maximum

## Regions

Supported regions:

- `SANAA` - Sana'a (Capital)
- `ADEN` - Aden
- `TAIZ` - Taiz
- `HODEIDAH` - Hodeidah

## Getting Real Shop Data

### Research Sources

1. **Local Business Directories**

   - Yemen Chamber of Commerce
   - Local business registries
   - Trade associations

2. **Online Sources**

   - Google Maps (search "gold shop Yemen")
   - Social media (Facebook, Instagram)
   - Business websites

3. **Field Research**

   - Visit local markets
   - Collect business cards
   - GPS coordinates from maps

4. **User Submissions**
   - Allow shop owners to register
   - User-submitted shops (pending verification)

### Data to Collect

For each real shop, collect:

- ✅ Shop name (English & Arabic)
- ✅ Exact address with GPS coordinates
- ✅ Phone number
- ✅ Email (if available)
- ✅ Opening hours
- ✅ Services offered
- ✅ Price range (if known)
- ✅ Certification status
- ✅ Photos (shop exterior/interior)

## Best Practices

1. **Verify Information**

   - Always verify shop details before marking as verified
   - Cross-reference with multiple sources

2. **GPS Accuracy**

   - Use precise coordinates (at least 6 decimal places)
   - Verify location on map before adding

3. **Regular Updates**

   - Update prices regularly
   - Keep opening hours current
   - Refresh photos periodically

4. **User Reviews**

   - Encourage customers to leave reviews
   - Monitor review quality
   - Respond to negative reviews

5. **Privacy**
   - Only include publicly available information
   - Respect shop owner privacy preferences

## Troubleshooting

### Migration Issues

If you get a migration error:

```bash
# Reset migration history (WARNING: This will delete existing data)
rm -rf prisma/migrations
npx prisma migrate dev --name init_shops
```

### Import Errors

If import fails:

- Check CSV/JSON format
- Verify required fields are present
- Check data types (lat/lng must be numbers)
- Ensure region values are valid

### API Errors

- Check authentication token for protected endpoints
- Verify shop ID exists
- Check request body format
- Review server logs for details

## Support

For issues or questions:

- Check server logs: `logs/backend.log`
- Review API documentation: `http://localhost:8000/openapi.json`
- Use Prisma Studio to inspect database: `npx prisma studio`
