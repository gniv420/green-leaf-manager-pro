
import React, { useEffect, useState } from 'react';
import { Document } from '@/lib/document-types';
import { db } from '@/lib/db';
import { DocumentViewer } from '@/lib/document-viewer';

interface Props {
  memberId: number;
}

const DocumentsSection: React.FC<Props> = ({ memberId }) => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDocuments = async () => {
      try {
        if (memberId) {
          const docs = await db.documents.where('memberId').equals(memberId).toArray();
          setDocuments(docs);
        }
      } catch (error) {
        console.error('Error fetching documents:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDocuments();
  }, [memberId]);

  if (loading) {
    return <div className="text-center py-4">Cargando documentos...</div>;
  }

  if (documents.length === 0) {
    return <div className="text-center py-4 text-gray-500">No hay documentos</div>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
      {documents.map((doc) => (
        <div
          key={doc.id}
          className="border rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow"
        >
          <h3 className="font-medium text-lg truncate">{doc.name || doc.title}</h3>
          <p className="text-sm text-gray-500 mb-2">
            {new Date(doc.uploadDate instanceof Date ? doc.uploadDate : doc.uploadDate || doc.createdAt).toLocaleDateString()}
          </p>
          
          <div className="mt-2 flex justify-between items-center">
            <span className="text-xs px-2 py-1 bg-gray-100 rounded">
              {doc.contentType}
            </span>
            
            <button
              onClick={() => DocumentViewer.openDocument(doc)}
              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              Ver documento
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default DocumentsSection;
