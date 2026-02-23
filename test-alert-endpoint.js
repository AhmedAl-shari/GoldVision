/**
 * Test script to diagnose alert creation issues
 * Run this to see what error is actually happening
 */

const { PrismaClient, Prisma } = require("@prisma/client");
const prisma = new PrismaClient();

async function testAlertCreation() {
  console.log("🧪 Testing Alert Creation...\n");

  try {
    // Test 1: Check if user exists
    console.log("1. Checking for users in database...");
    const users = await prisma.user.findMany({ take: 5 });
    console.log(`   Found ${users.length} users`);
    if (users.length > 0) {
      console.log(`   First user: ID=${users[0].id}, Email=${users[0].email}`);
    } else {
      console.log("   ⚠️  No users found! This might be the issue.");
      return;
    }

    const testUserId = users[0].id;

    // Test 2: Test Prisma.Decimal
    console.log("\n2. Testing Prisma.Decimal...");
    const testDecimal = new Prisma.Decimal("4055.98");
    console.log(`   ✅ Prisma.Decimal works: ${testDecimal.toString()}`);

    // Test 3: Try creating an alert
    console.log("\n3. Attempting to create test alert...");
    const testAlert = await prisma.alert.create({
      data: {
        userId: testUserId,
        asset: "XAU",
        currency: "USD",
        ruleType: "price_above",
        threshold: new Prisma.Decimal("4055.98"),
        direction: "above",
      },
    });
    console.log(`   ✅ Alert created successfully! ID: ${testAlert.id}`);

    // Test 4: Try to delete it
    console.log("\n4. Attempting to delete test alert...");
    const deleted = await prisma.alert.deleteMany({
      where: {
        id: testAlert.id,
        userId: testUserId,
      },
    });
    console.log(`   ✅ Alert deleted successfully! Count: ${deleted.count}`);

    console.log("\n✅ All tests passed! The issue might be:");
    console.log("   1. Server not restarted");
    console.log("   2. Authentication/userId extraction issue");
    console.log("   3. CSRF token issue");
  } catch (error) {
    console.error("\n❌ Test failed with error:");
    console.error("   Message:", error.message);
    console.error("   Code:", error.code);
    console.error("   Meta:", error.meta);
    console.error("\n   This is the actual error causing the 500!");
  } finally {
    await prisma.$disconnect();
  }
}

testAlertCreation();


