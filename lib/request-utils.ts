import { NextRequest } from "next/server";
import { hashIpAddress } from "./trial-db";

/**
 * Extract client IP address from request headers
 * Handles various proxy configurations (Vercel, Cloudflare, etc.)
 */
export function getClientIp(request: NextRequest): string {
  // Check common proxy headers in order of preference
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    // x-forwarded-for can contain multiple IPs, take the first (client IP)
    const firstIp = forwardedFor.split(",")[0].trim();
    if (firstIp) return firstIp;
  }

  // Vercel-specific header
  const vercelForwardedFor = request.headers.get("x-vercel-forwarded-for");
  if (vercelForwardedFor) {
    const firstIp = vercelForwardedFor.split(",")[0].trim();
    if (firstIp) return firstIp;
  }

  // Cloudflare header
  const cfConnectingIp = request.headers.get("cf-connecting-ip");
  if (cfConnectingIp) return cfConnectingIp;

  // Real IP header (nginx)
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp;

  // Fallback to a default for local development
  return "127.0.0.1";
}

/**
 * Get a hashed user identifier from request for trial tracking
 * Uses IP address hashed with SHA-256 for privacy
 */
export function getTrialUserIdentifier(request: NextRequest): string {
  const ip = getClientIp(request);
  return hashIpAddress(ip);
}
