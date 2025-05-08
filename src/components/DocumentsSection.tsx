import { useState, useEffect, useRef } from 'react';
import { db, Document } from '@/lib/db';
import { DocumentType } from '@/lib/document-types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Trash2, Upload, Download, FileImage } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';

interface DocumentsSectionProps {
  memberId: number;
}

const DocumentsSection: React.FC<DocumentsSectionProps> = ({ memberId }) => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [newDocumentName, setNewDocumentName] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchDocuments();
  }, [memberId]);

  const fetchDocuments = async () => {
    try {
      const memberDocuments = await db.documents
        .where('memberId')
        .equals(memberId)
        .toArray();
      setDocuments(memberDocuments);
    } catch (error) {
      console.error('Error fetching documents:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudieron cargar los documentos'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      // Automatically set document name if not provided
      if (!newDocumentName) {
        setNewDocumentName(e.target.files[0].name);
      }
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedFile) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Por favor selecciona un archivo'
      });
      return;
    }

    if (!newDocumentName) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Por favor ingresa un nombre para el documento'
      });
      return;
    }

    setIsUploading(true);

    try {
      // Convert file to base64
      const base64 = await fileToBase64(selectedFile);
      
      // Add document to database
      const docId = await db.documents.add({
        memberId,
        name: newDocumentName,
        type: 'other' as DocumentType,
        fileName: selectedFile.name,
        contentType: selectedFile.type,
        size: selectedFile.size,
        data: base64,
        uploadDate: new Date(),
        createdAt: new Date()
      });

      // Refresh documents list
      const newDoc = await db.documents.get(docId);
      if (newDoc) {
        setDocuments([...documents, newDoc]);
      }

      // Reset form
      setSelectedFile(null);
      setNewDocumentName('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      toast({
        title: 'Documento subido',
        description: 'El documento ha sido subido correctamente'
      });
    } catch (error) {
      console.error('Error uploading document:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudo subir el documento'
      });
    } finally {
      setIsUploading(false);
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  };

  const handleDownload = (doc: Document) => {
    try {
      const link = doc.data;
      const a = window.document.createElement('a');
      a.href = link.toString();
      a.download = doc.fileName;
      window.document.body.appendChild(a);
      a.click();
      window.document.body.removeChild(a);
      toast({
        title: 'Descarga iniciada',
        description: 'El documento se está descargando'
      });
    } catch (error) {
      console.error('Error downloading document:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudo descargar el documento'
      });
    }
  };

  // Function to determine if a document can show a thumbnail
  const canShowThumbnail = (doc: Document): boolean => {
    return doc.contentType?.startsWith('image/') || false;
  };

  // Function to get thumbnail from document data
  const getThumbnailUrl = (doc: Document): string => {
    if (canShowThumbnail(doc)) {
      return doc.data?.toString() || '';
    }
    return '';
  };

  const confirmDelete = (id: number) => {
    setDocumentToDelete(id);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!documentToDelete) return;
    
    try {
      await db.documents.delete(documentToDelete);
      setDocuments(documents.filter(doc => doc.id !== documentToDelete));
      toast({
        title: 'Documento eliminado',
        description: 'El documento ha sido eliminado correctamente'
      });
    } catch (error) {
      console.error('Error deleting document:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudo eliminar el documento'
      });
    } finally {
      setDeleteDialogOpen(false);
      setDocumentToDelete(null);
    }
  };

  return (
    <Card className="border-green-200">
      <CardHeader>
        <CardTitle>Documentos</CardTitle>
        <CardDescription>
          Gestiona los documentos asociados a este socio
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <form onSubmit={handleUpload} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="documentName">Nombre del documento</Label>
              <Input
                id="documentName"
                value={newDocumentName}
                onChange={(e) => setNewDocumentName(e.target.value)}
                className="border-green-200 focus-visible:ring-green-500"
                placeholder="Ej. DNI, Certificado..."
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="documentFile">Archivo</Label>
              <Input
                id="documentFile"
                ref={fileInputRef}
                type="file"
                onChange={handleFileChange}
                className="border-green-200 focus-visible:ring-green-500"
                required
              />
            </div>
          </div>
          <Button 
            type="submit" 
            disabled={isUploading}
            className="bg-green-600 hover:bg-green-700"
          >
            {isUploading ? (
              <div className="flex items-center">
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-b-2 border-t-2 border-white"></div>
                Subiendo...
              </div>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Subir documento
              </>
            )}
          </Button>
        </form>

        <div className="space-y-2">
          <h3 className="font-medium">Documentos subidos</h3>
          {isLoading ? (
            <div className="flex h-20 items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-t-2 border-primary"></div>
            </div>
          ) : documents.length > 0 ? (
            <div className="rounded-md border">
              <div className="divide-y">
                {documents.map((doc) => (
                  <div key={doc.id} className="flex items-center justify-between p-3">
                    <div className="flex items-center space-x-3">
                      {canShowThumbnail(doc) ? (
                        <div className="h-12 w-12 rounded border overflow-hidden flex-shrink-0">
                          <img 
                            src={getThumbnailUrl(doc)} 
                            alt={doc.name}
                            className="h-full w-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="h-12 w-12 rounded border bg-muted flex items-center justify-center flex-shrink-0">
                          <FileImage className="h-6 w-6 text-muted-foreground" />
                        </div>
                      )}
                      <div>
                        <p className="font-medium">{doc.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(doc.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <Button 
                        variant="outline" 
                        size="icon"
                        onClick={() => handleDownload(doc)}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="outline"
                        size="icon"
                        onClick={() => confirmDelete(doc.id!)}
                        className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="py-3 text-center text-muted-foreground">
              No hay documentos subidos
            </p>
          )}
        </div>
      </CardContent>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar eliminación</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que quieres eliminar este documento? Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default DocumentsSection;
