
import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { Document, documentTypeLabels } from '@/lib/document-types';
import { openDocument, releaseDocumentUrl } from '@/lib/document-viewer';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { File, Eye, Plus, Trash, ImageIcon } from 'lucide-react';
import type { DocumentType } from '@/lib/document-types';

interface MemberDocumentsProps {
  memberId?: number;
}

interface UploadFormProps {
  handleFileUpload: (file: File | null, documentType: string) => Promise<void>;
  documentTypes: any[] | undefined;
  onClose: () => void;
}

const UploadForm: React.FC<UploadFormProps> = ({ handleFileUpload, documentTypes, onClose }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedDocumentType, setSelectedDocumentType] = useState<string>('');

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedFile || !selectedDocumentType) {
      alert('Por favor, selecciona un archivo y un tipo de documento.');
      return;
    }
    await handleFileUpload(selectedFile, selectedDocumentType);
    onClose();
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="grid gap-4 py-4">
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="documentType" className="text-right">
            Tipo de Documento
          </Label>
          <Select value={selectedDocumentType} onValueChange={setSelectedDocumentType}>
            <SelectTrigger className="col-span-3">
              <SelectValue placeholder="Seleccionar tipo" />
            </SelectTrigger>
            <SelectContent>
              {Object.keys(documentTypeLabels).map((type) => (
                <SelectItem key={type} value={type}>
                  {documentTypeLabels[type as DocumentType]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="file" className="text-right">
            Archivo
          </Label>
          <Input
            id="file"
            type="file"
            className="col-span-3"
            onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
          />
        </div>
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit">Subir</Button>
      </DialogFooter>
    </form>
  );
};

const MemberDocuments: React.FC<MemberDocumentsProps> = ({ memberId }) => {
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [isDocumentViewOpen, setIsDocumentViewOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [currentDocumentUrl, setCurrentDocumentUrl] = useState<string | null>(null);
  const [currentDocument, setCurrentDocument] = useState<Document | null>(null);
  const [documentToDelete, setDocumentToDelete] = useState<number | null>(null);
  
  const { toast } = useToast();
  
  const documentTypes = useLiveQuery(() => db.documents.toArray(), []);

  const documents = useLiveQuery(async () => {
    if (!memberId) return [];
    
    try {
      return await db.documents
        .where('memberId')
        .equals(parseInt(String(memberId)))
        .toArray();
    } catch (error) {
      console.error("Error loading documents:", error);
      return [];
    }
  }, [memberId]);

  // Clean up document URL when component unmounts or when URL changes
  useEffect(() => {
    return () => {
      if (currentDocumentUrl) {
        releaseDocumentUrl(currentDocumentUrl);
      }
    };
  }, [currentDocumentUrl]);

  const handleViewDocument = async (doc: Document) => {
    try {
      // Generate URL from document data
      const url = openDocument(doc);
      if (url) {
        setCurrentDocumentUrl(url);
        setCurrentDocument(doc);
        setIsDocumentViewOpen(true);
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: "No se pudo abrir el documento."
        });
      }
    } catch (error) {
      console.error("Error al abrir el documento:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Error al abrir el documento."
      });
    }
  };

  const handleFileUpload = async (file: File | null, docType: string) => {
    if (!memberId || !file) return;

    try {
      // Read the file as an ArrayBuffer
      const fileData = await file.arrayBuffer();
      
      // Guardar la referencia en la base de datos
      await db.documents.add({
        memberId: parseInt(String(memberId)),
        type: docType as DocumentType,
        uploadDate: new Date(),
        name: file.name,
        fileName: file.name,
        contentType: file.type,
        size: file.size,
        data: fileData,
        createdAt: new Date(),
      });

      toast({
        title: "Documento subido.",
        description: "El documento ha sido subido correctamente.",
      });
    } catch (error) {
      console.error("Error al subir el documento:", error);
      toast({
        variant: "destructive",
        title: "Error.",
        description: "No se pudo subir el documento.",
      });
    } finally {
      setIsUploadDialogOpen(false);
    }
  };

  const handleConfirmDeleteDocument = (documentId?: number) => {
    if (!documentId) return;
    setDocumentToDelete(documentId);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteDocument = async () => {
    if (!documentToDelete) return;

    try {
      await db.documents.delete(documentToDelete);
      toast({
        title: "Documento eliminado.",
        description: "El documento ha sido eliminado correctamente.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error.",
        description: "No se pudo eliminar el documento.",
      });
    } finally {
      setIsDeleteDialogOpen(false);
      setDocumentToDelete(null);
    }
  };

  return (
    <>
      <Card>
        <CardHeader className="pb-2">
          <div className="flex justify-between items-center">
            <CardTitle>Documentos</CardTitle>
            <Button variant="outline" size="sm" onClick={() => setIsUploadDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Subir documento
            </Button>
          </div>
          <CardDescription>
            Documentos asociados al socio
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {documents && documents.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {documents.map((doc) => (
                <Card key={doc.id} className="shadow-sm">
                  <CardHeader>
                    <CardTitle className="flex items-center text-base">
                      <File className="mr-2 h-4 w-4" />
                      {doc.name}
                    </CardTitle>
                    <CardDescription>
                      {documentTypeLabels[doc.type]} • {format(new Date(doc.uploadDate), 'dd/MM/yyyy')}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex justify-between">
                      <Button variant="secondary" size="sm" onClick={() => handleViewDocument(doc)}>
                        <Eye className="mr-2 h-4 w-4" />
                        Ver
                      </Button>
                      <Button variant="destructive" size="sm" onClick={() => handleConfirmDeleteDocument(doc.id)}>
                        <Trash className="mr-2 h-4 w-4" />
                        Eliminar
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-32">
              <ImageIcon className="h-6 w-6 mr-2 text-muted-foreground" />
              <p className="text-muted-foreground">No hay documentos asociados a este socio.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upload Dialog */}
      <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Subir Documento</DialogTitle>
          </DialogHeader>
          <UploadForm 
            handleFileUpload={handleFileUpload} 
            documentTypes={documentTypes} 
            onClose={() => setIsUploadDialogOpen(false)} 
          />
        </DialogContent>
      </Dialog>

      {/* View Document Dialog */}
      <Dialog open={isDocumentViewOpen} onOpenChange={() => {
        setIsDocumentViewOpen(false);
        if (currentDocumentUrl) {
          releaseDocumentUrl(currentDocumentUrl);
          setCurrentDocumentUrl(null);
        }
      }}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Visualización de Documento</DialogTitle>
          </DialogHeader>
          <div className="aspect-w-16 aspect-h-9">
            {currentDocumentUrl && (
              <iframe src={currentDocumentUrl} title="Document Preview" className="border-none w-full h-[400px]" />
            )}
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => {
              setIsDocumentViewOpen(false);
              if (currentDocumentUrl) {
                releaseDocumentUrl(currentDocumentUrl);
                setCurrentDocumentUrl(null);
              }
            }}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Estás seguro?</DialogTitle>
          </DialogHeader>
          <p>Esta acción no se puede deshacer. ¿Estás seguro de que quieres eliminar este documento?</p>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDeleteDocument}>
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default MemberDocuments;
