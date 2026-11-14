import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';

function parseEnvFile(filePath: string): Record<string, string> {
  if (!fs.existsSync(filePath)) return {};
  try {
    return dotenv.parse(fs.readFileSync(filePath));
  } catch {
    return {};
  }
}

/**
 * Merges environment variables with this precedence (lowest -> highest):
 * 1. Runtime process.env (e.g. Cloud SQL credentials injected by hosting runtime)
 * 2. Non-empty values manually set in `.env.example`
 * 3. Non-empty values in `.env` (if a local `.env` file is present)
 *
 * Re-reads `.env.example` and `.env` from disk on demand so manual edits
 * to Admin Studio, Cloudinary, and Google Sign-In config take effect cleanly.
 */
export function readMergedEnv(): Record<string, string> {
  const merged: Record<string, string> = {};

  for (const [k, v] of Object.entries(process.env)) {
    if (typeof v === 'string' && v.trim() !== '') {
      merged[k] = v;
    }
  }

  const exampleParsed = parseEnvFile(path.resolve(process.cwd(), '.env.example'));
  for (const [k, v] of Object.entries(exampleParsed)) {
    if (typeof v === 'string' && v.trim() !== '') {
      merged[k] = v.trim();
    }
  }

  const envParsed = parseEnvFile(path.resolve(process.cwd(), '.env'));
  for (const [k, v] of Object.entries(envParsed)) {
    if (typeof v === 'string' && v.trim() !== '') {
      merged[k] = v.trim();
    }
  }

  return merged;
}

export function getEnvValue(key: string, fallback = ''): string {
  const env = readMergedEnv();
  return env[key] ?? fallback;
}

// ============================================================================
// 1. CLOUD SQL CONNECTION CONFIG
// ============================================================================

export interface SqlConfig {
  host: string;
  database: string;
  user: string;
  password: string;
  adminUser: string;
  adminPassword: string;
  port: number;
  ssl: boolean;
}

export function getSqlConfig(): SqlConfig {
  const env = readMergedEnv();
  const portNum = Number(env.SQL_PORT || 5432);
  return {
    host: env.SQL_HOST || '',
    database: env.SQL_DB_NAME || '',
    user: env.SQL_USER || '',
    password: env.SQL_PASSWORD || '',
    adminUser: env.SQL_ADMIN_USER || env.SQL_USER || '',
    adminPassword: env.SQL_ADMIN_PASSWORD || env.SQL_PASSWORD || '',
    port: Number.isFinite(portNum) && portNum > 0 ? portNum : 5432,
    ssl: (env.SQL_SSL || '').toLowerCase() === 'true',
  };
}

// ============================================================================
// 2. ADMIN STUDIO & SESSION SECURITY CONFIG
// ============================================================================

export function getAuthSecret(): string {
  const env = readMergedEnv();
  return (
    env.AUTH_SECRET ||
    env.SQL_PASSWORD ||
    'liorave-dev-secret-change-in-production'
  );
}

export function getConfiguredAdminEmails(): string[] {
  const env = readMergedEnv();
  const raw = [env.ADMIN_EMAIL, env.ADMIN_EMAILS].filter(Boolean).join(',');
  const set = new Set(
    raw
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean)
  );
  return Array.from(set);
}

export function isConfiguredAdminEmail(email: string): boolean {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return false;
  return getConfiguredAdminEmails().includes(normalized);
}

export function getConfiguredAdminPassword(): string {
  const env = readMergedEnv();
  return env.ADMIN_PASSWORD || '';
}

export function verifyEnvAdminPassword(inputPassword: string): boolean {
  const configured = getConfiguredAdminPassword();
  if (!configured) return false;
  const a = crypto.createHash('sha256').update(inputPassword).digest();
  const b = crypto.createHash('sha256').update(configured).digest();
  return crypto.timingSafeEqual(a, b);
}

// ============================================================================
// 3. CLOUDINARY MEDIA UPLOAD CONFIG
// ============================================================================

