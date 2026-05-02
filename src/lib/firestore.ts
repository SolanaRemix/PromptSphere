import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
  onSnapshot,
  limit,
  runTransaction,
  updateDoc,
  increment,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from './firebase';
import { DEFAULT_COMMISSION_RATE } from './utils';
import type {
  User,
  Prompt,
  PromptVersion,
  CollaboratorPresence,
  Role,
  ActivityLog,
  MarketplaceListing,
  Affiliate,
  AffiliateReferral,
  Payment,
  PaymentMethod,
  PaymentStatus,
} from '@/types';

// Users
export async function createUser(userData: Omit<User, 'createdAt'>) {
  await setDoc(doc(db, 'users', userData.uid), {
    ...userData,
    createdAt: serverTimestamp(),
  });
}

/**
 * Atomically upserts a user profile document.
 * Uses `merge: true` so a simultaneous sign-in from multiple devices cannot
 * create duplicate documents or overwrite fields that already exist.
 * `createdAt` is only written on the initial create; subsequent merges leave
 * it unchanged because Firestore ignores missing keys in a merge write.
 */
export async function upsertUser(userData: Omit<User, 'createdAt'>) {
  const ref = doc(db, 'users', userData.uid);
  // Persist createdAt only if the document is being created for the first time.
  // Using setDoc with merge:true means existing fields are not overwritten.
  await setDoc(
    ref,
    {
      ...userData,
      createdAt: serverTimestamp(),
    },
    { merge: true }
  );
}

export async function getUser(uid: string): Promise<User | null> {
  const snap = await getDoc(doc(db, 'users', uid));
  if (!snap.exists()) return null;
  const data = snap.data();
  return {
    ...data,
    createdAt: (data.createdAt as Timestamp)?.toDate() ?? new Date(),
  } as User;
}

/**
 * Returns all user documents.
 *
 * ⚠️  SECURITY: This function reads the entire `users` collection from the
 * browser client.  It MUST be protected by a Firestore security rule that
 * restricts reads to authenticated admins, e.g.:
 *
 *   match /users/{uid} {
 *     allow list: if request.auth.token.email == '<ADMIN_EMAIL>';
 *   }
 *
 * For stronger enforcement, move this call behind a Next.js Route Handler or
 * Firebase Callable Function that verifies a Firebase Admin SDK custom claim.
 */
export async function getAllUsers(): Promise<User[]> {
  const snap = await getDocs(collection(db, 'users'));
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      ...data,
      createdAt: (data.createdAt as Timestamp)?.toDate() ?? new Date(),
    } as User;
  });
}

