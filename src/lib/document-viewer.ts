
// Helper function to open document URLs
export const openDocument = (document: { data: ArrayBuffer | string, contentType: string }) => {
  if (!document.data) return null;
  
  // Convert ArrayBuffer to Blob
  let blob;
  if (document.data instanceof ArrayBuffer) {
    blob = new Blob([document.data], { type: document.contentType });
  } else {
    blob = new Blob([document.data], { type: document.contentType });
  }
  
  // Create a URL for the blob
  const url = URL.createObjectURL(blob);
  return url;
};

// Helper function to clean up URLs
export const releaseDocumentUrl = (url: string) => {
  URL.revokeObjectURL(url);
};
