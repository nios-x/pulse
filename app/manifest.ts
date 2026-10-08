import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Pulse · शुगर की देखभाल",
    short_name: "Pulse",
    description: "Sugar care for the whole family. पूरे परिवार के लिए शुगर की देखभाल।",
    start_url: "/home",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    lang: "hi",
    background_color: "#fbfaf6",
    theme_color: "#1b6f73",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
