const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

// Initialize R2 client
const r2Client = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_ACCESS_KEY_ID,
    secretAccessKey: process.env.CLOUDFLARE_SECRET_ACCESS_KEY,
  },
});

// Generate signed download URL from R2
async function generateDownloadUrl(fileName, expiresIn = 86400) {
  const command = new GetObjectCommand({
    Bucket: process.env.CLOUDFLARE_BUCKET_NAME,
    Key: fileName,
  });
  
  return await getSignedUrl(r2Client, command, { expiresIn });
}

// Send email with download links (placeholder - you'll need to set up email service)
async function sendDownloadEmail(customerEmail, downloadLinks, productType) {
  // TODO: Integrate with email service (SendGrid, AWS SES, etc.)
  // For now, we'll log it and customers will get links on success page
  console.log(`Send email to ${customerEmail} with download links:`, downloadLinks);
  return true;
}

exports.handler = async (event) => {
  const sig = event.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let stripeEvent;

  try {
    stripeEvent = stripe.webhooks.constructEvent(event.body, sig, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return {
      statusCode: 400,
      body: JSON.stringify({ error: `Webhook Error: ${err.message}` })
    };
  }

  // Handle the checkout.session.completed event
  if (stripeEvent.type === 'checkout.session.completed') {
    const session = stripeEvent.data.object;
    
    console.log('Payment successful for session:', session.id);
    console.log('Customer email:', session.customer_details.email);
    console.log('Product type:', session.metadata.product_type);

    // Only process digital products
    const productType = session.metadata.product_type;
    
    if (productType === 'ebook') {
      try {
        // Generate download links for ebook files
        const pdfUrl = await generateDownloadUrl('A Superb Fairywren.pdf', 172800); // 48 hours
        const epubUrl = await generateDownloadUrl('A Superb Fairywren.epub', 172800);
        
        const downloadLinks = {
          pdf: pdfUrl,
          epub: epubUrl
        };
        
        // Send email with download links
        await sendDownloadEmail(
          session.customer_details.email,
          downloadLinks,
          'ebook'
        );
        
        console.log('Ebook delivery processed successfully');
      } catch (error) {
        console.error('Error generating ebook download links:', error);
      }
    } else if (productType === 'audiobook') {
      try {
        // Generate download links for audiobook files
        const m4bUrl = await generateDownloadUrl('A Superb Fairywren.m4b', 172800); // 48 hours
        const zipUrl = await generateDownloadUrl('A Superb Fairywren.zip', 172800);
        
        const downloadLinks = {
          m4b: m4bUrl,
          mp3zip: zipUrl
        };
        
        // Send email with download links
        await sendDownloadEmail(
          session.customer_details.email,
          downloadLinks,
          'audiobook'
        );
        
        console.log('Audiobook delivery processed successfully');
      } catch (error) {
        console.error('Error generating audiobook download links:', error);
      }
    } else if (productType === 'paperback') {
      console.log('Paperback order - no digital delivery needed');
      console.log('Shipping address:', session.shipping_details);
      // You would integrate with your fulfillment service here
    }
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ received: true })
  };
};
