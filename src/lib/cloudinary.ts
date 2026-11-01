export const buildCloudinaryUrl = (url: string | undefined | null, transformations: string) => {
  if (!url) return '';
  if (!url.includes('res.cloudinary.com') || !url.includes('/upload/')) return url;
  
  // Format: https://res.cloudinary.com/demo/image/upload/v1234/sample.jpg
  // Target: https://res.cloudinary.com/demo/image/upload/transformations/v1234/sample.jpg
  
  const parts = url.split('/upload/');
  if (parts.length === 2) {
    const pathParams = parts[1].split('/');
    // Check if it already has transformations (e.g. w_500,h_500,c_fill)
    // Cloudinary transformations usually don't have dots or start with v (version)
    if (pathParams[0].includes('_') && !pathParams[0].startsWith('v') && !pathParams[0].includes('.')) {
      // Replace existing transformations
      return `${parts[0]}/upload/${transformations}/${pathParams.slice(1).join('/')}`;
    } else {
      // Insert new transformations
      return `${parts[0]}/upload/${transformations}/${parts[1]}`;
    }
  }
  return url;
};
