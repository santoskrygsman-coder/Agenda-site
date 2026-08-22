"use client";

import { useState } from "react";
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isBefore, startOfDay, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Clock, CalendarIcon, CheckCircle, ArrowLeft, Heart, Sparkles, MessageCircle } from "lucide-react";

export default function BookingWizard({ services, settings }: { services: any[], settings: any }) {
  const [step, setStep] = useState(1);
  const [selectedService, setSelectedService] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  
  const [formData, setFormData] = useState({ name: "", phone: "", notes: "" });
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
          
          <div className="space-y-4">
            {services.map((service: any) => (
              <div 
                key={service.id} 
                onClick={() => handleServiceSelect(service)}
                className="p-5 border border-[#F3E8E8] bg-white rounded-2xl hover:border-[#D9A0A0] hover:bg-[#FFF5F5] cursor-pointer transition-all shadow-[0_4px_20px_rgba(0,0,0,0.02)] active:scale-[0.98]"
              >
                <div className="flex justify-between items-start">
                  <h3 className="font-semibold text-[#3A3335]">{service.name}</h3>
                  <span className="font-bold text-[#B98389]">R$ {service.price.toFixed(2)}</span>
                </div>
                {service.description && <p className="text-sm text-[#8B7E7F] mt-2 leading-relaxed">{service.description}</p>}
                <div className="mt-3 text-xs font-medium text-[#A99D9E] flex items-center">
                  <Clock size={12} className="mr-1.5 opacity-70" /> {service.duration} min
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
          
          <div className="bg-[#FFF5F5] p-5 rounded-2xl mb-6 border border-[#F3E8E8]">
            <h3 className="font-bold text-[#A76D74] mb-3 flex items-center gap-2 text-sm">
              <Heart size={14} /> Seu agendamento
            </h3>
            <div className="space-y-2">
              <p className="text-sm text-[#5A5052] flex items-center gap-2">
                <Sparkles size={14} className="text-[#D4A373]" /> {selectedService.name}
              </p>
              <p className="text-sm text-[#5A5052] flex items-center gap-2">
                <CalendarIcon size={14} className="text-[#D4A373]" /> {format(selectedDate!, "dd/MM/yyyy")}
              </p>
              <p className="text-sm text-[#5A5052] flex items-center gap-2">
                <Clock size={14} className="text-[#D4A373]" /> {selectedTime}
              </p>
              <div className="pt-2 mt-2 border-t border-[#F3E8E8]">
                <p className="text-sm font-bold text-[#A76D74]">R$ {selectedService.price.toFixed(2)}</p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-[#8B7E7F] mb-1.5 uppercase tracking-wide">Nome Completo</label>
              <input 
                required 
                type="text" 
                className="w-full p-4 border border-[#F3E8E8] bg-white rounded-xl focus:border-[#B98389] focus:ring-1 focus:ring-[#B98389] outline-none transition-all text-[#3A3335] shadow-[0_2px_10px_rgba(0,0,0,0.01)]"
                placeholder="Ex: Maria da Silva"
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#8B7E7F] mb-1.5 uppercase tracking-wide">WhatsApp</label>
              <input 
                required 
                type="tel" 
                className="w-full p-4 border border-[#F3E8E8] bg-white rounded-xl focus:border-[#B98389] focus:ring-1 focus:ring-[#B98389] outline-none transition-all text-[#3A3335] shadow-[0_2px_10px_rgba(0,0,0,0.01)]"
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
            <div>
              <label className="block text-xs font-bold text-[#8B7E7F] mb-1.5 uppercase tracking-wide">Observação (Opcional)</label>
              <textarea 
                className="w-full p-4 border border-[#F3E8E8] bg-white rounded-xl focus:border-[#B98389] focus:ring-1 focus:ring-[#B98389] outline-none transition-all text-[#3A3335] shadow-[0_2px_10px_rgba(0,0,0,0.01)] resize-none"
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
        <div className="text-center animate-in zoom-in duration-700 py-10 px-4">
          <div className="w-20 h-20 bg-[#FFF5F5] text-[#B98389] rounded-full flex items-center justify-center mx-auto mb-6 border-4 border-white shadow-[0_4px_20px_rgba(0,0,0,0.05)]">
            <CheckCircle size={36} />
          </div>
          <h2 className="text-2xl font-bold text-[#3A3335] mb-2 flex justify-center items-center gap-2">
            <span className="text-[#D4A373] text-sm">✦</span>
            Solicitação enviada!
            <Heart size={18} className="text-[#B98389] inline ml-1" />
          </h2>
          <p className="text-[#8B7E7F] mb-8 text-sm leading-relaxed max-w-[260px] mx-auto">
            Seu pedido foi enviado com sucesso. Em breve você receberá a confirmação pelo WhatsApp.
          </p>
          
          <div className="bg-white border border-[#F3E8E8] p-5 rounded-2xl text-left mb-8 shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
            <div className="space-y-3">
              <div className="flex justify-between items-center pb-3 border-b border-[#F3E8E8]">
                <span className="text-[#8B7E7F] text-xs uppercase font-bold tracking-wide">Status</span>
                <span className="text-[#D4A373] text-xs font-bold bg-[#FFF9F2] px-2.5 py-1 rounded-full flex items-center gap-1">
                  <Clock size={12} /> PENDENTE
                </span>
              </div>
              <p className="text-sm text-[#5A5052] flex items-center gap-3">
                <CalendarIcon size={16} className="text-[#B98389]" /> {format(selectedDate!, "dd/MM/yyyy")} às {selectedTime}
              </p>
              <p className="text-sm text-[#5A5052] flex items-center gap-3">
                <Sparkles size={16} className="text-[#B98389]" /> {selectedService.name}
              </p>
            </div>
          </div>

          <button 
            onClick={() => window.location.reload()}
            className="text-[#B98389] font-bold text-sm hover:text-[#A76D74] transition-colors uppercase tracking-wide"
          >
            Fazer novo agendamento
          </button>
        </div>
      )}
    </div>
  );
}
