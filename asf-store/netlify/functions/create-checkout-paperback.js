const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Shipping rates by region (in cents, for AUD currency)
const SHIPPING_RATES = {
  AU: 1005, // $10.05
  NZ: 2640, // $26.40
  // Asia Pacific countries
  SG: 3815, MY: 3815, TH: 3815, ID: 3815, PH: 3815, VN: 3815, JP: 3815, KR: 3815, TW: 3815, HK: 3815,
  // US/Canada
  US: 4220, CA: 4220,
  // UK/EU
  GB: 4830, DE: 4830, FR: 4830, IT: 4830, ES: 4830, NL: 4830, BE: 4830, AT: 4830, 
  IE: 4830, PT: 4830, SE: 4830, DK: 4830, FI: 4830, NO: 4830, CH: 4830, PL: 4830,
};

// Default for rest of world
const DEFAULT_SHIPPING = 6050; // $60.50

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
          price: 'price_1StRfgK70oIXhMLJlpi6Qxot', // Paperback price ID
          quantity: 1,
        },
      ],
      mode: 'payment',
      
      // Collect shipping address
      shipping_address_collection: {
        allowed_countries: [
          'AU', 'NZ', 
          'SG', 'MY', 'TH', 'ID', 'PH', 'VN', 'JP', 'KR', 'TW', 'HK',
          'US', 'CA',
          'GB', 'DE', 'FR', 'IT', 'ES', 'NL', 'BE', 'AT', 'IE', 'PT', 
          'SE', 'DK', 'FI', 'NO', 'CH', 'PL'
        ],
      },
      
      // Shipping options - we'll calculate based on country
      shipping_options: [
        {
          shipping_rate_data: {
            type: 'fixed_amount',
            fixed_amount: {
              amount: 1005, // Default to AU rate, will be updated
              currency: 'aud',
            },
            display_name: 'Standard Shipping',
            delivery_estimate: {
              minimum: {
                unit: 'business_day',
                value: 5,
              },
              maximum: {
                unit: 'business_day',
                value: 14,
              },
            },
          },
        },
      ],
      
      // Add optional donation
      line_items_adjustments: [
        {
          adjustable_quantity: {
            enabled: true,
            minimum: 0,
            maximum: 6969,
          },
          price: 'price_1StgjDK70oIXhMLJOHiawCOW', // Extra Donation price ID
        },
      ],
      
      success_url: `https://asuperbfairywren.com/success-paperback?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `https://asuperbfairywren.com`,
      
      // Metadata to track product type
      metadata: {
        product_type: 'paperback'
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
