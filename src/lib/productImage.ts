export const getProductImage = (product: {
  image?: string | null;
  image_url?: string | null;
  images?: string[] | null;
}) => product.image || product.image_url || product.images?.find(Boolean) || '';
