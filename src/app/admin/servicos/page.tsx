"use client";

import React, { useRef, useState } from "react";
import {
  Plus,
  X,
  Trash2,
  Camera,
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

const IMAGE_OPTIONS = [
  { label: "Catálogo: Extensão Clássica (HD)", value: "/images/service-classica.png" },
  { label: "Catálogo: Volume Brasileiro (HD)", value: "/images/service-brasileiro.png" },
  { label: "Catálogo: Volume Híbrido (HD)", value: "/images/service-hibrido.png" },
  { label: "Catálogo: Volume Russo (HD)", value: "/images/service-russo.png" },
  { label: "Catálogo: Manutenção (HD)", value: "/images/service-manutencao.png" },
  { label: "Catálogo: Remoção (HD)", value: "/images/service-remocao.png" },
];

export default function AdminServicesPage() {
  const {
    allServices,
    refreshServices,
    toggleServiceActive,
    createOrUpdateService,
    deleteService,
  } = useBooking();

  const fileInputRef = useRef<HTMLInputElement | null>(null);

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

  const openNewModal = () => {
    setEditingService(null);
    setName("");
    setDescription("");
    setPrice("");
    setDurationMinutes("90");
    setImage("/images/service-classica.png");
    setRequiresDeposit(true);
    setUploadSuccess("");
    setErrorMsg("");
    setModalOpen(true);
  };

  const openEditModal = (svc: ServiceItem) => {
    setEditingService(svc);
    setName(svc.name);
    setDescription(svc.description || "");
    setPrice(String(svc.price));
    setDurationMinutes(String(svc.durationMinutes || 90));
    setImage(svc.image || "/images/service-classica.png");
    setRequiresDeposit(svc.requiresDeposit !== false);
    setUploadSuccess("");
    setErrorMsg("");
    setModalOpen(true);
  };

  const uploadRealPhotoBlob = async (file: File | Blob, fileName?: string) => {
    setUploadingPhoto(true);
    setErrorMsg("");
    setUploadSuccess("");

    try {
      const formData = new FormData();
      formData.append(
        "file",
        file,
        fileName || (file instanceof File ? file.name : "foto-real-hd.jpg")
      );

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.url) {
        setErrorMsg(data.error || "Não foi possível enviar a foto em HD.");
      } else {
        setImage(data.url);
        setUploadSuccess("Foto real em Alta Definição carregada!");
      }
    } catch {
      setErrorMsg("Erro ao enviar a fotografia para o servidor.");
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await uploadRealPhotoBlob(file, file.name);
    e.target.value = "";
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
            const ext = imageType.split("/")[1] || "png";
            await uploadRealPhotoBlob(blob, `foto-colada-hd.${ext}`);
            return;
          }
        }
        setErrorMsg(
          "Nenhuma imagem encontrada na área de transferência. Use 'Enviar foto real (HD)'."
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

    if (!name.trim()) {
      setErrorMsg("Informe o nome do serviço.");
      return;
    }
    if (isNaN(parsedPrice) || parsedPrice < 0) {
      setErrorMsg("Informe um preço válido.");
      return;
    }
    if (isNaN(parsedDuration) || parsedDuration < 15) {
      setErrorMsg("A duração mínima é de 15 minutos.");
      return;
    }

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
    });
    setSaving(false);

    if (!res.ok) {
      setErrorMsg(res.error || "Não foi possível salvar o serviço.");
    } else {
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
          Toque em um serviço para editar preço, duração ou enviar uma{" "}
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
                onClick={() => setModalOpen(false)}
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

              {/* Opção de Sinal Obrigatório por Serviço */}
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
                className="w-full min-h-[56px] bg-[#FAF5F1] border border-[#E4D5CB] rounded-[14px] px-3.5 py-2.5 flex items-center justify-between gap-3 cursor-pointer touch-manipulation select-none"
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
                <div className="relative w-full h-[130px] rounded-[12px] overflow-hidden bg-[#EAD8CE] border border-[#DFCFC5]">
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
                        ? "Foto Real Enviada (HD)"
                        : "Foto HD do Catálogo"}
                    </span>
                  </div>
                </div>

                {uploadSuccess && (
                  <p className="text-[11.5px] font-semibold text-[#2E8540] flex items-center gap-1">
                    <Check size={13} />
                    <span>{uploadSuccess}</span>
                  </p>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/avif"
                  onChange={handleFileChange}
                  className="hidden"
                />

                {/* Botões para Enviar Foto Real do Celular/Computador ou Colar */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    disabled={uploadingPhoto}
                    onClick={() => fileInputRef.current?.click()}
                    className="min-h-[42px] bg-[#38231E] hover:bg-[#2D1C18] active:scale-[0.98] text-[#FAF3EE] rounded-[11px] py-2 px-2.5 text-[12px] font-semibold flex items-center justify-center gap-1.5 transition touch-manipulation"
                  >
                    <Camera size={14} className="shrink-0" />
                    <span>
                      {uploadingPhoto ? "Enviando..." : "Enviar foto real"}
                    </span>
                  </button>

                  <button
                    type="button"
                    disabled={uploadingPhoto}
                    onClick={handlePastePhoto}
                    className="min-h-[42px] bg-[#FFFDFB] hover:bg-[#F3E8E0] active:scale-[0.98] border border-[#D8C6BC] text-[#2D1C18] rounded-[11px] py-2 px-2.5 text-[12px] font-semibold flex items-center justify-center gap-1.5 transition touch-manipulation"
                  >
                    <ClipboardPaste size={14} className="text-[#6E5850] shrink-0" />
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
                <PrimaryButton type="submit" variant="rose" className="flex-1" disabled={saving}>
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
