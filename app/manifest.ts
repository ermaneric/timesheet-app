import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Handyman Timesheets",
    short_name: "Timesheets",
    start_url: "/",
    display: "standalone",
    background_color: "#f6f7f9",
    theme_color: "#0e7c86",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
