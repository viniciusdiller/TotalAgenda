"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import type { PublicGalleryImage } from "@totalagenda/shared-types";
import { Container } from "../ui/Container";
import { Reveal } from "../ui/Reveal";
import { GalleryLightbox } from "./GalleryLightbox";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
const STAGGER_CAP = 8;

export function GallerySection({ images }: { images: PublicGalleryImage[] }) {
  const [index, setIndex] = useState<number | null>(null);
  const reduceMotion = useReducedMotion();

  if (images.length === 0) return null;

  return (
    <>
      <Reveal>
        <section className="border-t border-zinc-200 py-16 dark:border-white/10">
          <Container className="max-w-2xl">
            <h2 className="font-display text-2xl font-bold text-zinc-900 dark:text-white">Galeria</h2>

            {/* Masonry via CSS columns — imagens de proporções variadas quebram a
                monotonia de um grid uniforme, sem precisar medir cada imagem em JS. */}
            <div className="mt-6 columns-2 gap-3 sm:columns-3 [&>*]:mb-3">
              {images.map((image, i) => (
                <motion.button
                  key={image.id}
                  type="button"
                  layoutId={`gallery-photo-${image.id}`}
                  onClick={() => setIndex(i)}
                  className="group relative block w-full overflow-hidden rounded-2xl bg-zinc-100 break-inside-avoid dark:bg-white/5"
                  initial={reduceMotion ? undefined : { opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-40px" }}
                  transition={{ duration: 0.4, delay: (i % STAGGER_CAP) * 0.05 }}
                  whileHover={reduceMotion ? undefined : { y: -2 }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`${API_URL}${image.url}`}
                    alt=""
                    className="block w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]"
                  />
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                </motion.button>
              ))}
            </div>
          </Container>
        </section>
      </Reveal>

      {/* Fora do <Reveal> de propósito: motion.div com animação de y aplica
          transform no elemento, e position:fixed dentro de um ancestral com
          transform passa a ser relativo a ele, não à viewport — o lightbox
          aparecia fora de tela quando ficava dentro do Reveal. */}
      <GalleryLightbox images={images} index={index} onClose={() => setIndex(null)} onNavigate={setIndex} />
    </>
  );
}
