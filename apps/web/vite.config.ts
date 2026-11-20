import { resolve } from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        verify: resolve(__dirname, "verify.html"),
        matrix: resolve(__dirname, "matrix.html"),
        documents: resolve(__dirname, "documents.html"),
        protocol: resolve(__dirname, "protocol.html"),
        changelog: resolve(__dirname, "changelog.html"),
      },
    },
  },
});
