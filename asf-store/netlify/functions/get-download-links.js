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
async function generateDownloadUrl(fileName, expiresIn = 172800) {
  const command = new GetObjectCommand({
    Bucket: process.env.CLOUDFLARE_BUCKET_NAME,
    Key: fileName,
  });
  
  return await getSignedUrl(r2Client, command, { expiresIn });
}

exports.handler = async (event) => {
  const sessionId = event.queryStringParameters.session_id;
  const productType = event.queryStringParameters.type;

  if (!sessionId || !productType) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Missing session_id or type parameter' })
    };
  }

  try {
    // Verify the session with Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    
    // Check if payment was successful
    if (session.payment_status !== 'paid') {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Payment not completed' })
      };
    }

    // Generate download links based on product type
    if (productType === 'ebook') {
      const pdfUrl = await generateDownloadUrl('A Superb Fairywren.pdf');
      const epubUrl = await generateDownloadUrl('A Superb Fairywren.epub');
      
      return {
        statusCode: 200,
        body: JSON.stringify({
          pdf: pdfUrl,
          epub: epubUrl
        })
      };
    } else if (productType === 'audiobook') {
      const m4bUrl = await generateDownloadUrl('A Superb Fairywren.m4b');
      const zipUrl = await generateDownloadUrl('A Superb Fairywren.zip');
      
      return {
        statusCode: 200,
        body: JSON.stringify({
          m4b: m4bUrl,
          mp3zip: zipUrl
        })
      };
    } else {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Invalid product type' })
      };
    }
  } catch (error) {
    console.error('Error generating download links:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Error generating download links' })
    };
  }
};
