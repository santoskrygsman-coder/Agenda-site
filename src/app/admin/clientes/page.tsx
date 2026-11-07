"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Search, ChevronRight, X, Trash2, Check } from "lucide-react";
import MobileContainer from "@/components/ui/MobileContainer";
import PageHeader from "@/components/ui/PageHeader";
import PrimaryButton from "@/components/ui/PrimaryButton";
import { WhatsAppCircleIcon } from "@/components/ui/BotanicalDecor";
import { buildWaMeUrl } from "@/lib/whatsapp";

type FilterType = "todos" | "ativas" | "frequentes" | "inativas";

interface ClientHistoryItem {
  id: string;
  date: string;
  dateFormatted: string;
  time: string;
  endTime: string;
  serviceName: string;
  priceFormatted: string;
  status: string;
  paymentStatus: string;
}

interface ClientRecord {
  id: string;
  initials: string;
  name: string;
  phone: string;
  rawPhone: string;
  email: string;
  notes: string;
  avatar?: string;
  appointmentsCount: number;
  category: "ativas" | "frequentes" | "inativas";
  history: ClientHistoryItem[];
}

const FILTERS: { key: FilterType; label: string }[] = [
  { key: "todos", label: "Todos" },
  { key: "ativas", label: "Ativas" },
  { key: "frequentes", label: "Frequentes" },
  { key: "inativas", label: "Inativas" },
];

