import { api } from '@/services/api';

export interface Attachment {
  id: string;
  entityType: string;
  entityId: string;
  filename: string;
  url: string;
  size?: number;
  mimetype?: string;
  description?: string;
  uploadedById?: string;
  uploadedBy?: { id: string; fullName: string };
  createdAt: string;
}

export interface AttachmentInput {
  filename: string;
  url: string;
  size?: number;
  mimetype?: string;
}

export const attachmentsApi = {
  list: async (entityType: string, entityId: string): Promise<Attachment[]> => {
    const { data } = await api.get<Attachment[]>('/attachments', {
      params: { entityType, entityId },
    });
    return Array.isArray(data) ? data : [];
  },

  createMany: async (
    entityType: string,
    entityId: string,
    files: AttachmentInput[],
  ): Promise<void> => {
    await api.post('/attachments', { entityType, entityId, files });
  },

  remove: async (id: string): Promise<void> => {
    await api.delete('/attachments/' + id);
  },
};