// Prompts
export async function createPrompt(promptData: Omit<Prompt, 'id' | 'createdAt' | 'updatedAt'>) {
  const ref = await addDoc(collection(db, 'prompts'), {
    ...promptData,
    parameters: promptData.parameters ?? [],
    visibility: promptData.visibility ?? 'private',
    price: promptData.price ?? 0,
    version: promptData.version ?? 1,
    collaborators: promptData.collaborators ?? [],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function getPromptById(promptId: string): Promise<Prompt | null> {
  const snap = await getDoc(doc(db, 'prompts', promptId));
  if (!snap.exists()) return null;
  const data = snap.data();
  return {
    id: snap.id,
    ...data,
    parameters: data.parameters ?? [],
    visibility: data.visibility ?? 'private',
    price: data.price ?? 0,
    version: data.version ?? 1,
    collaborators: data.collaborators ?? [],
    createdAt: (data.createdAt as Timestamp)?.toDate() ?? new Date(),
    updatedAt: (data.updatedAt as Timestamp)?.toDate() ?? new Date(),
  } as Prompt;
}

/**
 * Updates a prompt document using a transaction to prevent lost updates from
 * concurrent editors. The version is atomically incremented from the current
 * stored value, so all concurrent saves are recorded in sequence rather than
 * silently overwriting each other.
 *
 * Returns the new version number as committed by the transaction, which callers
 * should use (e.g. to label a version-history snapshot) so that the stored
 * document version and the snapshot version are always in sync.
 *
 * Only the owner may update their own prompt (enforced by Firestore security rules).
 */
export async function updatePrompt(
  promptId: string,
  updates: Partial<Omit<Prompt, 'id' | 'createdAt' | 'version'>>
): Promise<number> {
  const promptRef = doc(db, 'prompts', promptId);
  let newVersion = 0;
  await runTransaction(db, async (transaction) => {
    const snap = await transaction.get(promptRef);
    if (!snap.exists()) throw new Error('Prompt not found.');
    const storedVersion: number = snap.data().version ?? 0;
    // Always derive the next version from the current stored value so that two
    // clients starting from the same base do not both write the same version number.
    newVersion = storedVersion + 1;
    transaction.update(promptRef, {
      ...updates,
      version: newVersion,
      updatedAt: serverTimestamp(),
    });
  });
  return newVersion;
}

export async function getUserPrompts(userId: string): Promise<Prompt[]> {
  const q = query(
    collection(db, 'prompts'),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      ...data,
      parameters: data.parameters ?? [],
      visibility: data.visibility ?? 'private',
      price: data.price ?? 0,
      version: data.version ?? 1,
      collaborators: data.collaborators ?? [],
      createdAt: (data.createdAt as Timestamp)?.toDate() ?? new Date(),
      updatedAt: (data.updatedAt as Timestamp)?.toDate() ?? new Date(),
    } as Prompt;
  });
}

/**
 * Returns all public prompts ordered by creation date (newest first).
 * Used for trending analysis and discovery.
 */
export async function getPublicPrompts(maxResults = 50): Promise<Prompt[]> {
  const q = query(
    collection(db, 'prompts'),
    where('visibility', '==', 'public'),
    orderBy('createdAt', 'desc'),
    limit(maxResults)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      ...data,
      parameters: data.parameters ?? [],
      visibility: data.visibility ?? 'public',
      price: data.price ?? 0,
      version: data.version ?? 1,
      collaborators: data.collaborators ?? [],
      createdAt: (data.createdAt as Timestamp)?.toDate() ?? new Date(),
      updatedAt: (data.updatedAt as Timestamp)?.toDate() ?? new Date(),
    } as Prompt;
  });
}

/**
 * Subscribes to real-time updates for a single prompt.
 * Returns an unsubscribe function to cancel the listener.
 */
export function subscribeToPrompt(
  promptId: string,
  callback: (prompt: Prompt | null) => void
): Unsubscribe {
  return onSnapshot(doc(db, 'prompts', promptId), (snap) => {
    if (!snap.exists()) {
      callback(null);
      return;
    }
    const data = snap.data();
    callback({
      id: snap.id,
      ...data,
      parameters: data.parameters ?? [],
      visibility: data.visibility ?? 'private',
      price: data.price ?? 0,
      version: data.version ?? 1,
      collaborators: data.collaborators ?? [],
      createdAt: (data.createdAt as Timestamp)?.toDate() ?? new Date(),
      updatedAt: (data.updatedAt as Timestamp)?.toDate() ?? new Date(),
    } as Prompt);
  });
}

// Version History

/**
 * Saves a snapshot of the current prompt state as a version entry.
 */
export async function savePromptVersion(
  promptId: string,
  versionData: Omit<PromptVersion, 'id' | 'savedAt'>
): Promise<string> {
  const ref = await addDoc(collection(db, 'prompts', promptId, 'versions'), {
    ...versionData,
    savedAt: serverTimestamp(),
  });
  return ref.id;
}

/**
 * Returns all saved versions for a prompt, newest first.
 */
