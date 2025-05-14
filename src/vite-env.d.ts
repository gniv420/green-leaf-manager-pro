
/// <reference types="vite/client" />

// Agregar definiciones de tipo para reemplazar dexie-react-hooks
declare module 'dexie-react-hooks' {
  import { useState, useEffect } from 'react';
  
  export function useLiveQuery<T>(
    queryFn: () => T | Promise<T>,
    dependencies?: any[]
  ): T | undefined;
}

declare module 'buffer' {
  global {
    interface Buffer {
      from(arrayBuffer: ArrayBuffer): Buffer;
      from(data: string, encoding?: string): Buffer;
    }
  }
}
