// Run this once to get a Gmail refresh token:
//   npx tsx generate-gmail-token.ts
//
// This will give you a URL. Open it in your browser, log in,
// copy the authorization code, and paste it back here.

import dotenv from "dotenv";
dotenv.config();
import { google } from "googleapis";
import { writeFileSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const CLIENT_ID = process.env.GMAIL_CLIENT_ID;
const CLIENT_SECRET = process.env.GMAIL_CLIENT_SECRET;

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error("Missing GMAIL_CLIENT_ID or GMAIL_CLIENT_SECRET in .env");
  process.exit(1);
}

const oauth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  "http://localhost",
);

async function main() {
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: ["https://www.googleapis.com/auth/gmail.readonly"],
    prompt: "consent",
  });

  console.log("\nOpen this URL in your browser:\n");
  console.log(authUrl);
  console.log("\nAfter authorizing, your browser will show an error page (localhost refused to connect).");
  console.log("Look at the URL bar. Copy the full URL.");
  console.log("It looks like: http://localhost/?code=4/0AVHEtk6...&scope=...");
  console.log("Paste that entire URL below and press Enter:\n");

  const urlInput = await new Promise<string>((resolve) => {
    process.stdout.write("Paste URL: ");
    process.stdin.once("data", (data) => {
      resolve(data.toString().trim());
    });
  });

  // Extract code from URL like: http://localhost/?code=4/0AVHEtk6...&scope=...
  const url = new URL(urlInput);
  const code = url.searchParams.get("code");
  if (!code) {
    console.error("Could not find 'code' in the URL. Did you paste the full redirect URL?");
    process.exit(1);
  }

  const { tokens } = await oauth2Client.getToken(code);
  console.log("\nRefresh token:", tokens.refresh_token);

  if (tokens.refresh_token) {
    const envPath = join(process.cwd(), ".env");
    let content = readFileSync(envPath, "utf-8");
    content = content.replace(
      /GMAIL_REFRESH_TOKEN=.*/,
      `GMAIL_REFRESH_TOKEN=${tokens.refresh_token}`,
    );
    writeFileSync(envPath, content);
    console.log("Updated .env with refresh token.");
  }
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
