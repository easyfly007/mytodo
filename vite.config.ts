import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// https://vite.dev/config/
export default defineConfig(() => {
  const base = "/mytodo/";
  const plugins = [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["vite.svg"],
      manifest: {
        name: "MyTodo",
        short_name: "MyTodo",
        description: "跨设备同步的个人 Todo",
        theme_color: "#111827",
        background_color: "#f6f7fb",
        display: "standalone",
        start_url: base,
        scope: base,
        icons: [
          {
            src: `${base}vite.svg`,
            sizes: "any",
            type: "image/svg+xml",
          },
        ],
      },
    }),
  ];
  return {
    base,
    plugins,
  };
});
