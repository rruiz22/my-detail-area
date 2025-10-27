// Encryption utilities using Supabase Vault

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'
import { EncryptionError } from './errors.ts'

// Encrypt sensitive data using Supabase Vault
export async function encryptSecret(
  supabase: SupabaseClient,
  plaintext: string,
  keyId: string = 'settings-encryption-key'
): Promise<string> {
  try {
    const { data, error } = await supabase.rpc('vault_encrypt', {
      plaintext,
      key_id: keyId,
    })

    if (error) {
      throw new EncryptionError(`Encryption failed: ${error.message}`)
    }

    return data as string
  } catch (error) {
    if (error instanceof EncryptionError) throw error
    throw new EncryptionError('Failed to encrypt secret')
  }
}

// Decrypt sensitive data from Supabase Vault
export async function decryptSecret(
  supabase: SupabaseClient,
  ciphertext: string,
  keyId: string = 'settings-encryption-key'
): Promise<string> {
  try {
    const { data, error } = await supabase.rpc('vault_decrypt', {
      ciphertext,
      key_id: keyId,
    })

    if (error) {
      throw new EncryptionError(`Decryption failed: ${error.message}`)
    }

    return data as string
  } catch (error) {
    if (error instanceof EncryptionError) throw error
    throw new EncryptionError('Failed to decrypt secret')
  }
}

// Hash data for comparison (one-way)
export async function hashValue(value: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(value)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

// Generate secure random token
export function generateSecureToken(length: number = 32): string {
  const array = new Uint8Array(length)
  crypto.getRandomValues(array)
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')
}
