export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface SupabaseErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
}

export function handleSupabaseError(error: unknown, operationType: OperationType, path: string | null) {
  let errorMessage = '';
  
  if (error instanceof Error) {
    errorMessage = error.message;
  } else if (typeof error === 'object' && error !== null) {
    try {
      errorMessage = (error as any).message || (error as any).details || JSON.stringify(error);
    } catch (e) {
      errorMessage = String(error);
    }
  } else {
    errorMessage = String(error);
  }
  
  const errInfo: SupabaseErrorInfo = {
    error: errorMessage,
    operationType,
    path
  }
  
  if (errorMessage.includes('Failed to fetch')) {
    console.error('Supabase Network Error (Failed to fetch). Check URL and Key.');
  }

  console.error('Supabase Error Details:', JSON.stringify(errInfo, null, 2));
  throw new Error(JSON.stringify(errInfo));
}
