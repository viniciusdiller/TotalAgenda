"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { CaretLeft, CaretRight, X } from "@phosphor-icons/react/dist/ssr";
import type { PublicGalleryImage } from "@totalagenda/shared-types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export function GalleryLightbox({
  images,
  openIndex,
  onClose,
}: {
  images: PublicGalleryImage[];
  openIndex: number | null;
  onClose: () => void;
}) {
  const [index, setIndex] = useState(openIndex ?? 0);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (openIndex != null) setIndex(openIndex);
  }, [openIndex]);

  useEffect(() => {
    if (openIndex == null) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") setIndex((i) => (i + 1) % images.length);
      if (e.key === "ArrowLeft") setIndex((i) => (i - 1 + images.length) % images.length);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [openIndex, onClose, images.length]);

  return (
    <AnimatePresence>
      {openIndex != null ? (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label="Galeria de fotos"
          initial={reduceMotion ? undefined : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/90 p-4"
          onClick={onClose}
        >
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="absolute top-5 right-5 text-white/70 hover:text-white"
          >
            <X size={24} />
          </button>

          {images.length > 1 ? (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIndex((i) => (i - 1 + images.length) % images.length);
                }}
                aria-label="Anterior"
                className="absolute left-3 text-white/70 hover:text-white sm:left-6"
              >
                <CaretLeft size={28} />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIndex((i) => (i + 1) % images.length);
                }}
                aria-label="Próxima"
                className="absolute right-3 text-white/70 hover:text-white sm:right-6"
              >
                <CaretRight size={28} />
              </button>
            </>
          ) : null}

          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`${API_URL}${images[index].url}`}
            alt=""
            onClick={(e) => e.stopPropagation()}
            className="max-h-[85vh] max-w-full rounded-lg object-contain shadow-2xl"
          />
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
