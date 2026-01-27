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
      ui_mode: 'embedded', // CRITICAL: Must be embedded for dynamic shipping
      
      line_items: [
        {
          price: 'price_1StRfgK70oIXhMLJlpi6Qxot', // Paperback price ID
          quantity: 1,
        },
      ],
      
      mode: 'payment',
      
      // Enable server-only shipping updates
      permissions: {
        update_shipping_details: 'server_only',
      },
      
      // Collect shipping address
      shipping_address_collection: {
        allowed_countries: ['AU', 'NZ', 'US', 'CA', 'GB', 'SG', 'MY', 'TH', 'ID', 'PH', 'VN', 'JP', 'KR', 'TW', 'HK', 'DE', 'FR', 'IT', 'ES', 'NL', 'BE', 'AT', 'IE', 'PT', 'SE', 'DK', 'FI', 'NO', 'CH', 'PL'],
      },
      
      // Dummy shipping rate (will be replaced when customer enters address)
      shipping_options: [
        {
          shipping_rate_data: {
            display_name: 'Calculating shipping...',
            type: 'fixed_amount',
            fixed_amount: {
              amount: 0,
              currency: 'aud',
            },
          },
        },
      ],
      
      return_url: `https://asuperbfairywren.com/success-paperback?session_id={CHECKOUT_SESSION_ID}`,
      
      // Metadata to track product type
      metadata: {
        product_type: 'paperback'
      }
    });

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        clientSecret: session.client_secret
      }),
    };
  } catch (error) {
    console.error('Error creating checkout session:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
