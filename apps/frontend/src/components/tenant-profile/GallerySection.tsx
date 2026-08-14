import type { PublicGalleryImage } from "@totalagenda/shared-types";
import { Container } from "../ui/Container";
import { Reveal } from "../ui/Reveal";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export function GallerySection({ images }: { images: PublicGalleryImage[] }) {
  if (images.length === 0) return null;

  return (
    <Reveal>
      <section className="border-t border-zinc-200 py-16 dark:border-white/10">
        <Container className="max-w-2xl">
          <h2 className="font-display text-2xl font-bold text-zinc-900 dark:text-white">Galeria</h2>

          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {images.map((image) => (
              <a
                key={image.id}
                href={`${API_URL}${image.url}`}
                target="_blank"
                rel="noreferrer"
                className="group aspect-square overflow-hidden rounded-2xl bg-zinc-100 dark:bg-white/5"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`${API_URL}${image.url}`}
                  alt=""
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
              </a>
            ))}
          </div>
        </Container>
      </section>
    </Reveal>
  );
}
