import * as fs from "fs";
import * as path from "path";
import * as os from "os";

/**
 * Google Cloud Credentials Helper
 * 
 * Handles credentials for both local development and production environments:
 * - Local: Uses lib/google-cloud-key.json file
 * - Production: Uses GOOGLE_APPLICATION_CREDENTIALS_BASE64 env var (base64 encoded JSON)
 * 
 * Returns the path to a credentials file that can be used with Google Cloud SDK clients.
 */
export function getGoogleCloudCredentialsPath(): string {
  // Production: Use base64 encoded credentials from environment variable
  // If GOOGLE_APPLICATION_CREDENTIALS_BASE64 is set, use it (production deployment)
  const base64Credentials = process.env.GOOGLE_APPLICATION_CREDENTIALS_BASE64;
  
  if (base64Credentials) {
    try {
      // Decode base64 credentials
      const credentialsJson = Buffer.from(base64Credentials, "base64").toString("utf-8");
      
      // Validate it's valid JSON
      JSON.parse(credentialsJson);
      
      // Create temporary file for Google Cloud SDK
      // Use a unique filename with random component for concurrent invocations
      const tempDir = os.tmpdir();
      const randomId = Math.random().toString(36).substring(2, 15);
      const tempFilePath = path.join(tempDir, `google-cloud-credentials-${Date.now()}-${randomId}.json`);
      
      // Write credentials to temp file
      fs.writeFileSync(tempFilePath, credentialsJson, "utf-8");
      
      // Set file permissions (read-only for owner)
      fs.chmodSync(tempFilePath, 0o600);
      
      console.log("✅ [CREDENTIALS] Using base64 credentials from environment variable");
      
      return tempFilePath;
    } catch (error: any) {
      console.error("❌ [CREDENTIALS] Failed to decode base64 credentials:", error.message);
      throw new Error(`Invalid GOOGLE_APPLICATION_CREDENTIALS_BASE64: ${error.message}`);
    }
  }
  
  // Local development: Use file-based credentials
  const credentialsPath = path.join(process.cwd(), "lib", "google-cloud-key.json");
  
  if (!fs.existsSync(credentialsPath)) {
    throw new Error(
      `Google Cloud credentials not found at ${credentialsPath}. ` +
      `For local development, ensure lib/google-cloud-key.json exists. ` +
      `For production, set GOOGLE_APPLICATION_CREDENTIALS_BASE64 environment variable.`
    );
  }
  
  console.log("✅ [CREDENTIALS] Using file-based credentials from lib/google-cloud-key.json");
  
  return credentialsPath;
}

/**
 * Get Google Cloud credentials configuration object
 * Can be used directly with Google Cloud SDK clients that accept credentials object
 */
export function getGoogleCloudCredentials(): object {
  const credentialsPath = getGoogleCloudCredentialsPath();
  const credentialsJson = fs.readFileSync(credentialsPath, "utf-8");
  return JSON.parse(credentialsJson);
}

