// Build-time enumeration of bundled product images.
const modules = import.meta.glob('../assets/*.{png,jpg,jpeg,webp}', { eager: true, query: '?url', import: 'default' });

export const ASSET_GALLERY = Object.entries(modules)
  .map(([path, url]) => ({
    url,
    name: path.split('/').pop().replace(/\.(png|jpe?g|webp)$/i, '').replace(/_/g, ' '),
  }))
  // exclude non-product imagery
  .filter(a => !/logo|hero|rajeshwar|roopali|mv2|field/i.test(a.name + a.url));