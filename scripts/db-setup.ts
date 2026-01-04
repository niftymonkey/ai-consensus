#!/usr/bin/env tsx
/**
 * Database Setup Script
 *
 * Usage: pnpm db:setup
 *
 * Creates all tables in a fresh PostgreSQL database.
 * Works with any PostgreSQL provider (Vercel Postgres, Neon, Supabase, local, etc.)
 */

import { config } from "dotenv";
import { sql } from "@vercel/postgres";
import * as fs from "fs";
import * as path from "path";

// Load environment variables from .env.local
config({ path: path.join(process.cwd(), ".env.local") });

async function runSetup() {
  console.log("🔄 Starting database setup...\n");

  // Verify connection string is available
  if (!process.env.POSTGRES_URL) {
    console.error("❌ Error: POSTGRES_URL not found in .env.local\n");
    console.error("To fix this:");
    console.error("  1. Copy .env.example to .env.local");
    console.error("  2. Add your PostgreSQL connection string to POSTGRES_URL");
    console.error("  3. Run this command again\n");
    console.error("Example connection strings:");
    console.error("  Neon:     postgresql://user:pass@ep-xxx.region.neon.tech/dbname?sslmode=require");
    console.error("  Supabase: postgresql://postgres:pass@db.xxx.supabase.co:5432/postgres");
    console.error("  Local:    postgresql://postgres:postgres@localhost:5432/ai_consensus\n");
    process.exit(1);
  }

  // Check if schema file exists
  const schemaPath = path.join(process.cwd(), "schema.sql");
  if (!fs.existsSync(schemaPath)) {
    console.error("❌ Error: schema.sql not found in project root\n");
    process.exit(1);
  }

  try {
    // Test database connection first
    console.log("📡 Testing database connection...");
    await sql`SELECT 1`;
    console.log("✅ Connected to database\n");

    // Read the schema file
    const schemaSQL = fs.readFileSync(schemaPath, "utf-8");

    // Split by semicolons and filter out comments and empty statements
    const statements = schemaSQL
      .split(";")
      .map((stmt) => stmt.trim())
      .filter((stmt) => {
        const withoutComments = stmt
          .split("\n")
          .filter((line) => !line.trim().startsWith("--"))
          .join("\n")
          .trim();
        return withoutComments.length > 0;
      });

    console.log(`📝 Found ${statements.length} SQL statements to execute\n`);

    let successCount = 0;
    let skipCount = 0;

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (!statement) continue;

      // Show first line of statement for logging
      const firstLine = statement.split("\n")[0].substring(0, 50);
      process.stdout.write(`[${i + 1}/${statements.length}] ${firstLine}...`);

      try {
        await sql.query(statement + ";");
        console.log(" ✅");
        successCount++;
      } catch (error: any) {
        if (error.message?.includes("already exists")) {
          console.log(" ⏭️  (exists)");
          skipCount++;
        } else {
          console.log(" ❌");
          throw error;
        }
      }
    }

    console.log(`\n✅ Database setup completed!`);
    console.log(`   ${successCount} statements executed, ${skipCount} skipped (already exist)\n`);
    console.log("Next steps:");
    console.log("  1. Run: pnpm dev");
    console.log("  2. Open: http://localhost:3000");
    console.log("  3. Sign in and add your API keys in Settings\n");

    process.exit(0);
  } catch (error: any) {
    console.error("\n❌ Setup failed!\n");

    // Provide helpful error messages for common issues
    if (error.code === "28P01") {
      console.error("🔑 Authentication failed - check your database password");
    } else if (error.code === "3D000") {
      console.error("🗄️  Database does not exist - create it first");
    } else if (error.code === "ENOTFOUND" || error.code === "ECONNREFUSED") {
      console.error("🌐 Cannot connect to database host - check your connection string");
    } else if (error.message?.includes("SSL")) {
      console.error("🔒 SSL error - try adding ?sslmode=require to your connection string");
    } else {
      console.error("Error:", error.message || error);
    }

    console.error("\nYour POSTGRES_URL format should look like:");
    console.error("  postgresql://username:password@host:port/database\n");

    process.exit(1);
  }
}

runSetup();
