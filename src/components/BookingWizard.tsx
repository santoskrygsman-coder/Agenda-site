"use client";

import { useState } from "react";
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isBefore, startOfDay, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Clock, CalendarIcon, CheckCircle, ArrowLeft, Heart, Sparkles, MessageCircle, CreditCard, Gift } from "lucide-react";
import { WhatsAppService } from "@/lib/whatsappService";
import Carousel from "@/components/Carousel";

export default function BookingWizard({ services, settings }: { services: any[], settings: any }) {
  const [step, setStep] = useState(1);
  const [selectedService, setSelectedService] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  
  const [formData, setFormData] = useState({ name: "", phone: "", notes: "", birthDate: "" });
  const [availableTimes, setAvailableTimes] = useState<string[]>([]);
  const [loadingTimes, setLoadingTimes] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // --- Step 1: Services ---
  const handleServiceSelect = (service: any) => {
    setSelectedService(service);
    setStep(2);
  };

  // --- Step 2: Date ---
  const handleMonthChange = (direction: number) => {
    setCurrentMonth(direction > 0 ? addMonths(currentMonth, 1) : subMonths(currentMonth, 1));
  };

  const handleDateSelect = async (date: Date) => {
    if (isBefore(date, startOfDay(new Date()))) return; // Impede datas passadas
    
    setSelectedDate(date);
    setLoadingTimes(true);
    setSelectedTime(null);
    setStep(3);
    
    // Buscar horários disponíveis
    try {
      const res = await fetch(`/api/availability?date=${format(date, "yyyy-MM-dd")}&duration=${selectedService.duration}`);
      const data = await res.json();
      setAvailableTimes(data.times || []);
    } catch (e) {
      console.error(e);
      setAvailableTimes([]);
    } finally {
      setLoadingTimes(false);
    }
  };

  // --- Step 3: Time ---
  const handleTimeSelect = (time: string) => {
    setSelectedTime(time);
    setStep(4);
  };

  // --- Step 4: Form Submit ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    
    try {
      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceId: selectedService.id,
          date: format(selectedDate!, "yyyy-MM-dd"),
          time: selectedTime,
          ...formData
        })
      });
      if (res.ok) {
        setStep(5);
      } else {
        const errorData = await res.json();
        alert(errorData.error || "Ocorreu um erro ao agendar. Tente novamente.");
      }
    } catch (e) {
      alert("Ocorreu um erro ao agendar.");
    } finally {
      setSubmitting(false);
    }
  };

  const renderCalendar = () => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    const days = eachDayOfInterval({ start, end });
    const maxFutureDate = addDays(startOfDay(new Date()), settings.maxDaysAhead || 30);
    
    return (
      <div className="mt-6">
        <div className="flex justify-between items-center mb-6">
          <button onClick={() => handleMonthChange(-1)} className="p-2 text-[#8B7E7F] hover:text-[#B98389] hover:bg-[#FFF5F5] rounded-full transition-colors">
            <ChevronLeft size={20} />
          </button>
          <h3 className="font-medium text-lg capitalize text-[#3A3335]">{format(currentMonth, "MMMM yyyy", { locale: ptBR })}</h3>
          <button onClick={() => handleMonthChange(1)} className="p-2 text-[#8B7E7F] hover:text-[#B98389] hover:bg-[#FFF5F5] rounded-full transition-colors">
            <ChevronRight size={20} />
          </button>
        </div>
        
        <div className="grid grid-cols-7 gap-1 mb-2 text-center text-xs font-semibold text-[#A99D9E]">
          <div>D</div><div>S</div><div>T</div><div>Q</div><div>Q</div><div>S</div><div>S</div>
        </div>
        
        <div className="grid grid-cols-7 gap-1 sm:gap-2">
          {Array.from({ length: start.getDay() }).map((_, i) => (
            <div key={`empty-${i}`} />
          ))}
          {days.map(day => {
            const isPast = isBefore(day, startOfDay(new Date()));
            const isTooFar = isBefore(maxFutureDate, day);
            const isSelected = selectedDate && isSameDay(day, selectedDate);
            const disabled = isPast || isTooFar;
            
            return (
              <button
                key={day.toISOString()}
                disabled={disabled}
                onClick={() => handleDateSelect(day)}
                className={`relative aspect-square flex flex-col items-center justify-center rounded-full text-center transition-all ${
                  isSelected ? "bg-[#B98389] text-white font-bold shadow-md shadow-[#B98389]/30" :
                  disabled ? "text-[#E8DCDC] cursor-not-allowed" :
                  "hover:bg-[#FFF5F5] hover:text-[#A76D74] text-[#3A3335] font-medium"
                }`}
              >
                {format(day, "d")}
                {isSelected && <span className="absolute bottom-1 w-1 h-1 bg-white rounded-full"></span>}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="w-full relative">
      {/* HEADER WIZARD */}
      {step > 1 && step < 5 && (
        <button onClick={() => setStep(step - 1)} className="flex items-center text-[#B98389] hover:text-[#A76D74] mb-6 font-medium transition-colors text-sm">
          <ArrowLeft size={16} className="mr-1" /> Voltar
        </button>
      )}

      {/* STEP 1: SERVICES */}
      {step === 1 && (
        <div className="animate-in slide-in-from-right-4 duration-500">
          <div className="mb-6 text-center">
            <h2 className="text-xl font-bold text-[#3A3335] flex items-center justify-center gap-2">
              <span className="text-[#D4A373] text-xs">✦</span> 
              Escolha seu procedimento
              <span className="text-[#D4A373] text-xs">✦</span>
            </h2>
            <p className="text-[#8B7E7F] text-sm mt-1 font-medium">Realce sua beleza com um atendimento personalizado.</p>
          </div>
          
          <div className="space-y-6">
            {services.map((service: any) => (
              <div 
                key={service.id} 
                onClick={() => handleServiceSelect(service)}
                className="p-5 border border-[#F3E8E8] bg-white rounded-3xl hover:border-[#D9A0A0] hover:bg-[#FFF5F5] cursor-pointer transition-all shadow-[0_4px_20px_rgba(0,0,0,0.02)] active:scale-[0.98] group"
              >
                {/* Seção da Galeria de Fotos vinculada ao Procedimento */}
                {service.galleryImages && service.galleryImages.length > 0 && (
                  <Carousel images={service.galleryImages} />
                )}
                
                <div className="flex justify-between items-start mt-2">
                  <h3 className="font-semibold text-[#3A3335] group-hover:text-[#A76D74] transition-colors">{service.name}</h3>
                  <span className="font-bold text-[#B98389]">R$ {service.price.toFixed(2)}</span>
                </div>
                {service.description && <p className="text-sm text-[#8B7E7F] mt-2 leading-relaxed">{service.description}</p>}
                
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <div className="text-xs font-bold tracking-wide uppercase bg-[#FCFAFA] border border-[#F3E8E8] text-[#8B7E7F] px-3 py-1.5 rounded-full flex items-center">
                    <Clock size={12} className="mr-1.5" /> {service.duration} min
                  </div>
                  {service.requiresDeposit && (
                    <div className="text-xs font-bold tracking-wide uppercase bg-[#FFF9F2] text-[#D4A373] px-3 py-1.5 rounded-full flex items-center">
                      <CreditCard size={12} className="mr-1.5" /> Exige Sinal
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* STEP 2: DATE */}
      {step === 2 && (
        <div className="animate-in slide-in-from-right-4 duration-500">
          <div className="mb-2 text-center">
            <h2 className="text-xl font-bold text-[#3A3335] flex items-center justify-center gap-2">
              <Heart size={16} className="text-[#B98389]" /> 
              Escolha seu dia
            </h2>
            <p className="text-[#8B7E7F] text-sm mt-1 font-medium">Qual dia combina melhor com você?</p>
          </div>
          <div className="bg-white p-4 rounded-3xl border border-[#F3E8E8] shadow-[0_4px_20px_rgba(0,0,0,0.02)] mt-6">
            {renderCalendar()}
          </div>
        </div>
      )}

      {/* STEP 3: TIME */}
      {step === 3 && (
        <div className="animate-in slide-in-from-right-4 duration-500">
          <div className="mb-6 text-center">
            <h2 className="text-xl font-bold text-[#3A3335] flex items-center justify-center gap-2">
              <span className="text-[#D4A373] text-xs">✦</span> 
              Escolha seu horário
              <span className="text-[#D4A373] text-xs">✦</span>
            </h2>
            <p className="text-[#8B7E7F] text-sm mt-1 font-medium">Horários disponíveis em {selectedDate ? format(selectedDate, "dd/MM") : ""}</p>
          </div>
          
          {loadingTimes ? (
            <div className="text-center py-12 text-[#B98389] flex flex-col items-center gap-3">
              <div className="w-6 h-6 border-2 border-[#B98389] border-t-transparent rounded-full animate-spin"></div>
              <span className="text-sm font-medium">Buscando horários...</span>
            </div>
          ) : availableTimes.length > 0 ? (
            <div className="grid grid-cols-3 gap-3">
              {availableTimes.map(time => (
                <button
                  key={time}
                  onClick={() => handleTimeSelect(time)}
                  className="py-4 px-2 rounded-2xl border border-[#F3E8E8] bg-white text-base font-semibold text-[#5A5052] hover:border-[#B98389] hover:bg-[#FFF5F5] hover:text-[#A76D74] transition-all shadow-[0_2px_10px_rgba(0,0,0,0.02)] active:scale-95 flex flex-col items-center gap-1"
                >
                  {time}
                </button>
              ))}
            </div>
          ) : (
            <div className="text-center py-10 px-4 text-[#8B7E7F] bg-white border border-[#F3E8E8] rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
              <CalendarIcon size={32} className="mx-auto mb-3 opacity-20" />
              <p className="font-medium">Nenhum horário disponível.</p>
              <p className="text-xs mt-1">Por favor, escolha outro dia.</p>
            </div>
          )}
        </div>
      )}

      {/* STEP 4: FORM */}
      {step === 4 && (
        <div className="animate-in slide-in-from-right-4 duration-500">
          <div className="mb-6 text-center">
            <h2 className="text-xl font-bold text-[#3A3335] flex items-center justify-center gap-2">
              <Sparkles size={16} className="text-[#B98389]" /> 
              Quase lá!
            </h2>
            <p className="text-[#8B7E7F] text-sm mt-1 font-medium">Informe seus dados para solicitar seu horário.</p>
          </div>
          
          <div className="bg-[#FFF5F5] p-5 rounded-3xl mb-6 border border-[#F3E8E8]">
            <h3 className="font-bold text-[#A76D74] mb-4 flex items-center gap-2 text-sm uppercase tracking-wide">
              <Heart size={14} /> Seu agendamento
            </h3>
            <div className="space-y-3">
              <p className="text-sm font-semibold text-[#5A5052] flex items-center gap-2">
                <Sparkles size={14} className="text-[#D4A373]" /> {selectedService.name}
              </p>
              <div className="flex gap-4">
                <p className="text-sm font-semibold text-[#5A5052] flex items-center gap-2">
                  <CalendarIcon size={14} className="text-[#D4A373]" /> {format(selectedDate!, "dd/MM/yyyy")}
                </p>
                <p className="text-sm font-semibold text-[#5A5052] flex items-center gap-2">
                  <Clock size={14} className="text-[#D4A373]" /> {selectedTime}
                </p>
              </div>
              <div className="pt-3 mt-1 border-t border-[#F3E8E8] flex justify-between items-center">
                <p className="text-sm font-bold text-[#5A5052] uppercase tracking-wide">Valor:</p>
                <p className="text-sm font-bold text-[#A76D74]">R$ {selectedService.price.toFixed(2)}</p>
              </div>
              {selectedService.requiresDeposit && (
                <div className="pt-2">
                  <div className="text-xs font-bold tracking-wide uppercase bg-[#FFF9F2] text-[#D4A373] px-3 py-2 rounded-xl flex items-center gap-2">
                    <CreditCard size={14} /> Requer sinal prévio
                  </div>
                </div>
              )}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-[#8B7E7F] mb-1.5 uppercase tracking-wide">Nome Completo *</label>
              <input 
                required 
                type="text" 
                className="w-full p-4 border border-[#F3E8E8] bg-white rounded-2xl focus:border-[#B98389] focus:ring-1 focus:ring-[#B98389] outline-none transition-all text-[#3A3335] shadow-[0_2px_10px_rgba(0,0,0,0.01)]"
                placeholder="Ex: Maria da Silva"
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#8B7E7F] mb-1.5 uppercase tracking-wide">WhatsApp *</label>
              <input 
                required 
                type="tel" 
                className="w-full p-4 border border-[#F3E8E8] bg-white rounded-2xl focus:border-[#B98389] focus:ring-1 focus:ring-[#B98389] outline-none transition-all text-[#3A3335] shadow-[0_2px_10px_rgba(0,0,0,0.01)]"
                placeholder="(11) 99999-9999"
                value={formData.phone}
                onChange={e => {
                  let v = e.target.value.replace(/\D/g, '');
                  if (v.length > 11) v = v.substring(0, 11);
                  if (v.length > 2) v = `(${v.substring(0,2)}) ${v.substring(2)}`;
                  if (v.length > 10) v = `${v.substring(0,10)}-${v.substring(10)}`;
                  else if (v.length > 9) v = `${v.substring(0,9)}-${v.substring(9)}`;
                  setFormData({...formData, phone: v});
                }}
              />
            </div>
            
            <div className="bg-[#FCFAFA] p-4 rounded-2xl border border-[#F3E8E8]">
              <label className="block text-xs font-bold text-[#8B7E7F] mb-1.5 uppercase tracking-wide flex items-center gap-1.5">
                <Gift size={14} className="text-[#B98389]" /> Aniversário (Opcional)
              </label>
              <input 
                type="text" 
                className="w-full p-3.5 border border-[#E8DCDC] bg-white rounded-xl focus:border-[#B98389] focus:ring-1 focus:ring-[#B98389] outline-none transition-all text-[#3A3335] text-sm"
                placeholder="DD/MM/AAAA"
                value={formData.birthDate}
                onChange={e => {
                  let v = e.target.value.replace(/\D/g, '');
                  if (v.length > 8) v = v.substring(0, 8);
                  if (v.length > 2) v = `${v.substring(0,2)}/${v.substring(2)}`;
                  if (v.length > 5) v = `${v.substring(0,5)}/${v.substring(5)}`;
                  setFormData({...formData, birthDate: v});
                }}
              />
              <p className="text-[10px] text-[#A99D9E] mt-1.5 font-medium">Cadastre para receber mimos especiais!</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#8B7E7F] mb-1.5 uppercase tracking-wide">Observação (Opcional)</label>
              <textarea 
                className="w-full p-4 border border-[#F3E8E8] bg-white rounded-2xl focus:border-[#B98389] focus:ring-1 focus:ring-[#B98389] outline-none transition-all text-[#3A3335] shadow-[0_2px_10px_rgba(0,0,0,0.01)] resize-none"
                placeholder="Alguma dúvida ou restrição?"
                rows={2}
                value={formData.notes}
                onChange={e => setFormData({...formData, notes: e.target.value})}
              />
            </div>

            <button 
              type="submit" 
              disabled={submitting}
              className="w-full bg-[#A76D74] text-white font-bold text-sm tracking-wide p-4 rounded-2xl mt-2 hover:bg-[#8A5A60] disabled:opacity-50 transition-all active:scale-[0.98] shadow-lg shadow-[#A76D74]/20 flex justify-center items-center gap-2"
            >
              {submitting ? "ENVIANDO..." : <><Sparkles size={16} /> SOLICITAR AGENDAMENTO</>}
            </button>
          </form>
        </div>
      )}

      {/* STEP 5: SUCCESS */}
      {step === 5 && (
        <div className="text-center animate-in zoom-in duration-700 py-6 px-2 sm:px-4">
          <div className="w-20 h-20 bg-[#FFF5F5] text-[#B98389] rounded-full flex items-center justify-center mx-auto mb-5 border-4 border-white shadow-[0_4px_20px_rgba(0,0,0,0.05)]">
            <CheckCircle size={36} />
          </div>
          <h2 className="text-2xl font-bold text-[#3A3335] mb-2 flex justify-center items-center gap-2">
            💕 Solicitação enviada!
          </h2>
          <p className="text-[#8B7E7F] mb-6 text-sm leading-relaxed max-w-[280px] mx-auto font-medium">
            Sua solicitação de agendamento foi registrada.
          </p>
          
          <div className="bg-white border border-[#F3E8E8] p-5 rounded-3xl text-left mb-6 shadow-[0_4px_20px_rgba(0,0,0,0.02)] relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-[#D4A373]"></div>
            <p className="text-xs font-bold text-[#8B7E7F] uppercase tracking-wide mb-1 flex items-center gap-1.5">
              <Sparkles size={12} className="text-[#D4A373]" /> Procedimento
            </p>
            <p className="text-lg font-bold text-[#3A3335] mb-4">{selectedService.name}</p>

            <div className="flex items-center gap-4 text-[#5A5052] font-semibold text-sm mb-4">
              <p className="flex items-center gap-1.5">
                <CalendarIcon size={16} className="text-[#B98389]" /> {format(selectedDate!, "dd/MM/yyyy")}
              </p>
              <p className="flex items-center gap-1.5">
                <Clock size={16} className="text-[#B98389]" /> {selectedTime}
              </p>
            </div>
            
            <div className="p-3 bg-[#FFF9F2] rounded-xl flex items-start gap-2">
              <div className="mt-0.5"><div className="w-2 h-2 rounded-full bg-[#D4A373] animate-pulse"></div></div>
              <div>
                <p className="text-xs font-bold text-[#D4A373] uppercase tracking-wide mb-0.5">AGUARDANDO CONFIRMAÇÃO</p>
                <p className="text-[11px] text-[#A99D9E] font-medium leading-tight">O horário ainda não está confirmado pela profissional.</p>
              </div>
            </div>
          </div>

          {selectedService.requiresDeposit && (
            <div className="bg-[#FFF5F5] border border-[#F3E8E8] rounded-2xl p-4 mb-6 flex gap-3 text-left">
              <div className="shrink-0 text-[#A76D74]"><CreditCard size={20} /></div>
              <div>
                <p className="text-sm font-bold text-[#3A3335] mb-1">Este procedimento requer um sinal para confirmação.</p>
                <p className="text-xs text-[#8B7E7F] leading-relaxed">A forma de pagamento será combinada diretamente com a profissional pelo WhatsApp.</p>
              </div>
            </div>
          )}

          {(() => {
            const whatsappTarget = settings?.whatsappSystemNumber || settings?.whatsapp;
            if (!whatsappTarget) return null;
            
            const msg = WhatsAppService.getNewRequestMessage(
              formData.name,
              selectedService.name,
              format(selectedDate!, "dd/MM/yyyy"),
              selectedTime || "",
              selectedService.price,
              selectedService.requiresDeposit,
              formData.notes
            );
            
            const href = WhatsAppService.generateWhatsAppLink(whatsappTarget, msg);

            return (
              <>
                <a 
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full bg-[#25D366] text-white font-bold text-sm tracking-wide p-4 rounded-2xl mb-3 hover:bg-[#1ebd5a] transition-all shadow-lg shadow-[#25D366]/20 flex justify-center items-center gap-2 active:scale-[0.98]"
                >
                  <MessageCircle size={18} /> ENVIAR PELO WHATSAPP
                </a>
              </>
            );
          })()}

          <button 
            onClick={() => window.location.reload()}
            className="text-[#8B7E7F] font-bold text-xs hover:text-[#3A3335] transition-colors uppercase tracking-widest mt-4"
          >
            Voltar para o início
          </button>
        </div>
      )}
    </div>
  );
}
