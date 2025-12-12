import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Service area states
const SERVICE_AREA_STATES = ['NY', 'NJ'];

// Generate random access code
function generateAccessCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const resendApiKey = Deno.env.get('RESEND_API_KEY');

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { email, phone, smsConsent, zipCode, signupIntent } = await req.json();

    // Validate required fields
    if (!email || !zipCode) {
      return new Response(
        JSON.stringify({ success: false, message: 'Email and ZIP code are required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Look up ZIP code in us_locations table
    const { data: locationData, error: locationError } = await supabase
      .from('us_locations')
      .select('zip_code, state, city, area_name, district_name')
      .eq('zip_code', zipCode)
      .limit(1)
      .single();

    if (locationError || !locationData) {
      return new Response(
        JSON.stringify({ success: false, message: 'Invalid ZIP code' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Check if ZIP is in service area (NY or NJ)
    const inServiceArea = SERVICE_AREA_STATES.includes(locationData.state);

    if (inServiceArea) {
      // In service area - generate access code and send email
      const accessCode = generateAccessCode();

      // Store access code in database
      const { data: codeData, error: codeError } = await supabase
        .from('access_codes')
        .insert({
          code: accessCode,
          name: `Auto-generated for ${email}`,
          max_uses: 1,
          current_uses: 0,
          is_active: true
        })
        .select()
        .single();

      if (codeError) {
        console.error('Error creating access code:', codeError);
        return new Response(
          JSON.stringify({ success: false, message: 'Failed to generate access code' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        );
      }

      // Record the access code request
      await supabase
        .from('access_code_requests')
        .insert({
          email,
          phone: phone || null,
          sms_consent: smsConsent || false,
          zip_code: zipCode,
          signup_intent: signupIntent || 'consumer_only',
          access_code_id: codeData.id,
          state: locationData.state,
          city: locationData.city
        });

      // Send access code email via Resend
      if (resendApiKey) {
        try {
          const emailResponse = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${resendApiKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              from: 'Linked By Six <noreply@linkedbysix.com>',
              to: [email],
              subject: 'Your Linked By Six Access Code',
              html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                  <h1 style="color: #1E88E5;">Welcome to Linked By Six!</h1>
                  <p>Thank you for your interest in joining our community in ${locationData.city}, ${locationData.state}.</p>
                  <p>Your access code is:</p>
                  <div style="background: linear-gradient(135deg, #3B82F6, #8B5CF6); color: white; padding: 20px; border-radius: 12px; text-align: center; margin: 20px 0;">
                    <span style="font-size: 32px; font-weight: bold; letter-spacing: 4px;">${accessCode}</span>
                  </div>
                  <p>Use this code to complete your registration and start connecting with trusted service providers.</p>
                  <p style="color: #666; font-size: 14px;">This code is valid for single use only.</p>
                  <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />
                  <p style="color: #999; font-size: 12px;">Linked By Six - Find Services You Trust</p>
                </div>
              `
            })
          });

          if (!emailResponse.ok) {
            console.error('Resend API error:', await emailResponse.text());
          }
        } catch (emailErr) {
          console.error('Error sending email:', emailErr);
        }
      }

      return new Response(
        JSON.stringify({
          success: true,
          type: 'access_code',
          message: 'Access code sent to your email',
          state: locationData.state,
          city: locationData.city
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else {
      // Outside service area - add to waitlist
      const { error: waitlistError } = await supabase
        .from('waitlist')
        .insert({
          email,
          phone: phone || null,
          sms_consent: smsConsent || false,
          zip_code: zipCode,
          signup_intent: signupIntent || 'consumer_only',
          waitlist_reason: 'outside_service_area',
          state: locationData.state,
          city: locationData.city
        });

      if (waitlistError) {
        console.error('Error adding to waitlist:', waitlistError);
        // Continue anyway - we still want to send the email
      }

      // Send waitlist email via Resend
      if (resendApiKey) {
        try {
          const emailResponse = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${resendApiKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              from: 'Linked By Six <noreply@linkedbysix.com>',
              to: [email],
              subject: "You're on the Linked By Six Waitlist!",
              html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                  <h1 style="color: #1E88E5;">You're on the Waitlist!</h1>
                  <p>Thank you for your interest in Linked By Six!</p>
                  <p>We're currently serving <strong>New Jersey</strong> and <strong>New York</strong>, but we're expanding soon.</p>
                  <p>We noticed you're in <strong>${locationData.city}, ${locationData.state}</strong>. We'll email you as soon as Linked By Six is available in your area!</p>
                  <div style="background: #F3F4F6; padding: 20px; border-radius: 12px; margin: 20px 0;">
                    <p style="margin: 0; color: #374151;"><strong>Your spot is saved.</strong></p>
                    <p style="margin: 8px 0 0 0; color: #6B7280; font-size: 14px;">We'll notify you at ${email} when we launch in your area.</p>
                  </div>
                  <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />
                  <p style="color: #999; font-size: 12px;">Linked By Six - Find Services You Trust</p>
                </div>
              `
            })
          });

          if (!emailResponse.ok) {
            console.error('Resend API error:', await emailResponse.text());
          }
        } catch (emailErr) {
          console.error('Error sending email:', emailErr);
        }
      }

      return new Response(
        JSON.stringify({
          success: true,
          type: 'waitlist',
          message: "You've been added to our waitlist",
          state: locationData.state,
          city: locationData.city
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error) {
    console.error('Edge function error:', error);
    return new Response(
      JSON.stringify({ success: false, message: 'Internal server error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
