'use client';
import { useState } from 'react';
import { MessageCircle, Phone, X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

export function FloatingContact({ phone, whatsapp }: { phone: string; whatsapp: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="fixed bottom-5 right-5 z-40 flex flex-col items-end gap-2 print:hidden">
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="flex flex-col items-end gap-2">
            <a href={`https://wa.me/${whatsapp}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 rounded-full bg-[#25D366] px-4 py-3 font-semibold text-white shadow-lg">
              <MessageCircle className="h-5 w-5" /> WhatsApp
            </a>
            <a href={`tel:${phone.replace(/\s/g, '')}`} className="flex items-center gap-2 rounded-full bg-petrol px-4 py-3 font-semibold text-white shadow-lg">
              <Phone className="h-5 w-5" /> Zvanīt
            </a>
          </motion.div>
        )}
      </AnimatePresence>
      <button
        onClick={() => setOpen((v) => !v)}
        className="grid h-14 w-14 place-items-center rounded-full bg-signal text-white shadow-[0_8px_24px_-6px_rgba(21,32,43,.5)] transition hover:scale-105"
        aria-expanded={open}
        aria-label={open ? 'Aizvērt saziņas izvēlni' : 'Sazināties'}
      >
        {open ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </button>
    </div>
  );
}
