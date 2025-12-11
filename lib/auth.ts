import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Discord from "next-auth/providers/discord";
import { sql } from "@vercel/postgres";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    Discord({
      clientId: process.env.DISCORD_CLIENT_ID!,
      clientSecret: process.env.DISCORD_CLIENT_SECRET!,
    }),
  ],
  pages: {
    signIn: "/signin",
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      if (!user.email) {
        return false;
      }

      try {
        // Check if user exists
        const existingUser = await sql`
          SELECT id FROM users WHERE email = ${user.email}
        `;

        if (existingUser.rows.length === 0) {
          // Create new user
          await sql`
            INSERT INTO users (email, name, image)
            VALUES (${user.email}, ${user.name || null}, ${user.image || null})
          `;
        } else {
          // Update user info
          await sql`
            UPDATE users
            SET name = ${user.name || null}, image = ${user.image || null}
            WHERE email = ${user.email}
          `;
        }

        return true;
      } catch (error) {
        console.error("Error during sign in:", error);
        return false;
      }
    },
    async session({ session, token }) {
      if (session.user && token.email) {
        // Fetch user ID from database
        try {
          const result = await sql`
            SELECT id FROM users WHERE email = ${token.email}
          `;
          if (result.rows.length > 0) {
            session.user.id = result.rows[0].id.toString();
          }
        } catch (error) {
          console.error("Error fetching user ID:", error);
        }
      }
      return session;
    },
  },
  session: {
    strategy: "jwt",
  },
});

// Extend the built-in session type
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }
}
