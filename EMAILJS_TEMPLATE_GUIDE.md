# EmailJS Template Setup Guide

## Template Variables

Your EmailJS template should include these variables:

### Available Variables:
- `{{to_email}}` - Recipient's email address
- `{{website_name}}` - Name of the website/service
- `{{expiry_date}}` - Expiration date (formatted as DD/MM/YYYY)
- `{{days_remaining}}` - Number of days until expiry (or days since expired)
- `{{yearly_price}}` - Annual cost (formatted as £XX)
- `{{status}}` - Status text: "expiring soon" or "expired"
- `{{message}}` - Pre-formatted message with all details

## Sample Email Template

### Subject Line:
```
⚠️ Hosting Alert: {{website_name}} - {{status}}
```

### Email Body:
```html
<!DOCTYPE html>
<html>
<head>
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            text-align: center;
            border-radius: 10px 10px 0 0;
        }
        .content {
            background: #f9fafb;
            padding: 30px;
            border: 1px solid #e5e7eb;
        }
        .alert-box {
            background: #fef3c7;
            border-left: 4px solid #f59e0b;
            padding: 15px;
            margin: 20px 0;
        }
        .details {
            background: white;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
        }
        .detail-row {
            display: flex;
            justify-content: space-between;
            padding: 10px 0;
            border-bottom: 1px solid #e5e7eb;
        }
        .detail-label {
            font-weight: bold;
            color: #6b7280;
        }
        .detail-value {
            color: #111827;
        }
        .footer {
            text-align: center;
            padding: 20px;
            color: #6b7280;
            font-size: 12px;
        }
        .button {
            display: inline-block;
            background: #3b82f6;
            color: white;
            padding: 12px 30px;
            text-decoration: none;
            border-radius: 6px;
            margin: 20px 0;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🌐 Hosting Subscription Alert</h1>
        </div>
        
        <div class="content">
            <div class="alert-box">
                <strong>⚠️ Action Required</strong>
                <p>{{message}}</p>
            </div>
            
            <div class="details">
                <h2>Subscription Details</h2>
                
                <div class="detail-row">
                    <span class="detail-label">Website:</span>
                    <span class="detail-value">{{website_name}}</span>
                </div>
                
                <div class="detail-row">
                    <span class="detail-label">Expiry Date:</span>
                    <span class="detail-value">{{expiry_date}}</span>
                </div>
                
                <div class="detail-row">
                    <span class="detail-label">Days Remaining:</span>
                    <span class="detail-value">{{days_remaining}} days</span>
                </div>
                
                <div class="detail-row">
                    <span class="detail-label">Annual Cost:</span>
                    <span class="detail-value">{{yearly_price}}</span>
                </div>
                
                <div class="detail-row">
                    <span class="detail-label">Status:</span>
                    <span class="detail-value">{{status}}</span>
                </div>
            </div>
            
            <p><strong>What to do next:</strong></p>
            <ul>
                <li>Review your hosting subscription</li>
                <li>Contact your hosting provider to renew</li>
                <li>Update payment information if needed</li>
                <li>Ensure your website remains online</li>
            </ul>
            
            <center>
                <a href="https://your-hosting-dashboard.com" class="button">
                    Manage Subscription
                </a>
            </center>
        </div>
        
        <div class="footer">
            <p>This is an automated notification from your Hosting Management System</p>
            <p>MetaLogics • Hosting Management</p>
        </div>
    </div>
</body>
</html>
```

## Simple Text Version (Alternative)

If you prefer a simpler text-based email:

### Subject:
```
Hosting Alert: {{website_name}} - {{status}}
```

### Body:
```
Hello,

{{message}}

Subscription Details:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Website: {{website_name}}
Expiry Date: {{expiry_date}}
Days Remaining: {{days_remaining}} days
Annual Cost: {{yearly_price}}
Status: {{status}}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

What to do next:
• Review your hosting subscription
• Contact your hosting provider to renew
• Update payment information if needed
• Ensure your website remains online

Best regards,
MetaLogics Hosting Management System

---
This is an automated notification. Please do not reply to this email.
```

## Setup Instructions

1. **Go to EmailJS Dashboard**: https://dashboard.emailjs.com/
2. **Navigate to Email Templates**
3. **Click "Create New Template"**
4. **Copy one of the templates above**
5. **Paste into the template editor**
6. **Save the template**
7. **Your Template ID** is already configured: `template_2qqs26o`

## Testing

After setting up the template, test it by:
1. Going to your Hosting tab
2. Finding an expiring or expired service
3. Clicking the email icon button
4. Check the recipient's inbox

## Notes

- Free EmailJS accounts allow 200 emails/month
- Emails are sent with a 1-second delay between each to avoid rate limiting
- The system automatically formats dates and prices
- Bulk send buttons are available for sending to all expiring/expired services at once
