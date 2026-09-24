// vite.config.js
import react from "file:///F:/Vastora/farmacy_cart/farmcy_kart1/admin/node_modules/@vitejs/plugin-react/dist/index.js";
import { defineConfig } from "file:///F:/Vastora/farmacy_cart/farmcy_kart1/admin/node_modules/vite/dist/node/index.js";
import cssInjectedByJsPlugin from "file:///F:/Vastora/farmacy_cart/farmcy_kart1/admin/node_modules/vite-plugin-css-injected-by-js/dist/esm/index.js";
import { VitePWA } from "file:///F:/Vastora/farmacy_cart/farmcy_kart1/admin/node_modules/vite-plugin-pwa/dist/index.js";
import compression from "file:///F:/Vastora/farmacy_cart/farmcy_kart1/admin/node_modules/vite-plugin-compression2/dist/index.mjs";
import { visualizer } from "file:///F:/Vastora/farmacy_cart/farmcy_kart1/admin/node_modules/rollup-plugin-visualizer/dist/plugin/index.js";
import dns from "dns";
import path from "path";
var __vite_injected_original_dirname = "F:\\Vastora\\farmacy_cart\\farmcy_kart1\\admin";
dns.setDefaultResultOrder("verbatim");
var vite_config_default = defineConfig({
  // root: "./", // Set the root directory of your project
  // base: "/", // Set the base URL path for your application
  build: {
    // outDir: "build", // comment this if you select vite as project when deploy
    assetsDir: "@/assets",
    // Set the directory for the static assets
    // sourcemap: process.env.__DEV__ === "true",
    rollupOptions: {
      // Additional Rollup configuration options if needed
    },
    chunkSizeWarningLimit: 10 * 1024
  },
  plugins: [
    react(),
    cssInjectedByJsPlugin(),
    VitePWA({
      registerType: "autoUpdate",
      devOptions: {
        // enabled: process.env.SW_DEV === "true",
        enabled: false,
        /* when using generateSW the PWA plugin will switch to classic */
        type: "module",
        navigateFallback: "index.html"
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg}"],
        maximumFileSizeToCacheInBytes: 10 * 1024 * 1024
      },
      // add this to cache all the
      // // static assets in the public folder
      // includeAssets: ["**/*"],
      includeAssets: [
        "src/assets/img/logo/*.png",
        "src/assets/img/*.png",
        "src/assets/img/*.jepg",
        "src/assets/img/*.webp",
        "favicon.ico"
      ],
      manifest: {
        theme_color: "#FFFFFF",
        background_color: "#FFFFFF",
        display: "standalone",
        orientation: "portrait",
        scope: ".",
        start_url: ".",
        id: ".",
        short_name: "Farmacykart - E-Commerce Website",
        name: "Farmacykart | React eCommerce Admin Dashboard",
        description: "Farmacykart : React Grocery & Organic Food Store e-commerce Admin Dashboard",
        icons: [
          {
            src: "/favicon-transparent.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any maskable"
          },
          {
            src: "/favicon-transparent.png",
            sizes: "512x512",
            type: "image/png"
          }
        ]
      }
    }),
    compression(),
    visualizer({
      filename: "statistics.html",
      open: true
    })
  ],
  server: {
    proxy: {
      "/api/": {
        target: "http://localhost:5065",
        changeOrigin: true
      }
    }
  },
  define: {
    "process.env": process.env
    // global: {}, //enable this when running on dev/local mode
  },
  resolve: {
    alias: {
      // eslint-disable-next-line no-undef
      "@": path.resolve(__vite_injected_original_dirname, "./src/")
    }
  },
  test: {
    global: true,
    environment: "jsdom",
    setupFiles: ["./src/setupTest.js"]
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcuanMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJGOlxcXFxWYXN0b3JhXFxcXGZhcm1hY3lfY2FydFxcXFxmYXJtY3lfa2FydDFcXFxcYWRtaW5cIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIkY6XFxcXFZhc3RvcmFcXFxcZmFybWFjeV9jYXJ0XFxcXGZhcm1jeV9rYXJ0MVxcXFxhZG1pblxcXFx2aXRlLmNvbmZpZy5qc1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vRjovVmFzdG9yYS9mYXJtYWN5X2NhcnQvZmFybWN5X2thcnQxL2FkbWluL3ZpdGUuY29uZmlnLmpzXCI7aW1wb3J0IHJlYWN0IGZyb20gXCJAdml0ZWpzL3BsdWdpbi1yZWFjdFwiO1xyXG5pbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tIFwidml0ZVwiO1xyXG5pbXBvcnQgY3NzSW5qZWN0ZWRCeUpzUGx1Z2luIGZyb20gXCJ2aXRlLXBsdWdpbi1jc3MtaW5qZWN0ZWQtYnktanNcIjtcclxuaW1wb3J0IHsgVml0ZVBXQSB9IGZyb20gXCJ2aXRlLXBsdWdpbi1wd2FcIjtcclxuaW1wb3J0IGNvbXByZXNzaW9uIGZyb20gXCJ2aXRlLXBsdWdpbi1jb21wcmVzc2lvbjJcIjtcclxuaW1wb3J0IHsgdmlzdWFsaXplciB9IGZyb20gXCJyb2xsdXAtcGx1Z2luLXZpc3VhbGl6ZXJcIjtcclxuXHJcbmltcG9ydCBkbnMgZnJvbSBcImRuc1wiO1xyXG5pbXBvcnQgcGF0aCBmcm9tIFwicGF0aFwiO1xyXG5cclxuZG5zLnNldERlZmF1bHRSZXN1bHRPcmRlcihcInZlcmJhdGltXCIpO1xyXG5cclxuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29uZmlnKHtcclxuICAvLyByb290OiBcIi4vXCIsIC8vIFNldCB0aGUgcm9vdCBkaXJlY3Rvcnkgb2YgeW91ciBwcm9qZWN0XHJcbiAgLy8gYmFzZTogXCIvXCIsIC8vIFNldCB0aGUgYmFzZSBVUkwgcGF0aCBmb3IgeW91ciBhcHBsaWNhdGlvblxyXG5cclxuICBidWlsZDoge1xyXG4gICAgLy8gb3V0RGlyOiBcImJ1aWxkXCIsIC8vIGNvbW1lbnQgdGhpcyBpZiB5b3Ugc2VsZWN0IHZpdGUgYXMgcHJvamVjdCB3aGVuIGRlcGxveVxyXG4gICAgYXNzZXRzRGlyOiBcIkAvYXNzZXRzXCIsIC8vIFNldCB0aGUgZGlyZWN0b3J5IGZvciB0aGUgc3RhdGljIGFzc2V0c1xyXG4gICAgLy8gc291cmNlbWFwOiBwcm9jZXNzLmVudi5fX0RFVl9fID09PSBcInRydWVcIixcclxuICAgIHJvbGx1cE9wdGlvbnM6IHtcclxuICAgICAgLy8gQWRkaXRpb25hbCBSb2xsdXAgY29uZmlndXJhdGlvbiBvcHRpb25zIGlmIG5lZWRlZFxyXG4gICAgfSxcclxuICAgIGNodW5rU2l6ZVdhcm5pbmdMaW1pdDogMTAgKiAxMDI0LFxyXG4gIH0sXHJcbiAgcGx1Z2luczogW1xyXG4gICAgcmVhY3QoKSxcclxuICAgIGNzc0luamVjdGVkQnlKc1BsdWdpbigpLFxyXG5cclxuICAgIFZpdGVQV0Eoe1xyXG4gICAgICByZWdpc3RlclR5cGU6IFwiYXV0b1VwZGF0ZVwiLFxyXG4gICAgICBkZXZPcHRpb25zOiB7XHJcbiAgICAgICAgLy8gZW5hYmxlZDogcHJvY2Vzcy5lbnYuU1dfREVWID09PSBcInRydWVcIixcclxuICAgICAgICBlbmFibGVkOiBmYWxzZSxcclxuICAgICAgICAvKiB3aGVuIHVzaW5nIGdlbmVyYXRlU1cgdGhlIFBXQSBwbHVnaW4gd2lsbCBzd2l0Y2ggdG8gY2xhc3NpYyAqL1xyXG4gICAgICAgIHR5cGU6IFwibW9kdWxlXCIsXHJcbiAgICAgICAgbmF2aWdhdGVGYWxsYmFjazogXCJpbmRleC5odG1sXCIsXHJcbiAgICAgIH0sXHJcbiAgICAgIHdvcmtib3g6IHtcclxuICAgICAgICBnbG9iUGF0dGVybnM6IFtcIioqLyoue2pzLGNzcyxodG1sLGljbyxwbmcsc3ZnfVwiXSxcclxuICAgICAgICBtYXhpbXVtRmlsZVNpemVUb0NhY2hlSW5CeXRlczogMTAgKiAxMDI0ICogMTAyNCxcclxuICAgICAgfSxcclxuXHJcbiAgICAgIC8vIGFkZCB0aGlzIHRvIGNhY2hlIGFsbCB0aGVcclxuICAgICAgLy8gLy8gc3RhdGljIGFzc2V0cyBpbiB0aGUgcHVibGljIGZvbGRlclxyXG4gICAgICAvLyBpbmNsdWRlQXNzZXRzOiBbXCIqKi8qXCJdLFxyXG4gICAgICBpbmNsdWRlQXNzZXRzOiBbXHJcbiAgICAgICAgXCJzcmMvYXNzZXRzL2ltZy9sb2dvLyoucG5nXCIsXHJcbiAgICAgICAgXCJzcmMvYXNzZXRzL2ltZy8qLnBuZ1wiLFxyXG4gICAgICAgIFwic3JjL2Fzc2V0cy9pbWcvKi5qZXBnXCIsXHJcbiAgICAgICAgXCJzcmMvYXNzZXRzL2ltZy8qLndlYnBcIixcclxuICAgICAgICBcImZhdmljb24uaWNvXCIsXHJcbiAgICAgIF0sXHJcbiAgICAgIG1hbmlmZXN0OiB7XHJcbiAgICAgICAgdGhlbWVfY29sb3I6IFwiI0ZGRkZGRlwiLFxyXG4gICAgICAgIGJhY2tncm91bmRfY29sb3I6IFwiI0ZGRkZGRlwiLFxyXG4gICAgICAgIGRpc3BsYXk6IFwic3RhbmRhbG9uZVwiLFxyXG4gICAgICAgIG9yaWVudGF0aW9uOiBcInBvcnRyYWl0XCIsXHJcbiAgICAgICAgc2NvcGU6IFwiLlwiLFxyXG4gICAgICAgIHN0YXJ0X3VybDogXCIuXCIsXHJcbiAgICAgICAgaWQ6IFwiLlwiLFxyXG4gICAgICAgIHNob3J0X25hbWU6IFwiRmFybWFjeWthcnQgLSBFLUNvbW1lcmNlIFdlYnNpdGVcIixcclxuICAgICAgICBuYW1lOiBcIkZhcm1hY3lrYXJ0IHwgUmVhY3QgZUNvbW1lcmNlIEFkbWluIERhc2hib2FyZFwiLFxyXG4gICAgICAgIGRlc2NyaXB0aW9uOlxyXG4gICAgICAgICAgXCJGYXJtYWN5a2FydCA6IFJlYWN0IEdyb2NlcnkgJiBPcmdhbmljIEZvb2QgU3RvcmUgZS1jb21tZXJjZSBBZG1pbiBEYXNoYm9hcmRcIixcclxuICAgICAgICBpY29uczogW1xyXG4gICAgICAgICAge1xyXG4gICAgICAgICAgICBzcmM6IFwiL2Zhdmljb24tdHJhbnNwYXJlbnQucG5nXCIsXHJcbiAgICAgICAgICAgIHNpemVzOiBcIjE5MngxOTJcIixcclxuICAgICAgICAgICAgdHlwZTogXCJpbWFnZS9wbmdcIixcclxuICAgICAgICAgICAgcHVycG9zZTogXCJhbnkgbWFza2FibGVcIixcclxuICAgICAgICAgIH0sXHJcbiAgICAgICAgICB7XHJcbiAgICAgICAgICAgIHNyYzogXCIvZmF2aWNvbi10cmFuc3BhcmVudC5wbmdcIixcclxuICAgICAgICAgICAgc2l6ZXM6IFwiNTEyeDUxMlwiLFxyXG4gICAgICAgICAgICB0eXBlOiBcImltYWdlL3BuZ1wiLFxyXG4gICAgICAgICAgfSxcclxuICAgICAgICBdLFxyXG4gICAgICB9LFxyXG4gICAgfSksXHJcbiAgICBjb21wcmVzc2lvbigpLFxyXG4gICAgdmlzdWFsaXplcih7XHJcbiAgICAgIGZpbGVuYW1lOiBcInN0YXRpc3RpY3MuaHRtbFwiLFxyXG4gICAgICBvcGVuOiB0cnVlLFxyXG4gICAgfSksXHJcbiAgXSxcclxuXHJcbiAgc2VydmVyOiB7XHJcbiAgICBwcm94eToge1xyXG4gICAgICBcIi9hcGkvXCI6IHtcclxuICAgICAgICB0YXJnZXQ6IFwiaHR0cDovL2xvY2FsaG9zdDo1MDY1XCIsXHJcbiAgICAgICAgY2hhbmdlT3JpZ2luOiB0cnVlLFxyXG4gICAgICB9LFxyXG4gICAgfSxcclxuICB9LFxyXG4gIGRlZmluZToge1xyXG4gICAgXCJwcm9jZXNzLmVudlwiOiBwcm9jZXNzLmVudixcclxuICAgIC8vIGdsb2JhbDoge30sIC8vZW5hYmxlIHRoaXMgd2hlbiBydW5uaW5nIG9uIGRldi9sb2NhbCBtb2RlXHJcbiAgfSxcclxuXHJcbiAgcmVzb2x2ZToge1xyXG4gICAgYWxpYXM6IHtcclxuICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLXVuZGVmXHJcbiAgICAgIFwiQFwiOiBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCBcIi4vc3JjL1wiKSxcclxuICAgIH0sXHJcbiAgfSxcclxuICB0ZXN0OiB7XHJcbiAgICBnbG9iYWw6IHRydWUsXHJcbiAgICBlbnZpcm9ubWVudDogXCJqc2RvbVwiLFxyXG4gICAgc2V0dXBGaWxlczogW1wiLi9zcmMvc2V0dXBUZXN0LmpzXCJdLFxyXG4gIH0sXHJcbn0pO1xyXG4iXSwKICAibWFwcGluZ3MiOiAiO0FBQTBULE9BQU8sV0FBVztBQUM1VSxTQUFTLG9CQUFvQjtBQUM3QixPQUFPLDJCQUEyQjtBQUNsQyxTQUFTLGVBQWU7QUFDeEIsT0FBTyxpQkFBaUI7QUFDeEIsU0FBUyxrQkFBa0I7QUFFM0IsT0FBTyxTQUFTO0FBQ2hCLE9BQU8sVUFBVTtBQVJqQixJQUFNLG1DQUFtQztBQVV6QyxJQUFJLHNCQUFzQixVQUFVO0FBRXBDLElBQU8sc0JBQVEsYUFBYTtBQUFBO0FBQUE7QUFBQSxFQUkxQixPQUFPO0FBQUE7QUFBQSxJQUVMLFdBQVc7QUFBQTtBQUFBO0FBQUEsSUFFWCxlQUFlO0FBQUE7QUFBQSxJQUVmO0FBQUEsSUFDQSx1QkFBdUIsS0FBSztBQUFBLEVBQzlCO0FBQUEsRUFDQSxTQUFTO0FBQUEsSUFDUCxNQUFNO0FBQUEsSUFDTixzQkFBc0I7QUFBQSxJQUV0QixRQUFRO0FBQUEsTUFDTixjQUFjO0FBQUEsTUFDZCxZQUFZO0FBQUE7QUFBQSxRQUVWLFNBQVM7QUFBQTtBQUFBLFFBRVQsTUFBTTtBQUFBLFFBQ04sa0JBQWtCO0FBQUEsTUFDcEI7QUFBQSxNQUNBLFNBQVM7QUFBQSxRQUNQLGNBQWMsQ0FBQyxnQ0FBZ0M7QUFBQSxRQUMvQywrQkFBK0IsS0FBSyxPQUFPO0FBQUEsTUFDN0M7QUFBQTtBQUFBO0FBQUE7QUFBQSxNQUtBLGVBQWU7QUFBQSxRQUNiO0FBQUEsUUFDQTtBQUFBLFFBQ0E7QUFBQSxRQUNBO0FBQUEsUUFDQTtBQUFBLE1BQ0Y7QUFBQSxNQUNBLFVBQVU7QUFBQSxRQUNSLGFBQWE7QUFBQSxRQUNiLGtCQUFrQjtBQUFBLFFBQ2xCLFNBQVM7QUFBQSxRQUNULGFBQWE7QUFBQSxRQUNiLE9BQU87QUFBQSxRQUNQLFdBQVc7QUFBQSxRQUNYLElBQUk7QUFBQSxRQUNKLFlBQVk7QUFBQSxRQUNaLE1BQU07QUFBQSxRQUNOLGFBQ0U7QUFBQSxRQUNGLE9BQU87QUFBQSxVQUNMO0FBQUEsWUFDRSxLQUFLO0FBQUEsWUFDTCxPQUFPO0FBQUEsWUFDUCxNQUFNO0FBQUEsWUFDTixTQUFTO0FBQUEsVUFDWDtBQUFBLFVBQ0E7QUFBQSxZQUNFLEtBQUs7QUFBQSxZQUNMLE9BQU87QUFBQSxZQUNQLE1BQU07QUFBQSxVQUNSO0FBQUEsUUFDRjtBQUFBLE1BQ0Y7QUFBQSxJQUNGLENBQUM7QUFBQSxJQUNELFlBQVk7QUFBQSxJQUNaLFdBQVc7QUFBQSxNQUNULFVBQVU7QUFBQSxNQUNWLE1BQU07QUFBQSxJQUNSLENBQUM7QUFBQSxFQUNIO0FBQUEsRUFFQSxRQUFRO0FBQUEsSUFDTixPQUFPO0FBQUEsTUFDTCxTQUFTO0FBQUEsUUFDUCxRQUFRO0FBQUEsUUFDUixjQUFjO0FBQUEsTUFDaEI7QUFBQSxJQUNGO0FBQUEsRUFDRjtBQUFBLEVBQ0EsUUFBUTtBQUFBLElBQ04sZUFBZSxRQUFRO0FBQUE7QUFBQSxFQUV6QjtBQUFBLEVBRUEsU0FBUztBQUFBLElBQ1AsT0FBTztBQUFBO0FBQUEsTUFFTCxLQUFLLEtBQUssUUFBUSxrQ0FBVyxRQUFRO0FBQUEsSUFDdkM7QUFBQSxFQUNGO0FBQUEsRUFDQSxNQUFNO0FBQUEsSUFDSixRQUFRO0FBQUEsSUFDUixhQUFhO0FBQUEsSUFDYixZQUFZLENBQUMsb0JBQW9CO0FBQUEsRUFDbkM7QUFDRixDQUFDOyIsCiAgIm5hbWVzIjogW10KfQo=
