
export type DocumentType = 
  | 'dni' 
  | 'passport' 
  | 'membership_agreement' 
  | 'club_rules' 
  | 'cultivation_agreement'
  | 'medical_prescription'
  | 'other';

export const documentTypeLabels: Record<DocumentType, string> = {
  dni: 'DNI/NIE',
  passport: 'Pasaporte',
  membership_agreement: 'Acuerdo de Socio',
  club_rules: 'Reglamento del Club',
  cultivation_agreement: 'Acuerdo de Cultivo',
  medical_prescription: 'Prescripción Médica',
  other: 'Otro',
};

export interface Document {
  id?: number;
  memberId: number;
  type: DocumentType;
  uploadDate: string;
  name: string;
  fileName: string;
  contentType: string;
  size: number;
  data: Buffer;
  createdAt: string;
}
