import QRCode from "qrcode";

/**
 * Serves the single, common QR code image (PNG) that is printed on every
 * physical AIVA loyalty card. It always points at the same login URL —
 * there is intentionally no per-card/per-customer variant.
 */
export async function GET() {
  const targetUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/login`;

  const pngBuffer = await QRCode.toBuffer(targetUrl, {
    type: "png",
    width: 600,
    margin: 2,
    color: { dark: "#2b2320", light: "#fdfbf8" },
  });

  return new Response(pngBuffer, {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
