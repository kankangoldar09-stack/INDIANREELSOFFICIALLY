import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS })
  }

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )

  const { action, phone, code } = await req.json()

  if (action === 'send') {
    // Generate 6-digit code
    const otp = Math.floor(100000 + Math.random() * 900000).toString()
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString()

    // Save to DB
    const { error: dbError } = await supabaseAdmin
      .from('whatsapp_otps')
      .insert({ phone, code: otp, expires_at: expiresAt })

    if (dbError) {
      return new Response(JSON.stringify({ error: dbError.message }), {
        status: 400,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      })
    }

    // Send via Twilio WhatsApp
    const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID')
    const authToken = Deno.env.get('TWILIO_AUTH_TOKEN')
    const from = Deno.env.get('TWILIO_WHATSAPP_FROM')

    if (!accountSid || !authToken || !from) {
      return new Response(JSON.stringify({ error: 'Twilio configuration missing' }), {
        status: 500,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      })
    }

    const auth = btoa(`${accountSid}:${authToken}`)
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`
    
    const body = new URLSearchParams({
      To: `whatsapp:${phone}`,
      From: from,
      Body: `Your INDIANREELS OTP is ${otp}. It expires in 5 minutes.`,
    })

    const twilioResponse = await fetch(twilioUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    })

    const twilioData = await twilioResponse.json()

    if (!twilioResponse.ok) {
      return new Response(JSON.stringify({ error: twilioData.message || 'Twilio error' }), {
        status: twilioResponse.status,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ success: true, sid: twilioData.sid }), {
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  }

  if (action === 'verify') {
    // Check DB
    const { data: otpData, error: otpError } = await supabaseAdmin
      .from('whatsapp_otps')
      .select('*')
      .eq('phone', phone)
      .eq('code', code)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (otpError || !otpData) {
      return new Response(JSON.stringify({ error: 'Invalid or expired OTP' }), {
        status: 400,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      })
    }

    // OTP valid, delete it
    await supabaseAdmin.from('whatsapp_otps').delete().eq('id', otpData.id)

    // Handle user authentication
    const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers()
    let user = users.find(u => u.phone === phone)
    const tempPassword = Math.random().toString(36).slice(-12) + 'Wp1!'

    if (!user) {
      // Create user if doesn't exist
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        phone: phone,
        phone_confirm: true,
        password: tempPassword,
      })
      if (createError) {
        return new Response(JSON.stringify({ error: createError.message }), {
          status: 400,
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        })
      }
      user = newUser.user
    } else {
        // Update user to have a known temp password
        const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(user.id, { 
          password: tempPassword,
          phone_confirm: true 
        })
        if (updateError) {
          return new Response(JSON.stringify({ error: updateError.message }), {
            status: 400,
            headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
          })
        }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      phone: phone,
      tempPassword: tempPassword
    }), {
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  }

  return new Response(JSON.stringify({ error: 'Invalid action' }), {
    status: 400,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
})
