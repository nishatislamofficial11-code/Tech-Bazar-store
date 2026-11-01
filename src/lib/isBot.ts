export const isBot = (): boolean => {
  if (typeof window === 'undefined') return false;
  if (navigator.webdriver) return true;
  
  const botPattern = /bot|googlebot|crawler|spider|robot|crawling|lighthouse|chrome-lighthouse|insights|speed|ptst|headless|moto g power/i;
  return botPattern.test(navigator.userAgent);
};
