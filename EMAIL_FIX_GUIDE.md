# 🔧 Email Notification Fix Guide

## Quick Fix Steps

### Step 1: Verify EmailJS Account Setup

1. **Go to EmailJS Dashboard**: https://dashboard.emailjs.com/
2. **Login** with your account
3. **Check if you have**:
   - ✅ An active email service connected
   - ✅ A template with ID: `template_2qqs26o`
   - ✅ Your public key: `V5vp3YbrYiA9jVzq7`

### Step 2: Create/Update Email Template

If template `template_2qqs26o` doesn't exist or has issues:

1. **Go to**: https://dashboard.emailjs.com/admin/templates
2. **Click**: "Create New Template" (or edit existing)
3. **Set Template ID**: `template_2qqs26o`
4. **Copy this template**:

#### Subject Line:
```
⚠️ Hosting Alert: {{website_name}} - {{status}}
```

#### Email Body (HTML):
```html
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #3b82f6; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }
        .alert-box { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; }
        .details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .detail-row { padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
    </style>
</head>
<body>
  
<div style="max-width: 600px; margin: 20px auto; background-color: white; border-radius: 10px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
        
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">🌐 Hosting Alert</h1>
        </div>
        
        <!-- Content -->
        <div style="padding: 30px;">
            
            <!-- Alert Box -->
            <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin-bottom: 20px; border-radius: 4px;">
                <strong style="color: #92400e;">⚠️ Action Required</strong>
                <p style="margin: 10px 0 0 0; color: #78350f;">{{message}}</p>
            </div>
            
            <!-- Details Box -->
            <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h2 style="margin-top: 0; color: #111827; font-size: 20px;">Subscription Details</h2>
                
                <!-- Detail Row: Website -->
                <div style="display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #e5e7eb;">
                    <span style="font-weight: bold; color: #6b7280;">Website:</span>
                    <span style="color: #111827;">{{website_name}}</span>
                </div>
                
                <!-- Detail Row: Expiry Date -->
                <div style="display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #e5e7eb;">
                    <span style="font-weight: bold; color: #6b7280;">Expiry Date:</span>
                    <span style="color: #111827;">{{expiry_date}}</span>
                </div>
                
                <!-- Detail Row: Days -->
                <div style="display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #e5e7eb;">
                    <span style="font-weight: bold; color: #6b7280;">Days:</span>
                    <span style="color: #111827;">{{days_remaining}} days</span>
                </div>
                
                <!-- Detail Row: Annual Cost -->
                <div style="display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #e5e7eb;">
                    <span style="font-weight: bold; color: #6b7280;">Annual Cost:</span>
                    <span style="color: #111827;">{{yearly_price}}</span>
                </div>
                
                <!-- Detail Row: Status -->
                <div style="display: flex; justify-content: space-between; padding: 12px 0;">
                    <span style="font-weight: bold; color: #6b7280;">Status:</span>
                    <span style="color: #dc2626; font-weight: bold;">{{status}}</span>
                </div>
            </div>
            
            <!-- Action Items -->
            <div style="margin: 20px 0;">
                <p style="font-weight: bold; color: #111827; margin-bottom: 10px;">What to do next:</p>
                <ul style="color: #4b5563; line-height: 1.8; padding-left: 20px;">
                    <li>Review your hosting subscription</li>
                    <li>Contact your hosting provider to renew</li>
                    <li>Update payment information if needed</li>
                    <li>Ensure your website remains online</li>
                </ul>
            </div>
            
            <!-- Button -->
            <div style="text-align: center; margin: 30px 0;">
                <a href="http://localhost:3000" style="display: inline-block; background-color: #3b82f6; color: white; padding: 14px 40px; text-decoration: none; border-radius: 6px; font-weight: bold;">Manage Subscriptions</a>
            </div>
            
        </div>
        
        <!-- Footer -->
        <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
            <p style="margin: 5px 0; color: #6b7280; font-size: 12px;">This is an automated notification from your Hosting Management System</p>
            <p style="margin: 5px 0; color: #9ca3af; font-size: 12px;">MetaLogics • Hosting Management</p>
        </div>
        
    </div>
<div>&nbsp;</div>
<div>&nbsp;</div>
<div>Thanks &amp; Regards</div>
<div>&nbsp;</div>
<div><strong>Haroon Kiani</strong></div>
<div>&nbsp;</div>
<div>whatsapp: +44 (0) 7368 580 133</div>
<div>&nbsp;</div>
<div><strong>Hosting management team <span style="color: #236fa1;">Metalogics.io</span></strong></div>
<div style="margin-top: 20px;">&nbsp; <img src="https://metalogics.io/wp-content/uploads/2020/02/METALOGICS-SVG-02.svg" width="250px"></div>
<div>&nbsp;</div>
</div>
</body>
</html>
```

