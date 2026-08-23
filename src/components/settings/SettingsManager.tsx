"use client";

import { useState, useEffect } from "react";
import { Save, User, MessageCircle, Clock, Smartphone, RotateCcw } from "lucide-react";

export default function SettingsManager() {
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");

  const defaultMsgs = {
    newRequest: "✨ Nova solicitação de agendamento\n\nCliente: {cliente}\nData: {data}\nHorário: {horario}\nProcedimento: {procedimento}\n\nAguardando confirmação.",
    confirmed: "✅ Agendamento Confirmado!\n\nOlá {cliente}, seu horário para {procedimento} no dia {data} às {horario} está confirmado.",
    rejected: "❌ Agendamento Não Confirmado\n\nOlá {cliente}, infelizmente não poderemos atender sua solicitação para o dia {data} às {horario}."
  };

  useEffect(() => {
    fetch('/api/settings')
      .then(res => res.json())
      .then(data => {
        setSettings(data);
        setLoading(false);
      });
  }, []);

  const handleSave = async (section: string) => {
    setSaving(true);
    await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings)
    });
    setSaving(false);
    setToast(section + " salvo com sucesso!");
    setTimeout(() => setToast(""), 3000);
  };

  const handleTestWhatsApp = () => {
    if (!settings?.whatsapp) return alert("Configure seu número de WhatsApp primeiro!");
    const phone = settings.whatsapp.replace(/\D/g, '');
    const msg = encodeURIComponent("Oi! Teste de configuração do WhatsApp do sistema de agendamento.");
    window.open(`https://wa.me/${phone}?text=${msg}`, '_blank');
  };

  if (loading) return <div className="text-center p-8 text-[#8B7E7F] animate-pulse">Carregando configurações...</div>;

  return (
    <div className="space-y-8 font-sans text-[#3A3335]">
      {toast && (
        <div className="fixed top-4 right-4 bg-[#5A7A66] text-white px-6 py-3 rounded-2xl shadow-xl z-50 font-bold transition-all flex items-center gap-2">
          {toast}
        </div>
      )}

      {/* PERFIL PROFISSIONAL */}
      <section className="bg-white rounded-3xl shadow-[0_4px_20px_rgba(0,0,0,0.02)] border border-[#F3E8E8] p-6 overflow-hidden">
        <div className="flex items-center gap-4 mb-6 border-b border-[#F3E8E8] pb-5">
          <div className="bg-[#FFF5F5] p-3.5 rounded-2xl text-[#A76D74]"><User size={24} /></div>
          <div>
            <h2 className="text-xl font-bold text-[#3A3335]">Perfil Profissional</h2>
            <p className="text-sm text-[#8B7E7F] font-medium mt-0.5">Informações públicas que aparecem na tela de agendamento.</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-6 mb-8 items-center sm:items-start">
          <div className="flex flex-col items-center gap-3">
            <div className="w-24 h-24 rounded-full bg-[#FCFAFA] border-2 border-[#F3E8E8] flex items-center justify-center overflow-hidden relative group">
              {settings.avatarUrl ? (
                <img src={settings.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <User size={32} className="text-[#D9A0A0]" />
              )}
              <label className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center text-white opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
                <span className="text-[10px] font-bold uppercase tracking-wide">Alterar</span>
                <input type="file" accept="image/jpeg, image/png, image/webp" className="hidden" onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  
                  const compressImage = (file: File): Promise<string> => {
                    return new Promise((resolve) => {
                      const reader = new FileReader();
                      reader.onload = (event) => {
                        const img = new Image();
                        img.onload = () => {
                          const canvas = document.createElement("canvas");
                          let width = img.width;
                          let height = img.height;
                          const max = 600; // Avatar doesn't need to be big
                          if (width > height && width > max) {
                            height *= max / width;
                            width = max;
                          } else if (height > max) {
                            width *= max / height;
                            height = max;
                          }
                          canvas.width = width;
                          canvas.height = height;
                          const ctx = canvas.getContext("2d");
                          ctx?.drawImage(img, 0, 0, width, height);
                          resolve(canvas.toDataURL("image/jpeg", 0.7));
                        };
                        img.src = event.target?.result as string;
                      };
                      reader.readAsDataURL(file);
                    });
                  };

                  const base64 = await compressImage(file);
                  setSettings({ ...settings, avatarUrl: base64 });
                }} />
              </label>
            </div>
            {settings.avatarUrl && (
              <button onClick={() => setSettings({ ...settings, avatarUrl: null })} className="text-[10px] text-[#A76D74] hover:underline uppercase font-bold tracking-wide">
                Remover foto
              </button>
            )}
          </div>
          
          <div className="flex-1 w-full space-y-2">
            <p className="text-sm font-bold text-[#3A3335]">Foto da Profissional</p>
            <p className="text-xs text-[#8B7E7F] leading-relaxed">
              Esta foto aparecerá no topo da sua página de agendamentos, substituindo a logo padrão. Recomendamos uma foto sua de rosto, sorrindo, para gerar conexão, ou o logo da sua marca. <br/>
              <span className="font-medium text-[#A76D74]">Formatos: JPG, PNG, WEBP. Máx 3MB.</span>
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[#8B7E7F] uppercase tracking-wide">Seu Nome / Nome do Estúdio</label>
            <input type="text" value={settings.professionalName || ''} onChange={e => setSettings({...settings, professionalName: e.target.value})} className="w-full p-3.5 bg-[#FCFAFA] border border-[#F3E8E8] rounded-xl focus:border-[#B98389] focus:ring-1 focus:ring-[#B98389] outline-none text-[#3A3335] font-medium transition-all" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[#8B7E7F] uppercase tracking-wide">Frase curta / Especialidade</label>
            <input type="text" value={settings.specialty || ''} onChange={e => setSettings({...settings, specialty: e.target.value})} className="w-full p-3.5 bg-[#FCFAFA] border border-[#F3E8E8] rounded-xl focus:border-[#B98389] focus:ring-1 focus:ring-[#B98389] outline-none text-[#3A3335] font-medium transition-all" placeholder="Ex: Especialista em Olhar" />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <label className="text-xs font-bold text-[#8B7E7F] uppercase tracking-wide">Descrição (Opcional)</label>
            <textarea value={settings.description || ''} onChange={e => setSettings({...settings, description: e.target.value})} className="w-full p-3.5 bg-[#FCFAFA] border border-[#F3E8E8] rounded-xl focus:border-[#B98389] focus:ring-1 focus:ring-[#B98389] outline-none text-[#3A3335] font-medium h-24 resize-none transition-all" />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <label className="text-xs font-bold text-[#8B7E7F] uppercase tracking-wide">Endereço (Aparece no topo)</label>
            <input type="text" value={settings.address || ''} onChange={e => setSettings({...settings, address: e.target.value})} className="w-full p-3.5 bg-[#FCFAFA] border border-[#F3E8E8] rounded-xl focus:border-[#B98389] focus:ring-1 focus:ring-[#B98389] outline-none text-[#3A3335] font-medium transition-all" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[#8B7E7F] uppercase tracking-wide">Link do Instagram (Opcional)</label>
            <input type="text" value={settings.instagram || ''} onChange={e => setSettings({...settings, instagram: e.target.value})} className="w-full p-3.5 bg-[#FCFAFA] border border-[#F3E8E8] rounded-xl focus:border-[#B98389] focus:ring-1 focus:ring-[#B98389] outline-none text-[#3A3335] font-medium transition-all" placeholder="https://instagram.com/..." />
          </div>
        </div>
        <button onClick={() => handleSave('Perfil')} disabled={saving} className="mt-8 w-full sm:w-auto px-8 py-3.5 bg-[#5A7A66] text-white font-bold text-sm tracking-wide rounded-xl hover:bg-[#4A6454] transition-all active:scale-[0.98] flex items-center justify-center gap-2 shadow-md shadow-[#5A7A66]/20">
          <Save size={18} /> SALVAR PERFIL
        </button>
      </section>

      {/* WHATSAPP & MENSAGENS */}
      <section className="bg-white rounded-3xl shadow-[0_4px_20px_rgba(0,0,0,0.02)] border border-[#F3E8E8] p-6 overflow-hidden">
        <div className="flex items-center gap-4 mb-6 border-b border-[#F3E8E8] pb-5">
          <div className="bg-[#E9F0EC] p-3.5 rounded-2xl text-[#5A7A66]"><MessageCircle size={24} /></div>
          <div>
            <h2 className="text-xl font-bold text-[#3A3335]">WhatsApp & Mensagens</h2>
            <p className="text-sm text-[#8B7E7F] font-medium mt-0.5">Configure seu número e os textos automáticos (via wa.me).</p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row gap-4 items-end">
            <div className="flex-1 w-full space-y-1.5">
              <label className="text-xs font-bold text-[#8B7E7F] uppercase tracking-wide flex justify-between">
                <span>Número do WhatsApp da Profissional (Sistema)</span>
                {settings.whatsappSystemNumber && <span className="text-[#5A7A66] flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-[#5A7A66]"></div> WhatsApp Configurado</span>}
              </label>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={settings.whatsappSystemNumber || ''} 
                  onChange={e => {
                    let v = e.target.value.replace(/\D/g, '');
                    if (v.length > 11) v = v.substring(0, 11);
                    if (v.length > 2) v = `(${v.substring(0,2)}) ${v.substring(2)}`;
                    if (v.length > 10) v = `${v.substring(0,10)}-${v.substring(10)}`;
                    else if (v.length > 9) v = `${v.substring(0,9)}-${v.substring(9)}`;
                    setSettings({...settings, whatsappSystemNumber: v});
                  }} 
                  placeholder="(11) 99999-9999" 
                  className="w-full p-3.5 bg-[#FCFAFA] border border-[#F3E8E8] rounded-xl focus:border-[#B98389] focus:ring-1 focus:ring-[#B98389] outline-none text-[#3A3335] font-medium transition-all" 
                />
                <button onClick={() => {
                  if (!settings?.whatsappSystemNumber) return alert("Configure seu número de WhatsApp primeiro!");
                  const phone = settings.whatsappSystemNumber.replace(/\D/g, '');
                  const finalPhone = (phone.length === 10 || phone.length === 11) ? `55${phone}` : phone;
                  const msg = encodeURIComponent("Olá! Este é um teste do sistema de agendamentos. 💕");
                  window.open(`https://wa.me/${finalPhone}?text=${msg}`, '_blank');
                }} className="px-5 py-3.5 bg-[#E9F0EC] text-[#5A7A66] font-bold text-sm tracking-wide rounded-xl hover:bg-[#D5E2D9] transition-all whitespace-nowrap active:scale-[0.98]"><Smartphone size={18} className="inline mr-2"/> TESTAR</button>
              </div>
            </div>
          </div>

          <p className="text-xs text-[#8B7E7F] font-medium bg-[#FCFAFA] border border-[#F3E8E8] p-4 rounded-xl leading-relaxed">✦ O sistema utilizará este número para que as clientes enviem as solicitações para você (via wa.me).</p>

          <div className="space-y-5 pt-6 border-t border-[#F3E8E8]">
            <div>
              <h3 className="font-bold text-[#3A3335]">Templates de Mensagem</h3>
              <p className="text-xs text-[#8B7E7F] mt-1 font-medium">Variáveis permitidas: <code className="text-[#A76D74] bg-[#FFF5F5] px-1 py-0.5 rounded font-bold">{'{cliente}'}</code>, <code className="text-[#A76D74] bg-[#FFF5F5] px-1 py-0.5 rounded font-bold">{'{data}'}</code>, <code className="text-[#A76D74] bg-[#FFF5F5] px-1 py-0.5 rounded font-bold">{'{horario}'}</code>, <code className="text-[#A76D74] bg-[#FFF5F5] px-1 py-0.5 rounded font-bold">{'{procedimento}'}</code></p>
            </div>
            
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-[#8B7E7F] uppercase tracking-wide">Nova solicitação (Enviado pela cliente)</label>
                <button onClick={() => setSettings({...settings, msgNewRequest: defaultMsgs.newRequest})} className="text-[10px] uppercase font-bold text-[#B98389] hover:text-[#A76D74] transition-colors flex items-center gap-1 bg-[#FFF5F5] px-2 py-1 rounded-md"><RotateCcw size={12}/> Restaurar</button>
              </div>
              <textarea value={settings.msgNewRequest} onChange={e => setSettings({...settings, msgNewRequest: e.target.value})} className="w-full p-3.5 bg-[#FCFAFA] border border-[#F3E8E8] rounded-xl focus:border-[#B98389] focus:ring-1 focus:ring-[#B98389] outline-none text-[#3A3335] font-medium h-32 resize-none transition-all" />
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-[#8B7E7F] uppercase tracking-wide">Confirmado (Enviado por você)</label>
                <button onClick={() => setSettings({...settings, msgConfirmed: defaultMsgs.confirmed})} className="text-[10px] uppercase font-bold text-[#B98389] hover:text-[#A76D74] transition-colors flex items-center gap-1 bg-[#FFF5F5] px-2 py-1 rounded-md"><RotateCcw size={12}/> Restaurar</button>
              </div>
              <textarea value={settings.msgConfirmed} onChange={e => setSettings({...settings, msgConfirmed: e.target.value})} className="w-full p-3.5 bg-[#FCFAFA] border border-[#F3E8E8] rounded-xl focus:border-[#B98389] focus:ring-1 focus:ring-[#B98389] outline-none text-[#3A3335] font-medium h-24 resize-none transition-all" />
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-[#8B7E7F] uppercase tracking-wide">Recusado (Enviado por você)</label>
                <button onClick={() => setSettings({...settings, msgRejected: defaultMsgs.rejected})} className="text-[10px] uppercase font-bold text-[#B98389] hover:text-[#A76D74] transition-colors flex items-center gap-1 bg-[#FFF5F5] px-2 py-1 rounded-md"><RotateCcw size={12}/> Restaurar</button>
              </div>
              <textarea value={settings.msgRejected} onChange={e => setSettings({...settings, msgRejected: e.target.value})} className="w-full p-3.5 bg-[#FCFAFA] border border-[#F3E8E8] rounded-xl focus:border-[#B98389] focus:ring-1 focus:ring-[#B98389] outline-none text-[#3A3335] font-medium h-24 resize-none transition-all" />
            </div>
          </div>
        </div>

        <button onClick={() => handleSave('WhatsApp')} disabled={saving} className="mt-8 w-full sm:w-auto px-8 py-3.5 bg-[#5A7A66] text-white font-bold text-sm tracking-wide rounded-xl hover:bg-[#4A6454] transition-all active:scale-[0.98] flex items-center justify-center gap-2 shadow-md shadow-[#5A7A66]/20">
          <Save size={18} /> SALVAR WHATSAPP
        </button>
      </section>

      {/* REGRAS DE AGENDAMENTO */}
      <section className="bg-white rounded-3xl shadow-[0_4px_20px_rgba(0,0,0,0.02)] border border-[#F3E8E8] p-6 overflow-hidden">
        <div className="flex items-center gap-4 mb-6 border-b border-[#F3E8E8] pb-5">
          <div className="bg-[#FFF9F2] p-3.5 rounded-2xl text-[#D4A373]"><Clock size={24} /></div>
          <div>
            <h2 className="text-xl font-bold text-[#3A3335]">Regras de Agendamento</h2>
            <p className="text-sm text-[#8B7E7F] font-medium mt-0.5">Defina limites e comportamentos do calendário.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[#8B7E7F] uppercase tracking-wide">Antecedência Mínima (Minutos)</label>
            <p className="text-xs text-[#A99D9E] mb-2 font-medium">Ex: 30 (Impede de marcar em cima da hora)</p>
            <input type="number" min="0" value={settings.minAdvanceMinutes} onChange={e => setSettings({...settings, minAdvanceMinutes: parseInt(e.target.value) || 0})} className="w-full p-3.5 bg-[#FCFAFA] border border-[#F3E8E8] rounded-xl focus:border-[#B98389] focus:ring-1 focus:ring-[#B98389] outline-none text-[#3A3335] font-bold transition-all" />
          </div>
          
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[#8B7E7F] uppercase tracking-wide">Agendamento Máximo (Dias)</label>
            <p className="text-xs text-[#A99D9E] mb-2 font-medium">Ex: 30 (Até quando a agenda fica aberta)</p>
            <input type="number" min="1" value={settings.maxDaysAhead} onChange={e => setSettings({...settings, maxDaysAhead: parseInt(e.target.value) || 30})} className="w-full p-3.5 bg-[#FCFAFA] border border-[#F3E8E8] rounded-xl focus:border-[#B98389] focus:ring-1 focus:ring-[#B98389] outline-none text-[#3A3335] font-bold transition-all" />
          </div>

          <div className="space-y-2.5 sm:col-span-2 mt-2">
            <label className="text-xs font-bold text-[#8B7E7F] uppercase tracking-wide">Bloqueio de horários pendentes</label>
            <p className="text-xs text-[#A99D9E] font-medium leading-relaxed">Se <span className="font-bold text-[#A76D74]">SIM</span>, um agendamento recém-solicitado "segura" o horário impedindo que outras clientes marquem no mesmo momento até você aprovar ou recusar.</p>
            <div className="flex gap-4 pt-2">
              <label className={`flex items-center justify-center gap-3 cursor-pointer p-4 rounded-2xl border transition-all flex-1 ${settings.pendingBlocksSlot ? 'border-[#B98389] bg-[#FFF5F5]' : 'border-[#F3E8E8] bg-[#FCFAFA]'}`}>
                <input type="radio" name="pendingBlock" checked={settings.pendingBlocksSlot} onChange={() => setSettings({...settings, pendingBlocksSlot: true})} className="hidden" />
                <span className={`font-bold text-sm tracking-wide ${settings.pendingBlocksSlot ? 'text-[#A76D74]' : 'text-[#8B7E7F]'}`}>SIM, BLOQUEAR</span>
              </label>
              <label className={`flex items-center justify-center gap-3 cursor-pointer p-4 rounded-2xl border transition-all flex-1 ${!settings.pendingBlocksSlot ? 'border-[#B98389] bg-[#FFF5F5]' : 'border-[#F3E8E8] bg-[#FCFAFA]'}`}>
                <input type="radio" name="pendingBlock" checked={!settings.pendingBlocksSlot} onChange={() => setSettings({...settings, pendingBlocksSlot: false})} className="hidden" />
                <span className={`font-bold text-sm tracking-wide ${!settings.pendingBlocksSlot ? 'text-[#A76D74]' : 'text-[#8B7E7F]'}`}>NÃO BLOQUEAR</span>
              </label>
            </div>
          </div>
        </div>

        <button onClick={() => handleSave('Regras')} disabled={saving} className="mt-8 w-full sm:w-auto px-8 py-3.5 bg-[#5A7A66] text-white font-bold text-sm tracking-wide rounded-xl hover:bg-[#4A6454] transition-all active:scale-[0.98] flex items-center justify-center gap-2 shadow-md shadow-[#5A7A66]/20">
          <Save size={18} /> SALVAR REGRAS
        </button>
      </section>
    </div>
  );
}
