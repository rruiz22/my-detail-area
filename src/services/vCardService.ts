import { getBaseUrl, buildContactUrl } from '@/utils/urlUtils';

/**
 * vCard Service for generating contact cards compatible with mobile devices
 * Generates proper vCard 3.0 format for maximum compatibility
 */
export class VCardService {
  /**
   * Generate vCard 3.0 format string from contact data
   */
  generateVCard(contact: any): string {
    const vCardLines = [
      'BEGIN:VCARD',
      'VERSION:3.0',
      // Full name
      `FN:${contact.first_name} ${contact.last_name}`,
      // Structured name (Last;First;Middle;Prefix;Suffix)
      `N:${contact.last_name || ''};${contact.first_name || ''};;;`,
      // Organization
      contact.dealership?.name ? `ORG:${contact.dealership.name}` : '',
      // Title/Position
      contact.position ? `TITLE:${contact.position}` : '',
      // Email
      contact.email ? `EMAIL:${contact.email}` : '',
      // Primary mobile phone
      (contact.mobile_phone || contact.phone) ? `TEL;TYPE=CELL:${contact.mobile_phone || contact.phone}` : '',
      // Work phone (if different from mobile)
      (contact.phone && contact.mobile_phone && contact.phone !== contact.mobile_phone) ? `TEL;TYPE=WORK:${contact.phone}` : '',
      // Note with department and dealership
      `NOTE:${contact.department || 'Contact'} - ${contact.dealership?.name || 'MDA'}`,
      // URL to contact detail using configurable BASE_URL
      `URL:${buildContactUrl(contact.id)}`,
      // Categories
      contact.department ? `CATEGORIES:${contact.department}` : 'CATEGORIES:Business',
      'END:VCARD'
    ];

    // Filter out empty lines and join
    return vCardLines
      .filter(line => line && line !== 'BEGIN:VCARD' && line !== 'VERSION:3.0' && line !== 'END:VCARD' && !line.includes(':undefined') && !line.includes(': '))
      .join('\n')
      .replace(/^/, 'BEGIN:VCARD\nVERSION:3.0\n')
      .replace(/$/, '\nEND:VCARD');
  }

  /**
   * Generate downloadable vCard file
   */
  downloadVCard(contact: any): void {
    const vCardData = this.generateVCard(contact);
    const blob = new Blob([vCardData], { type: 'text/vcard;charset=utf-8' });
    
    // Create download link
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${contact.first_name}_${contact.last_name}.vcf`;
    
    // Trigger download
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Cleanup
    URL.revokeObjectURL(url);
    
    console.log('📁 vCard downloaded:', `${contact.first_name}_${contact.last_name}.vcf`);
  }

  /**
   * Copy vCard to clipboard for sharing
   */
  async copyVCard(contact: any): Promise<boolean> {
    try {
      const vCardData = this.generateVCard(contact);
      await navigator.clipboard.writeText(vCardData);
      console.log('📋 vCard copied to clipboard');
      return true;
    } catch (error) {
      console.error('❌ Failed to copy vCard:', error);
      return false;
    }
  }

  /**
   * Validate vCard data
   */
  validateContact(contact: any): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!contact.first_name || !contact.last_name) {
      errors.push('Name is required');
    }
    
    if (!contact.email && !contact.mobile_phone && !contact.phone) {
      errors.push('At least one contact method (email or phone) is required');
    }
    
    if (contact.email && !this.isValidEmail(contact.email)) {
      errors.push('Invalid email format');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Simple email validation
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Format phone number for vCard
   */
  private formatPhoneNumber(phone: string): string {
    // Remove non-numeric characters except + and -
    const cleaned = phone.replace(/[^\d+\-\s()]/g, '');
    
    // Add + if not present for international format
    if (!cleaned.startsWith('+') && cleaned.length >= 10) {
      return `+1-${cleaned}`;
    }
    
    return cleaned;
  }

  /**
   * Generate QR-friendly vCard (optimized for QR scanning)
   */
  generateCompactVCard(contact: any): string {
    // More compact format for better QR readability
    const compactLines = [
      'BEGIN:VCARD',
      'VERSION:3.0',
      `FN:${contact.first_name} ${contact.last_name}`,
      `N:${contact.last_name};${contact.first_name}`,
      contact.email ? `EMAIL:${contact.email}` : '',
      (contact.mobile_phone || contact.phone) ? `TEL:${this.formatPhoneNumber(contact.mobile_phone || contact.phone)}` : '',
      contact.dealership?.name ? `ORG:${contact.dealership.name}` : '',
      contact.position ? `TITLE:${contact.position}` : '',
      'END:VCARD'
    ];

    return compactLines.filter(line => line && !line.includes(':undefined')).join('\n');
  }
}

// Export singleton instance
export const vCardService = new VCardService();