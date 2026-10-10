import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Order, isClientRole } from '../types';
import { Send, Phone, PhoneOff, Mic, MicOff, Volume2, X } from 'lucide-react';

interface ChatDrawerProps {
  order: Order;
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'chat' | 'call';
}

export const ChatDrawer: React.FC<ChatDrawerProps> = ({
  order,
  isOpen,
  onClose,
  initialTab = 'chat',
}) => {
  const { currentUser, chatMessages, sendChatMessage } = useApp();
  const [inputText, setInputText] = useState('');
  const [isCalling, setIsCalling] = useState(initialTab === 'call');
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const orderMessages = chatMessages.filter((m) => m.orderId === order.id);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [orderMessages]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isCalling) {
      timer = setInterval(() => {
        setCallDuration((d) => d + 1);
      }, 1000);
    } else {
      setCallDuration(0);
    }
    return () => clearInterval(timer);
  }, [isCalling]);

  if (!isOpen) return null;

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    sendChatMessage(order.id, inputText);
    setInputText('');
  };

  const formatCallTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const partnerName =
    isClientRole(currentUser?.role)
      ? order.driverName || 'Carlos Mendoza'
      : order.clientName || 'Cliente Rescátalo';

  const partnerPhone =
    isClientRole(currentUser?.role)
      ? order.driverPhone || '+58 414 123 9876'
      : order.clientPhone || '+58 412 876 5432';

  const partnerAvatar =
    isClientRole(currentUser?.role)
      ? order.driverAvatar || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80'
      : 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80';

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-3 bg-slate-950/85 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md h-[88vh] sm:h-[580px] bg-slate-900 rounded-t-3xl sm:rounded-3xl shadow-2xl border border-cyan-500/35 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-slate-950 px-4 py-3.5 text-white flex items-center justify-between shrink-0 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <img
              src={partnerAvatar}
              alt={partnerName}
              className="w-10 h-10 rounded-xl object-cover border-2 border-cyan-400"
            />
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-black text-white truncate">{partnerName}</h4>
                <span className="text-[10px] bg-cyan-950 text-cyan-300 border border-cyan-500/30 font-bold px-2 py-0.5 rounded-full">
                  En línea
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">{partnerPhone}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isCalling ? (
              <button
                type="button"
                onClick={() => setIsCalling(true)}
                className="w-9 h-9 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 flex items-center justify-center transition-colors cursor-pointer"
                title="Llamar"
              >
                <Phone className="w-4 h-4" />
              </button>
            ) : null}
            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* CALL VIEW */}
        {isCalling ? (
          <div className="flex-1 bg-slate-950 text-white flex flex-col items-center justify-between p-6 text-center animate-in fade-in">
            <div className="pt-4">
              <span className="text-xs uppercase tracking-widest text-cyan-400 font-bold block mb-1">
                Llamada Rescátalo VoIP · La Pascua
              </span>
              <h3 className="text-xl font-black">{partnerName}</h3>
              <p className="text-sm text-slate-400 mt-1">{partnerPhone}</p>
            </div>

            <div className="relative">
              <div className="w-28 h-28 rounded-full bg-slate-900 border border-cyan-500/30 p-1 flex items-center justify-center relative mx-auto">
                <div className="absolute inset-0 rounded-full border-2 border-cyan-400/40 animate-ping" />
                <img
                  src={partnerAvatar}
                  alt={partnerName}
                  className="w-24 h-24 rounded-full object-cover border-2 border-cyan-400"
                />
              </div>
              <div className="mt-4 text-cyan-400 font-mono text-lg font-bold">
                {formatCallTime(callDuration)}
              </div>
            </div>

            <div className="flex items-center gap-4 pb-4">
              <button
                type="button"
                onClick={() => setIsMuted(!isMuted)}
                className={`w-13 h-13 rounded-2xl flex items-center justify-center cursor-pointer ${
                  isMuted ? 'bg-cyan-400 text-slate-950' : 'bg-slate-800 text-slate-200'
                }`}
              >
                {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </button>

              <button
                type="button"
                onClick={() => setIsCalling(false)}
                className="w-16 h-16 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white flex items-center justify-center shadow-lg active:scale-95 cursor-pointer"
              >
                <PhoneOff className="w-7 h-7" />
              </button>

              <button
                type="button"
                className="w-13 h-13 rounded-2xl bg-slate-800 text-slate-200 flex items-center justify-center cursor-pointer"
              >
                <Volume2 className="w-5 h-5" />
              </button>
            </div>
          </div>
        ) : (
          /* CHAT VIEW */
          <>
            <div className="p-2.5 bg-slate-950 border-b border-slate-800 flex items-center gap-2 overflow-x-auto text-xs no-scrollbar shrink-0">
              {['Ya estoy en el punto', '¿Por dónde vienes?', 'Tengo el pago exacto en $', 'Estoy en la puerta'].map((quick) => (
                <button
                  key={quick}
                  type="button"
                  onClick={() => sendChatMessage(order.id, quick)}
                  className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-cyan-300 rounded-xl border border-cyan-500/20 whitespace-nowrap shrink-0 font-bold"
                >
                  {quick}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-900/60">
              {orderMessages.map((msg) => {
                const isMe = msg.senderId === currentUser?.id;
                return (
                  <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                    <div
                      className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                        isMe
                          ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-bold rounded-tr-xs'
                          : 'bg-slate-800 text-white border border-slate-700 rounded-tl-xs'
                      }`}
                    >
                      <p>{msg.text}</p>
                    </div>
                    <span className="text-[10px] text-slate-500 mt-0.5 px-1 font-mono">
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            <form onSubmit={handleSend} className="p-3 bg-slate-950 border-t border-slate-800 flex items-center gap-2 shrink-0">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Escribe un mensaje claro..."
                className="flex-1 px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-cyan-400 placeholder:text-slate-500"
              />
              <button
                type="submit"
                disabled={!inputText.trim()}
                className="w-10 h-10 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 text-slate-950 flex items-center justify-center shrink-0 cursor-pointer shadow-md"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
};
