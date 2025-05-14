
export type DocumentType = 'id' | 'medical' | 'membership' | 'other';

export interface Document {
  id?: number;
  memberId: number;
  title: string;
  description?: string;
  type: DocumentType;
  url?: string;
  content?: string;
  contentType?: string;
  createdAt: string;
  updatedAt?: string;
}
