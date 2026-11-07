/**
 * Utilitário para geração de código PIX Copia e Cola (padrão EMVCo / BACEN BR Code)
 * com valor do sinal já preenchido e cálculo de CRC16-CCITT (0x1021).
 */

function formatEmvField(id: string, value: string): string {
  const len = value.length.toString().padStart(2, "0");
  return `${id}${len}${value}`;
}

function normalizeAscii(str: string, maxLength: number): string {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9 ]/g, "")
    .trim()
    .toUpperCase()
    .slice(0, maxLength) || "ESTUDIO CILIOS";
}

export function computeCrc16(payload: string): string {
  let crc = 0xffff;
  const polynomial = 0x1021;

  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let bit = 0; bit < 8; bit++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ polynomial) & 0xffff;
      } else {
        crc = (crc << 1) & 0xffff;
      }
    }
  }

  return crc.toString(16).toUpperCase().padStart(4, "0");
}

export function generatePixCopyPaste(params: {
  pixKey: string;
  merchantName?: string;
  merchantCity?: string;
  amount: number;
  txid?: string;
}): string {
  const cleanKey = (params.pixKey || "000.000.000-00").trim();
  const merchantName = normalizeAscii(params.merchantName || "ESTUDIO CILIOS", 25);
  const merchantCity = normalizeAscii(params.merchantCity || "SAO PAULO", 15);
  const txid = (params.txid || "***").replace(/[^a-zA-Z0-9*]/g, "").slice(0, 25) || "***";

  const gui = formatEmvField("00", "br.gov.bcb.pix");
  const keyField = formatEmvField("01", cleanKey);
  const merchantAccountInfo = formatEmvField("26", `${gui}${keyField}`);

  const amountStr = Math.max(0, Number(params.amount || 0)).toFixed(2);
  const additionalData = formatEmvField("62", formatEmvField("05", txid));

  const payloadWithoutCrc = [
    formatEmvField("00", "01"),
    merchantAccountInfo,
    formatEmvField("52", "0000"),
    formatEmvField("53", "986"),
    ...(Number(params.amount) > 0 ? [formatEmvField("54", amountStr)] : []),
    formatEmvField("58", "BR"),
    formatEmvField("59", merchantName),
    formatEmvField("60", merchantCity),
    additionalData,
    "6304",
  ].join("");

  const crc = computeCrc16(payloadWithoutCrc);
  return `${payloadWithoutCrc}${crc}`;
}

/**
 * Gera uma matriz visual determinística estilo QR Code (25x25) a partir do payload BR Code
 * para exibição imediata no modal sem depender de chamadas externas.
 */
export function buildQrMatrixFromPayload(payload: string, size = 25): boolean[][] {
  const matrix: boolean[][] = Array.from({ length: size }, () =>
    Array.from({ length: size }, () => false)
  );
  const reserved: boolean[][] = Array.from({ length: size }, () =>
    Array.from({ length: size }, () => false)
  );

  const placeFinderPattern = (rowOffset: number, colOffset: number) => {
    for (let r = -1; r <= 7; r++) {
      for (let c = -1; c <= 7; c++) {
        const rr = rowOffset + r;
        const cc = colOffset + c;
        if (rr < 0 || rr >= size || cc < 0 || cc >= size) continue;
        reserved[rr][cc] = true;
        const isBorder = r === 0 || r === 6 || c === 0 || c === 6;
        const isInner = r >= 2 && r <= 4 && c >= 2 && c <= 4;
        const isSeparator = r === -1 || r === 7 || c === -1 || c === 7;
        matrix[rr][cc] = !isSeparator && (isBorder || isInner);
      }
    }
  };

  placeFinderPattern(0, 0);
  placeFinderPattern(0, size - 7);
  placeFinderPattern(size - 7, 0);

  // Timing patterns
  for (let i = 8; i < size - 8; i++) {
    reserved[6][i] = true;
    reserved[i][6] = true;
    matrix[6][i] = i % 2 === 0;
    matrix[i][6] = i % 2 === 0;
  }

  // Alignment pattern (bottom-right area)
  const alignCenter = size - 7;
  for (let r = -2; r <= 2; r++) {
    for (let c = -2; c <= 2; c++) {
      const rr = alignCenter + r;
      const cc = alignCenter + c;
      reserved[rr][cc] = true;
      const isBorder = Math.abs(r) === 2 || Math.abs(c) === 2;
      const isCenter = r === 0 && c === 0;
      matrix[rr][cc] = isBorder || isCenter;
    }
  }

  let seed = 2166136261;
  for (let i = 0; i < payload.length; i++) {
    seed ^= payload.charCodeAt(i);
    seed = Math.imul(seed, 16777619);
  }

  let idx = 0;
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (reserved[r][c]) continue;
      const charCode = payload.charCodeAt(idx % payload.length);
      const hash = Math.imul(seed ^ (r * 31 + c * 17 + charCode), 2654435761) >>> 0;
      matrix[r][c] = (hash & 1) === 1;
      idx++;
    }
  }

  return matrix;
}
