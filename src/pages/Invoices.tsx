import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/db';
import type { Invoice, InvoiceLine } from '@/lib/db';
import { Receipt, Eye, Printer, Calendar } from 'lucide-react';

const Invoices = () => {
  const { toast } = useToast();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [invoiceLines, setInvoiceLines] = useState<InvoiceLine[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadInvoices();
  }, []);

  const loadInvoices = async () => {
    try {
      const allInvoices = await db.getInvoices();
      setInvoices(allInvoices);
      setLoading(false);
    } catch (error) {
      console.error('Error loading invoices:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar las facturas',
        variant: 'destructive',
      });
      setLoading(false);
    }
  };

  const handleViewInvoice = async (invoice: Invoice) => {
    try {
      const lines = await db.getInvoiceLines(invoice.id!);
      setSelectedInvoice(invoice);
      setInvoiceLines(lines);
      setViewDialogOpen(true);
    } catch (error) {
      console.error('Error loading invoice lines:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los detalles de la factura',
        variant: 'destructive',
      });
    }
  };

  const handlePrintInvoice = () => {
    window.print();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES');
  };

  const filteredInvoices = invoices.filter(invoice => 
    invoice.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (invoice.customerName && invoice.customerName.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Receipt className="h-8 w-8" />
          Facturas
        </h1>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Input
                placeholder="Buscar por número o cliente..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <p className="text-center py-8">Cargando facturas...</p>
          ) : filteredInvoices.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">
              {searchTerm ? 'No se encontraron facturas' : 'No hay facturas registradas'}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nº Factura</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead className="text-right">Base</TableHead>
                  <TableHead className="text-right">IGIC</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Pago</TableHead>
                  <TableHead className="text-center">Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInvoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell className="font-mono font-medium">{invoice.invoiceNumber}</TableCell>
                    <TableCell>{formatDate(invoice.date)}</TableCell>
                    <TableCell>{invoice.customerName || 'Cliente General'}</TableCell>
                    <TableCell className="text-right">{formatCurrency(invoice.subtotal)}</TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground">
                      {formatCurrency(invoice.totalIgic)}
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {formatCurrency(invoice.total)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {invoice.paymentMethod}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant={invoice.status === 'pagada' ? 'default' : invoice.status === 'pendiente' ? 'secondary' : 'destructive'}
                        className={invoice.status === 'pagada' ? 'bg-green-600' : ''}
                      >
                        {invoice.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleViewInvoice(invoice)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Dialog para ver factura */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Factura {selectedInvoice?.invoiceNumber}</span>
              <Button variant="outline" size="sm" onClick={handlePrintInvoice}>
                <Printer className="h-4 w-4 mr-2" />
                Imprimir
              </Button>
            </DialogTitle>
          </DialogHeader>
          
          {selectedInvoice && (
            <div className="space-y-6 print:p-8" id="invoice-print">
              {/* Cabecera de la factura */}
              <div className="border-b pb-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-2xl font-bold mb-2">FACTURA</h2>
                    <p className="text-lg font-semibold">{selectedInvoice.invoiceNumber}</p>
                    <p className="text-sm text-muted-foreground">
                      Fecha: {formatDate(selectedInvoice.date)}
                    </p>
                  </div>
                  <div className="text-right">
                    <h3 className="font-bold text-lg">Pizzería</h3>
                    <p className="text-sm text-muted-foreground">
                      CIF: XXXXXXXXX
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Dirección del negocio
                    </p>
                  </div>
                </div>
              </div>

              {/* Datos del cliente */}
              <div className="bg-muted/50 p-4 rounded-lg">
                <h3 className="font-semibold mb-2">Cliente</h3>
                <p>{selectedInvoice.customerName || 'Cliente General'}</p>
              </div>

              {/* Líneas de factura */}
              <div>
                <h3 className="font-semibold mb-2">Detalles</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Producto</TableHead>
                      <TableHead className="text-right">Cantidad</TableHead>
                      <TableHead className="text-right">Precio</TableHead>
                      <TableHead className="text-center">IGIC</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoiceLines.map((line) => (
                      <TableRow key={line.id}>
                        <TableCell>{line.productName}</TableCell>
                        <TableCell className="text-right">{line.quantity}</TableCell>
                        <TableCell className="text-right">{formatCurrency(line.unitPrice)}</TableCell>
                        <TableCell className="text-center">{line.igicRate}%</TableCell>
                        <TableCell className="text-right font-semibold">
                          {formatCurrency(line.total)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Totales */}
              <div className="border-t pt-4">
                <div className="max-w-sm ml-auto space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Base Imponible:</span>
                    <span className="font-medium">{formatCurrency(selectedInvoice.subtotal)}</span>
                  </div>
                  {selectedInvoice.igic0 > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">IGIC 0%:</span>
                      <span>{formatCurrency(selectedInvoice.igic0)}</span>
                    </div>
                  )}
                  {selectedInvoice.igic3 > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">IGIC 3%:</span>
                      <span>{formatCurrency(selectedInvoice.igic3)}</span>
                    </div>
                  )}
                  {selectedInvoice.igic7 > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">IGIC 7%:</span>
                      <span>{formatCurrency(selectedInvoice.igic7)}</span>
                    </div>
                  )}
                  <div className="flex justify-between border-t pt-2">
                    <span className="font-semibold">Total IGIC:</span>
                    <span className="font-medium">{formatCurrency(selectedInvoice.totalIgic)}</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold">
                    <span>TOTAL:</span>
                    <span className="text-primary">{formatCurrency(selectedInvoice.total)}</span>
                  </div>
                </div>
              </div>

              {/* Información adicional */}
              <div className="border-t pt-4 text-sm text-muted-foreground">
                <p>Método de pago: <span className="capitalize">{selectedInvoice.paymentMethod}</span></p>
                <p>Estado: <span className="capitalize">{selectedInvoice.status}</span></p>
                {selectedInvoice.notes && (
                  <p className="mt-2">Notas: {selectedInvoice.notes}</p>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Invoices;
