import sharp from "sharp";

const WIDTH = 1024;
const HEIGHT = 1536;
/** Top 40% — área da foto do usuário (preservada). */
const TOP_H = Math.round(HEIGHT * 0.4);

function dataUrlToBuffer(dataUrl: string): Buffer {
  const match = /^data:(.+?);base64,(.*)$/.exec(dataUrl);
  if (!match) throw new Error("dataUrl inválido");
  return Buffer.from(match[2], "base64");
}

/**
 * Monta a imagem base (foto do usuário no topo + preto embaixo) e a máscara
 * para images.edit: topo opaco = preservar, fundo transparente = editar (texto).
 */
export async function prepareUploadForEdit(dataUrl: string): Promise<{
  basePng: Buffer;
  maskPng: Buffer;
}> {
  const inputBuffer = dataUrlToBuffer(dataUrl);

  // Foto encaixada no topo (cover, alinhada ao topo)
  const fitted = await sharp(inputBuffer)
    .rotate()
    .resize(WIDTH, TOP_H, { fit: "cover", position: "top" })
    .png()
    .toBuffer();

  // Canvas 4:5 preto com a foto colada no topo
  const basePng = await sharp({
    create: {
      width: WIDTH,
      height: HEIGHT,
      channels: 3,
      background: { r: 0, g: 0, b: 0 },
    },
  })
    .composite([{ input: fitted, top: 0, left: 0 }])
    .png()
    .toBuffer();

  // Máscara: topo opaco (preservar), fundo transparente (editar legenda)
  const preserveStrip = await sharp({
    create: {
      width: WIDTH,
      height: TOP_H,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    },
  })
    .png()
    .toBuffer();

  const maskPng = await sharp({
    create: {
      width: WIDTH,
      height: HEIGHT,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input: preserveStrip, top: 0, left: 0 }])
    .png()
    .toBuffer();

  return { basePng, maskPng };
}

export { WIDTH, HEIGHT, TOP_H };
