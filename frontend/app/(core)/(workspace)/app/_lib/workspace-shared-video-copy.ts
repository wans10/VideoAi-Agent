export function sharedVideoLoadFailureCopy(locale: string): string {
  if (locale === 'fr') {
    return 'Impossible de charger cet exemple. Vos réglages actuels sont conservés. Rechargez la page pour réessayer ou choisissez un autre exemple.';
  }
  if (locale === 'es') {
    return 'No se pudo cargar este ejemplo. Se conservaron tus ajustes actuales. Recarga la página para intentarlo de nuevo o elige otro ejemplo.';
  }
  if (locale.startsWith('zh')) {
    return '无法加载该示例。已保留您当前的设置。请刷新页面重试或选择其他示例。';
  }
  return 'This example could not be loaded. Your current settings have been kept. Reload the page to try again or choose another example.';
}
