// Attēlu konvertēšana servera pusē, kas strādā gan Node.js (Netlify, sharp), gan Cloudflare Workers (Images binding).
type Opts = { format: 'jpeg' | 'webp'; quality?: number; maxSize?: number };

type ImagesBinding = {
  input: (s: ReadableStream) => {
    transform: (t: Record<string, unknown>) => ImagesTransformer;
    output: (o: { format: string; quality?: number }) => Promise<{ response: () => Response }>;
  };
};
type ImagesTransformer = { output: (o: { format: string; quality?: number }) => Promise<{ response: () => Response }> };

async function cfImages(): Promise<ImagesBinding | null> {
  try {
    const { getCloudflareContext } = await import('@opennextjs/cloudflare');
    const env = getCloudflareContext().env as unknown as { IMAGES?: ImagesBinding };
    return env.IMAGES || null;
  } catch {
    return null;
  }
}

export async function convertImage(input: ArrayBuffer, o: Opts): Promise<Buffer> {
  const q = o.quality ?? 82;
  const images = await cfImages();
  if (images) {
    const stream = new Response(input).body!;
    const fmt = o.format === 'jpeg' ? 'image/jpeg' : 'image/webp';
    const base = images.input(stream);
    const res = o.maxSize ? await base.transform({ width: o.maxSize, height: o.maxSize, fit: 'scale-down' }).output({ format: fmt, quality: q }) : await base.output({ format: fmt, quality: q });
    return Buffer.from(await res.response().arrayBuffer());
  }
  const sharp = (await import('sharp')).default;
  let img = sharp(Buffer.from(input), { failOn: 'none' }).rotate();
  if (o.maxSize) img = img.resize({ width: o.maxSize, height: o.maxSize, fit: 'inside', withoutEnlargement: true });
  return o.format === 'jpeg' ? img.jpeg({ quality: q }).toBuffer() : img.webp({ quality: q }).toBuffer();
}
