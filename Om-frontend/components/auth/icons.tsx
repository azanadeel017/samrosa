import type { SVGProps } from "react";

/**
 * Shared line-icon set for auth screens: 24x24 viewBox, 1.5px stroke, round
 * caps/joins, no fills — kept consistent so nothing needs a third-party
 * icon package for this step.
 */
function base(props: SVGProps<SVGSVGElement>) {
  return {
    viewBox: "0 0 24 24",
    fill: "none" as const,
    stroke: "currentColor",
    strokeWidth: 1.5,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
    ...props,
  };
}

export function BowlIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <path d="M3.5 12h17a7.5 7.5 0 0 1-17 0Z" />
      <path d="M2 12h20" />
      <path d="M9 4.5c0 1-1.2 1-1.2 2.2S9 8 9 9" />
      <path d="M13.5 3.5c0 1-1.2 1-1.2 2.2s1.2 1.3 1.2 2.3" />
    </svg>
  );
}

export function HouseHeartIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <path d="M4 11.5 12 4l8 7.5" />
      <path d="M6 10v9.5a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V10" />
      <path d="M12 19v-3.2c-2.4-1.3-3.6-2.6-3.6-4.1a1.9 1.9 0 0 1 3.6-1 1.9 1.9 0 0 1 3.6 1c0 1.5-1.2 2.8-3.6 4.1Z" />
    </svg>
  );
}

export function CarIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <path d="M4 16.5 5 10.8c.2-1 1-1.8 2-1.8h10c1 0 1.8.7 2 1.8l1 5.7" />
      <path d="M3.2 16.5h17.6v2.8a1 1 0 0 1-1 1H4.2a1 1 0 0 1-1-1Z" />
      <circle cx="7.5" cy="19.3" r="1.4" />
      <circle cx="16.5" cy="19.3" r="1.4" />
      <path d="M5 13h14" />
    </svg>
  );
}

export function EyeIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
      <circle cx="12" cy="12" r="2.75" />
    </svg>
  );
}

export function EyeOffIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <path d="M3.5 3.5l17 17" />
      <path d="M10.6 5.6A10.4 10.4 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5a15.7 15.7 0 0 1-3.2 4" />
      <path d="M6.6 6.7C4.3 8.2 2.5 12 2.5 12s3.5 6.5 9.5 6.5c1.4 0 2.6-.3 3.7-.9" />
      <path d="M9.9 10.1a2.75 2.75 0 0 0 3.9 3.9" />
    </svg>
  );
}

export function CheckIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <path d="M5 12.5 9.5 17 19 7" />
    </svg>
  );
}

export function ChevronLeftIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <path d="M15 5.5 8.5 12l6.5 6.5" />
    </svg>
  );
}

export function InfoIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5.5" />
      <circle cx="12" cy="8" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function AlertIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <path d="M12 3.5 21.5 20h-19Z" />
      <path d="M12 9.5v5" />
      <circle cx="12" cy="17.2" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function UploadIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <path d="M12 15.5V4.5" />
      <path d="M8 8.5 12 4l4 4.5" />
      <path d="M4.5 15.5v3a1.5 1.5 0 0 0 1.5 1.5h12a1.5 1.5 0 0 0 1.5-1.5v-3" />
    </svg>
  );
}
