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

  if (loading) return <div className="text-center p-8 text-gray-500 animate-pulse">Carregando configurações...</div>;

  return (
    <div className="space-y-8">
      {toast && (
        <div className="fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-xl shadow-lg z-50 font-bold transition-all">
          {toast}
        </div>
      )}

      {/* PERFIL PROFISSIONAL */}
      <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 overflow-hidden">
        <div className="flex items-center gap-3 mb-6 border-b border-gray-100 pb-4">
          <div className="bg-pink-100 p-3 rounded-xl text-pink-600"><User size={24} /></div>
          <div>
            <h2 className="text-xl font-bold text-gray-800">Perfil Profissional</h2>
            <p className="text-sm text-gray-500">Informações públicas que aparecem na tela de agendamento.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-sm font-bold text-gray-600">Seu Nome / Nome do Estúdio</label>
            <input type="text" value={settings.professionalName || ''} onChange={e => setSettings({...settings, professionalName: e.target.value})} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-pink-500 outline-none text-gray-900" />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-bold text-gray-600">Frase curta / Especialidade</label>
            <input type="text" value={settings.specialty || ''} onChange={e => setSettings({...settings, specialty: e.target.value})} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-pink-500 outline-none text-gray-900" placeholder="Ex: Especialista em Olhar" />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <label className="text-sm font-bold text-gray-600">Descrição (Opcional)</label>
            <textarea value={settings.description || ''} onChange={e => setSettings({...settings, description: e.target.value})} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-pink-500 outline-none text-gray-900 h-24" />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <label className="text-sm font-bold text-gray-600">Endereço (Aparece no topo)</label>
            <input type="text" value={settings.address || ''} onChange={e => setSettings({...settings, address: e.target.value})} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-pink-500 outline-none text-gray-900" />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-bold text-gray-600">Link do Instagram (Opcional)</label>
            <input type="text" value={settings.instagram || ''} onChange={e => setSettings({...settings, instagram: e.target.value})} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-pink-500 outline-none text-gray-900" placeholder="https://instagram.com/..." />
          </div>
        </div>
        <button onClick={() => handleSave('Perfil')} disabled={saving} className="mt-6 w-full sm:w-auto px-8 py-3 bg-gray-900 text-white font-bold rounded-xl hover:bg-gray-800 transition-colors flex items-center justify-center gap-2">
          <Save size={20} /> Salvar Perfil
        </button>
      </section>

      {/* WHATSAPP & MENSAGENS */}
      <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 overflow-hidden">
        <div className="flex items-center gap-3 mb-6 border-b border-gray-100 pb-4">
          <div className="bg-green-100 p-3 rounded-xl text-green-600"><MessageCircle size={24} /></div>
          <div>
            <h2 className="text-xl font-bold text-gray-800">WhatsApp & Mensagens</h2>
            <p className="text-sm text-gray-500">Configure seu número e os textos automáticos (via wa.me).</p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row gap-4 items-end">
            <div className="flex-1 w-full space-y-1">
              <label className="text-sm font-bold text-gray-600 flex justify-between">
                <span>Número do WhatsApp</span>
                {settings.whatsapp && <span className="text-green-500 flex items-center gap-1 text-xs"><div className="w-2 h-2 rounded-full bg-green-500"></div> Configurado</span>}
              </label>
              <div className="flex gap-2">
                <input type="text" value={settings.whatsapp || ''} onChange={e => setSettings({...settings, whatsapp: e.target.value})} placeholder="5511999999999" className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-pink-500 outline-none text-gray-900" />
                <button onClick={handleTestWhatsApp} className="px-4 py-3 bg-green-50 text-green-600 font-bold rounded-xl hover:bg-green-100 border border-green-200 whitespace-nowrap"><Smartphone size={20} className="inline mr-2"/> Testar</button>
              </div>
            </div>
          </div>

          <p className="text-xs text-gray-500 italic bg-gray-50 p-3 rounded-lg">ℹ️ Atualmente as mensagens são abertas no WhatsApp da cliente ou no seu WhatsApp para envio manual (sem custos de API).</p>

          <div className="space-y-4 pt-4 border-t border-gray-100">
            <h3 className="font-bold text-gray-800">Templates de Mensagem</h3>
            <p className="text-xs text-gray-500 mb-2">Variáveis permitidas: <code className="text-pink-600 font-bold">{'{cliente}'}</code>, <code className="text-pink-600 font-bold">{'{data}'}</code>, <code className="text-pink-600 font-bold">{'{horario}'}</code>, <code className="text-pink-600 font-bold">{'{procedimento}'}</code></p>
            
            <div className="space-y-2">
              <div className="flex justify-between">
                <label className="text-sm font-bold text-gray-600">Nova solicitação (Enviado pela cliente p/ você)</label>
                <button onClick={() => setSettings({...settings, msgNewRequest: defaultMsgs.newRequest})} className="text-xs text-blue-500 hover:underline flex items-center gap-1"><RotateCcw size={12}/> Restaurar padrão</button>
              </div>
              <textarea value={settings.msgNewRequest} onChange={e => setSettings({...settings, msgNewRequest: e.target.value})} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-pink-500 outline-none text-gray-900 h-32" />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between">
                <label className="text-sm font-bold text-gray-600">Agendamento Confirmado (Enviado por você p/ cliente)</label>
                <button onClick={() => setSettings({...settings, msgConfirmed: defaultMsgs.confirmed})} className="text-xs text-blue-500 hover:underline flex items-center gap-1"><RotateCcw size={12}/> Restaurar padrão</button>
              </div>
              <textarea value={settings.msgConfirmed} onChange={e => setSettings({...settings, msgConfirmed: e.target.value})} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-pink-500 outline-none text-gray-900 h-24" />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between">
                <label className="text-sm font-bold text-gray-600">Agendamento Recusado (Enviado por você p/ cliente)</label>
                <button onClick={() => setSettings({...settings, msgRejected: defaultMsgs.rejected})} className="text-xs text-blue-500 hover:underline flex items-center gap-1"><RotateCcw size={12}/> Restaurar padrão</button>
              </div>
              <textarea value={settings.msgRejected} onChange={e => setSettings({...settings, msgRejected: e.target.value})} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-pink-500 outline-none text-gray-900 h-24" />
            </div>
          </div>
        </div>

        <button onClick={() => handleSave('WhatsApp')} disabled={saving} className="mt-6 w-full sm:w-auto px-8 py-3 bg-gray-900 text-white font-bold rounded-xl hover:bg-gray-800 transition-colors flex items-center justify-center gap-2">
          <Save size={20} /> Salvar WhatsApp
        </button>
      </section>

      {/* REGRAS DE AGENDAMENTO */}
      <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 overflow-hidden">
        <div className="flex items-center gap-3 mb-6 border-b border-gray-100 pb-4">
          <div className="bg-purple-100 p-3 rounded-xl text-purple-600"><Clock size={24} /></div>
          <div>
            <h2 className="text-xl font-bold text-gray-800">Regras de Agendamento</h2>
            <p className="text-sm text-gray-500">Defina limites e comportamentos do calendário.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="space-y-1">
            <label className="text-sm font-bold text-gray-600">Antecedência Mínima (Minutos)</label>
            <p className="text-xs text-gray-500 mb-2">Ex: 30 (Cliente não consegue marcar para agora mesmo)</p>
            <input type="number" min="0" value={settings.minAdvanceMinutes} onChange={e => setSettings({...settings, minAdvanceMinutes: parseInt(e.target.value) || 0})} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-pink-500 outline-none text-gray-900 font-bold" />
          </div>
          
          <div className="space-y-1">
            <label className="text-sm font-bold text-gray-600">Agendamento Máximo (Dias)</label>
            <p className="text-xs text-gray-500 mb-2">Ex: 30 (A agenda só abre até o mês que vem)</p>
            <input type="number" min="1" value={settings.maxDaysAhead} onChange={e => setSettings({...settings, maxDaysAhead: parseInt(e.target.value) || 30})} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-pink-500 outline-none text-gray-900 font-bold" />
          </div>

          <div className="space-y-1 sm:col-span-2">
            <label className="text-sm font-bold text-gray-600">Bloqueio de horários pendentes</label>
            <p className="text-xs text-gray-500 mb-2">Se SIM, um agendamento pendente "segura" o horário impedindo que outras clientes marquem no mesmo momento.</p>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer bg-gray-50 p-3 rounded-xl border border-gray-200 flex-1">
                <input type="radio" name="pendingBlock" checked={settings.pendingBlocksSlot} onChange={() => setSettings({...settings, pendingBlocksSlot: true})} className="w-5 h-5 text-pink-600" />
                <span className="font-bold text-gray-800">SIM</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer bg-gray-50 p-3 rounded-xl border border-gray-200 flex-1">
                <input type="radio" name="pendingBlock" checked={!settings.pendingBlocksSlot} onChange={() => setSettings({...settings, pendingBlocksSlot: false})} className="w-5 h-5 text-pink-600" />
                <span className="font-bold text-gray-800">NÃO</span>
              </label>
            </div>
          </div>
        </div>

        <button onClick={() => handleSave('Regras')} disabled={saving} className="mt-6 w-full sm:w-auto px-8 py-3 bg-gray-900 text-white font-bold rounded-xl hover:bg-gray-800 transition-colors flex items-center justify-center gap-2">
          <Save size={20} /> Salvar Regras
        </button>
      </section>
    </div>
  );
}
