
import React, { useEffect, useState } from 'react';
import { Button } from "@/components/ui/button";
import { Plus, File } from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Document } from '@/lib/document-types';
import { db } from '@/lib/db';
import { DocumentUploader } from '@/components/DocumentUploader';  // Fixed import
import { DocumentViewer } from '@/lib/document-viewer';

interface MemberDocumentsProps {
  memberId: number;
}

const MemberDocuments: React.FC<MemberDocumentsProps> = ({ memberId }) => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [showUploader, setShowUploader] = useState(false);
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

  const handleDocumentUpload = async (newDoc: Document) => {
    try {
      // Add the memberId to the document
      const docWithMemberId = { ...newDoc, memberId };
      const id = await db.documents.add(docWithMemberId);
      
      // Refresh documents list
      const updatedDoc = await db.documents.get(id);
      if (updatedDoc) {
        setDocuments([...documents, updatedDoc]);
      }
      
      setShowUploader(false);
    } catch (error) {
      console.error('Error uploading document:', error);
    }
  };

  const handleDeleteDocument = async (docId: number) => {
    try {
      await db.documents.delete(docId);
      setDocuments(documents.filter(doc => doc.id !== docId));
    } catch (error) {
      console.error('Error deleting document:', error);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center p-8">Cargando documentos...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Documentos</h2>
        <Button onClick={() => setShowUploader(true)} className="flex items-center gap-1">
          <Plus size={16} /> Añadir documento
        </Button>
      </div>

      {showUploader && (
        <Card className="border border-gray-200">
          <CardHeader>
            <CardTitle>Subir nuevo documento</CardTitle>
            <CardDescription>
              Sube un documento para este socio
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DocumentUploader onUpload={handleDocumentUpload} onCancel={() => setShowUploader(false)} />
          </CardContent>
        </Card>
      )}

      {documents.length === 0 && !showUploader ? (
        <Card>
          <CardContent className="p-8 text-center text-gray-500">
            No hay documentos para este socio.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {documents.map((doc) => (
            <Card key={doc.id} className="overflow-hidden">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg truncate">{doc.name}</CardTitle>
                <CardDescription className="text-xs">
                  {/* Convert string date to Date object for formatting */}
                  Subido el {new Date(doc.uploadDate).toLocaleDateString()}
                </CardDescription>
              </CardHeader>
              <CardContent className="pb-2">
                <div className="flex items-center gap-2">
                  <File size={16} className="text-blue-600" />
                  <span className="text-sm text-gray-600">{doc.contentType}</span>
                </div>
              </CardContent>
              <CardFooter className="flex justify-between pt-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => DocumentViewer.openDocument(doc)}
                >
                  Ver documento
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-red-500 hover:text-red-700"
                  onClick={() => handleDeleteDocument(doc.id as number)}
                >
                  Eliminar
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default MemberDocuments;
