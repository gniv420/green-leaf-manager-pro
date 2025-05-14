
import { Document } from '@/lib/document-types';

/**
 * Utility for viewing documents
 */
export const DocumentViewer = {
  /**
   * Opens a document in the appropriate viewer
   */
  openDocument: (document: Document) => {
    // Check if document has content or URL
    if (document.content) {
      // Create blob URL from content
      const blob = new Blob([document.content], { type: document.contentType });
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
    } else if (document.data) {
      // Use data field if content is not available
      const blob = new Blob([document.data], { type: document.contentType });
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');  
    } else if (document.url) {
      // Open URL directly
      window.open(document.url, '_blank');
    } else {
      console.error('Document has no content or URL to display');
    }
  }
};
