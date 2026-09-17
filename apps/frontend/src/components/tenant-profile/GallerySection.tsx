"use client";

import { useState } from "react";
import type { PublicGalleryImage } from "@totalagenda/shared-types";
import { Container } from "../ui/Container";
import { Reveal } from "../ui/Reveal";
import { GalleryLightbox } from "./GalleryLightbox";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export function GallerySection({ images }: { images: PublicGalleryImage[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  if (images.length === 0) return null;

  return (
    <Reveal>
      <section className="border-t border-zinc-200 py-16 dark:border-white/10">
        <Container className="max-w-2xl">
          <h2 className="font-display text-2xl font-bold text-zinc-900 dark:text-white">Galeria</h2>

          {/* Masonry via CSS columns — imagens de proporções variadas quebram a
              monotonia de um grid uniforme, sem precisar medir cada imagem em JS. */}
          <div className="mt-6 columns-2 gap-3 sm:columns-3 [&>*]:mb-3">
            {images.map((image, i) => (
              <button
                key={image.id}
                type="button"
                onClick={() => setOpenIndex(i)}
                className="group block w-full overflow-hidden rounded-2xl bg-zinc-100 break-inside-avoid dark:bg-white/5"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`${API_URL}${image.url}`}
                  alt=""
                  className="w-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
              </button>
            ))}
          </div>
        </Container>
      </section>

      <GalleryLightbox images={images} openIndex={openIndex} onClose={() => setOpenIndex(null)} />
    </Reveal>
  );
}
