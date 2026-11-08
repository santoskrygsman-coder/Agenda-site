"use client";

import React, { useRef, useState } from "react";
import {
  Plus,
  X,
  Trash2,
  Camera,
  Image as ImageIcon,
  ClipboardPaste,
  Search,
  Sparkles,
  Check,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import MobileContainer from "@/components/ui/MobileContainer";
import PageHeader from "@/components/ui/PageHeader";
import ServiceCard, {
  resolveHdServiceImage,
} from "@/components/ui/ServiceCard";
import PrimaryButton from "@/components/ui/PrimaryButton";
import { useBooking } from "@/context/BookingContext";
import { ServiceItem } from "@/lib/mockData";
import { calculateSignalInCents } from "@/lib/formatters";

const IMAGE_OPTIONS = [
  { label: "Catálogo: Extensão Clássica (HD)", value: "/images/service-classica.png" },
  { label: "Catálogo: Volume Brasileiro (HD)", value: "/images/service-brasileiro.png" },
  { label: "Catálogo: Volume Híbrido (HD)", value: "/images/service-hibrido.png" },
  { label: "Catálogo: Volume Russo (HD)", value: "/images/service-russo.png" },
  { label: "Catálogo: Manutenção (HD)", value: "/images/service-manutencao.png" },
  { label: "Catálogo: Remoção (HD)", value: "/images/service-remocao.png" },
];

const DEPOSIT_PRESETS = [20, 30, 40, 50, 100];
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10 MB

async function preparePhotoDataUrl(file: File | Blob): Promise<string> {
  const mime = (file.type || "image/jpeg").toLowerCase();
  const outputMime =
    mime === "image/png"
      ? "image/png"
      : mime === "image/webp"
      ? "image/webp"
      : "image/jpeg";

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Falha ao ler imagem"));
    reader.onload = () => {
      const rawDataUrl = String(reader.result || "");
      // Preserva arquivos menores que 1.5 MB sem recompressão desnecessária
      if (file.size <= 1.5 * 1024 * 1024 && rawDataUrl.startsWith("data:image/")) {
        resolve(rawDataUrl);
        return;
      }

      const img = new Image();
      img.onerror = () => resolve(rawDataUrl);
      img.onload = () => {
        try {
          const maxDim = 1400;
          let width = img.naturalWidth || img.width || 800;
          let height = img.naturalHeight || img.height || 800;
          if (width > maxDim || height > maxDim) {
            if (width >= height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }
          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            resolve(rawDataUrl);
            return;
          }
          ctx.drawImage(img, 0, 0, width, height);
          const compressed =
            outputMime === "image/png"
              ? canvas.toDataURL("image/png")
              : canvas.toDataURL(outputMime, 0.86);
          resolve(compressed);
        } catch {
          resolve(rawDataUrl);
        }
      };
      img.src = rawDataUrl;
    };
    reader.readAsDataURL(file);
  });
}

