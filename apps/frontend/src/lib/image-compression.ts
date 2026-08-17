// Comprime uma imagem no navegador antes do upload (redimensiona + reencoda como WEBP) —
// fotos de celular costumam vir na casa dos vários MB, o que estoura tanto o limite padrão
// de 1MB do Server Action (ver next.config.ts) quanto o limite do backend (ver
// MAX_IMAGE_SIZE_BYTES em apps/backend/src/tenants/tenants.service.ts). O backend também
// reprocessa a imagem recebida (sharp), então isso não duplica lógica — só evita mandar o
// arquivo original inteiro pela rede.
export async function compressImageFile(
  file: File,
  { maxDimension, quality = 0.82 }: { maxDimension: number; quality?: number },
): Promise<File> {
  if (!file.type.startsWith("image/")) return file;

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    // Formato que o navegador não sabe decodificar (ex.: algum HEIC sem suporte) — deixa o
    // backend rejeitar com uma mensagem melhor do que travar aqui.
    return file;
  }

  const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;

  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/webp", quality),
  );
  if (!blob) return file;

  // Nunca manda algo maior do que o original (imagens já pequenas/simples às vezes crescem
  // um pouco ao virar WEBP com essa qualidade).
  if (blob.size >= file.size) return file;

  const newName = file.name.replace(/\.[^.]+$/, "") + ".webp";
  return new File([blob], newName, { type: "image/webp" });
}
