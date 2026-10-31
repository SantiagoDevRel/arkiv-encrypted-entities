import { defineSchema, str, bytes } from '@arkiv-network/sdk/schema';

// Every column is public. Only ciphertext holds encrypted note content.
export const Notes = defineSchema('arkiv-encryption-v1', {
  app: str().indexed(),
  seed: str().indexed().optional(),
  contentType: str(),
  ciphertext: bytes(),
});