export default function AdminClientsListPage() {
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterType>("todos");

  // Modal de nova cliente
  const [newModalOpen, setNewModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  // Modal de histórico e ficha técnica editável da cliente selecionada
  const [selectedClient, setSelectedClient] = useState<ClientRecord | null>(
    null
  );
  const [editNotes, setEditNotes] = useState("");
  const [editCategory, setEditCategory] = useState<
    "ativas" | "frequentes" | "inativas"
  >("ativas");
  const [savingNotes, setSavingNotes] = useState(false);
  const [notesSavedMsg, setNotesSavedMsg] = useState("");

  const loadClients = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        q: searchQuery,
        category: activeFilter,
      });
      const res = await fetch(`/api/clients?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setClients(data);
      }
    } finally {
      setLoading(false);
    }
  }, [searchQuery, activeFilter]);

  useEffect(() => {
    loadClients();
  }, [loadClients]);

  const openClientModal = (client: ClientRecord) => {
    setSelectedClient(client);
    setEditNotes(client.notes || "");
    setEditCategory(client.category || "ativas");
    setNotesSavedMsg("");
  };

  const handleSaveClientSheet = async () => {
    if (!selectedClient) return;
    setSavingNotes(true);
    setNotesSavedMsg("");
    const res = await fetch(`/api/clients/${selectedClient.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        notes: editNotes,
        category: editCategory,
      }),
    });
    setSavingNotes(false);
    if (res.ok) {
      setNotesSavedMsg("Ficha técnica atualizada!");
      setSelectedClient({
        ...selectedClient,
        notes: editNotes,
        category: editCategory,
      });
      loadClients();
      setTimeout(() => setNotesSavedMsg(""), 2500);
    }
  };

  const handleDeleteClient = async () => {
    if (!selectedClient) return;
    const res = await fetch(`/api/clients/${selectedClient.id}`, {
      method: "DELETE",
    });
    if (res.ok) {
      setSelectedClient(null);
      loadClients();
    }
  };

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setSaving(true);
    const res = await fetch("/api/clients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, phone, email, notes }),
    });
    const data = await res.json();
    setSaving(false);

    if (!res.ok) {
      setFormError(data.error || "Erro ao cadastrar cliente.");
      return;
    }

    setNewModalOpen(false);
    setName("");
    setPhone("");
    setEmail("");
    setNotes("");
    loadClients();
  };

  return (
    <MobileContainer showAdminNav activeAdminTab="clientes">
      <div className="bg-gradient-to-b from-[#EEDBD2]/80 to-[#F4EAE3]">
        <PageHeader
          title="Clientes"
          leftType="menu"
          rightType="plus"
          onRightClick={() => {
            setFormError("");
            setNewModalOpen(true);
          }}
        />
      </div>

      <div className="px-5 pt-1 pb-6 flex-1">
        {/* Search Input */}
        <div className="bg-[#ECE5E0] border border-[#E0D6CE] rounded-[13px] px-3.5 py-2.5 flex items-center gap-2.5">
          <Search size={16} className="text-[#6E5B53] shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por nome ou telefone"
            className="w-full bg-transparent text-[13px] text-[#2D1C18] placeholder-[#7D6860] focus:outline-none"
          />
        </div>

        {/* Filter Chips */}
        <div className="flex items-center gap-2 mt-3 overflow-x-auto no-scrollbar">
          {FILTERS.map((f) => {
            const isActive = activeFilter === f.key;
            return (
              <button
                key={f.key}
                type="button"
                onClick={() => setActiveFilter(f.key)}
                className={`px-3.5 py-1.5 rounded-full text-[12px] transition-colors shrink-0 ${
                  isActive
                    ? "bg-[#B87472] text-white font-semibold"
                    : "bg-[#EFE6DF] text-[#3D2A24] font-medium hover:bg-[#E7DBD2]"
                }`}
              >
                {f.label}
              </button>
            );
          })}
        </div>

        {/* Clients List */}
        {loading ? (
          <p className="text-[13px] text-[#7A655D] py-6 text-center">
            Carregando clientes...
          </p>
        ) : clients.length === 0 ? (
          <div className="mt-5 bg-[#FAF5F1] border border-[#E7DAD1] rounded-[16px] p-5 text-center">
            <p className="text-[13.5px] font-semibold text-[#2D1C18]">
              Nenhuma cliente encontrada.
            </p>
            <p className="text-[12px] text-[#6E5B53] mt-1">
              Toque no botão + no topo direito para cadastrar uma cliente.
            </p>
          </div>
        ) : (
          <div className="mt-3 divide-y divide-[#E9DDD5]">
            {clients.map((client) => (
              <button
                key={client.id}
                type="button"
                onClick={() => openClientModal(client)}
                className="w-full text-left py-3 flex items-center justify-between gap-3 hover:bg-[#F3E9E2]/50 rounded-xl px-1 transition"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  {client.avatar ? (
                    <div className="w-[46px] h-[46px] rounded-full overflow-hidden shrink-0 border border-[#DFC9BE]">
                      <img
                        src={client.avatar}
                        alt={client.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="w-[46px] h-[46px] rounded-full bg-[#D1B59E] text-white font-semibold text-[14px] flex items-center justify-center shrink-0">
                      {client.initials}
                    </div>
                  )}

                  <div className="min-w-0">
                    <h3 className="text-[14.5px] font-bold text-[#2D1C18] leading-tight truncate">
                      {client.name}
                    </h3>
                    <p className="text-[12.5px] text-[#6E5B53] mt-0.5">
                      {client.phone}
                    </p>
                    <p className="text-[12px] text-[#7D6860] mt-0.5">
                      {client.appointmentsCount}{" "}
                      {client.appointmentsCount === 1
                        ? "agendamento"
                        : "agendamentos"}
                    </p>
                  </div>
                </div>

                <ChevronRight size={17} className="text-[#8E7970] shrink-0" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Modal de Cadastro de Cliente */}
      {newModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-[#2D1C18]/45 p-3">
          <div className="w-full max-w-[390px] bg-[#F8F1EB] border border-[#E6D8CF] rounded-[22px] p-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#E6D8CF]">
              <h3 className="font-serif text-[18px] font-semibold text-[#2D1C18]">
                Nova cliente
              </h3>
              <button
                type="button"
                onClick={() => setNewModalOpen(false)}
                className="w-7 h-7 rounded-full bg-[#EADCD3] flex items-center justify-center text-[#2D1C18]"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateClient} className="mt-3 space-y-3">
              {formError && (
                <div className="bg-[#F3D8D8] text-[#B84A48] text-[12px] px-3 py-2 rounded-[10px]">
                  {formError}
                </div>
              )}

              <div>
                <label className="block text-[12px] font-semibold text-[#4E3B35] mb-1">
                  Nome completo
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nome da cliente"
                  className="w-full bg-[#FAF5F1] border border-[#E4D5CB] rounded-[11px] px-3 py-2 text-[13.5px]"
                />
              </div>

              <div>
                <label className="block text-[12px] font-semibold text-[#4E3B35] mb-1">
                  Telefone / WhatsApp
                </label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(73) 99999-9999"
                  className="w-full bg-[#FAF5F1] border border-[#E4D5CB] rounded-[11px] px-3 py-2 text-[13.5px]"
                />
              </div>

              <div>
                <label className="block text-[12px] font-semibold text-[#4E3B35] mb-1">
                  E-mail (opcional)
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="cliente@email.com"
                  className="w-full bg-[#FAF5F1] border border-[#E4D5CB] rounded-[11px] px-3 py-2 text-[13.5px]"
                />
              </div>

              <div>
                <label className="block text-[12px] font-semibold text-[#4E3B35] mb-1">
                  Observações / Mapping de Cílios
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ex: curvatura D, fios 0.07 (8mm ao 12mm), sem alergias"
                  className="w-full bg-[#FAF5F1] border border-[#E4D5CB] rounded-[11px] px-3 py-2 text-[13.5px] resize-none"
                />
              </div>

              <PrimaryButton type="submit" variant="rose">
                {saving ? "Salvando..." : "Cadastrar cliente"}
              </PrimaryButton>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Histórico e Ficha Técnica Editável da Cliente */}
      {selectedClient && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-[#2D1C18]/45 p-3">
          <div className="w-full max-w-[390px] max-h-[86vh] bg-[#F8F1EB] border border-[#E6D8CF] rounded-[22px] p-5 shadow-2xl flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-[#E6D8CF]">
              <div>
                <h3 className="font-serif text-[18px] font-semibold text-[#2D1C18]">
                  {selectedClient.name}
                </h3>
                <p className="text-[12.5px] text-[#6E5B53]">
                  {selectedClient.phone}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={buildWaMeUrl(
                    selectedClient.rawPhone,
                    `Olá, ${selectedClient.name}! Tudo bem?`
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="WhatsApp da cliente"
                >
                  <WhatsAppCircleIcon size={26} variant="green" />
                </a>
                {selectedClient.history.length === 0 && (
                  <button
                    type="button"
                    onClick={handleDeleteClient}
                    className="w-7 h-7 rounded-full bg-[#F3D8D8] flex items-center justify-center text-[#B84A48]"
                    aria-label="Excluir cliente"
                    title="Excluir cliente"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setSelectedClient(null)}
                  className="w-7 h-7 rounded-full bg-[#EADCD3] flex items-center justify-center text-[#2D1C18]"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            <div className="py-3 overflow-y-auto space-y-3 flex-1">
              {/* Ficha Técnica / Mapping editável */}
              <div className="bg-[#FAF5F1] border border-[#E7DAD1] rounded-[14px] p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[12px] font-bold text-[#2D1C18]">
                    Ficha Técnica / Mapping
                  </span>
                  <select
                    value={editCategory}
                    onChange={(e) =>
                      setEditCategory(
                        e.target.value as "ativas" | "frequentes" | "inativas"
                      )
                    }
                    className="bg-[#F4EAE3] border border-[#E2D3C9] rounded-full px-2.5 py-0.5 text-[11px] font-semibold text-[#4E3B35]"
                  >
                    <option value="ativas">Ativa</option>
                    <option value="frequentes">Frequente</option>
                    <option value="inativas">Inativa</option>
                  </select>
                </div>

                <textarea
                  rows={2}
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="Anote curvatura, tamanho dos fios, técnica preferida ou alergias..."
                  className="w-full bg-[#F4EAE3] border border-[#E2D3C9] rounded-[10px] px-2.5 py-1.5 text-[12.5px] text-[#2D1C18] resize-none focus:outline-none focus:border-[#B87472]"
                />

                <div className="flex items-center justify-between">
                  {notesSavedMsg ? (
                    <span className="text-[11.5px] font-semibold text-[#2E8540] flex items-center gap-1">
                      <Check size={13} />
                      {notesSavedMsg}
                    </span>
                  ) : (
                    <span />
                  )}
                  <button
                    type="button"
                    disabled={savingNotes}
                    onClick={handleSaveClientSheet}
                    className="bg-[#B87472] hover:bg-[#A66361] text-white text-[11.5px] font-semibold px-3 py-1 rounded-full transition"
                  >
                    {savingNotes ? "Salvando..." : "Salvar ficha"}
                  </button>
                </div>
              </div>

              <h4 className="text-[13.5px] font-bold text-[#2D1C18]">
                Histórico de atendimentos ({selectedClient.history.length})
              </h4>

              {selectedClient.history.length === 0 ? (
                <p className="text-[12.5px] text-[#7A655D]">
                  Nenhum agendamento registrado ainda para esta cliente.
                </p>
              ) : (
                <div className="space-y-2">
                  {selectedClient.history.map((h) => (
                    <div
                      key={h.id}
                      className="bg-[#FAF5F1] border border-[#E7DAD1] rounded-[12px] p-3 flex items-center justify-between text-[12.5px]"
                    >
                      <div>
                        <p className="font-bold text-[#2D1C18]">
                          {h.serviceName}
                        </p>
                        <p className="text-[#6E5B53] text-[11.5px]">
                          {h.dateFormatted} • {h.time}
                        </p>
                      </div>
                      <span className="font-bold text-[#2D1C18]">
                        {h.priceFormatted}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </MobileContainer>
  );
}