export default function AdminServicesPage() {
  const {
    allServices,
    refreshServices,
    toggleServiceActive,
    createOrUpdateService,
    deleteService,
  } = useBooking();

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const unsavedUploadedUrlRef = useRef<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<ServiceItem | null>(
    null
  );
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [durationMinutes, setDurationMinutes] = useState("90");
  const [image, setImage] = useState("/images/service-classica.png");
  const [requiresDeposit, setRequiresDeposit] = useState(true);
  const [depositPercentage, setDepositPercentage] = useState("50");
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [feedbackMsg, setFeedbackMsg] = useState("");

  React.useEffect(() => {
    refreshServices(true);
  }, [refreshServices]);

  // Modal de pré-visualização da lupa em HD dentro do admin
  const [previewZoomOpen, setPreviewZoomOpen] = useState(false);
  const [previewMagnified, setPreviewMagnified] = useState(false);

  const cleanupUnsavedUploadIfNeeded = async () => {
    const tempUrl = unsavedUploadedUrlRef.current;
    unsavedUploadedUrlRef.current = null;
    if (tempUrl) {
      await fetch("/api/upload", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: tempUrl }),
      }).catch(() => {});
    }
  };

  const closeModal = () => {
    void cleanupUnsavedUploadIfNeeded();
    setModalOpen(false);
  };

  const openNewModal = () => {
    unsavedUploadedUrlRef.current = null;
    setEditingService(null);
    setName("");
    setDescription("");
    setPrice("");
    setDurationMinutes("90");
    setImage("/images/service-classica.png");
    setRequiresDeposit(true);
    setDepositPercentage("50");
    setUploadSuccess("");
    setErrorMsg("");
    setModalOpen(true);
  };

  const openEditModal = (svc: ServiceItem) => {
    unsavedUploadedUrlRef.current = null;
    setEditingService(svc);
    setName(svc.name);
    setDescription(svc.description || "");
    setPrice(String(svc.price));
    setDurationMinutes(String(svc.durationMinutes || 90));
    setImage(svc.image || "/images/service-classica.png");
    setRequiresDeposit(svc.requiresDeposit !== false);
    setDepositPercentage(String(svc.depositPercentage ?? 50));
    setUploadSuccess("");
    setErrorMsg("");
    setModalOpen(true);
  };

  const uploadRealPhotoBlob = async (file: File | Blob) => {
    setErrorMsg("");
    setUploadSuccess("");

    const rawMime = (file.type || "").toLowerCase();
    if (rawMime && !ALLOWED_MIME_TYPES.includes(rawMime)) {
      setErrorMsg("Formato inválido. Selecione uma foto JPG, PNG ou WebP.");
      return;
    }

    if (file.size > MAX_UPLOAD_BYTES) {
      setErrorMsg("A foto selecionada excede o limite máximo de 10 MB.");
      return;
    }

    setUploadingPhoto(true);
    try {
      const optimizedDataUrl = await preparePhotoDataUrl(file);

      const res = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dataUrl: optimizedDataUrl,
          previousUrl: unsavedUploadedUrlRef.current,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (res.ok && data.url) {
        unsavedUploadedUrlRef.current = data.url;
        setImage(data.url);
        setUploadSuccess(
          "Foto personalizada enviada! Toque em 'Salvar serviço' para concluir."
        );
      } else {
        setErrorMsg(data.error || "Não foi possível enviar a foto para o servidor.");
      }
    } catch {
      setErrorMsg("Erro de conexão ao enviar a fotografia. Tente novamente.");
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await uploadRealPhotoBlob(file);
    e.target.value = "";
  };

  const handleRemoveCustomPhoto = async () => {
    setErrorMsg("");
    setUploadSuccess("");
    await cleanupUnsavedUploadIfNeeded();
    setImage("/images/service-classica.png");
    setUploadSuccess(
      "Foto personalizada removida. Toque em 'Salvar serviço' para confirmar."
    );
  };

  const handlePastePhoto = async () => {
    setErrorMsg("");
    if (
      typeof navigator !== "undefined" &&
      navigator.clipboard &&
      "read" in navigator.clipboard
    ) {
      try {
        const items = await navigator.clipboard.read();
        for (const item of items) {
          const imageType = item.types.find((t) => t.startsWith("image/"));
          if (imageType) {
            const blob = await item.getType(imageType);
            await uploadRealPhotoBlob(blob);
            return;
          }
        }
        setErrorMsg(
          "Nenhuma imagem encontrada na área de transferência. Use 'Enviar foto real'."
        );
      } catch {
        fileInputRef.current?.click();
      }
    } else {
      fileInputRef.current?.click();
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    const parsedPrice = Number(String(price).replace(",", "."));
    const parsedDuration = Number(durationMinutes);
    const rawPct = Number(String(depositPercentage).replace(",", "."));

    if (!name.trim()) {
      setErrorMsg("Informe o nome do serviço.");
      return;
    }
    if (!Number.isFinite(parsedPrice) || parsedPrice < 0) {
      setErrorMsg("Informe um preço válido.");
      return;
    }
    if (!Number.isFinite(parsedDuration) || parsedDuration < 15) {
      setErrorMsg("A duração mínima é de 15 minutos.");
      return;
    }
    if (requiresDeposit) {
      if (
        String(depositPercentage).trim() === "" ||
        !Number.isFinite(rawPct) ||
        rawPct < 1 ||
        rawPct > 100
      ) {
        setErrorMsg("O percentual do sinal deve estar entre 1% e 100%.");
        return;
      }
    }

    const parsedDepositPct = requiresDeposit
      ? Math.round(rawPct)
      : Math.min(100, Math.max(1, Math.round(rawPct || 50)));

    setSaving(true);
    const res = await createOrUpdateService({
      id: editingService?.id,
      name: name.trim(),
      description: description.trim(),
      price: parsedPrice,
      durationMinutes: parsedDuration,
      image,
      active: editingService ? editingService.active : true,
      requiresDeposit,
      depositPercentage: parsedDepositPct,
    });
    setSaving(false);

    if (!res.ok) {
      setErrorMsg(res.error || "Não foi possível salvar o serviço.");
    } else {
      unsavedUploadedUrlRef.current = null;
      setModalOpen(false);
      setFeedbackMsg(
        editingService
          ? "Serviço atualizado com sucesso!"
          : "Novo serviço cadastrado com sucesso!"
      );
      setTimeout(() => setFeedbackMsg(""), 3000);
    }
  };

  const handleDelete = async () => {
    if (!editingService) return;
    setSaving(true);
    const res = await deleteService(editingService.id);
    setSaving(false);
    if (!res.ok) {
      setErrorMsg(res.error || "Não foi possível excluir.");
    } else {
      await cleanupUnsavedUploadIfNeeded();
      setModalOpen(false);
      setFeedbackMsg("Serviço excluído com sucesso!");
      setTimeout(() => setFeedbackMsg(""), 2500);
    }
  };

  const isCustomUploadedPhoto = !IMAGE_OPTIONS.some(
    (opt) => opt.value === image
  );
  const currentHdPreview = resolveHdServiceImage(image);

  return (
    <MobileContainer showAdminNav activeAdminTab="servicos">
      <PageHeader
        title="Meus serviços"
        leftType="menu"
        rightType="botanical"
      />

      <div className="px-4 pt-1 pb-5 flex-1 flex flex-col">
        <p className="text-[11.5px] text-[#6E5850] px-1 mb-2">
          Toque em um serviço para editar preço, duração, sinal Pix ou enviar uma{" "}
          <strong className="text-[#2D1C18]">foto real em alta definição</strong>{" "}
          para a lupa da cliente.
        </p>

        {feedbackMsg && (
          <div className="mb-2.5 bg-[#D8EFDC] border border-[#BDE2C4] text-[#2E8540] text-[12px] font-semibold px-3 py-2 rounded-[12px] text-center">
            {feedbackMsg}
          </div>
        )}

        <div className="space-y-2.5">
          {allServices.map((svc) => (
            <ServiceCard
              key={svc.id}
              service={svc}
              mode="admin"
              onToggleActive={toggleServiceActive}
              onEdit={openEditModal}
            />
          ))}
        </div>

        <div className="mt-3.5">
          <PrimaryButton
            variant="rose"
            leftIcon={<Plus size={17} strokeWidth={2.3} />}
            onClick={openNewModal}
          >
            Novo serviço
          </PrimaryButton>
        </div>
      </div>

      {/* Modal de Cadastro / Edição de Serviço com Upload de Foto Real em HD */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-[#2D1C18]/50 p-2.5 min-[375px]:p-3 overflow-y-auto">
          <div className="w-full max-w-[410px] bg-[#F8F1EB] border border-[#E6D8CF] rounded-[22px] p-4 shadow-2xl my-auto max-h-[90dvh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2.5 border-b border-[#E6D8CF]">
              <h2 className="font-serif text-[18px] font-semibold text-[#2D1C18]">
                {editingService ? "Editar serviço" : "Novo serviço"}
              </h2>
              <button
                type="button"
                onClick={closeModal}
                aria-label="Fechar modal"
                className="w-10 h-10 rounded-full bg-[#EADCD3] flex items-center justify-center text-[#2D1C18] active:scale-95 transition touch-manipulation"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSave} className="mt-3 space-y-2.5">
              {errorMsg && (
                <div className="bg-[#F3D8D8] text-[#B84A48] text-[12px] px-3 py-2 rounded-[10px]">
                  {errorMsg}
                </div>
              )}

              <div>
                <label className="block text-[12px] font-semibold text-[#4E3B35] mb-1">
                  Nome do procedimento
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Volume brasileiro"
                  enterKeyHint="next"
                  className="w-full min-h-[46px] bg-[#FAF5F1] border border-[#E4D5CB] rounded-[12px] px-3 py-2.5 text-[14px] text-[#2D1C18] focus:outline-none focus:border-[#B87472]"
                />
              </div>

              <div>
                <label className="block text-[12px] font-semibold text-[#4E3B35] mb-1">
                  Descrição curta
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Ex: Mais volume e definição"
                  enterKeyHint="next"
                  className="w-full min-h-[46px] bg-[#FAF5F1] border border-[#E4D5CB] rounded-[12px] px-3 py-2.5 text-[14px] text-[#2D1C18] focus:outline-none focus:border-[#B87472]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[12px] font-semibold text-[#4E3B35] mb-1">
                    Preço (R$)
                  </label>
                  <input
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    min="0"
                    required
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="150,00"
                    enterKeyHint="done"
                    className="w-full min-h-[46px] bg-[#FAF5F1] border border-[#E4D5CB] rounded-[12px] px-3 py-2.5 text-[14px] text-[#2D1C18] focus:outline-none focus:border-[#B87472]"
                  />
                </div>

                <div>
                  <label className="block text-[12px] font-semibold text-[#4E3B35] mb-1">
                    Duração
                  </label>
                  <select
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(e.target.value)}
                    className="w-full min-h-[46px] bg-[#FAF5F1] border border-[#E4D5CB] rounded-[12px] px-3 py-2.5 text-[14px] text-[#2D1C18] focus:outline-none focus:border-[#B87472]"
                  >
                    <option value="30">30min</option>
                    <option value="60">1h</option>
                    <option value="90">1h30</option>
                    <option value="120">2h</option>
                    <option value="150">2h30</option>
                    <option value="180">3h</option>
                  </select>
                </div>
              </div>

              {/* Opção de Sinal Obrigatório por Serviço + Escolha da % do Sinal */}
              <div className="w-full bg-[#FAF5F1] border border-[#E4D5CB] rounded-[14px] p-3.5 space-y-3">
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => setRequiresDeposit((prev) => !prev)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setRequiresDeposit((prev) => !prev);
                    }
                  }}
                  className="flex items-center justify-between gap-3 cursor-pointer touch-manipulation select-none"
                >
                  <div className="min-w-0">
                    <p className="text-[13px] font-bold text-[#2D1C18]">
                      Exigir sinal obrigatório via Pix
                    </p>
                    <p className="text-[11.5px] text-[#6E5850] leading-snug mt-0.5">
                      {requiresDeposit
                        ? "Ativado: cliente paga o sinal via Pix para confirmar o horário."
                        : "Desativado: cliente agenda sem pagar sinal antecipado."}
                    </p>
                  </div>
                  <span
                    role="switch"
                    aria-checked={requiresDeposit}
                    className={`w-[46px] h-[26px] rounded-full p-0.5 transition-colors duration-200 flex items-center shrink-0 ${
                      requiresDeposit ? "bg-[#B87472]" : "bg-[#D5C5BC]"
                    }`}
                  >
                    <span
                      className={`w-[22px] h-[22px] rounded-full bg-[#FFFDFB] shadow-sm transform transition-transform duration-200 ${
                        requiresDeposit ? "translate-x-[20px]" : "translate-x-0"
                      }`}
                    />
                  </span>
                </div>

                {requiresDeposit && (
                  <div className="pt-2.5 border-t border-[#EAE0D8] space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <label className="text-[12px] font-semibold text-[#4E3B35]">
                        Porcentagem do sinal (1% a 100%)
                      </label>
                      <div className="flex items-center gap-1 bg-[#FFFDFB] border border-[#DFCFC5] rounded-[10px] px-2.5 py-1">
                        <input
                          type="number"
                          inputMode="numeric"
                          min="1"
                          max="100"
                          step="1"
                          value={depositPercentage}
                          onChange={(e) => setDepositPercentage(e.target.value)}
                          className="w-12 text-right text-[13.5px] font-bold text-[#2D1C18] bg-transparent focus:outline-none"
                        />
                        <span className="text-[12.5px] font-bold text-[#6E5850]">
                          %
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-5 gap-1.5">
                      {DEPOSIT_PRESETS.map((pct) => {
                        const isSelected = Number(depositPercentage) === pct;
                        return (
                          <button
                            key={pct}
                            type="button"
                            onClick={() => setDepositPercentage(String(pct))}
                            className={`min-h-[36px] rounded-[10px] text-[12px] font-bold transition touch-manipulation ${
                              isSelected
                                ? "bg-[#B87472] text-white shadow-xs"
                                : "bg-[#F4EAE3] text-[#4E3B35] border border-[#E2D3C9]"
                            }`}
                          >
                            {pct}%
                          </button>
                        );
                      })}
                    </div>

                    {(() => {
                      const numPrice =
                        Number(String(price).replace(",", ".")) || 0;
                      const rawPct = Number(
                        String(depositPercentage).replace(",", ".")
                      );
                      const isPctValid =
                        String(depositPercentage).trim() !== "" &&
                        Number.isFinite(rawPct) &&
                        rawPct >= 1 &&
                        rawPct <= 100;

                      if (!isPctValid) {
                        return (
                          <div className="bg-[#F3D8D8] border border-[#E2B5B5] rounded-[10px] px-3 py-2 text-[11.5px] font-semibold text-[#B84A48]">
                            Informe um percentual válido entre 1% e 100%.
                          </div>
                        );
                      }

                      const calc = calculateSignalInCents(
                        numPrice,
                        true,
                        rawPct
                      );

                      return (
                        <div className="bg-[#F4E3DC]/80 border border-[#E5CEC4] rounded-[10px] px-3 py-2 space-y-1 text-[11.5px] text-[#2D1C18]">
                          <div className="flex items-center justify-between">
                            <span className="text-[#5C4740]">Valor total:</span>
                            <strong>
                              R${" "}
                              {calc.totalAmount.toLocaleString("pt-BR", {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </strong>
                          </div>
                          <div className="flex items-center justify-between">
                            <span>Sinal Pix ({calc.signalPercentage}%):</span>
                            <strong className="text-[#9E5856]">
                              R${" "}
                              {calc.signalAmount.toLocaleString("pt-BR", {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </strong>
                          </div>
                          <div className="flex items-center justify-between pt-0.5 border-t border-[#E5CEC4]/70">
                            <span className="text-[#5C4740]">
                              Restante no atendimento:
                            </span>
                            <strong>
                              R${" "}
                              {calc.remainingAmount.toLocaleString("pt-BR", {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </strong>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>

              {/* SEÇÃO DE FOTOGRAFIA REAL EM ALTA DEFINIÇÃO (HD) */}
              <div className="bg-[#FAF5F1] border border-[#E4D5CB] rounded-[16px] p-3 space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-1.5">
                  <label className="text-[12px] font-bold text-[#2D1C18] flex items-center gap-1.5">
                    <Camera size={14} className="text-[#B87472] shrink-0" />
                    <span>Fotografia do procedimento (HD)</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setPreviewMagnified(false);
                      setPreviewZoomOpen(true);
                    }}
                    className="min-h-[32px] text-[11px] font-bold text-[#B87472] hover:text-[#9E5D5B] flex items-center gap-1 bg-[#F4E3DC] px-2.5 py-1 rounded-full touch-manipulation"
                  >
                    <Search size={11} />
                    <span>Testar lupa HD</span>
                  </button>
                </div>

                {/* Prévia da Foto que aparece na Lupa */}
                <div className="relative w-full h-[135px] rounded-[12px] overflow-hidden bg-[#EAD8CE] border border-[#DFCFC5]">
                  <img
                    src={currentHdPreview}
                    alt="Prévia em alta definição"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = image;
                    }}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-2 left-2 bg-[#2D1C18]/80 text-[#FAF5F1] text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Sparkles size={10} className="text-[#E2B897]" />
                    <span>
                      {isCustomUploadedPhoto
                        ? "Foto Personalizada (HD)"
                        : "Foto HD do Catálogo"}
                    </span>
                  </div>
                  {isCustomUploadedPhoto && (
                    <button
                      type="button"
                      onClick={handleRemoveCustomPhoto}
                      className="absolute top-2 right-2 bg-[#2D1C18]/85 hover:bg-[#B84A48] text-[#FAF5F1] text-[10.5px] font-semibold px-2.5 py-1 rounded-full flex items-center gap-1 transition touch-manipulation"
                    >
                      <Trash2 size={11} />
                      <span>Remover foto</span>
                    </button>
                  )}
                </div>

                {uploadSuccess && (
                  <p className="text-[11.5px] font-semibold text-[#2E8540] flex items-center gap-1">
                    <Check size={13} className="shrink-0" />
                    <span>{uploadSuccess}</span>
                  </p>
                )}

                {/* Input Galeria (JPG, PNG, WebP) */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleFileChange}
                  className="hidden"
                />

                {/* Input Câmera Direta (quando suportado no celular) */}
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  capture="environment"
                  onChange={handleFileChange}
                  className="hidden"
                />

                {/* Botões para Galeria, Câmera ou Colar */}
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    disabled={uploadingPhoto}
                    onClick={() => fileInputRef.current?.click()}
                    className="min-h-[42px] bg-[#38231E] hover:bg-[#2D1C18] active:scale-[0.98] text-[#FAF3EE] rounded-[11px] py-2 px-2 text-[11.5px] font-semibold flex items-center justify-center gap-1 transition touch-manipulation"
                  >
                    <ImageIcon size={13} className="shrink-0" />
                    <span>
                      {uploadingPhoto ? "Enviando..." : "Enviar foto real"}
                    </span>
                  </button>

                  <button
                    type="button"
                    disabled={uploadingPhoto}
                    onClick={() => cameraInputRef.current?.click()}
                    className="min-h-[42px] bg-[#FFFDFB] hover:bg-[#F3E8E0] active:scale-[0.98] border border-[#D8C6BC] text-[#2D1C18] rounded-[11px] py-2 px-2 text-[11.5px] font-semibold flex items-center justify-center gap-1 transition touch-manipulation"
                  >
                    <Camera size={13} className="text-[#B87472] shrink-0" />
                    <span>Câmera</span>
                  </button>

                  <button
                    type="button"
                    disabled={uploadingPhoto}
                    onClick={handlePastePhoto}
                    className="min-h-[42px] bg-[#FFFDFB] hover:bg-[#F3E8E0] active:scale-[0.98] border border-[#D8C6BC] text-[#2D1C18] rounded-[11px] py-2 px-2 text-[11.5px] font-semibold flex items-center justify-center gap-1 transition touch-manipulation"
                  >
                    <ClipboardPaste size={13} className="text-[#6E5850] shrink-0" />
                    <span>Colar foto</span>
                  </button>
                </div>

                {/* Opção secundária: escolher foto padrão do catálogo */}
                <div className="pt-1">
                  <label className="block text-[11px] font-medium text-[#6E5850] mb-1">
                    Ou selecionar fotografia padrão do catálogo:
                  </label>
                  <select
                    value={isCustomUploadedPhoto ? "__custom__" : image}
                    onChange={(e) => {
                      if (e.target.value !== "__custom__") {
                        void cleanupUnsavedUploadIfNeeded();
                        setImage(e.target.value);
                        setUploadSuccess("");
                      }
                    }}
                    className="w-full min-h-[42px] bg-[#F4EAE3] border border-[#E2D3C9] rounded-[10px] px-2.5 py-2 text-[12.5px] text-[#2D1C18] focus:outline-none focus:border-[#B87472]"
                  >
                    {isCustomUploadedPhoto && (
                      <option value="__custom__">
                        ✓ Foto real enviada pela profissional (HD)
                      </option>
                    )}
                    {IMAGE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="pt-1.5 flex items-center gap-2">
                {editingService && (
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={saving}
                    className="w-12 h-12 min-w-[48px] min-h-[48px] rounded-[14px] bg-[#F3D8D8] text-[#B84A48] font-semibold text-[13px] flex items-center justify-center active:scale-95 transition touch-manipulation"
                    aria-label="Excluir serviço"
                  >
                    <Trash2 size={18} />
                  </button>
                )}
                <PrimaryButton
                  type="submit"
                  variant="rose"
                  className="flex-1"
                  disabled={saving || uploadingPhoto}
                >
                  {saving ? "Salvando..." : "Salvar serviço"}
                </PrimaryButton>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Teste da Lupa HD para a Profissional */}
      {previewZoomOpen && (
        <div
          className="fixed inset-0 z-[60] bg-[#2D1C18]/80 backdrop-blur-[3px] flex items-center justify-center p-3"
          onClick={() => setPreviewZoomOpen(false)}
        >
          <div
            className="w-full max-w-[390px] max-h-[90dvh] overflow-y-auto bg-[#FAF5F1] border border-[#E5D4C9] rounded-[24px] overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative w-full h-[300px] min-[375px]:h-[320px] bg-[#EAD8CE] overflow-auto">
              <img
                src={currentHdPreview}
                alt={name || "Prévia HD"}
                onClick={() => setPreviewMagnified((p) => !p)}
                className={`w-full h-full object-cover transition-transform duration-300 cursor-zoom-in ${
                  previewMagnified
                    ? "scale-175 cursor-zoom-out"
                    : "scale-100"
                }`}
              />
              <div className="absolute top-3 left-3 flex items-center gap-1.5">
                <span className="bg-[#2D1C18]/75 text-[#FAF5F1] text-[10.5px] font-semibold px-2.5 py-1.5 rounded-full flex items-center gap-1">
                  <Sparkles size={11} className="text-[#E2B897]" />
                  <span>Visão da Cliente (HD)</span>
                </span>
                <button
                  type="button"
                  onClick={() => setPreviewMagnified((p) => !p)}
                  className="min-h-[34px] bg-[#FAF5F1]/95 text-[#2D1C18] text-[11.5px] font-bold px-3 py-1.5 rounded-full flex items-center gap-1 touch-manipulation"
                >
                  {previewMagnified ? (
                    <>
                      <ZoomOut size={13} className="text-[#B87472]" />
                      <span>1x</span>
                    </>
                  ) : (
                    <>
                      <ZoomIn size={13} className="text-[#B87472]" />
                      <span>Zoom 2x</span>
                    </>
                  )}
                </button>
              </div>
              <button
                type="button"
                onClick={() => setPreviewZoomOpen(false)}
                aria-label="Fechar prévia"
                className="absolute top-3 right-3 w-10 h-10 rounded-full bg-[#2D1C18]/80 text-[#FAF5F1] flex items-center justify-center active:scale-95 transition touch-manipulation"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-4 text-center">
              <p className="text-[13px] font-bold text-[#2D1C18]">
                É assim que sua cliente verá a foto ao tocar na lupa 🔍 Ver
              </p>
              <p className="text-[11.5px] text-[#6E5850] mt-0.5">
                Toque na imagem ou no botão Zoom 2x para inspecionar os fios em
                alta definição.
              </p>
            </div>
          </div>
        </div>
      )}
    </MobileContainer>
  );
}
