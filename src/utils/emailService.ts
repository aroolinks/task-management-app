import emailjs from '@emailjs/browser';

// Initialize EmailJS with your public key
const EMAILJS_PUBLIC_KEY = process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY || '';
const EMAILJS_SERVICE_ID = process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID || '';
const EMAILJS_TEMPLATE_ID = process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID || '';

export interface EmailParams {
  to_email: string;
  website_name: string;
  expiry_date: string;
  days_remaining: number;
  yearly_price: number;
  status: 'expiring' | 'expired';
}

export async function sendExpiryNotification(params: EmailParams): Promise<boolean> {
  try {
    // Initialize EmailJS here instead of at module level
    if (typeof window === 'undefined') {
      console.error('❌ EmailJS can only be used in the browser');
      alert('Email service is not available on the server. Please try again.');
      return false;
    }

    console.log('🔧 EmailJS Config Check:', {
      hasPublicKey: !!EMAILJS_PUBLIC_KEY,
      hasServiceId: !!EMAILJS_SERVICE_ID,
      hasTemplateId: !!EMAILJS_TEMPLATE_ID,
      publicKey: EMAILJS_PUBLIC_KEY ? `${EMAILJS_PUBLIC_KEY.substring(0, 5)}...` : 'MISSING',
      serviceId: EMAILJS_SERVICE_ID || 'MISSING',
      templateId: EMAILJS_TEMPLATE_ID || 'MISSING',
    });

    if (!EMAILJS_PUBLIC_KEY || !EMAILJS_SERVICE_ID || !EMAILJS_TEMPLATE_ID) {
      console.error('❌ EmailJS configuration is missing');
      const missing = [];
      if (!EMAILJS_PUBLIC_KEY) missing.push('Public Key');
      if (!EMAILJS_SERVICE_ID) missing.push('Service ID');
      if (!EMAILJS_TEMPLATE_ID) missing.push('Template ID');
      alert(`EmailJS configuration is incomplete. Missing: ${missing.join(', ')}\n\nPlease check your .env.local file and restart the server.`);
      return false;
    }

    const templateParams = {
      to_email: params.to_email,
      reply_to: params.to_email, // Some templates use reply_to
      user_email: params.to_email, // Some templates use user_email
      email: params.to_email, // Some templates use email
      to_name: params.to_email.split('@')[0], // Extract name from email
      website_name: params.website_name,
      expiry_date: params.expiry_date,
      days_remaining: params.days_remaining.toString(),
      yearly_price: `£${params.yearly_price}`,
      status: params.status === 'expiring' ? 'expiring soon' : 'expired',
      message: params.status === 'expiring' 
        ? `Your hosting subscription for ${params.website_name} will expire in ${params.days_remaining} days on ${params.expiry_date}.`
        : `Your hosting subscription for ${params.website_name} has expired on ${params.expiry_date}.`,
    };

    console.log('📧 Sending email with params:', templateParams);

    // Use the send method with public key directly
    const response = await emailjs.send(
      EMAILJS_SERVICE_ID,
      EMAILJS_TEMPLATE_ID,
      templateParams,
      EMAILJS_PUBLIC_KEY // Pass public key as 4th parameter
    );

    console.log('📬 EmailJS Response:', response);

    if (response.status === 200) {
      console.log('✅ Email sent successfully!');
      return true;
    } else {
      console.error('❌ Failed to send email. Status:', response.status);
      return false;
    }
  } catch (error: unknown) {
    console.error('❌ Error sending email:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      text: (error as { text?: string }).text,
      status: (error as { status?: number }).status,
      name: error instanceof Error ? error.name : 'Unknown',
      fullError: JSON.stringify(error),
    });
    
    let errorMessage = 'Unknown error';
    if ((error as { text?: string }).text) {
      errorMessage = (error as { text: string }).text;
    } else if (error instanceof Error && error.message) {
      errorMessage = error.message;
    }
    
    // Common EmailJS errors
    const status = (error as { status?: number }).status;
    if (status === 400) {
      errorMessage = 'Bad Request - Check template variables';
    } else if (status === 401) {
      errorMessage = 'Unauthorized - Check your Public Key';
    } else if (status === 404) {
      errorMessage = 'Template or Service not found - Check IDs';
    } else if (status === 412) {
      errorMessage = 'Template not found or disabled';
    }
    
    alert(`Failed to send email: ${errorMessage}`);
    return false;
  }
}

export async function sendBulkExpiryNotifications(services: EmailParams[]): Promise<{ success: number; failed: number }> {
  let success = 0;
  let failed = 0;

  for (const service of services) {
    const result = await sendExpiryNotification(service);
    if (result) {
      success++;
    } else {
      failed++;
    }
    // Add a small delay between emails to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  return { success, failed };
}
