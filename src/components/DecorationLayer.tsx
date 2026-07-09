import type { Palette } from "@/lib/colorThemes";
import type { DecorationChoice } from "@/lib/templates";

interface DecorationLayerProps {
  decoration: DecorationChoice;
  palette: Palette;
}

export function DecorationLayer({ decoration, palette }: DecorationLayerProps) {
  if (decoration === "none") {
    return null;
  }

  return (
    <svg
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 h-full w-full overflow-visible"
      fill="none"
      preserveAspectRatio="none"
      viewBox="0 0 100 100"
    >
      {decoration === "heart" ? <HeartDecoration palette={palette} /> : null}
      {decoration === "leaf" ? <LeafDecoration palette={palette} /> : null}
      {decoration === "curve" ? <CurveDecoration palette={palette} /> : null}
      {decoration === "dotted" ? <DottedDecoration palette={palette} /> : null}
      {decoration === "bubble" ? <BubbleDecoration palette={palette} /> : null}
      {decoration === "star" ? <StarDecoration palette={palette} /> : null}
    </svg>
  );
}

function HeartDecoration({ palette }: { palette: Palette }) {
  return (
    <g opacity="0.92">
      <path
        d="M12 31C6 25 6 18 12 17C15 16.5 17.5 18.4 19 21C20.5 18.4 23 16.5 26 17C32 18 32 25 26 31L19 37L12 31Z"
        stroke={palette.sub}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.4"
        vectorEffect="non-scaling-stroke"
      />
      <path
        d="M74 18C71 15 71.4 11.5 74.5 11C76 10.8 77.3 11.7 78 13C78.7 11.7 80 10.8 81.5 11C84.6 11.5 85 15 82 18L78 21.5L74 18Z"
        fill={palette.accent}
        opacity="0.82"
      />
      <path
        d="M14 65C27 55 36 59 46 50C56 41 66 40 84 51"
        stroke={palette.main}
        strokeDasharray="2.2 3.2"
        strokeLinecap="round"
        strokeWidth="1.2"
        vectorEffect="non-scaling-stroke"
      />
      <circle cx="88" cy="54" fill={palette.sub} opacity="0.78" r="1.6" />
      <circle cx="10" cy="68" fill={palette.accent} opacity="0.68" r="1.1" />
    </g>
  );
}

function LeafDecoration({ palette }: { palette: Palette }) {
  return (
    <g opacity="0.9">
      <path
        d="M12 70C20 58 29 56 38 61C28 68 21 72 12 70Z"
        fill={palette.accent}
        opacity="0.2"
      />
      <path
        d="M12 70C20 58 29 56 38 61C28 68 21 72 12 70Z"
        stroke={palette.accent}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.2"
        vectorEffect="non-scaling-stroke"
      />
      <path
        d="M16 68C23 65 29 63 36 61"
        stroke={palette.accent}
        strokeLinecap="round"
        strokeWidth="0.8"
        vectorEffect="non-scaling-stroke"
      />
      <path
        d="M79 28C84 19 91 17 96 20C90 26 85 29 79 28Z"
        fill={palette.sub}
        opacity="0.22"
      />
      <path
        d="M79 28C84 19 91 17 96 20C90 26 85 29 79 28Z"
        stroke={palette.sub}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1"
        vectorEffect="non-scaling-stroke"
      />
      <path
        d="M65 78C73 72 81 71 89 76"
        stroke={palette.main}
        strokeLinecap="round"
        strokeWidth="1.1"
        vectorEffect="non-scaling-stroke"
      />
    </g>
  );
}

function CurveDecoration({ palette }: { palette: Palette }) {
  return (
    <g opacity="0.82">
      <path
        d="M7 61C22 35 38 79 52 54C63 34 75 35 92 46"
        stroke={palette.sub}
        strokeLinecap="round"
        strokeWidth="1.7"
        vectorEffect="non-scaling-stroke"
      />
      <path
        d="M9 68C28 47 39 83 56 63C68 49 80 50 91 58"
        stroke={palette.main}
        strokeLinecap="round"
        strokeWidth="0.9"
        vectorEffect="non-scaling-stroke"
      />
      <circle cx="19" cy="49" fill={palette.accent} opacity="0.8" r="1.5" />
      <circle cx="82" cy="51" fill={palette.sub} opacity="0.7" r="1.2" />
    </g>
  );
}

function DottedDecoration({ palette }: { palette: Palette }) {
  return (
    <g opacity="0.9">
      <path
        d="M15 25C35 12 57 17 84 32"
        stroke={palette.main}
        strokeDasharray="1.5 3"
        strokeLinecap="round"
        strokeWidth="1.3"
        vectorEffect="non-scaling-stroke"
      />
      <path
        d="M17 76C36 64 60 66 84 78"
        stroke={palette.sub}
        strokeDasharray="1.2 3.4"
        strokeLinecap="round"
        strokeWidth="1.2"
        vectorEffect="non-scaling-stroke"
      />
      <circle cx="12" cy="23" fill={palette.sub} r="1.3" />
      <circle cx="88" cy="79" fill={palette.accent} r="1.5" />
    </g>
  );
}

function BubbleDecoration({ palette }: { palette: Palette }) {
  return (
    <g opacity="0.92">
      <path
        d="M74 18H91C94 18 96 20 96 23V33C96 36 94 38 91 38H83L78 43V38H74C71 38 69 36 69 33V23C69 20 71 18 74 18Z"
        fill={palette.sub}
        opacity="0.16"
      />
      <path
        d="M74 18H91C94 18 96 20 96 23V33C96 36 94 38 91 38H83L78 43V38H74C71 38 69 36 69 33V23C69 20 71 18 74 18Z"
        stroke={palette.sub}
        strokeLinejoin="round"
        strokeWidth="1.1"
        vectorEffect="non-scaling-stroke"
      />
      <path
        d="M74 29H90M74 24H86"
        stroke={palette.main}
        strokeLinecap="round"
        strokeWidth="0.8"
        vectorEffect="non-scaling-stroke"
      />
      <path
        d="M11 68C20 55 36 56 47 65"
        stroke={palette.accent}
        strokeLinecap="round"
        strokeWidth="1.2"
        vectorEffect="non-scaling-stroke"
      />
    </g>
  );
}

function StarDecoration({ palette }: { palette: Palette }) {
  return (
    <g opacity="0.9">
      <path
        d="M15 23L17.4 28.2L23 29L19 33L20 38.6L15 35.9L10 38.6L11 33L7 29L12.6 28.2L15 23Z"
        fill={palette.sub}
        opacity="0.78"
      />
      <path
        d="M82 59L84 63.2L88.6 64L85.2 67.2L86 72L82 69.7L78 72L78.8 67.2L75.4 64L80 63.2L82 59Z"
        stroke={palette.accent}
        strokeLinejoin="round"
        strokeWidth="1.2"
        vectorEffect="non-scaling-stroke"
      />
      <path
        d="M24 70H40M28 74H50M75 25H92"
        stroke={palette.main}
        strokeLinecap="round"
        strokeWidth="1.2"
        vectorEffect="non-scaling-stroke"
      />
      <path
        d="M62 27L66 31L75 21"
        stroke={palette.accent}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
        vectorEffect="non-scaling-stroke"
      />
    </g>
  );
}
