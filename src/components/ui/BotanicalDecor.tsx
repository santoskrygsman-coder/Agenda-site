import React from "react";

export function BotanicalSprigRight({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 120 85"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`pointer-events-none select-none ${className}`}
    >
      <path
        d="M116 78C92 60 66 37 38 8"
        stroke="#C2966D"
        strokeWidth="1.3"
        strokeLinecap="round"
        opacity="0.75"
      />
      <path
        d="M90 55C80 46 76 31 84 20C92 31 94 44 90 55Z"
        fill="#D4AF8A"
        fillOpacity="0.55"
        stroke="#C2966D"
        strokeWidth="0.95"
      />
      <path
        d="M72 40C62 31 58 18 66 8C74 18 76 29 72 40Z"
        fill="#D4AF8A"
        fillOpacity="0.5"
        stroke="#C2966D"
        strokeWidth="0.95"
      />
      <path
        d="M96 60C82 61 67 55 58 44C71 43 86 49 96 60Z"
        fill="#D4AF8A"
        fillOpacity="0.55"
        stroke="#C2966D"
        strokeWidth="0.95"
      />
      <path
        d="M76 44C63 45 49 39 40 28C53 27 67 33 76 44Z"
        fill="#D4AF8A"
        fillOpacity="0.45"
        stroke="#C2966D"
        strokeWidth="0.95"
      />
      <path
        d="M106 68C100 57 100 42 108 32C114 42 112 57 106 68Z"
        fill="#D4AF8A"
        fillOpacity="0.6"
        stroke="#C2966D"
        strokeWidth="0.95"
      />
    </svg>
  );
}

export function BotanicalSprigBottomLeft({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 140 95"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`pointer-events-none select-none ${className}`}
    >
      <path
        d="M6 88C34 68 64 48 102 26"
        stroke="#C2966D"
        strokeWidth="1.3"
        strokeLinecap="round"
        opacity="0.7"
      />
      <path
        d="M28 72C24 56 28 39 42 28C44 44 37 61 28 72Z"
        fill="#D4AF8A"
        fillOpacity="0.55"
        stroke="#C2966D"
        strokeWidth="0.95"
      />
      <path
        d="M50 56C46 41 50 26 63 15C65 30 58 45 50 56Z"
        fill="#D4AF8A"
        fillOpacity="0.5"
        stroke="#C2966D"
        strokeWidth="0.95"
      />
      <path
        d="M36 66C52 68 69 61 80 50C65 48 49 55 36 66Z"
        fill="#D4AF8A"
        fillOpacity="0.5"
        stroke="#C2966D"
        strokeWidth="0.95"
      />
      <path
        d="M60 49C75 51 90 44 101 33C86 31 71 38 60 49Z"
        fill="#D4AF8A"
        fillOpacity="0.45"
        stroke="#C2966D"
        strokeWidth="0.95"
      />
    </svg>
  );
}

export function WhatsAppCircleIcon({
  size = 24,
  variant = "light",
}: {
  size?: number;
  variant?: "light" | "green" | "dark";
}) {
  const strokeColor =
    variant === "green"
      ? "#2E8540"
      : variant === "dark"
      ? "#3B2621"
      : "#FFFDFB";
  const bgColor =
    variant === "green"
      ? "rgba(46, 133, 64, 0.1)"
      : variant === "dark"
      ? "transparent"
      : "rgba(255, 255, 255, 0.18)";

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Speech bubble circle with bottom-left tail */}
      <path
        d="M12 3C7.03 3 3 6.92 3 11.75C3 13.54 3.56 15.2 4.52 16.58L3.4 20.4L7.42 19.35C8.76 20.08 10.33 20.5 12 20.5C16.97 20.5 21 16.58 21 11.75C21 6.92 16.97 3 12 3Z"
        fill={bgColor}
        stroke={strokeColor}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      {/* Handset inside bubble */}
      <path
        d="M9.1 8.2C8.8 8.2 8.4 8.5 8.2 8.9C8 9.3 7.9 10 8.5 11.1C9.1 12.2 10.2 13.5 11.7 14.3C12.7 14.9 13.5 15 14 14.9C14.6 14.8 15.1 14.3 15.3 13.8C15.4 13.5 15.4 13.2 15.2 13.1L13.8 12.4C13.6 12.3 13.4 12.3 13.2 12.5L12.6 13.2C12.5 13.3 12.3 13.3 12.1 13.2C11.4 12.9 10.8 12.3 10.3 11.6C10.2 11.4 10.2 11.2 10.4 11.1L10.8 10.6C10.9 10.4 10.9 10.2 10.8 10L10.1 8.5C9.9 8.2 9.7 8.2 9.4 8.2H9.1Z"
        fill={strokeColor}
      />
    </svg>
  );
}
