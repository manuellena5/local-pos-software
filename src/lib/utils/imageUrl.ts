const SERVER = typeof window !== 'undefined' && window.location.protocol === 'file:'
  ? 'http://localhost:3001'
  : '';

export function productImageUrl(filePath: string): string {
  return `${SERVER}/${filePath}`;
}
