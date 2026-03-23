import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const DATABASE_URL = process.env.DATABASE_URL || "mongodb://localhost:27017/cashcall";

async function seed() {
  await mongoose.connect(DATABASE_URL);
  console.log("Connected to MongoDB");

  const usersCollection = mongoose.connection.collection("users");

  // Drop old seed user if schema changed
  await usersCollection.deleteMany({ "phones.number": "0241234567" });
  // Also clean up old-schema users that have a `phone` field instead of `phones`
  await usersCollection.deleteMany({ phone: "0241234567" });

  const password_hash = await bcrypt.hash("password123", 10);

  await usersCollection.insertOne({
    firstName: "Admin",
    lastName: "User",
    email: "admin@adamusgh.com",
    phones: [{ number: "0241234567", isPrimary: true, isVerified: true }],
    password_hash,
    userType: "staff",
    status: "active",
    roles: [{ name: "admin", permissions: [] }],
    permissions: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  console.log("\n========================================");
  console.log("  Seed user created!");
  console.log("  Phone: 0241234567");
  console.log("  Name:  Admin User");
  console.log("  Email: admin@adamusgh.com");
  console.log("  Type:  staff");
  console.log("  Role:  admin");
  console.log("========================================\n");

  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
