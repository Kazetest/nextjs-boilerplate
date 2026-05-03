import ExifReader from "exifreader";

export type ExifResult = {
  ok: boolean;
  reason?: string;
  data: {
    dateTimeOriginal?: string;
    cameraModel?: string;
    software?: string;
    width?: number;
    height?: number;
    raw: Record<string, unknown>;
  };
};

const SUSPICIOUS_SOFTWARE = [
  "midjourney",
  "stable diffusion",
  "stable-diffusion",
  "dall-e",
  "dalle",
  "openai",
  "firefly",
  "imagen",
  "ideogram",
  "leonardo",
  "runway",
  "pika",
  "sora",
];

export async function extractExif(file: File): Promise<ExifResult> {
  try {
    const buffer = await file.arrayBuffer();
    const tags = ExifReader.load(buffer);

    const dateTimeOriginal =
      (tags.DateTimeOriginal as { description?: string } | undefined)
        ?.description ||
      (tags.DateTime as { description?: string } | undefined)?.description;
    const cameraModel =
      (tags.Model as { description?: string } | undefined)?.description ||
      (tags.Make as { description?: string } | undefined)?.description;
    const softwareRaw =
      (tags.Software as { description?: string } | undefined)?.description ||
      "";
    const software = softwareRaw.toLowerCase();
    const width = (tags["Image Width"] as { value?: number } | undefined)
      ?.value;
    const height = (tags["Image Height"] as { value?: number } | undefined)
      ?.value;

    const raw: Record<string, unknown> = {};
    for (const k of Object.keys(tags)) {
      const t = (tags as Record<string, unknown>)[k];
      if (t && typeof t === "object" && "description" in (t as object)) {
        raw[k] = (t as { description: unknown }).description;
      }
    }

    for (const s of SUSPICIOUS_SOFTWARE) {
      if (software.includes(s)) {
        return {
          ok: false,
          reason: `AI 도구로 생성된 이미지로 의심됩니다 (${softwareRaw})`,
          data: {
            dateTimeOriginal,
            cameraModel,
            software,
            width,
            height,
            raw,
          },
        };
      }
    }

    return {
      ok: true,
      data: { dateTimeOriginal, cameraModel, software, width, height, raw },
    };
  } catch {
    // EXIF 파싱 실패해도 통과 — 일부 정상 이미지는 EXIF 없음
    return { ok: true, data: { raw: {} } };
  }
}
