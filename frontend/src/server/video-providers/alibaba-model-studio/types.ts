import type { AlibabaModelRoute } from './model-map';
import type {
  BAILIAN_KLING_OMNI_MODEL,
  BAILIAN_KLING_TURBO_MODEL,
  BAILIAN_KLING_V3_MODEL,
  BAILIAN_MINIMAX_H3_MODEL,
  BailianHostedModel,
  BailianKlingMode,
} from './bailian-models';

export type AlibabaMediaType =
  | 'first_frame'
  | 'last_frame'
  | 'reference_image'
  | 'reference_video'
  | 'reference_audio'
  | 'file'
  | 'link';

export type AlibabaMedia = {
  type: AlibabaMediaType;
  url: string;
};

export type AlibabaVideoResolution = '480P' | '720P' | '1080P';

export type AlibabaVideoPayload = {
  model: Exclude<AlibabaModelRoute['model'], BailianHostedModel>;
  input: {
    prompt?: string;
    media?: AlibabaMedia[];
  };
  parameters: {
    resolution: AlibabaVideoResolution;
    ratio?: string;
    duration: number;
    audio?: boolean;
    prompt_extend?: boolean;
    watermark: false;
    seed?: number;
  };
};

/** Bailian-hosted Kling / MiniMax media roles (kling- and minimax-video-generation-api-reference). */
export type BailianHostedMediaType =
  | 'first_frame'
  | 'last_frame'
  | 'refer'
  | 'base'
  | 'feature'
  | 'image_url'
  | 'driving_audio';

export type BailianHostedMedia = {
  type: BailianHostedMediaType;
  url: string;
  /** Kling Omni only, with a base/feature video. */
  keep_original_sound?: 'yes' | 'no';
};

export type BailianKlingVideoPayload = {
  model: typeof BAILIAN_KLING_TURBO_MODEL | typeof BAILIAN_KLING_V3_MODEL | typeof BAILIAN_KLING_OMNI_MODEL;
  input: {
    prompt?: string;
    negative_prompt?: string;
    media?: BailianHostedMedia[];
    multi_shot?: boolean;
    shot_type?: 'intelligence' | 'customize';
    multi_prompt?: Array<{ index: number; prompt: string; duration: number }>;
  };
  parameters: {
    mode: BailianKlingMode;
    aspect_ratio?: string;
    duration?: number;
    audio?: boolean;
    watermark: false;
  };
};

export type BailianMinimaxVideoPayload = {
  model: typeof BAILIAN_MINIMAX_H3_MODEL;
  input: {
    prompt: string;
    media?: BailianHostedMedia[];
  };
  parameters: {
    resolution: '768P' | '2K';
    ratio?: string;
    duration: number;
    watermark: false;
  };
};

export type BailianHostedVideoPayload = BailianKlingVideoPayload | BailianMinimaxVideoPayload;
/** Everything the shared video-synthesis endpoint accepts from Keyvo. */
export type AlibabaVideoRequestPayload = AlibabaVideoPayload | BailianHostedVideoPayload;

export type AlibabaTaskOutput = {
  task_id?: string;
  task_status?: string;
  video_url?: string;
  code?: string;
  message?: string;
};

export type AlibabaTaskUsage = {
  duration?: number;
  input_video_duration?: number;
  output_video_duration?: number;
  fps?: number;
  SR?: number;
  ratio?: string;
  video_count?: number;
};

export type AlibabaTaskResponse = {
  request_id?: string;
  output?: AlibabaTaskOutput;
  usage?: AlibabaTaskUsage;
  code?: string;
  message?: string;
};

export type AlibabaReferenceAsset = {
  url: string;
  mimeType?: string | null;
  durationSec?: number | null;
  hasAlpha?: boolean | null;
};
