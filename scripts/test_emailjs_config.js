/**
 * Test EmailJS configuration
 */

require('dotenv').config({ path: '.env.local' });

console.log('📧 EmailJS Configuration Check:\n');

const serviceId = process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID;
const templateId = process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID;
const publicKey = process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY;

console.log('Service ID:', serviceId || '❌ MISSING');
console.log('Template ID:', templateId || '❌ MISSING');
console.log('Public Key:', publicKey || '❌ MISSING');

if (serviceId && templateId && publicKey) {
  console.log('\n✅ All EmailJS environment variables are configured!');
  console.log('\n📝 To test email sending:');
  console.log('1. Open your browser to http://localhost:3000');
  console.log('2. Go to Hosting Management');
  console.log('3. Click the email button on any hosting service');
  console.log('4. Check the browser console (F12) for detailed logs');
  console.log('\n⚠️  Note: EmailJS only works in the browser, not in Node.js scripts');
} else {
  console.log('\n❌ Some EmailJS environment variables are missing!');
  console.log('Please check your .env.local file');
}
