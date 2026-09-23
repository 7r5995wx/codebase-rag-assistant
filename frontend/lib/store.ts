export interface IndexingStatusState {
  status: string;
  progress_percentage: number;
  message: string;
  files_indexed: number;
  chunks_created: number;
  error?: string;
}

const STATUS_MAP: Record<string, IndexingStatusState> = {};

export function setStatus(repositoryId: string, state: IndexingStatusState) {
  STATUS_MAP[repositoryId] = state;
}

export function updateStatus(repositoryId: string, state: Partial<IndexingStatusState>) {
  if (!STATUS_MAP[repositoryId]) {
    STATUS_MAP[repositoryId] = {
      status: 'analyzing',
      progress_percentage: 0,
      message: 'Initializing...',
      files_indexed: 0,
      chunks_created: 0,
    };
  }
  Object.assign(STATUS_MAP[repositoryId], state);
}

export function getStatus(repositoryId: string): IndexingStatusState | undefined {
  return STATUS_MAP[repositoryId];
}
