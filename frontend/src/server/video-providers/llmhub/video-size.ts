const SHORT_SIDE = { '480p': 480, '720p': 720, '1080p': 1080, '4k': 2160 } as const;

/** Requested geometry is advisory at submission and verified on the completed file. */
export function llmhubVideoSize(
  resolution: string | null,
  aspectRatio: string | null,
  engineId?: string,
): string | null {
  const shortSide = resolution && Object.hasOwn(SHORT_SIDE, resolution)
    ? SHORT_SIDE[resolution as keyof typeof SHORT_SIDE] : null;
  const match = (aspectRatio === 'auto' || aspectRatio === 'adaptive' || !aspectRatio
    ? '16:9' : aspectRatio).match(/^(\d+):(\d+)$/);
  if (!shortSide || !match) return null;
  const widthRatio = Number(match[1]);
  const heightRatio = Number(match[2]);
  if (!widthRatio || !heightRatio) return null;
  const roundEven = (value: number) => Math.round(value / 2) * 2;
  const width = widthRatio >= heightRatio ? roundEven(shortSide * widthRatio / heightRatio) : shortSide;
  const height = widthRatio >= heightRatio ? shortSide : roundEven(shortSide * heightRatio / widthRatio);
  if (engineId?.startsWith('wan-3') && resolution === '480p' && widthRatio === 16 && heightRatio === 9) {
    // Wan's adapter accepts 832x480 and emits the standard 854x480 frame.
    return '832x480';
  }
  return `${width}x${height}`;
}

export function matchesLlmhubVideoGeometry(params: {
  resolution: string | null;
  aspectRatio: string | null;
  width: number;
  height: number;
}): boolean {
  const shortSide = params.resolution && Object.hasOwn(SHORT_SIDE, params.resolution)
    ? SHORT_SIDE[params.resolution as keyof typeof SHORT_SIDE] : null;
  if (shortSide && Math.abs(Math.min(params.width, params.height) - shortSide) > shortSide * 0.04) return false;
  const match = params.aspectRatio?.match(/^(\d+):(\d+)$/);
  if (!match) return true;
  const ratio = Number(match[1]) / Number(match[2]);
  return Math.abs(params.width / params.height - ratio) <= ratio * 0.04;
}