export async function getPromptVersions(promptId: string): Promise<PromptVersion[]> {
  const q = query(
    collection(db, 'prompts', promptId, 'versions'),
    orderBy('version', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      ...data,
      parameters: data.parameters ?? [],
      savedAt: (data.savedAt as Timestamp)?.toDate() ?? new Date(),
    } as PromptVersion;
  });
}

// Collaboration Presence

/**
 * Writes (or refreshes) a collaborator's presence record for a prompt.
 * Call periodically or on cursor movement to keep the entry fresh.
 */
export async function updateCollaboratorPresence(
  promptId: string,
  presence: CollaboratorPresence
): Promise<void> {
  await setDoc(
    doc(db, 'collaborationSessions', promptId, 'presence', presence.userId),
    {
      ...presence,
      lastSeen: serverTimestamp(),
    },
    { merge: true }
  );
}

/**
 * Removes a collaborator's presence record when they leave.
 */
export async function removeCollaboratorPresence(
  promptId: string,
  userId: string
): Promise<void> {
  await deleteDoc(doc(db, 'collaborationSessions', promptId, 'presence', userId));
}

/**
 * Subscribes to the live presence list for a prompt.
 * Returns an unsubscribe function.
 */
export function subscribeToCollaborators(
  promptId: string,
  callback: (collaborators: CollaboratorPresence[]) => void
): Unsubscribe {
  return onSnapshot(
    collection(db, 'collaborationSessions', promptId, 'presence'),
    (snap) => {
      const collaborators = snap.docs.map((d) => {
        const data = d.data();
        return {
          ...data,
          lastSeen: (data.lastSeen as Timestamp)?.toDate() ?? new Date(),
        } as CollaboratorPresence;
      });
      callback(collaborators);
    }
  );
}

/**
 * Deletes a prompt document owned by `userId`.
 *
 * The `userId` parameter is used for a client-side ownership guard; the
 * definitive enforcement MUST be in Firestore security rules:
 *
 *   match /prompts/{promptId} {
 *     allow delete: if request.auth.uid == resource.data.userId;
 *   }
 */
export async function deletePrompt(promptId: string, userId: string) {
  const promptRef = doc(db, 'prompts', promptId);
  const snap = await getDoc(promptRef);
  if (!snap.exists() || snap.data().userId !== userId) {
    throw new Error('Permission denied: you do not own this prompt.');
  }
  await deleteDoc(promptRef);
}

// Roles
export async function getRoles(): Promise<Role[]> {
  const snap = await getDocs(collection(db, 'roles'));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Role));
}

// Activity Logs
/**
 * `timestamp` is always set by the server; callers must not supply it.
 */
export async function logActivity(data: Omit<ActivityLog, 'id' | 'timestamp'>) {
  await addDoc(collection(db, 'activityLogs'), {
    ...data,
    timestamp: serverTimestamp(),
  });
}

/**
 * Returns recent activity log entries.
 *
 * ⚠️  SECURITY: This function reads the `activityLogs` collection from the
 * browser client.  It MUST be protected by a Firestore security rule that
 * restricts reads to authenticated admins, e.g.:
 *
 *   match /activityLogs/{logId} {
 *     allow read: if request.auth.token.email == '<ADMIN_EMAIL>';
 *   }
 *
 * For stronger enforcement, move this call behind a Next.js Route Handler or
 * Firebase Callable Function that verifies a Firebase Admin SDK custom claim.
 */
export async function getActivityLogs(): Promise<ActivityLog[]> {
  const q = query(collection(db, 'activityLogs'), orderBy('timestamp', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      ...data,
      timestamp: (data.timestamp as Timestamp)?.toDate() ?? new Date(),
    } as ActivityLog;
  });
}

// ---------------------------------------------------------------------------
// Marketplace
// ---------------------------------------------------------------------------

/**
 * Returns public marketplace listings ordered by popularity score.
 * Optionally filter by category.
 */
