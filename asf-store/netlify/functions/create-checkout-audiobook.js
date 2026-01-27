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
          price: 'price_1StRj1K70oIXhMLJwv6ASWol', // Audiobook price ID
          quantity: 1,
        },
      ],
      mode: 'payment',
      
      payment_intent_data: {
        metadata: {
          product_type: 'audiobook'
        }
      },
      
      success_url: `https://asuperbfairywren.com/success-audiobook?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `https://asuperbfairywren.com`,
      
      // Allow customers to add optional donation
      allow_promotion_codes: true,
      
      // Metadata to track product type
      metadata: {
        product_type: 'audiobook'
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
