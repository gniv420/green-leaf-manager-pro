import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/db';
import { Document, DocumentType, documentTypeLabels } from '@/lib/document-types';
import { FileText, Upload, Trash } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface DocumentUploaderProps {
  memberId?: number;
}

export function DocumentUploader({ memberId }: DocumentUploaderProps) {
  const [selectedType, setSelectedType] = useState<DocumentType>('other');
  const [documentName, setDocumentName] = useState('');
  const [notes, setNotes] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [documents, setDocuments] = useState<Document[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Cargar documentos cuando cambia el ID del miembro
  React.useEffect(() => {
    if (memberId) {
      loadDocuments();
    }
  }, [memberId]);

  // Función para cargar los documentos
  const loadDocuments = async () => {
    if (!memberId) return;
    
    try {
      const docs = await db.documents
        .where('memberId')
        .equals(memberId)
        .toArray();
      
      setDocuments(docs);
    } catch (error) {
      console.error('Error al cargar documentos:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los documentos',
        variant: 'destructive'
      });
    }
  };

  // Función para manejar la selección de archivos
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      
      // Establecer el nombre del documento si está vacío
      if (!documentName) {
        setDocumentName(selectedFile.name.split('.')[0]);
      }
    }
  };

  // Función para subir un documento
  const uploadDocument = async () => {
    if (!file || !memberId) return;
    
    setLoading(true);
    
    try {
      // Convertir archivo a ArrayBuffer
      const buffer = await file.arrayBuffer();
      
      // Crear el registro del documento
      const docData: Document = {
        memberId,
        type: selectedType,
        name: documentName || file.name,
        fileName: file.name,
        contentType: file.type,
        size: file.size,
        data: buffer,
        uploadDate: new Date(),
        createdAt: new Date(),
        notes: notes || '',
      };
      
      // Guardar en la base de datos
      await db.documents.add(docData);
      
      // Limpiar el formulario
      setSelectedType('other');
      setDocumentName('');
      setNotes('');
      setFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
      toast({
        title: 'Documento guardado',
        description: 'El documento se ha guardado correctamente'
      });
      
      // Recargar la lista de documentos
      await loadDocuments();
      
    } catch (error) {
      console.error('Error al guardar documento:', error);
      toast({
        title: 'Error',
        description: 'No se pudo guardar el documento',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Función para eliminar un documento
  const deleteDocument = async (documentId: number) => {
    if (!documentId) return;
    
    try {
      await db.documents.delete(documentId);
      toast({
        title: 'Documento eliminado',
        description: 'El documento se ha eliminado correctamente'
      });
      
      // Actualizar la lista de documentos
      await loadDocuments();
    } catch (error) {
      console.error('Error al eliminar documento:', error);
      toast({
        title: 'Error',
        description: 'No se pudo eliminar el documento',
        variant: 'destructive'
      });
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <FileText className="mr-2 h-5 w-5" />
            Subir documento
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="docType">Tipo de documento</Label>
              <Select 
                value={selectedType} 
                onValueChange={(value) => setSelectedType(value as DocumentType)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar tipo" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(documentTypeLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="docName">Nombre del documento</Label>
              <Input 
                id="docName" 
                value={documentName} 
                onChange={(e) => setDocumentName(e.target.value)}
                placeholder="Nombre descriptivo del documento" 
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="docFile">Archivo</Label>
              <Input 
                id="docFile" 
                type="file" 
                ref={fileInputRef}
                onChange={handleFileSelect} 
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="docNotes">Notas</Label>
              <Textarea 
                id="docNotes" 
                value={notes} 
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Información adicional sobre este documento" 
                rows={3}
              />
            </div>
            
            <Button 
              className="w-full" 
              onClick={uploadDocument}
              disabled={!file || loading} 
            >
              <Upload className="mr-2 h-4 w-4" />
              {loading ? 'Subiendo...' : 'Subir documento'}
            </Button>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Documentos ({documents.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {documents.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground">
              No hay documentos disponibles
            </div>
          ) : (
            <div className="divide-y">
              {documents.map((doc) => (
                <div key={doc.id} className="py-3 flex justify-between items-center">
                  <div>
                    <p className="font-medium">{doc.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {documentTypeLabels[doc.type]} • {format(new Date(doc.uploadDate), 'dd/MM/yyyy', { locale: es })}
                    </p>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-destructive hover:text-destructive"
                    onClick={() => doc.id && deleteDocument(doc.id)}
                  >
                    <Trash className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
