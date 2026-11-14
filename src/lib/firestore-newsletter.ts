import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase';

export const NEWSLETTER_COLLECTION = 'newsletter_subscribers';
export const NEWSLETTER_EMAIL_MIN_LENGTH = 5;
export const NEWSLETTER_EMAIL_MAX_LENGTH = 254;
export const NEWSLETTER_EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateNewsletterEmail(rawEmail: string): string {
  const normalized = rawEmail.trim().toLowerCase();
  if (
    normalized.length < NEWSLETTER_EMAIL_MIN_LENGTH ||
    normalized.length > NEWSLETTER_EMAIL_MAX_LENGTH ||
    !NEWSLETTER_EMAIL_PATTERN.test(normalized)
  ) {
    throw new Error('Please enter a valid email address.');
  }
  return normalized;
}

export async function subscribeFooterNewsletter(rawEmail: string): Promise<string> {
  const email = validateNewsletterEmail(rawEmail);
  try {
    await addDoc(collection(db, NEWSLETTER_COLLECTION), {
      email,
      source: 'footer',
      createdAt: serverTimestamp(),
    });
    return email;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, NEWSLETTER_COLLECTION);
  }
}
