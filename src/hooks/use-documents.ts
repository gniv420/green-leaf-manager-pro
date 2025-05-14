
import { useState, useEffect } from 'react';
import { Document, DocumentType } from '@/lib/document-types';
import { db } from '@/lib/db';

export function useDocuments(memberId?: number) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!memberId) {
      setDocuments([]);
      setLoading(false);
      return;
    }

    const fetchDocuments = async () => {
      try {
        setLoading(true);
        const docs = await db.query(
          `SELECT * FROM documents WHERE memberId = ? ORDER BY createdAt DESC`,
          [memberId]
        );
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

  const addDocument = async (document: Omit<Document, 'id'>) => {
    try {
      const result = await db.run(
        `INSERT INTO documents (memberId, type, name, fileName, contentType, size, data, uploadDate, createdAt, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          document.memberId,
          document.type,
          document.name,
          document.fileName,
          document.contentType,
          document.size,
          document.data,
          document.uploadDate,
          document.createdAt,
          document.notes || ''
        ]
      );

      // Refetch documents after adding a new one
      if (memberId) {
        const updatedDocs = await db.query(
          `SELECT * FROM documents WHERE memberId = ? ORDER BY createdAt DESC`,
          [memberId]
        );
        setDocuments(updatedDocs);
      }

      return result.lastID;
    } catch (err) {
      console.error('Error adding document:', err);
      throw err;
    }
  };

  const deleteDocument = async (documentId: number) => {
    try {
      await db.run(`DELETE FROM documents WHERE id = ?`, [documentId]);
      
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
