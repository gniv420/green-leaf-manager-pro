import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { Document, documentTypeLabels } from '@/lib/document-types';
import { openDocument, releaseDocumentUrl } from '@/lib/document-viewer';
import { format } from 'date-fns';
import { useToast } from '@/components/ui/use-toast';
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
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { File, Eye, Plus, Trash, ImageIcon, FileText, FileWarning } from 'lucide-react';
import type { DocumentType } from '@/lib/document-types';

interface MemberDocumentsProps {
  memberId?: number;
}

interface UploadFormProps {
  handleFileUpload: (file: File | null, documentType: string, customName: string) => Promise<void>;
  documentTypes: any[] | undefined;
  onClose: () => void;
}

const UploadForm: React.FC<UploadFormProps> = ({ handleFileUpload, documentTypes, onClose }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedDocumentType, setSelectedDocumentType] = useState<string>('');
  const [customName, setCustomName] = useState<string>('');

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedFile || !selectedDocumentType) {
      alert('Por favor, selecciona un archivo y un tipo de documento.');
      return;
    }
    
    // Use the custom name if provided, otherwise use the original filename
    const documentName = customName.trim() ? customName : selectedFile.name;
    
    await handleFileUpload(selectedFile, selectedDocumentType, documentName);
    onClose();
  };

  // Update the custom name field when a file is selected
  useEffect(() => {
    if (selectedFile) {
      const fileNameWithoutExtension = selectedFile.name.split('.').slice(0, -1).join('.');
      setCustomName(fileNameWithoutExtension);
    } else {
      setCustomName('');
    }
  }, [selectedFile]);

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
          <Label htmlFor="customName" className="text-right">
            Nombre del documento
          </Label>
          <Input
            id="customName"
            value={customName}
            onChange={(e) => setCustomName(e.target.value)}
            placeholder="Introduce un nombre personalizado"
            className="col-span-3"
          />
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

// Helper function to get a suitable icon based on file type
const getDocumentIcon = (contentType: string) => {
  if (contentType.includes('image')) {
    return <ImageIcon className="h-6 w-6" />;
  } else if (contentType.includes('pdf')) {
    return <FileText className="h-6 w-6" />;
  } else {
    return <File className="h-6 w-6" />;
  }
};

// Check if a file is an image
const isImage = (contentType: string): boolean => {
  return contentType.includes('image');
};

