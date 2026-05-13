import "@testing-library/jest-dom/vitest";

Object.defineProperty(HTMLCanvasElement.prototype, "getContext", {
  configurable: true,
  value: () =>
    ({
      measureText: (text: string) => ({
        actualBoundingBoxAscent: 12,
        actualBoundingBoxDescent: 4,
        actualBoundingBoxLeft: 0,
        actualBoundingBoxRight: text.length * 7,
        alphabeticBaseline: 0,
        emHeightAscent: 12,
        emHeightDescent: 4,
        fontBoundingBoxAscent: 12,
        fontBoundingBoxDescent: 4,
        hangingBaseline: 0,
        ideographicBaseline: 0,
        width: text.length * 7,
      }),
    }) as CanvasRenderingContext2D,
});
