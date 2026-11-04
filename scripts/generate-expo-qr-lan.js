/**
 * Writes ../expo-dev-qr.png for Expo Go (same Wi‑Fi as this Mac).
 * Metro must be running (default port 8081). Override: EXPO_LAN_IP, EXPO_METRO_PORT.
 */
const { execSync } = require("child_process");
const path = require("path");
const QR = require("qrcode");

function lanIp() {
  for (const iface of ["en0", "en1"]) {
    try {
      const ip = execSync(`ipconfig getifaddr ${iface}`, { encoding: "utf8" }).trim();
      if (ip) return ip;
    } catch {
      /* try next */
    }
  }
  throw new Error("Could not read LAN IP (en0/en1). Set EXPO_LAN_IP.");
}

const ip = process.env.EXPO_LAN_IP || lanIp();
const port = process.env.EXPO_METRO_PORT || "8081";
const url = `exp://${ip}:${port}`;
const out = path.join(__dirname, "..", "expo-dev-qr.png");

QR.toFile(out, url, { width: 512, margin: 2 }, (err) => {
  if (err) throw err;
  process.stdout.write(`Wrote ${out}\n${url}\n`);
});
