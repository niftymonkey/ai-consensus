#!/usr/bin/env tsx
/**
 * Database Migration Script
 *
 * Usage: pnpm migrate [migration-file]
 *
 * Examples:
 *   pnpm migrate                                    # Runs 001_add_consensus_tables.sql
 *   pnpm migrate 002_add_trial_usage_table.sql     # Runs specific migration
 *
 * This script applies database migrations to your Vercel Postgres database.
 */

import { config } from "dotenv";
import { sql } from "@vercel/postgres";
import * as fs from "fs";
import * as path from "path";

// Load environment variables from .env.local
config({ path: path.join(process.cwd(), ".env.local") });

async function runMigration() {
  // Get migration file from command line args, default to 001
  const migrationFile = process.argv[2] || "001_add_consensus_tables.sql";

  console.log(`🔄 Starting database migration: ${migrationFile}\n`);

  // Verify connection string is available
  if (!process.env.POSTGRES_URL) {
    console.error("❌ Error: POSTGRES_URL not found in .env.local");
    console.error("Please ensure your .env.local file has the POSTGRES_URL variable set.\n");
    process.exit(1);
  }

  try {
    // Read the migration file
    const migrationPath = path.join(process.cwd(), "migrations", migrationFile);

    if (!fs.existsSync(migrationPath)) {
      console.error(`❌ Error: Migration file not found: ${migrationPath}`);
      console.error("\nAvailable migrations:");
      const migrations = fs.readdirSync(path.join(process.cwd(), "migrations"));
      migrations.filter(f => f.endsWith(".sql")).forEach(f => console.log(`  - ${f}`));
      process.exit(1);
    }

    const migrationSQL = fs.readFileSync(migrationPath, "utf-8");

    // Split by semicolons and filter out comments and empty statements
    const statements = migrationSQL
      .split(";")
      .map((stmt) => stmt.trim())
      .filter((stmt) => {
        // Remove empty statements and comment-only statements
        const withoutComments = stmt
          .split("\n")
          .filter((line) => !line.trim().startsWith("--"))
          .join("\n")
          .trim();
        return withoutComments.length > 0;
      });

    console.log(`📝 Found ${statements.length} SQL statements to execute\n`);

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (!statement) continue;

      // Show first line of statement for logging
      const firstLine = statement.split("\n")[0].substring(0, 60);
      console.log(`[${i + 1}/${statements.length}] Executing: ${firstLine}...`);

      try {
        await sql.query(statement + ";");
        console.log(`✅ Success\n`);
      } catch (error: any) {
        // If it's a "already exists" error, that's okay
        if (error.message?.includes("already exists")) {
          console.log(`⚠️  Already exists (skipping)\n`);
        } else {
          throw error;
        }
      }
    }

    console.log("✅ Migration completed successfully!\n");
    console.log("You can now test the consensus workflow at http://localhost:3000/consensus\n");

    process.exit(0);
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  }
}

runMigration();
