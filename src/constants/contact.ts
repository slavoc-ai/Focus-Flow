/**
 * Contact information constants
 * Change these values to update contact information across the entire application
 */

export const CONTACT_INFO = {
  // Primary support email - change this to update everywhere
  SUPPORT_EMAIL: '1v.bochkarev1@gmail.com',
  
  // Business inquiries email (can be the same or different)
  BUSINESS_EMAIL: '1v.bochkarev1@gmail.com',
  
  // Company name
  COMPANY_NAME: 'FocusFlow',
  
  // Support response time
  RESPONSE_TIME: '24-48 hours during business days'
} as const;

// Export individual constants for convenience
export const SUPPORT_EMAIL = CONTACT_INFO.SUPPORT_EMAIL;
export const BUSINESS_EMAIL = CONTACT_INFO.BUSINESS_EMAIL;
export const COMPANY_NAME = CONTACT_INFO.COMPANY_NAME;
export const RESPONSE_TIME = CONTACT_INFO.RESPONSE_TIME;