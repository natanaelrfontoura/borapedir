/**
 * @file /src/services/offlineSyncService.ts
 * @description Motor Offline-First com fila persistente em localStorage e retry exponencial.
 * Garante que o restaurante continue vendendo, enviando pedidos ao KDS e fechando caixa mesmo sem internet.
 */

import { doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { OfflineMutation } from '../models/types';

const OFFLINE_QUEUE_KEY = 'nexoresto_offline_mutation_queue_v1';
const SIMULATED_OFFLINE_KEY = 'nexoresto_simulated_offline_mode';

/**
 * Remove recursivamente todas as chaves com valor `undefined` antes de enviar ao Firestore,
 * evitando o erro "Unsupported field value: undefined" em setDoc().
 */
export function sanitizeForFirestore<T>(obj: T): T {
  if (obj === null || obj === undefined || typeof obj !== 'object') {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeForFirestore(item)) as unknown as T;
  }
  const cleaned: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    if (value !== undefined) {
      cleaned[key] = sanitizeForFirestore(value);
    }
  }
  return cleaned as T;
}

export function getOfflineQueue(): OfflineMutation[] {
  try {
    const raw = localStorage.getItem(OFFLINE_QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveOfflineQueue(queue: OfflineMutation[]): void {
  try {
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
  } catch (e) {
    console.error('Falha ao gravar fila offline:', e);
  }
}

export function purgeFakeOrdersFromOfflineQueue(isFakeOrderCheck: (data: unknown) => boolean): void {
  try {
    const queue = getOfflineQueue();
    const filtered = queue.filter((item) => {
      if (item.collectionName !== 'orders') return true;
      if (['ord-4091', 'ord-4092', 'ord-4093', 'ord-4094'].includes(item.docId)) return false;
      return !isFakeOrderCheck(item.payload);
    });
    saveOfflineQueue(filtered);
  } catch (e) {
    console.error('Falha ao limpar fila offline de pedidos:', e);
  }
}

export function isSimulatedOffline(): boolean {
  try {
    return localStorage.getItem(SIMULATED_OFFLINE_KEY) === 'true';
  } catch {
    return false;
  }
}

export function setSimulatedOffline(value: boolean): void {
  try {
    localStorage.setItem(SIMULATED_OFFLINE_KEY, value ? 'true' : 'false');
  } catch (e) {
    console.error(e);
  }
}

export function enqueueOfflineMutation(
  collectionName: string,
  docId: string,
  operation: 'set' | 'update' | 'delete',
  payload: Record<string, unknown>
): OfflineMutation[] {
  const sanitizedPayload = sanitizeForFirestore(payload);
  const queue = getOfflineQueue();
  const filtered = queue.filter((q) => !(q.collectionName === collectionName && q.docId === docId));
  const next: OfflineMutation = {
    id: `mut-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    collectionName,
    docId,
    operation,
    payload: sanitizedPayload,
    timestamp: new Date().toISOString(),
    retries: 0,
  };
  const updated = [...filtered, next];
  saveOfflineQueue(updated);
  return updated;
}

/**
 * Persiste documento no Firestore ou enfileira caso o restaurante esteja sem conexão.
 */
export async function persistEntityWithOfflineFallback(
  collectionName: string,
  docId: string,
  data: Record<string, unknown>,
  forceOffline = false
): Promise<{ synced: boolean; queueLength: number }> {
  const sanitizedData = sanitizeForFirestore(data);
  const offlineNow = forceOffline || isSimulatedOffline() || !navigator.onLine;

  if (offlineNow) {
    const q = enqueueOfflineMutation(collectionName, docId, 'set', sanitizedData);
    return { synced: false, queueLength: q.length };
  }

  try {
    await setDoc(doc(db, collectionName, docId), sanitizedData, { merge: true });
    return { synced: true, queueLength: getOfflineQueue().length };
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${collectionName}/${docId}`);
    const q = enqueueOfflineMutation(collectionName, docId, 'set', sanitizedData);
    return { synced: false, queueLength: q.length };
  }
}

/**
 * Reconcilia toda a fila pendente com o Firestore assim que a internet volta.
 */
export async function flushOfflineQueue(): Promise<{
  flushedCount: number;
  remainingCount: number;
}> {
  if (isSimulatedOffline() || !navigator.onLine) {
    const q = getOfflineQueue();
    return { flushedCount: 0, remainingCount: q.length };
  }

  const queue = getOfflineQueue();
  if (queue.length === 0) {
    return { flushedCount: 0, remainingCount: 0 };
  }

  const remaining: OfflineMutation[] = [];
  let flushedCount = 0;

  for (const mutation of queue) {
    try {
      const ref = doc(db, mutation.collectionName, mutation.docId);
      if (mutation.operation === 'delete') {
        await deleteDoc(ref);
      } else {
        const sanitizedPayload = sanitizeForFirestore({ ...mutation.payload, syncStatus: 'synced' });
        await setDoc(ref, sanitizedPayload, { merge: true });
      }
      flushedCount++;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `${mutation.collectionName}/${mutation.docId}`);
      remaining.push({ ...mutation, retries: mutation.retries + 1 });
    }
  }

  saveOfflineQueue(remaining);
  return { flushedCount, remainingCount: remaining.length };
}
