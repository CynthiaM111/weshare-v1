import type { SVGProps } from "react";

export function GooglePlayIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" {...props}>
      <path
        d="M3.6 2.1c-.4.3-.6.8-.6 1.4v17c0 .6.2 1.1.6 1.4l9.7-9.9L3.6 2.1Z"
        fill="#FFFFFF"
      />
      <path
        d="m17.2 8.4-3-1.7L3.9 2.0c-.1 0-.2-.1-.3-.1l9.7 9.9 3.9-3.4Z"
        fill="#FFFFFF"
        opacity="0.95"
      />
      <path
        d="M21 11.0c-.3-.2-.7-.4-.7-.4l-3.1-1.8L13 12l4.2 3.2 3.1-1.8s.4-.2.7-.4c.7-.5.7-1.5 0-2Z"
        fill="#FFFFFF"
        opacity="0.85"
      />
      <path
        d="m17.2 15.6-4.0-3.4L3.6 22.1c.4.3 1 .3 1.6-.0l12-6.5Z"
        fill="#FFFFFF"
        opacity="0.9"
      />
    </svg>
  );
}

export function AppleIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" {...props}>
      <path d="M16.365 1.43c0 1.14-.448 2.232-1.18 3.013-.77.825-2.07 1.456-3.13 1.371-.123-1.08.402-2.196 1.092-2.916.78-.816 2.115-1.42 3.218-1.468ZM20.5 17.45c-.494 1.141-.726 1.647-1.36 2.654-.886 1.404-2.137 3.152-3.687 3.165-1.377.013-1.73-.897-3.6-.886-1.872.012-2.262.9-3.64.886-1.55-.013-2.737-1.594-3.624-2.998C2.094 16.265 1.785 11.13 3.51 8.4c1.226-1.94 3.16-3.073 4.976-3.073 1.85 0 3.013 1.014 4.546 1.014 1.487 0 2.395-1.015 4.535-1.015 1.62 0 3.336.882 4.55 2.402-3.997 2.186-3.345 7.886-1.617 9.722Z" />
    </svg>
  );
}