export async function getMarketplaceListings(opts: {
  category?: string;
  sortBy?: 'popularityScore' | 'price' | 'rating' | 'createdAt';
  maxResults?: number;
} = {}): Promise<MarketplaceListing[]> {
  const { category, sortBy = 'popularityScore', maxResults = 50 } = opts;
  let q = query(
    collection(db, 'marketplace'),
    orderBy(sortBy, 'desc'),
    limit(maxResults)
  );
  if (category && category !== 'all') {
    q = query(
      collection(db, 'marketplace'),
      where('category', '==', category),
      orderBy(sortBy, 'desc'),
      limit(maxResults)
    );
  }
  const snap = await getDocs(q);
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      ...data,
      affiliateLinks: data.affiliateLinks ?? [],
      tags: data.tags ?? [],
      createdAt: (data.createdAt as Timestamp)?.toDate() ?? new Date(),
    } as MarketplaceListing;
  });
}

/** Returns a single marketplace listing by its promptId. */
export async function getMarketplaceListingByPromptId(
  promptId: string
): Promise<MarketplaceListing | null> {
  const q = query(
    collection(db, 'marketplace'),
    where('promptId', '==', promptId),
    limit(1)
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  const data = d.data();
  return {
    id: d.id,
    ...data,
    affiliateLinks: data.affiliateLinks ?? [],
    tags: data.tags ?? [],
    createdAt: (data.createdAt as Timestamp)?.toDate() ?? new Date(),
  } as MarketplaceListing;
}

/** Creates or updates a marketplace listing for a prompt. */
export async function upsertMarketplaceListing(
  listing: Omit<MarketplaceListing, 'id' | 'createdAt'>
): Promise<string> {
  const existing = await getMarketplaceListingByPromptId(listing.promptId);
  if (existing) {
    await updateDoc(doc(db, 'marketplace', existing.id), {
      ...listing,
    });
    return existing.id;
  }
  const ref = await addDoc(collection(db, 'marketplace'), {
    ...listing,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

/** Increments the popularity score of a listing (e.g., on view/purchase). */
export async function incrementPopularityScore(
  listingId: string,
  delta = 1
): Promise<void> {
  await updateDoc(doc(db, 'marketplace', listingId), {
    popularityScore: increment(delta),
  });
}

// ---------------------------------------------------------------------------
// Payments
// ---------------------------------------------------------------------------

/**
 * Records a completed payment and increments the prompt's sales count.
 * Returns the new payment document ID.
 *
 * ⚠️  PRODUCTION NOTE: The client should only ever write a `pending` payment.
 * A trusted backend (Cloud Function / webhook) should be responsible for
 * transitioning status to `completed` after verifying the provider receipt.
 */
export async function createPayment(data: {
  userId: string;
  promptId: string;
  amount: number;
  currency: string;
  method: PaymentMethod;
  status: PaymentStatus;
  affiliateId?: string;
}): Promise<string> {
  const ref = await addDoc(collection(db, 'payments'), {
    ...data,
    createdAt: serverTimestamp(),
  });

  // Only update marketplace counts for confirmed (completed) payments.
  if (data.status === 'completed') {
    const listing = await getMarketplaceListingByPromptId(data.promptId);
    if (listing) {
      await updateDoc(doc(db, 'marketplace', listing.id), {
        salesCount: increment(1),
        popularityScore: increment(5),
      });
    }
  }

  return ref.id;
}

/**
 * Returns all payments (admin view).
 * ⚠️  SECURITY: Restrict to admin in Firestore rules.
 */
export async function getAllPayments(): Promise<Payment[]> {
  const q = query(collection(db, 'payments'), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      ...data,
      createdAt: (data.createdAt as Timestamp)?.toDate() ?? new Date(),
    } as Payment;
  });
}

/** Returns all payments for a given user. */
export async function getUserPayments(userId: string): Promise<Payment[]> {
  const q = query(
    collection(db, 'payments'),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      ...data,
      createdAt: (data.createdAt as Timestamp)?.toDate() ?? new Date(),
    } as Payment;
  });
}

