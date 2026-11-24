import type { MediaInputEligibility } from '@/lib/media-input-eligibility';
import { getWanReferenceValidationMessage } from '@/lib/wan-image-failure-messages';

export function mediaInputEligibilityMessage(result: MediaInputEligibility, locale = 'en'): string | null {
  const fr = locale.startsWith('fr'); const es = locale.startsWith('es'); const zh = locale.startsWith('zh');
  if (result.status === 'excerpt_required' && result.maxDurationExclusive) return zh ? `请在添加后选择短于 ${result.maxDurationSec} 秒的片段。` : fr ? `Choisissez un passage de moins de ${result.maxDurationSec} s après l’ajout.`
    : es ? `Elige un fragmento de menos de ${result.maxDurationSec} s después de añadirlo.` : `Choose a section under ${result.maxDurationSec} s after adding.`;
  if (result.status === 'excerpt_required') return zh ? `请在添加后选择不超过 ${result.maxDurationSec} 秒的片段。` : fr ? `Choisissez un passage de ${result.maxDurationSec} s maximum après l’ajout.`
    : es ? `Elige un fragmento de hasta ${result.maxDurationSec} s después de añadirlo.` : `Choose a section up to ${result.maxDurationSec} s after adding.`;
  if (result.status === 'unverified') return zh ? '缺失的媒体信息将在生成前核验。' : fr ? 'Les métadonnées manquantes seront vérifiées avant la génération.'
    : es ? 'Los datos pendientes se verificarán antes de generar.' : 'Missing media details will be verified before generation.';
  if (result.status !== 'blocked') return null;
  const wanImage = getWanReferenceValidationMessage({ engineId: result.engineId ?? '', locale,
    error: 'IMAGE_DIMENSIONS_TOO_SMALL', actualWidth: result.actualWidth, actualHeight: result.actualHeight,
    minimumSidePx: result.minimumImageSidePx });
  if (wanImage) return wanImage;
  if (result.minimumImageSidePx) return zh ? `请选择每边至少 ${result.minimumImageSidePx} 像素的图片。` : fr ? `Choisissez une image d’au moins ${result.minimumImageSidePx} px de chaque côté.`
    : es ? `Elige una imagen de al menos ${result.minimumImageSidePx} px por lado.` : `Choose an image at least ${result.minimumImageSidePx} px on each side.`;
  if (result.durationIssue === 'too-short') return zh ? `素材过短，请选择至少 ${result.minDurationSec} 秒。` : fr ? `Source trop courte. Choisissez au moins ${result.minDurationSec} s.`
    : es ? `Fuente demasiado corta. Elige al menos ${result.minDurationSec} s.` : `Source is too short. Choose at least ${result.minDurationSec} s.`;
  if (result.durationIssue === 'too-long') return zh ? `素材对该用途而言过长，请导入不超过 ${result.maxDurationSec} 秒的片段。` : fr ? `Source trop longue pour ce rôle. Importez un passage de ${result.maxDurationSec} s maximum.`
    : es ? `Fuente demasiado larga para este rol. Importa un fragmento de hasta ${result.maxDurationSec} s.` : `Source is too long for this role. Import a section up to ${result.maxDurationSec} s.`;
  const messages = {
    mode: ['This role is unavailable in the current workflow.', 'Ce rôle est indisponible dans le mode actuel.', 'Este rol no está disponible en el modo actual.', '当前流程不支持该用途。'],
    dimensions: ['Dimensions are incompatible with this role. Choose a different source.', 'Dimensions incompatibles avec ce rôle. Choisissez une autre source.', 'Dimensiones incompatibles con este rol. Elige otra fuente.', '尺寸与该用途不兼容，请选择其他素材。'],
    kind: ['This role needs a different media type.', 'Ce rôle nécessite un autre type de média.', 'Este rol necesita otro tipo de medio.', '该用途需要其他类型的媒体。'],
    size: ['File is too large for this role.', 'Fichier trop volumineux pour ce rôle.', 'Archivo demasiado grande para este rol.', '文件过大，不适用于该用途。'],
    format: ['Format is incompatible with this role.', 'Format incompatible avec ce rôle.', 'Formato incompatible con este rol.', '格式与该用途不兼容。'],
    aspect_ratio: ['Image proportions are incompatible with this role.', 'Proportions de l’image incompatibles avec ce rôle.', 'Proporciones de imagen incompatibles con este rol.', '图片比例与该用途不兼容。'],
    duration: ['Duration is incompatible with this role.', 'Durée incompatible avec ce rôle.', 'Duración incompatible con este rol.', '时长与该用途不兼容。'],
  };
  return messages[result.issue ?? 'format'][zh ? 3 : fr ? 1 : es ? 2 : 0];
}
