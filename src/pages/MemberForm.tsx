import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db, Member } from '@/lib/db';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';
import { ProductType } from '@/lib/product-types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Plus, File, Upload, X, Loader2 } from 'lucide-react';

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

interface RouteParams {
  id?: string;
}

const MemberForm = () => {
  const { id } = useParams<RouteParams>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [formData, setFormData] = useState<Member>({
    firstName: '',
    lastName: '',
    dni: '',
    address: '',
    phone: '',
    email: '',
    dob: '',
    memberCode: '',
    consumptionGrams: 0,
    balance: 0,
    notes: '',
    rfidCode: '',
    id: undefined,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [documentDialogOpen, setDocumentDialogOpen] = useState(false);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [numPages, setNumPages] = useState<number | null>(null);
  const [fileError, setFileError] = useState<string | null>('');
  const [uploading, setUploading] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [uploadedFileUrl, setUploadedFileUrl] = useState<string | null>(null);
  const [documents, setDocuments] = useState<any[]>([]);

  useEffect(() => {
    if (id) {
      fetchMember(id);
      fetchDocuments(id);
    }
  }, [id]);

  const fetchMember = async (id: string) => {
    setIsLoading(true);
    try {
      const member = await db.members.get(parseInt(id));
      if (member) {
        setFormData({
          firstName: member.firstName || '',
          lastName: member.lastName || '',
          dni: member.dni || '',
          address: member.address || '',
          phone: member.phone || '',
          email: member.email || '',
          dob: member.dob || '',
          memberCode: member.memberCode || '',
          consumptionGrams: member.consumptionGrams || 0,
          balance: member.balance || 0,
          notes: member.notes || '',
          rfidCode: member.rfidCode || '',
          id: member.id,
          createdAt: member.createdAt,
          updatedAt: member.updatedAt,
        });
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Socio no encontrado'
        });
        navigate('/members');
      }
    } catch (error) {
      console.error('Error fetching member:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudo cargar el socio'
      });
      navigate('/members');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchDocuments = async (memberId: string) => {
    try {
      const docs = await db.documents.where('memberId').equals(parseInt(memberId)).toArray();
      setDocuments(docs);
    } catch (error) {
      console.error('Error fetching documents:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudieron cargar los documentos'
      });
    }
  };

  const handleChange = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = event.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleDateChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = event.target;
    setFormData({
      ...formData,
      dob: value
    });
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      if (id) {
        // Update existing member
        await db.members.update(parseInt(id), {
          ...formData,
          updatedAt: new Date()
        });
        toast({
          title: 'Socio actualizado',
          description: 'El socio ha sido actualizado correctamente'
        });
      } else {
        // Create new member
        const newMember = {
          ...formData,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        const memberId = await db.members.add(newMember);
        
        // Generate member code
        const code = await db.generateMemberCode(formData.firstName, formData.lastName);
        await db.members.update(memberId, { memberCode: code });
        
        toast({
          title: 'Socio creado',
          description: 'El socio ha sido creado correctamente'
        });
      }
      navigate('/members');
    } catch (error) {
      console.error('Error saving member:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudo guardar el socio'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setFileError('');
    const file = event.target.files && event.target.files[0];

    if (!file) {
      setPdfFile(null);
      return;
    }

    if (file.type !== 'application/pdf') {
      setFileError('Por favor, seleccione un archivo PDF.');
      setPdfFile(null);
      return;
    }

    setPdfFile(file);
  };

  const onDocumentLoadSuccess = ({ numPages: nextNumPages }: { numPages: number }) => {
    setNumPages(nextNumPages);
  };

  const handleFileUpload = async () => {
    if (!pdfFile) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Por favor, seleccione un archivo PDF.'
      });
      return;
    }

    setUploading(true);
    try {
      const arrayBuffer = await pdfFile.arrayBuffer();
      const blob = new Blob([arrayBuffer], { type: 'application/pdf' });

      // Save the file to IndexedDB
      const fileId = await db.documents.add({
        memberId: parseInt(id!),
        name: pdfFile.name,
        type: pdfFile.type,
        size: pdfFile.size,
        data: blob,
        createdAt: new Date(),
      });

      setUploadedFileName(pdfFile.name);
      setUploadedFileUrl(`/api/document/${fileId}`);
      setDocumentDialogOpen(false);
      setPdfFile(null);
      setNumPages(null);
      setFileError('');

      toast({
        title: 'Archivo subido',
        description: 'El archivo ha sido subido correctamente.'
      });

      fetchDocuments(id!);
    } catch (error) {
      console.error('Error uploading file:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudo subir el archivo.'
      });
    } finally {
      setUploading(false);
    }
  };

  const removeDocument = async (documentId: number) => {
    try {
      await db.documents.delete(documentId);
      setDocuments(documents.filter(doc => doc.id !== documentId));
      toast({
        title: 'Archivo eliminado',
        description: 'El archivo ha sido eliminado correctamente.'
      });
    } catch (error) {
      console.error('Error deleting document:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudo eliminar el archivo.'
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">{id ? 'Editar Socio' : 'Nuevo Socio'}</h1>
      </div>
      {isLoading ? (
        <div className="flex h-[50vh] items-center justify-center">
          <div className="h-16 w-16 animate-spin rounded-full border-b-2 border-t-2 border-primary"></div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="firstName">Nombre</Label>
              <Input
                id="firstName"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                required
                className="border-green-200 focus-visible:ring-green-500"
              />
            </div>
            <div>
              <Label htmlFor="lastName">Apellidos</Label>
              <Input
                id="lastName"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                required
                className="border-green-200 focus-visible:ring-green-500"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="dni">DNI</Label>
              <Input
                id="dni"
                name="dni"
                value={formData.dni}
                onChange={handleChange}
                required
                className="border-green-200 focus-visible:ring-green-500"
              />
            </div>
            <div>
              <Label htmlFor="dob">Fecha de Nacimiento</Label>
              <Input
                id="dob"
                type="date"
                value={formData.dob ? formData.dob.slice(0, 10) : ''} // Format to YYYY-MM-DD
                onChange={handleDateChange}
                required
                className="border-green-200 focus-visible:ring-green-500"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="address">Dirección</Label>
              <Input
                id="address"
                name="address"
                value={formData.address}
                onChange={handleChange}
                className="border-green-200 focus-visible:ring-green-500"
              />
            </div>
            <div>
              <Label htmlFor="phone">Teléfono</Label>
              <Input
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="border-green-200 focus-visible:ring-green-500"
              />
            </div>
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              className="border-green-200 focus-visible:ring-green-500"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="memberCode">Código de Socio</Label>
              <Input
                id="memberCode"
                name="memberCode"
                value={formData.memberCode}
                onChange={handleChange}
                disabled={true}
                className="border-green-200 focus-visible:ring-green-500"
              />
            </div>
            <div>
              <Label htmlFor="rfidCode">Código RFID (Llavero)</Label>
              <Input
                id="rfidCode"
                name="rfidCode"
                value={formData.rfidCode}
                onChange={handleChange}
                className="border-green-200 focus-visible:ring-green-500"
              />
            </div>
          </div>
          <div>
            <Label htmlFor="notes">Notas</Label>
            <Textarea
              id="notes"
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              className="border-green-200 focus-visible:ring-green-500"
            />
          </div>

          <div>
            <Button type="submit" disabled={isSubmitting} className="bg-green-600 hover:bg-green-700">
              {isSubmitting ? (
                <>
                  Guardando...
                  <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                </>
              ) : (
                id ? 'Actualizar' : 'Guardar'
              )}
            </Button>
            <Button variant="outline" onClick={() => navigate('/members')}>
              Cancelar
            </Button>
          </div>
        </form>
      )}

      <div>
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold tracking-tight">Documentos</h2>
          <Button onClick={() => setDocumentDialogOpen(true)} className="bg-green-600 hover:bg-green-700">
            <Plus className="mr-2 h-4 w-4" />
            Subir Documento
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
          {documents.map(doc => (
            <div key={doc.id} className="border rounded-md p-4">
              <div className="font-bold">{doc.name}</div>
              <a href={`/api/document/${doc.id}`} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
                Ver Documento
              </a>
              <Button variant="ghost" size="icon" className="ml-2" onClick={() => removeDocument(doc.id)}>
                <X className="h-4 w-4 text-red-500" />
              </Button>
            </div>
          ))}
          {documents.length === 0 && (
            <div className="text-center p-4">No hay documentos subidos.</div>
          )}
        </div>
      </div>

      <Dialog open={documentDialogOpen} onOpenChange={setDocumentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Subir Documento</DialogTitle>
            <DialogDescription>
              Selecciona un archivo PDF para subir.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="pdf" className="text-right">
                Archivo PDF
              </Label>
              <Input type="file" id="pdf" accept="application/pdf" className="col-span-3" onChange={handleFileChange} />
            </div>
            {fileError && <p className="text-red-500">{fileError}</p>}
            {pdfFile && (
              <div className="border rounded-md p-4">
                <h3>Vista previa del documento</h3>
                <Document file={pdfFile} onLoadSuccess={onDocumentLoadSuccess}>
                  <Page pageNumber={1} renderTextLayer={false} renderAnnotationLayer={false} />
                </Document>
                <p>Número de páginas: {numPages}</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDocumentDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleFileUpload} disabled={uploading || !pdfFile} className="bg-green-600 hover:bg-green-700">
              {uploading ? (
                <>
                  Subiendo...
                  <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                </>
              ) : (
                'Subir archivo'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MemberForm;
