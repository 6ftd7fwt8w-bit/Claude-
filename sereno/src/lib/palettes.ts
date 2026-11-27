/** Estilos de color de la app. Los valores viven en styles.css (data-palette en <html>). */
export type PaletteId = 'bosque' | 'arena' | 'pistacho' | 'lima' | 'lavanda' | 'oceano';

export interface Palette {
  id: PaletteId;
  name: string;
  /** fondo, degradado (2 tonos) y acento: para dibujar la muestra */
  swatch: [string, string, string, string];
  /** color de la barra del navegador / iPhone en modo claro */
  bar: string;
}

export const PALETTES: Palette[] = [
  { id: 'bosque', name: 'Bosque', swatch: ['#f4f7f3', '#63c79d', '#2b8b78', '#3ca67e'], bar: '#f4f7f3' },
  { id: 'arena', name: 'Arena y rosa', swatch: ['#f6efe7', '#eeb3ae', '#c98378', '#d9848f'], bar: '#f6efe7' },
  { id: 'pistacho', name: 'Pistacho', swatch: ['#f1f5ec', '#c3e3ae', '#86b97f', '#8dbb7e'], bar: '#f1f5ec' },
  { id: 'lima', name: 'Lima y grafito', swatch: ['#ecedee', '#3a3d42', '#1c1e21', '#d2f30e'], bar: '#ecedee' },
  { id: 'lavanda', name: 'Lavanda', swatch: ['#f4f2fa', '#b9aaf6', '#6f86db', '#8f7be3'], bar: '#f4f2fa' },
  { id: 'oceano', name: 'Océano', swatch: ['#eef5f7', '#78c9dc', '#2f6e9e', '#3e9bc0'], bar: '#eef5f7' },
];

export function applyPalette(id: PaletteId | undefined): void {
  const p = PALETTES.find((x) => x.id === id) ?? PALETTES[0];
  document.documentElement.dataset.palette = p.id;
  const meta = document.querySelector('meta[name="theme-color"]');
  const dark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
  if (meta) meta.setAttribute('content', dark ? '#131b18' : p.bar);
}
