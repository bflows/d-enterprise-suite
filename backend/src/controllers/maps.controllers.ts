import type { Request, Response } from "express";

const GEOCODE_URL = "https://maps.googleapis.com/maps/api/geocode/json";
const SV_META_URL = "https://maps.googleapis.com/maps/api/streetview/metadata";
const SV_STATIC_URL = "https://maps.googleapis.com/maps/api/streetview";

function queryString(v: unknown): string {
  if (v == null) return "";
  if (Array.isArray(v)) return queryString(v[0]);
  return String(v).trim();
}

function buildPostalLine(parts: {
  address: string;
  address2: string;
  city: string;
  zipCode: string;
}): string | null {
  const line = [parts.address, parts.address2, parts.city, parts.zipCode]
    .map((p) => p.trim())
    .filter(Boolean)
    .join(", ");
  return line.length >= 5 ? line : null;
}

/** Great-circle distance in meters (WGS84 sphere). */
function haversineMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6_371_000;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Initial compass bearing in degrees [0, 360) from (lat1,lng1) toward (lat2,lng2).
 * Use this so the camera on the panorama looks toward the geocoded property (front of house),
 * matching the intent of Maps’ pin-facing view when Street View opens for an address.
 */
function bearingDegrees(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δλ = ((lng2 - lng1) * Math.PI) / 180;
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  const θ = Math.atan2(y, x);
  return ((θ * 180) / Math.PI + 360) % 360;
}

/**
 * GET /api/maps/street-view
 * Query: address (street), optional address2, city, zipCode — geocoded to lat/lng, then Street View static image.
 */
export async function getStreetViewForAddress(req: Request, res: Response): Promise<void> {
  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) {
    res.status(503).json({
      success: false,
      message: "Google Maps API key is not configured (GOOGLE_MAPS_API_KEY).",
    });
    return;
  }

  const address = queryString(req.query.address);
  const address2 = queryString(req.query.address2);
  const city = queryString(req.query.city);
  const zipCode = queryString(req.query.zipCode);

  const postalLine = buildPostalLine({ address, address2, city, zipCode });
  if (!postalLine) {
    res.status(400).json({
      success: false,
      message: "Provide address, city, and/or zip to form a geocodable location.",
    });
    return;
  }

  try {
    const geoUrl = new URL(GEOCODE_URL);
    geoUrl.searchParams.set("address", postalLine);
    geoUrl.searchParams.set("key", key);

    const geoRes = await fetch(geoUrl.toString());
    if (!geoRes.ok) {
      res.status(502).json({ success: false, message: "Geocoding request failed." });
      return;
    }

    const geoJson = (await geoRes.json()) as {
      status: string;
      results?: Array<{ geometry?: { location?: { lat: number; lng: number } } }>;
    };

    const loc = geoJson.results?.[0]?.geometry?.location;
    if (geoJson.status !== "OK" || !loc) {
      res.status(404).json({
        success: false,
        message: "Address could not be geocoded.",
      });
      return;
    }

    const { lat, lng } = loc;
    const latLng = `${lat},${lng}`;

    const metaUrl = new URL(SV_META_URL);
    metaUrl.searchParams.set("location", latLng);
    metaUrl.searchParams.set("key", key);

    const metaRes = await fetch(metaUrl.toString());
    if (!metaRes.ok) {
      res.status(502).json({ success: false, message: "Street View metadata request failed." });
      return;
    }

    const meta = (await metaRes.json()) as {
      status?: string;
      pano_id?: string;
      location?: { lat: number; lng: number };
    };
    if (meta.status !== "OK") {
      res.status(404).json({
        success: false,
        message: "No Street View imagery for this location.",
      });
      return;
    }

    const panoId = meta.pano_id?.trim();
    const panoLoc = meta.location;
    let heading: number | undefined;
    if (
      panoLoc &&
      Number.isFinite(panoLoc.lat) &&
      Number.isFinite(panoLoc.lng) &&
      haversineMeters(panoLoc.lat, panoLoc.lng, lat, lng) >= 5
    ) {
      heading = Math.round(bearingDegrees(panoLoc.lat, panoLoc.lng, lat, lng));
    }

    const staticUrl = new URL(SV_STATIC_URL);
    staticUrl.searchParams.set("size", "640x400");
    staticUrl.searchParams.set("key", key);
    staticUrl.searchParams.set("fov", "80");
    staticUrl.searchParams.set("pitch", "0");
    if (panoId) {
      staticUrl.searchParams.set("pano", panoId);
    } else {
      staticUrl.searchParams.set("location", latLng);
    }
    if (heading !== undefined) {
      staticUrl.searchParams.set("heading", String(heading));
    }

    const imgRes = await fetch(staticUrl.toString());
    if (!imgRes.ok) {
      res.status(404).json({
        success: false,
        message: "Street View image could not be loaded.",
      });
      return;
    }

    const contentType = imgRes.headers.get("content-type") ?? "image/jpeg";
    const buffer = Buffer.from(await imgRes.arrayBuffer());
    res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", "private, max-age=86400");
    res.status(200).send(buffer);
  } catch (e) {
    console.error("getStreetViewForAddress:", e);
    res.status(500).json({ success: false, message: "Internal error loading Street View." });
  }
}
