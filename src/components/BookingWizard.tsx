"use client";

import { useState } from "react";
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isToday, isBefore, startOfDay, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Clock, CalendarIcon, Scissors, CheckCircle, ArrowLeft } from "lucide-react";

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
      <div className="mt-4">
        <div className="flex justify-between items-center mb-4">
          <button onClick={() => handleMonthChange(-1)} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200">
            <ChevronLeft size={20} />
          </button>
          <h3 className="font-semibold text-lg capitalize">{format(currentMonth, "MMMM yyyy", { locale: ptBR })}</h3>
          <button onClick={() => handleMonthChange(1)} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200">
            <ChevronRight size={20} />
          </button>
        </div>
        
        <div className="grid grid-cols-7 gap-2 mb-2 text-center text-sm font-medium text-gray-500">
          <div>D</div><div>S</div><div>T</div><div>Q</div><div>Q</div><div>S</div><div>S</div>
        </div>
        
        <div className="grid grid-cols-7 gap-2">
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
                className={`p-3 rounded-full text-center transition-colors ${
                  isSelected ? "bg-pink-500 text-white font-bold" :
                  disabled ? "text-gray-300 cursor-not-allowed" :
                  "hover:bg-pink-100 text-gray-700"
                }`}
              >
                {format(day, "d")}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="w-full">
      {/* HEADER WIZARD */}
      {step > 1 && step < 5 && (
        <button onClick={() => setStep(step - 1)} className="flex items-center text-pink-600 mb-4 font-medium">
          <ArrowLeft size={18} className="mr-1" /> Voltar
        </button>
      )}

      {/* STEP 1: SERVICES */}
      {step === 1 && (
        <div className="animate-in slide-in-from-right-4 duration-300">
          <h2 className="text-xl font-bold mb-4 flex items-center text-gray-800"><Scissors className="mr-2 text-pink-500" /> Escolha o Procedimento</h2>
          <div className="space-y-3">
            {services.map(service => (
              <div 
                key={service.id} 
                onClick={() => handleServiceSelect(service)}
                className="p-4 border-2 border-transparent bg-gray-50 rounded-2xl hover:border-pink-300 hover:bg-pink-50 cursor-pointer transition-all shadow-sm"
              >
                <div className="flex justify-between items-start">
                  <h3 className="font-bold text-gray-800">{service.name}</h3>
                  <span className="font-bold text-pink-600">R$ {service.price.toFixed(2)}</span>
                </div>
                {service.description && <p className="text-sm text-gray-500 mt-1">{service.description}</p>}
                <div className="mt-2 text-xs font-medium text-gray-400 flex items-center">
                  <Clock size={12} className="mr-1" /> Duração: {service.duration} min
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* STEP 2: DATE */}
      {step === 2 && (
        <div className="animate-in slide-in-from-right-4 duration-300">
          <h2 className="text-xl font-bold mb-2 flex items-center text-gray-800"><CalendarIcon className="mr-2 text-pink-500" /> Qual dia fica melhor?</h2>
          <p className="text-gray-500 text-sm">Selecione uma data para {selectedService.name}</p>
          {renderCalendar()}
        </div>
      )}

      {/* STEP 3: TIME */}
      {step === 3 && (
        <div className="animate-in slide-in-from-right-4 duration-300">
          <h2 className="text-xl font-bold mb-2 flex items-center text-gray-800"><Clock className="mr-2 text-pink-500" /> Horários Disponíveis</h2>
          <p className="text-gray-500 text-sm mb-4">Para o dia {selectedDate ? format(selectedDate, "dd/MM/yyyy") : ""}</p>
          
          {loadingTimes ? (
            <div className="text-center py-8 text-pink-500">Buscando horários...</div>
          ) : availableTimes.length > 0 ? (
            <div className="grid grid-cols-2 gap-3">
              {availableTimes.map(time => (
                <button
                  key={time}
                  onClick={() => handleTimeSelect(time)}
                  className="p-4 rounded-xl border-2 border-gray-200 text-lg font-semibold text-gray-700 hover:border-pink-500 hover:bg-pink-50 hover:text-pink-600 transition-colors"
                >
                  {time}
                </button>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-xl">
              Nenhum horário disponível nesta data.
            </div>
          )}
        </div>
      )}

      {/* STEP 4: FORM */}
      {step === 4 && (
        <div className="animate-in slide-in-from-right-4 duration-300">
          <h2 className="text-xl font-bold mb-4 text-gray-800">Seus Dados</h2>
          
          <div className="bg-pink-50 p-4 rounded-xl mb-6">
            <h3 className="font-bold text-pink-800 mb-2">Resumo do Agendamento</h3>
            <p className="text-sm text-pink-700"><strong>Procedimento:</strong> {selectedService.name}</p>
            <p className="text-sm text-pink-700"><strong>Data:</strong> {format(selectedDate!, "dd/MM/yyyy")} às {selectedTime}</p>
            <p className="text-sm text-pink-700"><strong>Valor:</strong> R$ {selectedService.price.toFixed(2)}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome Completo</label>
              <input 
                required 
                type="text" 
                className="w-full p-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-pink-500 focus:outline-none"
                placeholder="Maria da Silva"
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">WhatsApp</label>
              <input 
                required 
                type="tel" 
                className="w-full p-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-pink-500 focus:outline-none"
                placeholder="(00) 00000-0000"
                value={formData.phone}
                onChange={e => setFormData({...formData, phone: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Observação (Opcional)</label>
              <textarea 
                className="w-full p-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-pink-500 focus:outline-none"
                placeholder="Alguma restrição ou dúvida?"
                rows={2}
                value={formData.notes}
                onChange={e => setFormData({...formData, notes: e.target.value})}
              />
            </div>

            <button 
              type="submit" 
              disabled={submitting}
              className="w-full bg-pink-600 text-white font-bold text-lg p-4 rounded-xl mt-4 hover:bg-pink-700 disabled:opacity-50 transition-colors"
            >
              {submitting ? "Enviando..." : "ENVIAR SOLICITAÇÃO"}
            </button>
          </form>
        </div>
      )}

      {/* STEP 5: SUCCESS */}
      {step === 5 && (
        <div className="text-center animate-in zoom-in duration-500 py-8">
          <div className="w-20 h-20 bg-green-100 text-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle size={40} />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Solicitação Enviada!</h2>
          <p className="text-gray-600 mb-6">
            Seu horário foi enviado para análise da profissional. Aguarde a confirmação pelo seu WhatsApp.
          </p>
          
          <div className="bg-gray-50 border border-gray-200 p-4 rounded-xl text-left mb-6">
            <p className="text-sm text-gray-600"><strong>Data:</strong> {format(selectedDate!, "dd/MM/yyyy")}</p>
            <p className="text-sm text-gray-600"><strong>Horário:</strong> {selectedTime}</p>
            <p className="text-sm text-gray-600"><strong>Procedimento:</strong> {selectedService.name}</p>
            <p className="text-sm text-gray-600"><strong>Status:</strong> <span className="text-yellow-600 font-bold bg-yellow-100 px-2 py-0.5 rounded">PENDENTE</span></p>
          </div>

          <button 
            onClick={() => window.location.reload()}
            className="text-pink-600 font-bold hover:underline"
          >
            Fazer novo agendamento
          </button>
        </div>
      )}
    </div>
  );
}
