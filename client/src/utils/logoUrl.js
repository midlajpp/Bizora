export const getLogoUrl = (logoPath) => {
  if (!logoPath) return '';
  if (logoPath.startsWith('http://') || logoPath.startsWith('https://') || logoPath.startsWith('data:')) {
    return logoPath;
  }
  const envUrl = import.meta.env.VITE_API_URL;
  const apiBase = envUrl
    ? envUrl.replace(/\/api\/?$/, '')
    : (typeof window !== 'undefined' ? window.location.origin : '');
  return `${apiBase}${logoPath.startsWith('/') ? '' : '/'}${logoPath}`;
};
