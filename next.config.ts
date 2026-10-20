import type { NextConfig } from "next";

/**
 * DEPLOY_TARGET=gh-pages 일 때만 GitHub Pages용 정적 사이트로 빌드합니다.
 * (https://<user>.github.io/<repo>/ 아래에서 동작하도록 basePath 적용)
 * 일반 `next dev` / `next build`는 기존 설정 그대로입니다.
 */
const isPages = process.env.DEPLOY_TARGET === "gh-pages";
const basePath = isPages ? (process.env.PAGES_BASE_PATH ?? "/frame-fit") : "";

const nextConfig: NextConfig = {
  // 정적 내보내기는 부분 사전 렌더링(PPR)을 지원하지 않아 Pages 빌드에서만 끔
  cacheComponents: !isPages,
  partialPrefetching: !isPages,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  // 클라이언트 코드에서 public/ 파일을 부를 때 쓰는 경로 접두어
  env: { NEXT_PUBLIC_BASE_PATH: basePath },
  ...(isPages
    ? {
        output: "export",
        basePath,
        trailingSlash: true,
        images: { unoptimized: true },
      }
    : {
        // 정적 내보내기에서는 응답 헤더를 설정할 수 없어 서버 실행 시에만 적용
        async headers() {
          return [
            {
              source: "/:path*",
              headers: [
                // 카메라는 이 사이트에서만, 마이크·위치 정보는 사용하지 않음
                { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=()" },
                { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
                { key: "X-Content-Type-Options", value: "nosniff" },
              ],
            },
          ];
        },
      }),
};

export default nextConfig;
