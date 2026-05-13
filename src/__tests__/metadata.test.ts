import { describe, expect, it } from "vitest";
import indexHtml from "../../index.html?raw";
import ogImageUrl from "../../public/og-image.png?url";

const metadataDocument = new DOMParser().parseFromString(
  indexHtml,
  "text/html",
);

function metaContent(selector: string): string | null {
  return (
    metadataDocument.querySelector<HTMLMetaElement>(selector)?.content ?? null
  );
}

describe("document metadata", () => {
  it("defines social sharing metadata for link previews", () => {
    const title =
      "Progresifo - Interactive Piano Chord and Progression Practice";
    const description =
      "Learn piano chords and chord progressions with an interactive keyboard, guided practice, and MIDI input.";
    const imagePath = "/og-image.png";

    expect(metadataDocument.title).toBe(title);
    expect(metaContent('meta[name="description"]')).toBe(description);
    expect(metaContent('meta[property="og:title"]')).toBe(title);
    expect(metaContent('meta[property="og:description"]')).toBe(description);
    expect(metaContent('meta[property="og:type"]')).toBe("website");
    expect(metaContent('meta[property="og:image"]')).toBe(imagePath);
    expect(metaContent('meta[property="og:image:width"]')).toBe("1200");
    expect(metaContent('meta[property="og:image:height"]')).toBe("630");
    expect(metaContent('meta[name="twitter:card"]')).toBe(
      "summary_large_image",
    );
    expect(metaContent('meta[name="twitter:title"]')).toBe(title);
    expect(metaContent('meta[name="twitter:description"]')).toBe(description);
    expect(metaContent('meta[name="twitter:image"]')).toBe(imagePath);
    expect(ogImageUrl).toMatch(/\/og-image\.png$/);
  });
});
