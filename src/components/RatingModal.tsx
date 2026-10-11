import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Order } from '../types';
import { Star, CheckCircle, ThumbsUp, X } from 'lucide-react';

interface RatingModalProps {
  order: Order;
  isOpen: boolean;
  onClose: () => void;
}

const SERVICE_TAGS = [
  'Puntual',
  'Manejo seguro',
  'Pedido intacto',
  'Excelente trato',
  'Buena comunicación',
  'Súper rápido',
];

export const RatingModal: React.FC<RatingModalProps> = ({ order, isOpen, onClose }) => {
  const { submitRating } = useApp();
  const [stars, setStars] = useState<number>(5);
  const [selectedTags, setSelectedTags] = useState<string[]>(['Puntual', 'Pedido intacto']);
  const [comment, setComment] = useState('');
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen) return null;

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitRating(order.id, stars, selectedTags, comment);
    setSubmitted(true);
    setTimeout(() => {
      onClose();
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/85 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-[94%] max-w-sm mx-auto bg-slate-900 rounded-3xl shadow-2xl border border-cyan-500/35 overflow-hidden max-h-[85vh] overflow-y-auto">
        {submitted ? (
          <div className="p-7 text-center space-y-3">
            <div className="w-14 h-14 rounded-full bg-cyan-950 text-cyan-400 flex items-center justify-center mx-auto border border-cyan-500/40">
              <CheckCircle className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-black text-white">¡Calificación Registrada!</h3>
            <p className="text-xs text-slate-300">
              Gracias por impulsar la confianza en Rescátalo Valle de la Pascua.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            <div className="text-center">
              <img
                src={
                  order.driverAvatar ||
                  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80'
                }
                alt={order.driverName || 'Repartidor'}
                className="w-16 h-16 rounded-2xl object-cover border-2 border-cyan-400 shadow-md mx-auto mb-2.5"
              />
              <h3 className="text-base font-black text-white">¡Entrega Completada!</h3>
              <p className="text-xs text-slate-300 mt-0.5">
                Califica el servicio de <strong>{order.driverName || 'tu conductor'}</strong>
              </p>
            </div>

            {/* Stars */}
            <div className="flex justify-center items-center gap-2 py-1">
              {[1, 2, 3, 4, 5].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setStars(val)}
                  className="p-1 cursor-pointer focus:outline-none hover:scale-115 transition-transform"
                >
                  <Star
                    className={`w-8 h-8 ${
                      val <= stars
                        ? 'fill-cyan-400 text-cyan-400'
                        : 'text-slate-700 fill-slate-800'
                    }`}
                  />
                </button>
              ))}
            </div>

            {/* Service Tags */}
            <div>
              <label className="block text-xs font-black text-cyan-400 uppercase mb-2">
                Aspectos destacados del servicio:
              </label>
              <div className="flex flex-wrap gap-2">
                {SERVICE_TAGS.map((tag) => {
                  const isSelected = selectedTags.includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleTag(tag)}
                      className={`text-xs font-bold px-3 py-1.5 rounded-xl border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-cyan-500 border-cyan-500 text-slate-950 shadow-xs'
                          : 'bg-slate-950 border-slate-700 text-slate-300 hover:text-white'
                      }`}
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Comment */}
            <div>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Escribe una breve reseña (opcional)..."
                rows={2}
                className="w-full p-3 bg-slate-950 border border-slate-700 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:border-cyan-400 resize-none placeholder:text-slate-500"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3.5 bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 text-slate-950 font-black text-sm rounded-2xl cursor-pointer active:scale-98 transition-all shadow-lg shadow-cyan-500/20"
            >
              Enviar Calificación
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
