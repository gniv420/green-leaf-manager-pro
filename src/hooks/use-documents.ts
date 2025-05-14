
import { useState, useEffect } from 'react';
import { Document, DocumentType } from '@/lib/document-types';
import { db } from '@/lib/db';

/**
 * Custom hook for managing member documents
 */
export function useDocuments(memberId?: number) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  // Fetch documents when memberId changes
  useEffect(() => {
    if (!memberId) {
      setDocuments([]);
      setLoading(false);
      return;
    }

    const fetchDocuments = async () => {
      try {
        setLoading(true);
        // Use the correct method from the SQLiteDB instance
        const docs = await db.documents.where('memberId').equals(memberId).toArray();
        setDocuments(docs);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Error loading documents'));
        console.error('Error loading documents:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDocuments();
  }, [memberId]);

  /**
   * Add a new document to the database
   */
  const addDocument = async (document: Omit<Document, 'id'>) => {
    try {
      // Use the correct method to add a document
      const documentId = await db.documents.add(document);

      // Refresh documents list after adding
      if (memberId) {
        const updatedDocs = await db.documents.where('memberId').equals(memberId).toArray();
        setDocuments(updatedDocs);
      }

      return documentId;
    } catch (err) {
      console.error('Error adding document:', err);
      throw err;
    }
  };

  /**
   * Delete a document from the database
   */
  const deleteDocument = async (documentId: number) => {
    try {
      // Use the correct method to delete a document
      await db.documents.delete(documentId);
      
      // Update documents list after deletion
      setDocuments(documents.filter(doc => doc.id !== documentId));
      
      return true;
    } catch (err) {
      console.error('Error deleting document:', err);
      throw err;
    }
  };

  return {
    documents,
    loading,
    error,
    addDocument,
    deleteDocument
  };
}
