
export const openDocument = (doc: { data: Buffer | ArrayBuffer, contentType: string }): string => {
  try {
    // Convertir el ArrayBuffer o Buffer a Blob
    let blob;
    if (doc.data instanceof ArrayBuffer) {
      blob = new Blob([doc.data], { type: doc.contentType });
    } else {
      // Convertir Buffer a ArrayBuffer primero si es necesario
      const arrayBuffer = new Uint8Array(doc.data).buffer;
      blob = new Blob([arrayBuffer], { type: doc.contentType });
    }
    
    // Crear URL para el blob
    const url = URL.createObjectURL(blob);
    return url;
  } catch (error) {
    console.error('Error opening document:', error);
    return '';
  }
};

export const releaseDocumentUrl = (url: string): void => {
  try {
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error releasing document URL:', error);
  }
};
