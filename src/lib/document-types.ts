
export type DocumentType = 
  | 'dni' 
  | 'medicalPrescription' 
  | 'membershipForm' 
  | 'privacyPolicy' 
  | 'responsibilityStatement' 
  | 'other';

export interface Document {
  id?: number;
  memberId?: number;
  type: DocumentType;
  name: string;
  fileName: string;
  contentType: string;
  size: number;
  data: ArrayBuffer | string;
  uploadDate: Date;
  createdAt: Date;
  notes?: string;
}

export const documentTypeLabels: Record<DocumentType, string> = {
  dni: 'DNI/NIE',
  medicalPrescription: 'Prescripción médica',
  membershipForm: 'Formulario de inscripción',
  privacyPolicy: 'Política de privacidad firmada',
  responsibilityStatement: 'Declaración de responsabilidad',
  other: 'Otro documento'
};
