"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/Button";
import {
  uploadGalleryImageAction,
  removeGalleryImageAction,
  type UploadGalleryImageState,
} from "./actions";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
const uploadInitialState: UploadGalleryImageState = {};

export function GalleryManager({ images }: { images: { id: string; url: string }[] }) {
  const [uploadState, uploadFormAction, uploadPending] = useActionState(
    uploadGalleryImageAction,
    uploadInitialState,
  );

  return (
    <div className="rounded-2xl border border-zinc-200 p-5 dark:border-white/10">
      <p className="text-sm font-semibold text-zinc-900 dark:text-white">Galeria</p>
      <p className="mt-1 text-sm text-zinc-500 dark:text-stone-400">
        Fotos do espaço e do trabalho, mostradas na página pública (até 12 fotos).
      </p>

      {images.length > 0 ? (
        <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-4">
          {images.map((image) => (
            <div key={image.id} className="group relative aspect-square overflow-hidden rounded-xl">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`${API_URL}${image.url}`}
                alt=""
                className="h-full w-full object-cover"
              />
              <form action={removeGalleryImageAction.bind(null, image.id)}>
                <button
                  type="submit"
                  className="absolute inset-0 flex items-center justify-center bg-black/50 text-sm font-medium text-white opacity-0 transition-opacity group-hover:opacity-100"
                >
                  Remover
                </button>
              </form>
            </div>
          ))}
        </div>
      ) : null}

      <form action={uploadFormAction} className="mt-4 flex items-center gap-3">
        <input
          type="file"
          name="file"
          accept="image/jpeg,image/png,image/webp"
          className="text-sm text-zinc-600 dark:text-stone-300"
        />
        <Button type="submit" variant="ghost" disabled={uploadPending} className="text-sm">
          {uploadPending ? "Enviando..." : "Adicionar foto"}
        </Button>
      </form>

      {uploadState?.error ? (
        <p className="mt-2 text-sm text-red-600 dark:text-red-400">{uploadState.error}</p>
      ) : null}
    </div>
  );
}
