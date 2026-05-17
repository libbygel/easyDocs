export function absoluteAppUrl(path: string) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const origin = typeof window !== 'undefined' && window.location?.origin
    ? window.location.origin
    : 'https://easydocs.tech';
  return `${origin}${normalizedPath}`;
}

export function openAppPath(path: string) {
  window.open(absoluteAppUrl(path), '_blank', 'noopener,noreferrer');
}
