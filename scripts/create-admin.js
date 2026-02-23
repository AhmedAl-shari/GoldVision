#!/usr/bin/env node

/**
 * Admin User Creation Script
 *
 * This script allows you to create admin users via command line
 * Usage: node scripts/create-admin.js <email> <password>
 *
 * Example: node scripts/create-admin.js admin@company.com securepassword123
 */

const axios = require("axios");

async function createAdmin(email, password) {
  try {
    console.log(`Creating admin user: ${email}`);

    const response = await axios.post("http://localhost:8000/auth/signup", {
      email,
      password,
      locale: "en",
      role: "admin",
    });

    console.log("✅ Admin user created successfully!");
    console.log("📧 Email:", response.data.user.email);
    console.log("👤 Role:", response.data.user.role);
    console.log("🆔 User ID:", response.data.user.id);
    console.log("📅 Created:", response.data.user.createdAt);

    return response.data;
  } catch (error) {
    if (error.response) {
      console.error("❌ Error creating admin user:");
      console.error("Status:", error.response.status);
      console.error(
        "Message:",
        error.response.data.detail || error.response.data.message
      );
    } else {
      console.error("❌ Network error:", error.message);
    }
    process.exit(1);
  }
}

// Get command line arguments
const args = process.argv.slice(2);

if (args.length < 2) {
  console.log("Usage: node scripts/create-admin.js <email> <password>");
  console.log(
    "Example: node scripts/create-admin.js admin@company.com securepassword123"
  );
  process.exit(1);
}

const [email, password] = args;

// Validate email format
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
if (!emailRegex.test(email)) {
  console.error("❌ Invalid email format");
  process.exit(1);
}

// Validate password strength
if (password.length < 8) {
  console.error("❌ Password must be at least 8 characters long");
  process.exit(1);
}

// Create the admin user
createAdmin(email, password);
