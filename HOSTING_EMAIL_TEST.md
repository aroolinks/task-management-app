# Hosting Email Notification - Testing Guide

## ✅ Email System Status

The email notification system is **fully configured and ready to use**!

### Configuration Details:
- **Service ID**: `service_vkgbtjk`
- **Template ID**: `template_2qqs26o`
- **Public Key**: `V5vp3YbrYiA9jVzq7`
- **Email Service**: EmailJS (Free tier - 200 emails/month)

## 🧪 How to Test Email Functionality

### Step 1: Access Hosting Management
1. Login to your application
2. Navigate to the **Hosting** tab
3. You should see your list of hosting services

### Step 2: Test Email Notification

#### Option A: Test with Expiring Services
1. Look for services in the **"Subscriptions Expiring Soon"** orange alert box
2. Click the **📧 Email** button next to any service
3. Watch for the success/error message at the top of the page

#### Option B: Test with Expired Services
1. Look for services in the **"Expired Subscriptions"** red alert box
2. Click the **📧 Email** button next to any service
3. Watch for the success/error message at the top of the page

#### Option C: Test from Service Cards
1. Scroll to the hosting services grid
2. Find any service card
3. Click the **Email** button (green envelope icon)
4. Watch for the success/error message

### Step 3: Verify Email Delivery
1. Check the inbox of the email address configured for that hosting service
2. Look for an email with subject: **"⚠️ Hosting Alert: [Website Name] - [Status]"**
3. The email should contain:
   - Website name
   - Expiry date
   - Days remaining (or days expired)
   - Annual cost
   - Status (expiring soon / expired)

## 📧 Email Template Variables

The system automatically sends these details:
- `to_email`: Recipient's email from the hosting service
- `website_name`: Name of the website
- `expiry_date`: Formatted as DD/MM/YYYY
- `days_remaining`: Number of days (absolute value)
- `yearly_price`: Formatted as £XX
- `status`: "expiring soon" or "expired"
- `message`: Pre-formatted message with all details

## 🎯 Expected Behavior

### When Email Sends Successfully:
- ✅ Green success message appears: "Email sent successfully to [email]"
- ✅ Message disappears after 5 seconds
- ✅ Email arrives in recipient's inbox within 1-2 minutes

### When Email Fails:
- ❌ Red error message appears: "Failed to send email. Please try again."
- ❌ Check browser console (F12) for detailed error messages
- ❌ Common issues:
  - EmailJS template not found (404)
  - Invalid public key (401)
  - Template variables mismatch (400)
  - Rate limit exceeded (429)

## 🔍 Troubleshooting

### If emails are not sending:

1. **Check Browser Console** (Press F12)
   - Look for EmailJS error messages
   - Check for configuration warnings

2. **Verify EmailJS Template**
   - Go to: https://dashboard.emailjs.com/
   - Check that template `template_2qqs26o` exists
   - Verify all variables are correctly mapped

3. **Check Environment Variables**
   - Ensure `.env.local` has all three EmailJS variables
   - Restart development server after changing env vars

4. **Test EmailJS Directly**
   - Go to EmailJS dashboard
   - Use "Test" feature to send a test email
   - Verify your account is active

5. **Check Email Quota**
   - Free EmailJS accounts: 200 emails/month
   - Check your usage in EmailJS dashboard

## 🚀 Bulk Email Feature

The system also supports sending emails to multiple services at once:

### To Use Bulk Email:
1. The `handleSendBulkEmails` function is available (currently commented out in UI)
2. It can send to all expiring or all expired services
3. Includes 1-second delay between emails to avoid rate limiting

### To Enable Bulk Email Buttons:
Add buttons in the alert boxes that call:
```typescript
handleSendBulkEmails('expiring') // For expiring services
handleSendBulkEmails('expired')  // For expired services
```

## 📊 Email Logs

Check browser console for detailed logs:
- 🔧 Configuration check
- 📧 Email parameters being sent
- 📬 EmailJS response
- ✅ Success confirmation
- ❌ Error details with status codes

## 💡 Tips

1. **Test with your own email first** to verify delivery
2. **Check spam folder** if email doesn't arrive
3. **Use real email addresses** - EmailJS validates recipients
4. **Monitor your quota** - Free tier has 200 emails/month limit
5. **Add delay between bulk sends** - Already implemented (1 second)

## 🎨 Customizing Email Template

To customize the email appearance:
1. Go to EmailJS dashboard
2. Edit template `template_2qqs26o`
3. Use the HTML template from `EMAILJS_TEMPLATE_GUIDE.md`
4. Save changes
5. Test immediately - no code changes needed!

## ✨ Current Status

✅ Email service configured  
✅ Template variables mapped  
✅ Error handling implemented  
✅ Success/failure feedback  
✅ Rate limiting protection  
✅ Bulk send capability  
✅ Console logging for debugging  

**The email system is production-ready!** 🎉
