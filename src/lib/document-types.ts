
export type DocumentType = 'id' | 'medical' | 'membership' | 'other';

export const documentTypeLabels: Record<DocumentType, string> = {
  id: 'Identificación',
  medical: 'Médico',
  membership: 'Membresía',
  other: 'Otro'
};

export interface Document {
  id?: number;
  memberId: number;
  title: string;
  description?: string;
  type: DocumentType;
  url?: string;
  content?: ArrayBuffer;
  contentType?: string;
  createdAt: Date | string;
  updatedAt?: Date | string;
  
  // Additional fields used in the app
  name?: string;
  fileName?: string;
  size?: number;
  data?: ArrayBuffer;
  uploadDate?: Date | string;
  notes?: string;
}
