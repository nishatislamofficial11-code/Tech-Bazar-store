import DOMPurify from 'dompurify';

const ALLOWED_TAGS = [
  'a',
  'b',
  'blockquote',
  'br',
  'code',
  'em',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'hr',
  'i',
  'li',
  'ol',
  'p',
  'pre',
  'span',
  'strong',
  'table',
  'tbody',
  'td',
  'th',
  'thead',
  'tr',
  'u',
  'ul',
  'img',
  'iframe'
];

const ALLOWED_ATTR = ['href', 'target', 'rel', 'title', 'src', 'alt', 'width', 'height', 'allow', 'allowfullscreen', 'class', 'style'];

DOMPurify.addHook('afterSanitizeAttributes', function(node) {
  // set missing alt attributes on images for SEO
  if (node.tagName === 'IMG' && !node.getAttribute('alt')) {
    node.setAttribute('alt', 'Product Description Image');
  }
});

export function sanitizeHtml(value?: string) {
  return DOMPurify.sanitize(value || '', {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
  });
}
