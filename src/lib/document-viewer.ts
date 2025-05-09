
// Helper function to open document URLs
export const openDocument = (document: { data: ArrayBuffer | string, contentType: string }) => {
  console.log("openDocument called with document:", document ? "Document exists" : "Document is null/undefined");
  
  if (!document || !document.data) {
    console.error("Invalid document: document or document.data is null/undefined");
    return null;
  }
  
  try {
    // Log document content type
    console.log("Document content type:", document.contentType);
    
    // Convert ArrayBuffer or string to Blob
    let blob;
    if (document.data instanceof ArrayBuffer) {
      console.log("Document data is ArrayBuffer, size:", document.data.byteLength);
      blob = new Blob([document.data], { type: document.contentType || 'application/octet-stream' });
    } else if (typeof document.data === 'string') {
      console.log("Document data is string, length:", document.data.length);
      blob = new Blob([document.data], { type: document.contentType || 'application/octet-stream' });
    } else {
      console.error("Invalid document data format:", typeof document.data);
      return null;
    }
    
    // Create a URL for the blob
    const url = URL.createObjectURL(blob);
    console.log("Document URL created successfully:", url);
    return url;
  } catch (error) {
    console.error("Error creating document URL:", error);
    return null;
  }
};

// Helper function to clean up URLs
export const releaseDocumentUrl = (url: string) => {
  console.log("Releasing document URL:", url);
  
  if (!url) {
    console.warn("Attempting to release an empty document URL");
    return;
  }
  
  try {
    URL.revokeObjectURL(url);
    console.log("Document URL released successfully:", url);
  } catch (error) {
    console.error("Error releasing document URL:", error);
  }
};
