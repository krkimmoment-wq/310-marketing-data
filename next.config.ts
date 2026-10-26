import type { NextConfig } from "next";
import { LEGACY_REDIRECTS } from "./src/lib/nav";

const nextConfig: NextConfig = {
  // 메뉴 정리(2026-10-26): 옛 화면 주소 → 새 메뉴의 탭으로 임시 연결(307). 목록은 src/lib/nav.ts
  async redirects() {
    return LEGACY_REDIRECTS;
  },
};

export default nextConfig;
