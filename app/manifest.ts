import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "NOai — AI를 쓰지 못하는 SNS",
    short_name: "NOai",
    description:
      "AI 시대의 인스타그램. 모든 사진과 글은 진짜 사람이 찍고 쓴 것만.",
    start_url: "/feed",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#fafaf7",
    theme_color: "#1a1a1a",
    lang: "ko",
    icons: [
      {
        src: "/favicon.ico",
        sizes: "any",
        type: "image/x-icon",
      },
    ],
  };
}
