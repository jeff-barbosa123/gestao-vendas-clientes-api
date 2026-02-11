/**
 * Migration script to hash existing plain text passwords in the database
 * Run this once after deploying the password hashing update
 * 
 * Usage: node scripts/migrate-passwords.js
 */

require("dotenv").config();
const { pool } = require("../src/db");
const { hashPassword, isBcryptHash } = require("../src/utils/passwordHash");

async function migratePasswords() {
  console.log("Starting password migration...");
  
  try {
    // Get all users with plain text passwords
    const result = await pool.query("SELECT id, email, password FROM users");
    const users = result.rows;
    
    console.log(`Found ${users.length} users to check`);
    
    let migrated = 0;
    let alreadyHashed = 0;
    let errors = 0;
    
    for (const user of users) {
      try {
        // Check if password is already hashed
        if (isBcryptHash(user.password)) {
          alreadyHashed++;
          continue;
        }
        
        // Skip if password looks like placeholder
        if (user.password === "<PASSWORD>" || user.password === "placeholder") {
          console.log(`Skipping placeholder password for user ${user.email}`);
          continue;
        }
        
        // Hash the plain text password
        const hashedPassword = await hashPassword(user.password);
        
        // Update user with hashed password
        await pool.query(
          "UPDATE users SET password = $1, updated_at = NOW() WHERE id = $2",
          [hashedPassword, user.id]
        );
        
        console.log(`✓ Migrated password for user: ${user.email}`);
        migrated++;
      } catch (err) {
        console.error(`✗ Error migrating password for user ${user.email}:`, err.message);
        errors++;
      }
    }
    
    console.log("\n=== Migration Summary ===");
    console.log(`Total users: ${users.length}`);
    console.log(`Migrated: ${migrated}`);
    console.log(`Already hashed: ${alreadyHashed}`);
    console.log(`Errors: ${errors}`);
    console.log("\nMigration completed!");
    
    process.exit(errors > 0 ? 1 : 0);
  } catch (err) {
    console.error("Fatal error during migration:", err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Validate environment variables
if (!process.env.JWT_SECRET || process.env.JWT_SECRET === "dev-secret") {
  console.error("ERROR: JWT_SECRET must be set before running migration");
  process.exit(1);
}

migratePasswords();
