// Identify an image by its bytes, not by what the uploader claimed.
//
// multer's `file.mimetype` is copied from the multipart part header, which the
// client writes. Filtering on it means the check is performed against a value
// the attacker chose. Reading the signature instead means the file has to
// actually be the format it says it is.
 
const SIGNATURES = [
  // JPEG: FF D8 FF
  { mime: 'image/jpeg', test: (b) => b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  {
    mime: 'image/png',
    test: (b) => b.length > 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47
      && b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a,
  },
  // WebP: "RIFF" .... "WEBP"
  {
    mime: 'image/webp',
    test: (b) => b.length > 12 && b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP',
  },
];
 
/**
 * @param {Buffer} buffer
 * @returns {string|null} the detected MIME type, or null if it is not one of
 *                        the three formats this application accepts.
 */
function sniffImageMime(buffer) {
  if (!buffer || !buffer.length) return null;
  const hit = SIGNATURES.find((s) => s.test(buffer));
  return hit ? hit.mime : null;
}
 
module.exports = { sniffImageMime };