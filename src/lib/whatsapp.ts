export const normalizeWhatsAppNumber = (value?: string) => {
  if (!value) return '';
  const digits = value.replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('880')) return digits;
  if (digits.startsWith('0')) return `88${digits}`;
  return digits;
};

export const createWhatsAppUrl = (phone?: string, message?: string) => {
  const number = normalizeWhatsAppNumber(phone);
  if (!number) return '';
  const text = message ? `?text=${encodeURIComponent(message)}` : '';
  return `https://wa.me/${number}${text}`;
};
