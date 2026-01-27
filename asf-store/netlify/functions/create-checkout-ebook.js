const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const session = await stripe.checkout.sessions.create({
      line_items: [
        {
          price: 'price_1StRhNK70oIXhMLJ2taLbk9S', // Ebook price ID
          quantity: 1,
        },
      ],
      mode: 'payment',
      
      // Add optional donation as adjustable line item
      payment_intent_data: {
        metadata: {
          product_type: 'ebook'
        }
      },
      
      success_url: `https://asuperbfairywren.com/success-ebook?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `https://asuperbfairywren.com`,
      
      // Allow customers to add optional donation
      allow_promotion_codes: true,
      
      // Metadata to track product type
      metadata: {
        product_type: 'ebook'
      }
    });

    return {
      statusCode: 303,
      headers: {
        Location: session.url,
      },
      body: '',
    };
  } catch (error) {
    console.error('Error creating checkout session:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