export interface CloudinaryConfig {
  configured: boolean;
  cloudName: string;
  apiKey: string;
  apiSecret: string;
  folder: string;
}

export function getCloudinaryConfig(): CloudinaryConfig {
  const env = readMergedEnv();

  let cloudName = env.CLOUDINARY_CLOUD_NAME || '';
  let apiKey = env.CLOUDINARY_API_KEY || '';
  let apiSecret = env.CLOUDINARY_API_SECRET || '';
  const folder = env.CLOUDINARY_FOLDER || env.CLOUDINARY_UPLOAD_FOLDER || '';

  // Optional support for CLOUDINARY_URL=cloudinary://api_key:api_secret@cloud_name
  const cloudinaryUrl = env.CLOUDINARY_URL || '';
  if (cloudinaryUrl && (!cloudName || !apiKey || !apiSecret)) {
    try {
      const parsed = new URL(cloudinaryUrl);
      if (parsed.protocol === 'cloudinary:') {
        cloudName = cloudName || parsed.hostname;
        apiKey = apiKey || decodeURIComponent(parsed.username);
        apiSecret = apiSecret || decodeURIComponent(parsed.password);
      }
    } catch {
      // ignore invalid CLOUDINARY_URL
    }
  }

  return {
    configured: Boolean(cloudName && apiKey && apiSecret),
    cloudName,
    apiKey,
    apiSecret,
    folder,
  };
}

// ============================================================================
// 4. GOOGLE SIGN-IN STOREFRONT CONFIG
// ============================================================================

export interface GoogleAuthConfig {
  googleLoginEnabled: boolean;
  googleClientId: string;
  mode: 'google_gis' | 'firebase_google' | 'demo';
}

export function getGoogleAuthConfig(): GoogleAuthConfig {
  const env = readMergedEnv();

  const rawEnable = (env.VITE_ENABLE_GOOGLE_LOGIN || '').toLowerCase();
  const explicitClientId =
    env.VITE_GOOGLE_CLIENT_ID || env.GOOGLE_CLIENT_ID || '';
  const loginCode =
    env.VITE_GOOGLE_LOGIN_CODE || env.GOOGLE_LOGIN_CODE || '';

  const resolvedClientId =
    explicitClientId ||
    (loginCode.endsWith('.apps.googleusercontent.com') ? loginCode : '');

  const enabled =
    rawEnable === 'true' ||
    Boolean(resolvedClientId) ||
    Boolean(loginCode);

  const mode: GoogleAuthConfig['mode'] = !enabled
    ? 'demo'
    : resolvedClientId
      ? 'google_gis'
      : 'firebase_google';

  return {
    googleLoginEnabled: enabled,
    googleClientId: resolvedClientId,
    mode,
  };
}

// ============================================================================
// 5. GOOGLE SHEETS WEBHOOK CONFIG (Field Dispatch & Contact Messages)
// ============================================================================

export interface GoogleSheetConfig {
  sharedUrl: string;
  dispatchUrl: string;
  contactUrl: string;
}

export function getGoogleSheetConfig(): GoogleSheetConfig {
  const env = readMergedEnv();
  const sharedUrl =
    env.GOOGLE_SHEET_URL || env.GOOGLE_SHEETS_WEBHOOK_URL || '';
  const dispatchUrl = env.GOOGLE_SHEET_DISPATCH_URL || sharedUrl;
  const contactUrl = env.GOOGLE_SHEET_CONTACT_URL || sharedUrl;
  return {
    sharedUrl,
    dispatchUrl,
    contactUrl,
  };
}

export async function forwardToGoogleSheet(
  targetUrl: string,
  payload: Record<string, unknown>
): Promise<boolean> {
  const cleanUrl = targetUrl.trim();
  if (!cleanUrl || !/^https?:\/\//i.test(cleanUrl)) {
    return false;
  }
  try {
    const resp = await fetch(cleanUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(6000),
    });
    if (!resp.ok) {
      console.warn('Google Sheet forwarding returned non-OK status:', resp.status);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('Google Sheet forwarding failed:', err);
    return false;
  }
}
