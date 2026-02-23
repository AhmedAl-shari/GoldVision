#!/usr/bin/env node

/**
 * User Management Script
 *
 * This script allows you to list all users and their roles
 * Usage: node scripts/list-users.js
 */

const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function listUsers() {
  try {
    console.log("📋 Listing all users...\n");

    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        role: true,
        locale: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    if (users.length === 0) {
      console.log("No users found.");
      return;
    }

    console.log(
      "┌─────┬─────────────────────────────┬─────────┬─────────┬─────────────────────────┐"
    );
    console.log(
      "│ ID  │ Email                       │ Role    │ Locale  │ Created                 │"
    );
    console.log(
      "├─────┼─────────────────────────────┼─────────┼─────────┼─────────────────────────┤"
    );

    users.forEach((user) => {
      const id = user.id.toString().padEnd(3);
      const email = user.email.padEnd(27);
      const role = user.role.padEnd(7);
      const locale = user.locale.padEnd(7);
      const createdAt = user.createdAt.toISOString().split("T")[0];

      console.log(`│ ${id} │ ${email} │ ${role} │ ${locale} │ ${createdAt} │`);
    });

    console.log(
      "└─────┴─────────────────────────────┴─────────┴─────────┴─────────────────────────┘"
    );

    const adminCount = users.filter((u) => u.role === "admin").length;
    const userCount = users.filter((u) => u.role === "user").length;

    console.log(`\n📊 Summary:`);
    console.log(`   Total Users: ${users.length}`);
    console.log(`   Administrators: ${adminCount}`);
    console.log(`   Regular Users: ${userCount}`);
  } catch (error) {
    console.error("❌ Error listing users:", error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// List all users
listUsers();