const MemberDocuments: React.FC<MemberDocumentsProps> = ({ memberId }) => {
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [isDocumentViewOpen, setIsDocumentViewOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [currentDocumentUrl, setCurrentDocumentUrl] = useState<string | null>(null);
  const [documentThumbnail, setDocumentThumbnail] = useState<string | null>(null);
  const [currentDocument, setCurrentDocument] = useState<Document | null>(null);
  const [documentToDelete, setDocumentToDelete] = useState<number | null>(null);
  const [thumbnailError, setThumbnailError] = useState(false);
  
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
      if (documentThumbnail && documentThumbnail !== currentDocumentUrl) {
        releaseDocumentUrl(documentThumbnail);
      }
    };
  }, [currentDocumentUrl, documentThumbnail]);

  const createThumbnail = async (doc: Document) => {
    try {
      // Reset thumbnail error state
      setThumbnailError(false);
      
      // For images, use the document itself as the thumbnail
      if (isImage(doc.contentType)) {
        return openDocument(doc);
      }
      
      // For non-images, we'll use a generic icon representation instead
      return null;
    } catch (error) {
      console.error("Error creating thumbnail:", error);
      setThumbnailError(true);
      return null;
    }
  };

  const handleViewDocument = async (doc: Document) => {
    try {
      setThumbnailError(false);
      setCurrentDocument(doc);
      
      // Generate URL from document data
      const url = openDocument(doc);
      
      if (!url) {
        throw new Error("No se pudo generar URL del documento");
      }
      
      setCurrentDocumentUrl(url);
      
      // Create thumbnail for the document (for images only)
      const thumbnailUrl = isImage(doc.contentType) ? url : null;
      setDocumentThumbnail(thumbnailUrl);
      
      setIsDocumentViewOpen(true);
    } catch (error) {
      console.error("Error al abrir el documento:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo abrir el documento."
      });
    }
  };

  const handleFileUpload = async (file: File | null, docType: string, customName: string) => {
    if (!memberId || !file) return;

    try {
      // Read the file as an ArrayBuffer
      const fileData = await file.arrayBuffer();
      
      // Guardar la referencia en la base de datos
      await db.documents.add({
        memberId: parseInt(String(memberId)),
        type: docType as DocumentType,
        uploadDate: new Date(),
        name: customName || file.name, // Use custom name if provided
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
                      {getDocumentIcon(doc.contentType)}
                      <span className="ml-2 truncate">{doc.name}</span>
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

      {/* View Document Dialog - Making the preview smaller */}
      <Dialog open={isDocumentViewOpen} onOpenChange={() => {
        setIsDocumentViewOpen(false);
        if (currentDocumentUrl) {
          releaseDocumentUrl(currentDocumentUrl);
          setCurrentDocumentUrl(null);
        }
        if (documentThumbnail) {
          releaseDocumentUrl(documentThumbnail);
          setDocumentThumbnail(null);
        }
      }}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{currentDocument?.name || 'Visualización de Documento'}</DialogTitle>
          </DialogHeader>
          
          <div className="flex flex-col space-y-4">
            {/* Document info */}
            {currentDocument && (
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="font-medium">Tipo:</span> {documentTypeLabels[currentDocument.type]}
                </div>
                <div>
                  <span className="font-medium">Tamaño:</span> {Math.round(currentDocument.size / 1024)} KB
                </div>
                <div>
                  <span className="font-medium">Fecha:</span> {format(new Date(currentDocument.uploadDate), 'dd/MM/yyyy')}
                </div>
                <div>
                  <span className="font-medium">Archivo original:</span> {currentDocument.fileName}
                </div>
              </div>
            )}
            
            {/* Thumbnail preview for images - made smaller */}
            {isImage(currentDocument?.contentType || '') && documentThumbnail && (
              <div className="border rounded-md overflow-hidden max-w-[300px] mx-auto">
                <AspectRatio ratio={4 / 3} className="bg-muted">
                  <img 
                    src={documentThumbnail} 
                    alt={currentDocument?.name || "Vista previa"}
                    className="object-contain w-full h-full"
                    onError={() => setThumbnailError(true)}
                  />
                </AspectRatio>
              </div>
            )}
            
            {/* Non-image document representation - made smaller */}
            {!isImage(currentDocument?.contentType || '') && currentDocument && (
              <div className="border rounded-md p-4 flex items-center justify-center max-w-[300px] mx-auto">
                <div className="flex flex-col items-center">
                  {getDocumentIcon(currentDocument.contentType)}
                  <span className="mt-2 text-sm">{currentDocument.fileName}</span>
                </div>
              </div>
            )}
            
            {/* Error state */}
            {thumbnailError && (
              <div className="flex items-center justify-center p-4 border rounded-md">
                <div className="flex flex-col items-center text-destructive">
                  <FileWarning className="h-10 w-10 mb-2" />
                  <p>No se pudo cargar la vista previa del documento</p>
                </div>
              </div>
            )}
            
            {/* Document viewer - made much smaller */}
            {currentDocumentUrl && !isImage(currentDocument?.contentType || '') && (
              <div className="border rounded-md overflow-hidden max-w-[300px] mx-auto">
                <iframe 
                  src={currentDocumentUrl} 
                  title="Document Preview" 
                  className="border-none w-full"
                  style={{ height: '200px' }}
                  onError={() => {
                    console.log("Error loading document in iframe");
                    setThumbnailError(true);
                  }}
                />
              </div>
            )}
          </div>
          
          <DialogFooter className="mt-4">
            <Button variant="secondary" onClick={() => {
              setIsDocumentViewOpen(false);
              if (currentDocumentUrl) {
                releaseDocumentUrl(currentDocumentUrl);
                setCurrentDocumentUrl(null);
              }
              if (documentThumbnail) {
                releaseDocumentUrl(documentThumbnail);
                setDocumentThumbnail(null);
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