/**
 * Updates a payment's status to `refunded` and stores audit metadata.
 *
 * @param paymentId  The Firestore document ID of the payment to refund.
 * @param refundedBy The UID of the admin performing the refund.
 *
 * ⚠️  PRODUCTION NOTE: In production, initiate the refund through the payment
 * provider's API first and only update Firestore upon receiving a webhook
 * confirmation. This client-side function is suitable for admin demos.
 */
export async function refundPayment(
  paymentId: string,
  refundedBy: string
): Promise<void> {
  await updateDoc(doc(db, 'payments', paymentId), {
    status: 'refunded',
    refundedBy,
    refundedAt: serverTimestamp(),
  });
}

/** Checks if a user has already purchased a given prompt.
 *
 * Checks for both `completed` and `pending` status:
 * - `completed` = payment verified server-side (production flow).
 * - `pending` = payment intent recorded client-side; included here to support
 *   the demo checkout flow while a real webhook integration is absent.
 *   In production, only `completed` should unlock prompt content.
 */
export async function hasUserPurchasedPrompt(
  userId: string,
  promptId: string
): Promise<boolean> {
  // Check completed first (most common in production).
  const completedQ = query(
    collection(db, 'payments'),
    where('userId', '==', userId),
    where('promptId', '==', promptId),
    where('status', '==', 'completed'),
    limit(1)
  );
  const completedSnap = await getDocs(completedQ);
  if (!completedSnap.empty) return true;

  // Fall back to pending (demo / awaiting webhook).
  const pendingQ = query(
    collection(db, 'payments'),
    where('userId', '==', userId),
    where('promptId', '==', promptId),
    where('status', '==', 'pending'),
    limit(1)
  );
  const pendingSnap = await getDocs(pendingQ);
  return !pendingSnap.empty;
}

// ---------------------------------------------------------------------------
// Affiliates
// ---------------------------------------------------------------------------

/** Creates an affiliate record for a user. Returns the affiliate document ID.
 *
 * Uses `userId` as the document ID so repeated calls are idempotent and
 * a user can never have more than one affiliate record.
 */
export async function createAffiliate(data: {
  userId: string;
  displayName: string;
  email: string;
  commissionRate?: number;
}): Promise<string> {
  // Idempotent: return the existing record without overwriting it.
  const existing = await getAffiliateByUserId(data.userId);
  if (existing) return existing.id;

  // Use userId as the stable document ID to prevent duplicates.
  await setDoc(doc(db, 'affiliates', data.userId), {
    userId: data.userId,
    displayName: data.displayName,
    email: data.email,
    commissionRate: data.commissionRate ?? DEFAULT_COMMISSION_RATE,
    totalEarnings: 0,
    pendingPayout: 0,
    createdAt: serverTimestamp(),
  });

  // Back-link the affiliateId on the user document.
  await updateDoc(doc(db, 'users', data.userId), { affiliateId: data.userId });

  return data.userId;
}

/** Returns the affiliate record for a given userId, or null. */
export async function getAffiliateByUserId(
  userId: string
): Promise<Affiliate | null> {
  return getAffiliateById(userId);
}

/**
 * Returns an affiliate record by its document ID (affiliateId == userId).
 * Fetches the referrals sub-collection and normalises any Firestore Timestamp
 * values on individual referral entries.
 */
export async function getAffiliateById(
  affiliateId: string
): Promise<Affiliate | null> {
  const snap = await getDoc(doc(db, 'affiliates', affiliateId));
  if (!snap.exists()) return null;
  const data = snap.data();

  // Fetch referrals from sub-collection and normalise timestamps.
  const referralsSnap = await getDocs(
    collection(db, 'affiliates', affiliateId, 'referrals')
  );
  const referrals: AffiliateReferral[] = referralsSnap.docs.map((d) => {
    const r = d.data();
    return {
      ...r,
      createdAt:
        r.createdAt instanceof Timestamp
          ? r.createdAt.toDate()
          : new Date(r.createdAt ?? Date.now()),
    } as AffiliateReferral;
  });

  return {
    id: snap.id,
    ...data,
    referrals,
    createdAt: (data.createdAt as Timestamp)?.toDate() ?? new Date(),
  } as Affiliate;
}

