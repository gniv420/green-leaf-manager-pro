
// Helper function to open document URLs
export const openDocument = (document: { data: ArrayBuffer | string, contentType: string }) => {
  if (!document || !document.data) return null;
  
  try {
    // Convert ArrayBuffer to Blob
    let blob;
    if (document.data instanceof ArrayBuffer) {
      blob = new Blob([document.data], { type: document.contentType || 'application/octet-stream' });
    } else {
      blob = new Blob([document.data], { type: document.contentType || 'application/octet-stream' });
    }
    
    // Create a URL for the blob
    const url = URL.createObjectURL(blob);
    return url;
  } catch (error) {
    console.error("Error creating document URL:", error);
    return null;
  }
};

// Helper function to clean up URLs
export const releaseDocumentUrl = (url: string) => {
  if (!url) return;
  
  try {
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error("Error releasing document URL:", error);
  }
};
