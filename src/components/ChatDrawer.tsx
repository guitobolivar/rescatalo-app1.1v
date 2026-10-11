import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Order, isClientRole, ChatMessage } from '../types';
import { Send, Phone, PhoneOff, Mic, MicOff, Volume2, X, Lock } from 'lucide-react';
import {
  subscribeToFirestoreOrderMessages,
  sendFirestoreOrderMessage,
} from '../services/firebase';

interface ChatDrawerProps {
  order: Order;
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'chat' | 'call';
  onMessagesRead?: () => void;
}

export const ChatDrawer: React.FC<ChatDrawerProps> = ({
  order,
  isOpen,
  onClose,
  initialTab = 'chat',
  onMessagesRead,
}) => {
  const { currentUser, chatMessages, sendChatMessage } = useApp();
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isCalling, setIsCalling] = useState(initialTab === 'call');
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [firestoreMessages, setFirestoreMessages] = useState<ChatMessage[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Marcar como leídos cuando el usuario abre el chat
  useEffect(() => {
    if (isOpen) {
      onMessagesRead?.();
    }
  }, [isOpen, onMessagesRead]);

  // 1. En el useEffect donde usas onSnapshot para escuchar la colección de mensajes (orders/{orderId}/messages),
  // se incluye una función de limpieza (cleanup function) que cancela el listener anterior usando return () => unsubscribe();
  useEffect(() => {
    if (!isOpen || !order?.id) return;

    const unsubscribe = subscribeToFirestoreOrderMessages(order.id, (remoteMsgs) => {
      if (Array.isArray(remoteMsgs)) {
        setFirestoreMessages(remoteMsgs);
        onMessagesRead?.();
      }
    });

    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, [isOpen, order?.id]);

  // Desduplicación estricta por ID único de Firestore o local para evitar duplicados en la UI
  const localOrderMessages = chatMessages.filter((m) => m.orderId === order.id);
  const combinedMessagesMap = new Map<string, ChatMessage>();

  firestoreMessages.forEach((m) => {
    if (m.id) combinedMessagesMap.set(m.id, m);
  });
  // Solo agregar locales si no existen ya en Firestore
  localOrderMessages.forEach((m) => {
    if (m.id && !combinedMessagesMap.has(m.id)) {
      // También evitar duplicado si ya hay un mensaje en Firestore con el mismo texto y timestamp muy similar
      const isDuplicateText = firestoreMessages.some(
        (fm) => fm.senderId === m.senderId && fm.text === m.text && Math.abs(fm.timestamp - m.timestamp) < 4000
      );
      if (!isDuplicateText) {
        combinedMessagesMap.set(m.id, m);
      }
    }
  });

  const displayMessages = Array.from(combinedMessagesMap.values()).sort(
    (a, b) => (a.timestamp || 0) - (b.timestamp || 0)
  );

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [displayMessages.length]);

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

  // 2. handleSendMessage con e.preventDefault(), bloqueo isSending y limpieza inmediata de inputText
  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSending) return;

    const text = inputText.trim();
    if (!text || !currentUser) return;

    // Limpia el campo de texto inmediatamente al iniciar el envío
    setInputText('');
    setIsSending(true);

    try {
      // 1. Envío a la subcolección de Firestore `orders/{orderId}/messages` con serverTimestamp()
      await sendFirestoreOrderMessage(order.id, {
        text,
        senderId: currentUser.id,
        senderName: currentUser.name,
        senderRole: currentUser.role,
      });
      // 2. Despacho en memoria para sincronización auxiliar
      sendChatMessage(order.id, text);
    } catch (err) {
      console.warn('Error guardando mensaje en Firestore subcolección:', err);
    } finally {
      setIsSending(false);
    }
  };

  const handleQuickSend = async (quickText: string) => {
    if (isSending || !currentUser) return;
    setIsSending(true);

    try {
      await sendFirestoreOrderMessage(order.id, {
        text: quickText,
        senderId: currentUser.id,
        senderName: currentUser.name,
        senderRole: currentUser.role,
      });
      sendChatMessage(order.id, quickText);
    } catch (err) {
      console.warn('Error guardando mensaje rápido en Firestore:', err);
    } finally {
      setIsSending(false);
    }
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
                  onClick={() => handleQuickSend(quick)}
                  className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-cyan-300 rounded-xl border border-cyan-500/20 whitespace-nowrap shrink-0 font-bold active:scale-95 transition-transform"
                >
                  {quick}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-900/60">
              {displayMessages.length === 0 ? (
                <div className="text-center py-12 text-slate-500 space-y-2">
                  <div className="w-10 h-10 rounded-full bg-slate-800/80 flex items-center justify-center mx-auto text-cyan-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <p className="text-xs font-bold text-slate-400">Chat 100% privado en tiempo real</p>
                  <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
                    Solo tú y tu contraparte asignada tienen acceso a este canal exclusivo.
                  </p>
                </div>
              ) : (
                displayMessages.map((msg) => {
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
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            <form onSubmit={handleSend} className="p-3 bg-slate-950 border-t border-slate-800 flex items-center gap-2 shrink-0">
              <input
                type="text"
                value={inputText}
                disabled={isSending}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={isSending ? "Enviando mensaje..." : "Escribe un mensaje claro..."}
                className="flex-1 px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-cyan-400 placeholder:text-slate-500 disabled:opacity-60 transition-colors"
              />
              <button
                type="submit"
                disabled={!inputText.trim() || isSending}
                className="w-10 h-10 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 hover:scale-[1.04] active:scale-95 disabled:opacity-40 disabled:hover:scale-100 text-slate-950 flex items-center justify-center shrink-0 cursor-pointer shadow-lg shadow-cyan-500/20 transition-all"
                title="Enviar mensaje"
              >
                {isSending ? (
                  <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Send className="w-4 h-4 stroke-[2.5]" />
                )}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
};
