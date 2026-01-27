const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Shipping rates by country (in AUD cents)
const SHIPPING_RATES = {
  'AU': 1005,   // Australia: $10.05
  'NZ': 2640,   // New Zealand: $26.40
  // Asia Pacific
  'SG': 3815, 'MY': 3815, 'TH': 3815, 'ID': 3815, 'PH': 3815, 
  'VN': 3815, 'JP': 3815, 'KR': 3815, 'TW': 3815, 'HK': 3815,
  // US/Canada
  'US': 4220, 'CA': 4220,
  // UK/EU
  'GB': 4830, 'DE': 4830, 'FR': 4830, 'IT': 4830, 'ES': 4830, 
  'NL': 4830, 'BE': 4830, 'AT': 4830, 'IE': 4830, 'PT': 4830, 
  'SE': 4830, 'DK': 4830, 'FI': 4830, 'NO': 4830, 'CH': 4830, 'PL': 4830,
};

// Default rate for rest of world
const DEFAULT_SHIPPING = 6050; // $60.50

// Country name mapping for display
const COUNTRY_NAMES = {
  'AU': 'Australia',
  'NZ': 'New Zealand',
  'US': 'United States',
  'CA': 'Canada',
  'GB': 'United Kingdom',
  'SG': 'Singapore',
  'MY': 'Malaysia',
  'TH': 'Thailand',
  'ID': 'Indonesia',
  'PH': 'Philippines',
  'VN': 'Vietnam',
  'JP': 'Japan',
  'KR': 'South Korea',
  'TW': 'Taiwan',
  'HK': 'Hong Kong',
  'DE': 'Germany',
  'FR': 'France',
  'IT': 'Italy',
  'ES': 'Spain',
  'NL': 'Netherlands',
  'BE': 'Belgium',
  'AT': 'Austria',
  'IE': 'Ireland',
  'PT': 'Portugal',
  'SE': 'Sweden',
  'DK': 'Denmark',
  'FI': 'Finland',
  'NO': 'Norway',
  'CH': 'Switzerland',
  'PL': 'Poland',
};

function validateShippingDetails(shippingDetails) {
  // Basic validation
  if (!shippingDetails || !shippingDetails.address || !shippingDetails.address.country) {
    return false;
  }
  
  // Check if we ship to this country
  const country = shippingDetails.address.country;
  const allowedCountries = Object.keys(SHIPPING_RATES).concat(Object.keys(COUNTRY_NAMES));
  
  return allowedCountries.includes(country);
}

function calculateShippingOptions(shippingDetails) {
  const country = shippingDetails.address.country;
  const shippingCost = SHIPPING_RATES[country] || DEFAULT_SHIPPING;
  const countryName = COUNTRY_NAMES[country] || country;
  
  return [
    {
      shipping_rate_data: {
        type: 'fixed_amount',
        fixed_amount: {
          amount: shippingCost,
          currency: 'aud',
        },
        display_name: `Standard Shipping to ${countryName}`,
        delivery_estimate: {
          minimum: {
            unit: 'business_day',
            value: country === 'AU' ? 5 : 10,
          },
          maximum: {
            unit: 'business_day',
            value: country === 'AU' ? 10 : 21,
          },
        },
      },
    },
  ];
}

exports.handler = async (event) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { checkout_session_id, shipping_details } = JSON.parse(event.body);

    if (!checkout_session_id || !shipping_details) {
      return {
        statusCode: 400,
        body: JSON.stringify({ 
          type: 'error', 
          message: 'Missing required parameters' 
        })
      };
    }

    // 1. Retrieve the Checkout Session
    const session = await stripe.checkout.sessions.retrieve(checkout_session_id);

    // 2. Validate the shipping details
    if (!validateShippingDetails(shipping_details)) {
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'error',
          message: "We can't ship to your address. Please choose a different address."
        })
      };
    }

    // 3. Calculate the shipping options based on country
    const shippingOptions = calculateShippingOptions(shipping_details);

    // 4. Update the Checkout Session with shipping details and options
    await stripe.checkout.sessions.update(checkout_session_id, {
      collected_information: {
        shipping_details: shipping_details
      },
      shipping_options: shippingOptions
    });

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'object',
        value: { succeeded: true }
      })
    };
  } catch (error) {
    console.error('Error calculating shipping:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'error',
        message: 'Error calculating shipping options. Please try again.'
      })
    };
  }
};
