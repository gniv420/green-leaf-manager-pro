
import React, { useState, useEffect } from 'react';
import { Document, DocumentType } from '@/lib/document-types';
import { db } from '@/lib/db';
import { toast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import DocumentUploader from '@/components/DocumentUploader';
import { DocumentViewer } from '@/lib/document-viewer';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { FileIcon, Trash2 } from 'lucide-react';

interface MemberDocumentsProps {
  memberId: number;
}

const MemberDocuments: React.FC<MemberDocumentsProps> = ({ memberId }) => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUploaderOpen, setIsUploaderOpen] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState<Document | null>(null);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  // Cargar documentos
  useEffect(() => {
    const loadDocuments = async () => {
      try {
        setLoading(true);
        const docs = await db.documents.where('memberId').equals(memberId).toArray();
        setDocuments(docs);
      } catch (error) {
        console.error('Error loading documents:', error);
        toast({
          title: 'Error',
          description: 'No se pudieron cargar los documentos',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    if (memberId) {
      loadDocuments();
    }
  }, [memberId]);

  // Handle file upload
  const handleFileUpload = async (file: File, documentType: DocumentType, documentName: string) => {
    try {
      // Create a FileReader to read the file as an ArrayBuffer
      const reader = new FileReader();
      
      reader.onload = async (event) => {
        if (!event.target?.result) {
          throw new Error('Failed to read file');
        }
        
        // Convert the ArrayBuffer to a Buffer for SQLite storage
        const buffer = Buffer.from(event.target.result as ArrayBuffer);
        
        // Create the document object
        const document: Omit<Document, 'id'> = {
          memberId,
          type: documentType,
          uploadDate: new Date().toISOString(),
          name: documentName || file.name,
          fileName: file.name,
          contentType: file.type,
          size: file.size,
          data: buffer,
          createdAt: new Date().toISOString(),
        };
        
        // Save to database
        await db.documents.add(document);
        
        // Reload documents
        const updatedDocs = await db.documents.where('memberId').equals(memberId).toArray();
        setDocuments(updatedDocs);
        
        toast({
          title: 'Éxito',
          description: 'Documento subido correctamente',
        });
        
        // Close uploader
        setIsUploaderOpen(false);
      };
      
      reader.onerror = () => {
        throw new Error('Error reading file');
      };
      
      // Start reading the file
      reader.readAsArrayBuffer(file);
    } catch (error) {
      console.error('Error uploading document:', error);
      toast({
        title: 'Error',
        description: 'No se pudo subir el documento',
        variant: 'destructive',
      });
    }
  };

  // Preparar eliminación de un documento
  const prepareDeleteDocument = (document: Document) => {
    setDocumentToDelete(document);
    setConfirmDeleteOpen(true);
  };

  // Confirmar eliminación
  const confirmDeleteDocument = async () => {
    try {
      if (!documentToDelete?.id) return;
      
      await db.documents.delete(documentToDelete.id);
      
      // Actualizar la lista de documentos
      setDocuments(documents.filter(doc => doc.id !== documentToDelete.id));
      
      toast({
        title: 'Éxito',
        description: 'Documento eliminado correctamente',
      });
    } catch (error) {
      console.error('Error deleting document:', error);
      toast({
        title: 'Error',
        description: 'No se pudo eliminar el documento',
        variant: 'destructive',
      });
    } finally {
      setConfirmDeleteOpen(false);
      setDocumentToDelete(null);
    }
  };

  // Obtener traducción del tipo de documento
  const getDocumentTypeLabel = (type: string): string => {
    const typeMap: Record<string, string> = {
      id: 'DNI/NIE',
      registration: 'Registro de Socios',
      membership: 'Acuerdo de Membresía',
      medical: 'Certificado Médico',
      consumption: 'Declaración de Consumo',
      other: 'Otro',
    };
    
    return typeMap[type] || 'Desconocido';
  };

  // Renderizar icono según tipo de documento
  const getDocumentIcon = (contentType: string) => {
    return <FileIcon className="h-10 w-10 text-gray-400" />;
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Documentación</h2>
        <Button onClick={() => setIsUploaderOpen(true)}>Subir Documento</Button>
      </div>

      {loading ? (
        <div className="text-center py-8">Cargando documentos...</div>
      ) : documents.length === 0 ? (
        <div className="text-center py-8 border border-dashed rounded-lg">
          <p className="text-gray-500">No hay documentos para este miembro</p>
          <Button variant="outline" className="mt-2" onClick={() => setIsUploaderOpen(true)}>
            Subir Primer Documento
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {documents.map(doc => (
            <div key={doc.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors flex justify-between">
              <div className="flex items-center">
                <div className="mr-4">
                  {getDocumentIcon(doc.contentType)}
                </div>
                <div>
                  <h3 className="font-medium">{doc.name}</h3>
                  <p className="text-sm text-gray-500">
                    {getDocumentTypeLabel(doc.type)}
                  </p>
                  <p className="text-xs text-gray-400">
                    {new Date(doc.uploadDate).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="flex flex-col space-y-2">
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => DocumentViewer.openDocument(doc)}
                >
                  Ver
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="text-red-500 hover:text-red-700 hover:bg-red-50"
                  onClick={() => prepareDeleteDocument(doc)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Uploader Dialog */}
      {isUploaderOpen && (
        <DocumentUploader
          open={isUploaderOpen}
          onClose={() => setIsUploaderOpen(false)}
          onUpload={handleFileUpload}
        />
      )}

      {/* Confirm Delete Dialog */}
      <AlertDialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. El documento será eliminado permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteDocument} className="bg-red-500 hover:bg-red-600">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default MemberDocuments;
