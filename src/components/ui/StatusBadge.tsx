import React from "react";
import { AppointmentItem } from "@/lib/mockData";

interface StatusBadgeProps {
  status: AppointmentItem["status"];
  label: string;
  size?: "sm" | "md";
}

export default function StatusBadge({
  status,
  label,
  size = "sm",
}: StatusBadgeProps) {
  const styles = {
    concluido: "bg-[#D5ECDA] text-[#3B844E]",
    confirmado: "bg-[#D8EFDC] text-[#3B844E]",
    aguardando: "bg-[#F7E3C0] text-[#9A6824]",
    agendado: "bg-[#E5DFDB] text-[#4E423E]",
  }[status];

  if (size === "sm" && status === "aguardando") {
    return (
      <span
        className={`inline-block ${styles} px-3 py-1 text-[11px] font-medium rounded-[12px] text-center leading-[1.15]`}
      >
        Aguardando
        <br />
        pagamento
      </span>
    );
  }

  const sizeStyles =
    size === "md"
      ? "px-4 py-1.5 text-[12.5px] font-semibold rounded-full"
      : "px-3 py-1 text-[11.5px] font-medium rounded-full text-center leading-tight";

  return <span className={`inline-block ${styles} ${sizeStyles}`}>{label}</span>;
}
