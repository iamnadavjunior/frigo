import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "CABU Technician",
    short_name: "Tech App",
    description: "Technician job management for CABU Fridge System",
    start_url: "/",
    display: "standalone",
    background_color: "#0a0a0a",
    theme_color: "#14b8a6",
    orientation: "portrait",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    categories: ["productivity", "utilities"],
  };
}
