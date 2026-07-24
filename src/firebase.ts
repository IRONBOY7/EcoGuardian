import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, addDoc, updateDoc, doc, query, where } from "firebase/firestore";
import { getStorage, ref, uploadBytes } from "firebase/storage";
import { getDownloadURL } from "@firebase/storage";
import { getAuth } from "firebase/auth";
import { User, Report } from "./types";

// Try to load credentials from environment
const metaEnv = (import.meta as any).env || {};
const firebaseConfig = {
  apiKey: metaEnv.VITE_FIREBASE_API_KEY || "",
  authDomain: metaEnv.VITE_FIREBASE_AUTH_DOMAIN || "",
  projectId: metaEnv.VITE_FIREBASE_PROJECT_ID || "",
  storageBucket: metaEnv.VITE_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: metaEnv.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: metaEnv.VITE_FIREBASE_APP_ID || ""
};

let db: any = null;
let storage: any = null;
let auth: any = null;
let useFirebase = false;

if (firebaseConfig.apiKey && firebaseConfig.projectId) {
  try {
    const app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    storage = getStorage(app);
    auth = getAuth(app);
    useFirebase = true;
    console.log("Firebase Firestore, Auth, and Storage initialized successfully.");
  } catch (error) {
    console.warn("Firebase initialization failed, falling back to full-stack API mode.", error);
  }
} else {
  console.log("Running in offline-capable full-stack local server mode.");
}

export { auth, useFirebase, db };

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth?.currentUser?.uid || null,
      email: auth?.currentUser?.email || null,
      emailVerified: auth?.currentUser?.emailVerified || null,
      isAnonymous: auth?.currentUser?.isAnonymous || null,
      tenantId: auth?.currentUser?.tenantId || null,
      providerInfo: auth?.currentUser?.providerData?.map((provider: any) => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

/**
 * Recursively cleans an object by stripping any keys with `undefined` values,
 * ensuring strict compatibility with Firestore data validation rules.
 */
export function sanitizeFirestoreData(obj: any): any {
  if (obj === null || obj === undefined) return null;
  if (typeof obj !== "object") return obj;
  if (Array.isArray(obj)) return obj.map(sanitizeFirestoreData);
  if (obj instanceof Date) return obj;

  const cleaned: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      cleaned[key] = sanitizeFirestoreData(value);
    }
  }
  return cleaned;
}

export async function uploadFileToStorage(file: File, folder: string): Promise<string> {
  if (useFirebase && storage) {
    try {
      const fileName = `${Date.now()}_${file.name.replace(/\s+/g, "_")}`;
      const storageRef = ref(storage, `${folder}/${fileName}`);
      const snapshot = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);
      return downloadURL;
    } catch (err) {
      console.warn("Firebase Storage upload failed, falling back to local base64.", err);
    }
  }

  // Dual-mode offline fallback: Base64 DataURL representation
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        resolve(e.target.result as string);
      } else {
        reject(new Error("File conversion failed."));
      }
    };
    reader.onerror = () => reject(new Error("Error reading file."));
    reader.readAsDataURL(file);
  });
}

export const dbService = {
  // Query reports for current authenticated user according to ownership/role
  async getReports(currentUser?: User | null): Promise<Report[]> {
    if (useFirebase && db) {
      const firebaseUser = auth?.currentUser;
      if (!firebaseUser) {
        // Unauthenticated users cannot access reports
        return [];
      }

      try {
        const role = currentUser?.role || (firebaseUser.email === "admin@ecoguardian.org" ? "admin" : "citizen");
        let q;
        if (role === "admin" || firebaseUser.email === "admin@ecoguardian.org" || firebaseUser.email === "issakaayisha761@gmail.com") {
          // Authorized admin reads all reports
          q = collection(db, "reports");
        } else if (role === "company") {
          // Collector reads reports relevant to collection work
          q = collection(db, "reports");
        } else {
          // Citizen: read their own reports by matching reporterId with Firebase UID
          q = query(
            collection(db, "reports"),
            where("reporterId", "==", firebaseUser.uid)
          );
        }

        const snapshot = await getDocs(q);
        const docs = snapshot.docs.map(d => ({ id: d.id, ...(d.data() as object) } as Report));
        if (docs.length > 0) {
          return docs;
        }
      } catch (err: any) {
        console.warn("Firestore getReports failed, falling back to API server:", err);
      }
    }

    try {
      const res = await fetch("/api/reports");
      if (!res.ok) return [];
      return await res.json();
    } catch (apiErr) {
      return [];
    }
  },

  // Query all items in a collection
  async getCollection(collectionName: string, currentUser?: User | null): Promise<any[]> {
    if (collectionName === "reports") {
      return this.getReports(currentUser);
    }

    if (useFirebase && db) {
      try {
        const q = collection(db, collectionName);
        const snapshot = await getDocs(q);
        const docs = snapshot.docs.map(d => ({ id: d.id, ...(d.data() as object) }));
        if (docs.length > 0) {
          return docs;
        }
      } catch (err: any) {
        console.warn(`Firestore collection '${collectionName}' query failed, falling back to API server:`, err);
      }
    }

    try {
      const res = await fetch(`/api/${collectionName}`);
      if (!res.ok) {
        return [];
      }
      return await res.json();
    } catch (apiErr) {
      return [];
    }
  },

  // Add document to a collection
  async addDocument(collectionName: string, data: any): Promise<any> {
    if (useFirebase && db) {
      try {
        const firebaseUid = auth?.currentUser?.uid;
        const rawData = { ...data };
        if (collectionName === "reports" && firebaseUid && !rawData.reporterId) {
          rawData.reporterId = firebaseUid;
        }
        const docData = sanitizeFirestoreData(rawData);
        const docRef = await addDoc(collection(db, collectionName), docData);
        const createdDoc = { id: docRef.id, ...docData };
        // Sync with local backend
        fetch(`/api/${collectionName}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(createdDoc)
        }).catch(() => {});
        return createdDoc;
      } catch (err: any) {
        handleFirestoreError(err, OperationType.CREATE, collectionName);
      }
    }

    const res = await fetch(`/api/${collectionName}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });
    const result = await res.json();
    return result.success ? (result.data || result.report || result.announcement || result.notification || result.reward || result.community || result.collector_assignment) : null;
  },

  // Update a document in a collection
  async updateDocument(collectionName: string, docId: string, updates: any): Promise<boolean> {
    if (useFirebase && db) {
      try {
        const cleanedUpdates = sanitizeFirestoreData(updates);
        const docRef = doc(db, collectionName, docId);
        await updateDoc(docRef, cleanedUpdates);
        // Sync with local backend API as well
        fetch(`/api/${collectionName}/${docId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(cleanedUpdates)
        }).catch(() => {});
        return true;
      } catch (err: any) {
        console.warn(`Firestore updateDoc failed for ${collectionName}/${docId}, attempting fallback API:`, err);
        try {
          const res = await fetch(`/api/${collectionName}/${docId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(updates)
          });
          const result = await res.json();
          if (result.success) return true;
        } catch (apiErr) {
          // Fallback also failed
        }
        handleFirestoreError(err, OperationType.UPDATE, `${collectionName}/${docId}`);
      }
    }

    const res = await fetch(`/api/${collectionName}/${docId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates)
    });
    const result = await res.json();
    return !!result.success;
  }
};
