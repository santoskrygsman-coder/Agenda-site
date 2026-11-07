import React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

interface PrimaryButtonProps {
  children: React.ReactNode;
  href?: string;
  onClick?: () => void;
  variant?: "rose" | "confirm" | "neutral" | "danger-soft";
  showArrow?: boolean;
  leftIcon?: React.ReactNode;
  className?: string;
  type?: "button" | "submit";
  disabled?: boolean;
}

export default function PrimaryButton({
  children,
  href,
  onClick,
  variant = "rose",
  showArrow = false,
  leftIcon,
  className = "",
  type = "button",
  disabled = false,
}: PrimaryButtonProps) {
  const baseStyles =
    "w-full min-h-[48px] rounded-[15px] py-3.5 px-5 text-[15px] font-medium transition-all duration-200 active:scale-[0.99] flex items-center justify-center relative select-none touch-manipulation";

  const variantStyles = {
    rose: "bg-[#B87472] hover:bg-[#A86462] text-[#FFFDFB] shadow-[0_2px_8px_rgba(184,116,114,0.22)]",
    confirm: "bg-[#2E8540] hover:bg-[#277337] text-white font-semibold",
    neutral:
      "bg-[#EBE3DD] hover:bg-[#E2D8D0] text-[#2D1C18] font-semibold border border-[#E0D5CD]",
    "danger-soft":
      "bg-[#F3D8D8] hover:bg-[#ECCACA] text-[#B84A48] font-semibold",
  }[variant];

  const content = (
    <>
      {leftIcon && <span className="mr-2 flex items-center">{leftIcon}</span>}
      <span className="text-center leading-snug">{children}</span>
      {showArrow && (
        <ArrowRight
          size={18}
          strokeWidth={2}
          className="absolute right-4 min-[375px]:right-5 text-white/95"
        />
      )}
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        onClick={onClick}
        className={`${baseStyles} ${variantStyles} ${className}`}
      >
        {content}
      </Link>
    );
  }

  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`${baseStyles} ${variantStyles} ${
        disabled ? "opacity-55 cursor-not-allowed" : ""
      } ${className}`}
    >
      {content}
    </button>
  );
}
