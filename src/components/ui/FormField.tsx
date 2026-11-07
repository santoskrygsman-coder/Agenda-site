"use client";

import React from "react";
import { AlertCircle } from "lucide-react";

interface FormFieldProps {
  icon: React.ReactNode;
  rightIcon?: React.ReactNode;
  placeholder: string;
  subPlaceholder?: string;
  value: string;
  onChange: (val: string) => void;
  onBlur?: () => void;
  error?: string | null;
  multiline?: boolean;
  type?: string;
}

export default function FormField({
  icon,
  rightIcon,
  placeholder,
  subPlaceholder,
  value,
  onChange,
  onBlur,
  error,
  multiline = false,
  type = "text",
}: FormFieldProps) {
  const hasError = Boolean(error);

  if (multiline) {
    return (
      <div className="w-full">
        <div
          className={`w-full rounded-[14px] px-3.5 py-3 transition-colors border ${
            hasError
              ? "bg-[#FDF4F4] border-[#C95B59] focus-within:border-[#B84A48]"
              : "bg-[#FAF5F0] border-[#E6D8CF] focus-within:border-[#B87472]"
          }`}
        >
          <div className="flex items-center gap-3 pb-2.5 border-b border-[#EFE5DE]">
            <span
              className={`shrink-0 ${
                hasError ? "text-[#B84A48]" : "text-[#4B3630]"
              }`}
            >
              {icon}
            </span>
            <span className="text-[13.5px] text-[#7D6A63]">{placeholder}</span>
          </div>
          <textarea
            rows={2}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onBlur={onBlur}
            placeholder={subPlaceholder || ""}
            aria-invalid={hasError}
            className="w-full bg-transparent pt-2 text-[13.5px] text-[#2D1C18] placeholder-[#8A766F] focus:outline-none resize-none"
          />
        </div>
        {hasError && (
          <p className="mt-1 px-1 text-[11.5px] font-medium text-[#B84A48] flex items-center gap-1">
            <AlertCircle size={12.5} className="shrink-0" />
            <span>{error}</span>
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="w-full">
      <div
        className={`w-full rounded-[14px] px-3.5 py-3 flex items-center gap-3 transition-colors border ${
          hasError
            ? "bg-[#FDF4F4] border-[#C95B59] focus-within:border-[#B84A48]"
            : "bg-[#FAF5F0] border-[#E6D8CF] focus-within:border-[#B87472]"
        }`}
      >
        <span
          className={`shrink-0 ${
            hasError ? "text-[#B84A48]" : "text-[#4B3630]"
          }`}
        >
          {icon}
        </span>
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          placeholder={placeholder}
          aria-invalid={hasError}
          className="flex-1 bg-transparent text-[13.5px] text-[#2D1C18] placeholder-[#7D6A63] focus:outline-none min-w-0"
        />
        {rightIcon && <span className="shrink-0 text-[#4B3630]">{rightIcon}</span>}
      </div>
      {hasError && (
        <p className="mt-1 px-1 text-[11.5px] font-medium text-[#B84A48] flex items-center gap-1">
          <AlertCircle size={12.5} className="shrink-0" />
          <span>{error}</span>
        </p>
      )}
    </div>
  );
}