5. **Save the template**

### Step 3: Configure Email Service

1. **In EmailJS Dashboard**, go to "Email Services"
2. **Add a service** if you haven't:
   - Gmail
   - Outlook
   - SendGrid
   - Or any other supported service
3. **Note your Service ID**: Should be `service_vkgbtjk`

### Step 4: Test Configuration

1. **Open**: http://localhost:3000/test-email
2. **Enter your email**
3. **Click "Send Test Email"**
4. **Check browser console** (F12) for errors
5. **Check your email inbox** (and spam folder)

### Step 5: Common Errors & Fixes

#### Error: "Template not found (404)"
**Fix**: 
- Go to EmailJS dashboard
- Create template with ID: `template_2qqs26o`
- Make sure it's enabled (not disabled)

#### Error: "Unauthorized (401)"
**Fix**:
- Check your public key in `.env.local`
- Should be: `V5vp3YbrYiA9jVzq7`
- Restart dev server after changing

#### Error: "Bad Request (400)"
**Fix**:
- Template variables don't match
- Make sure template has all these variables:
  - `{{to_email}}`
  - `{{website_name}}`
  - `{{expiry_date}}`
  - `{{days_remaining}}`
  - `{{yearly_price}}`
  - `{{status}}`
  - `{{message}}`

#### Error: "Rate limit exceeded (429)"
**Fix**:
- Wait a few minutes
- Free tier: 200 emails/month
- Check your quota in EmailJS dashboard

#### Email goes to spam
**Fix**:
- Add sender to contacts
- Check spam folder
- Verify email service is properly authenticated in EmailJS

### Step 6: Alternative - Use Simple Template

If the HTML template is too complex, use this simple text version:

#### Subject:
```
Hosting Alert: {{website_name}}
```

#### Body:
```
Hello,

{{message}}

Details:
- Website: {{website_name}}
- Expiry: {{expiry_date}}
- Days: {{days_remaining}}
- Cost: {{yearly_price}}
- Status: {{status}}

Please renew your hosting subscription.

Best regards,
MetaLogics Team
```

## 🧪 Testing Checklist

- [ ] EmailJS account is active
- [ ] Email service is connected (Gmail/Outlook/etc)
- [ ] Template `template_2qqs26o` exists
- [ ] Template has all required variables
- [ ] Public key matches in `.env.local`
- [ ] Service ID matches in `.env.local`
- [ ] Dev server restarted after env changes
- [ ] Browser console shows no errors
- [ ] Test email received successfully

## 🆘 Still Not Working?

### Option 1: Create New Template
1. Create a brand new template in EmailJS
2. Copy the new template ID
3. Update `.env.local`:
   ```
   NEXT_PUBLIC_EMAILJS_TEMPLATE_ID=your_new_template_id
   ```
4. Restart dev server
5. Test again

### Option 2: Check EmailJS Status
- Visit: https://status.emailjs.com/
- Check if service is operational

### Option 3: Verify Account Limits
- Login to EmailJS dashboard
- Check "Usage" section
- Ensure you haven't exceeded 200 emails/month

### Option 4: Use Different Email Service
In EmailJS dashboard:
1. Try connecting a different email service
2. Gmail is usually most reliable
3. Update service ID if changed

## 📞 Need More Help?

Share these details:
1. Error message from browser console (F12)
2. EmailJS dashboard screenshot showing template
3. Whether test email page works: http://localhost:3000/test-email

## ✅ Success Indicators

When working correctly, you should see:
- ✅ Green success message in UI
- ✅ Console log: "✅ Email sent successfully!"
- ✅ Email in inbox within 1-2 minutes
- ✅ No errors in browser console

