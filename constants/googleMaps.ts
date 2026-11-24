export function makeGoogleMapsUrl(
  latitude: number,
  longitude: number
): string {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    throw new Error("Invalid GPS coordinates.");
  }

  const lat = latitude.toFixed(6);
  const lon = longitude.toFixed(6);
  const query = lat + "," + lon;

  return "https://maps.google.com/?q=" + encodeURIComponent(query);
}
