
export const openDocument = (doc: { data: Buffer | ArrayBuffer | string, contentType: string }): string => {
  try {
    // Convertir el ArrayBuffer o Buffer a Blob
    let blob;
    
    if (typeof doc.data === 'string') {
      // Si es una cadena (base64 o URL de datos), usarla directamente
      return doc.data;
    } else if (doc.data instanceof ArrayBuffer) {
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
    if (!url.startsWith('data:')) {
      URL.revokeObjectURL(url);
    }
  } catch (error) {
    console.error('Error releasing document URL:', error);
  }
};