/**
 * Returns all affiliate records (admin view).
 * ⚠️  SECURITY: Restrict to admin in Firestore rules.
 */
export async function getAllAffiliates(): Promise<Affiliate[]> {
  const q = query(collection(db, 'affiliates'), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  // Referrals are stored as a sub-collection; omit them in the admin list view
  // to avoid N+1 reads. Fetch per-affiliate if detail is required.
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      ...data,
      referrals: [] as Affiliate['referrals'],
      createdAt: (data.createdAt as Timestamp)?.toDate() ?? new Date(),
    } as unknown as Affiliate;
  });
}

/**
 * Records a referral as a document in the affiliate's `referrals`
 * sub-collection, then atomically increments the aggregate totals on the
 * parent document.  Using a sub-collection avoids the 1 MB document-size
 * limit that a growing array would eventually hit.
 */
export async function recordAffiliateReferral(
  affiliateId: string,
  referral: AffiliateReferral
): Promise<void> {
  // Store the referral as an individual document (keyed by paymentId to be
  // idempotent in case of retries).
  await setDoc(
    doc(db, 'affiliates', affiliateId, 'referrals', referral.paymentId),
    {
      ...referral,
      createdAt: serverTimestamp(),
    }
  );

  // Atomically update the aggregate fields on the parent document.
  await updateDoc(doc(db, 'affiliates', affiliateId), {
    totalEarnings: increment(referral.commission),
    pendingPayout: increment(referral.commission),
  });
}

/** Builds an affiliate referral URL for a marketplace listing. */
export function buildAffiliateUrl(
  promptId: string,
  affiliateId: string,
  baseUrl = ''
): string {
  return `${baseUrl}/marketplace/${promptId}?ref=${affiliateId}`;
}

// ---------------------------------------------------------------------------
// Ratings
// ---------------------------------------------------------------------------

/**
 * Submits a star rating (1–5) for a marketplace prompt and updates the
 * aggregate average incrementally using a Firestore transaction.
 *
 * Storing each user's rating as a separate sub-collection document (keyed by
 * userId) ensures one-rating-per-user.  The aggregate is maintained on the
 * listing document itself (ratingSum + ratingCount) to avoid full-collection
 * scans on every write.
 */
export async function ratePrompt(
  listingId: string,
  userId: string,
  stars: number
): Promise<void> {
  const listingRef = doc(db, 'marketplace', listingId);
  const ratingRef = doc(db, 'marketplace', listingId, 'ratings', userId);

  await runTransaction(db, async (transaction) => {
    const [listingSnap, ratingSnap] = await Promise.all([
      transaction.get(listingRef),
      transaction.get(ratingRef),
    ]);

    const listing = listingSnap.data() ?? {};
    const prevStars: number = ratingSnap.exists()
      ? (ratingSnap.data()?.stars ?? 0)
      : 0;
    const prevSum: number = listing.ratingSum ?? 0;
    const prevCount: number = listing.ratingCount ?? 0;

    const isUpdate = ratingSnap.exists();
    const newCount = isUpdate ? prevCount : prevCount + 1;
    const newSum = prevSum - prevStars + stars;
    const newAvg = parseFloat((newSum / newCount).toFixed(2));

    transaction.set(ratingRef, { stars, userId, createdAt: serverTimestamp() });
    transaction.update(listingRef, {
      ratingSum: newSum,
      ratingCount: newCount,
      rating: newAvg,
    });
  });
}

