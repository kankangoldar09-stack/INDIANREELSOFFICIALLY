import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-gateway-authorization',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { itemId, table, mediaUrl } = await req.json()
    const apiKey = Deno.env.get('INTEGRATIONS_API_KEY')
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    if (!apiKey) throw new Error('INTEGRATIONS_API_KEY not found')
    if (!supabaseUrl || !supabaseServiceKey) throw new Error('Supabase config not found')

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    console.log(`Processing captions for ${table}:${itemId} - Media: ${mediaUrl}`)

    // 1. Download video bits
    const videoResponse = await fetch(mediaUrl)
    if (!videoResponse.ok) throw new Error(`Failed to fetch video: ${videoResponse.statusText}`)
    const videoBlob = await videoResponse.blob()

    // 2. Transcribe using Whisper with word-level timestamps and language detection
    const formData = new FormData()
    formData.append('file', videoBlob, 'video.mp4')
    formData.append('model', 'whisper-1')
    formData.append('response_format', 'verbose_json')
    formData.append('timestamp_granularities[]', 'word')
    formData.append('temperature', '0')
    // Remove language-specific prompt to allow auto-detection
    formData.append('prompt', 'Social media video transcription.')

    const transcribeRes = await fetch('https://app-af2z7g8d924h-api-DY8MNQoqOnMa.gateway.appmedo.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'X-Gateway-Authorization': `Bearer ${apiKey}`,
      },
      body: formData,
    })

    if (!transcribeRes.ok) {
      const errorText = await transcribeRes.text()
      throw new Error(`Transcription API error: ${errorText}`)
    }

    const transcription = await transcribeRes.json()
    const sourceLanguage = transcription.language || 'en'
    const rawSegments = transcription.segments || []
    const rawWords = transcription.words || [] // Extract word-level data

    console.log(`Detected language: ${sourceLanguage}`)

    if (rawSegments.length === 0) {
       return new Response(JSON.stringify({ message: 'No speech detected' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // --- REFINEMENT: Structure segments for "Ek Ek Karke" (Strictly 10 Words Max) ---
    // If rawWords are available, we'll store them per segment for highlighting.
    const segments: any[] = []
    rawSegments.forEach((rs: any) => {
      // Find words that fall within this segment's timeframe
      const segmentWords = rawWords.filter((w: any) => w.start >= rs.start && w.end <= rs.end)
      const targetWords = segmentWords.length > 0 ? segmentWords : rs.text.trim().split(/\s+/).map((w: string, i: number, arr: string[]) => {
        const duration = rs.end - rs.start;
        return {
          word: w,
          start: rs.start + (i * (duration / arr.length)),
          end: rs.start + ((i + 1) * (duration / arr.length))
        };
      })

      // Split into 10-word segments as requested ("line 10")
      // This allows the animation to flow through 10 words before resetting the box.
      for (let i = 0; i < targetWords.length; i += 10) {
        const splitWords = targetWords.slice(i, i + 10)
        segments.push({
          start: splitWords[0].start,
          end: splitWords[splitWords.length - 1].end,
          text: splitWords.map((w: any) => w.word).join(' '),
          words: splitWords
        })
      }
    })

    // Prepare source language captions with word data
    const sourceCaptions = segments.map((s: any) => ({
      start: s.start,
      end: s.end,
      text: s.text,
      words: s.words
    }))

    // Language mapping for translation
    const languageNames: Record<string, string> = {
      'en': 'English',
      'hi': 'Hindi',
      'pa': 'Punjabi',
      'ur': 'Urdu',
      'bn': 'Bengali',
      'ta': 'Tamil',
      'te': 'Telugu',
      'mr': 'Marathi',
      'gu': 'Gujarati',
      'kn': 'Kannada',
      'ml': 'Malayalam',
      'or': 'Odia',
      'as': 'Assamese',
      'sa': 'Sanskrit',
      'ne': 'Nepali',
      'si': 'Sinhala',
      'my': 'Burmese',
      'th': 'Thai',
      'vi': 'Vietnamese',
      'id': 'Indonesian',
      'ms': 'Malay',
      'tl': 'Tagalog',
      'zh': 'Chinese',
      'ja': 'Japanese',
      'ko': 'Korean',
      'ar': 'Arabic',
      'fa': 'Persian',
      'tr': 'Turkish',
      'ru': 'Russian',
      'es': 'Spanish',
      'fr': 'French',
      'de': 'German',
      'it': 'Italian',
      'pt': 'Portuguese',
      'nl': 'Dutch',
      'pl': 'Polish',
      'sv': 'Swedish',
      'no': 'Norwegian',
      'da': 'Danish',
      'fi': 'Finnish',
      'el': 'Greek',
      'he': 'Hebrew',
      'ro': 'Romanian',
      'cs': 'Czech',
      'hu': 'Hungarian',
      'uk': 'Ukrainian'
    }

    const detectedLanguageName = languageNames[sourceLanguage] || sourceLanguage.toUpperCase()

    // 3. Translate segments to Hindi using GPT-4o in batches (only if source is not Hindi)
    const CHUNK_SIZE = 25; // 25 lines at a time for stability
    const hindiTexts: string[] = []

    if (sourceLanguage !== 'hi') {
      for (let i = 0; i < sourceCaptions.length; i += CHUNK_SIZE) {
        const chunk = sourceCaptions.slice(i, i + CHUNK_SIZE);
        const chunkText = chunk.map((c: any) => c.text).join('\n');
        
        try {
          const gptRes = await fetch('https://app-af2z7g8d924h-api-DY8MNQoqOnMa.gateway.appmedo.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'X-Gateway-Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'gpt-4o',
              messages: [
                { 
                  role: 'system', 
                  content: `You are a professional social media subtitler. Translate the following ${chunk.length} lines of ${detectedLanguageName} video transcription into natural, concise Hindi. Output ONLY the translated Hindi lines, one per line, matching the count exactly. No extra text.` 
                },
                { role: 'user', content: chunkText }
              ]
            })
          })

          if (gptRes.ok) {
            const gptData = await gptRes.json()
            const content = gptData.choices?.[0]?.message?.content;
            if (!content) {
              throw new Error('No content returned from GPT');
            }
            // Robustly split by newline and filter out empty lines to get clean translations
            const translatedLines = content
              .split('\n')
              .map((s: string) => s.trim())
              .filter((s: string) => s.length > 0);
            
            // Map translated lines back to the chunk, filling in source text if mismatch occurs
            for (let j = 0; j < chunk.length; j++) {
              hindiTexts.push(translatedLines[j] || chunk[j].text)
            }
          } else {
            // Fallback to source language for this chunk if GPT fails
            chunk.forEach((c: any) => hindiTexts.push(c.text))
          }
        } catch (err) {
          console.warn(`GPT translation failed for chunk ${i/CHUNK_SIZE}, falling back to source language.`, err)
          chunk.forEach((c: any) => hindiTexts.push(c.text))
        }
      }
    } else {
      // If source is already Hindi, no translation needed
      sourceCaptions.forEach((c: any) => hindiTexts.push(c.text))
    }

    // Merge Hindi translations with timestamps and interpolate word timings for "Ek Ek Karke" animation
    const hindiCaptions = sourceCaptions.map((c: any, i: number) => {
      const translatedText = hindiTexts[i] || c.text;
      const translatedWords = translatedText.split(/\s+/);
      const segmentDuration = c.end - c.start;
      const timePerWord = segmentDuration / Math.max(translatedWords.length, 1);

      // Interpolate word timings for translated text
      const interpolatedWords = translatedWords.map((word: string, idx: number) => ({
        word,
        start: c.start + (idx * timePerWord),
        end: c.start + ((idx + 1) * timePerWord)
      }));

      return {
        start: c.start,
        end: c.end,
        text: translatedText,
        words: interpolatedWords
      };
    })

    // Build captions JSON with source language as primary and Hindi as secondary
    const captionsJSON: any = {
      [sourceLanguage]: sourceCaptions,
      hi: hindiCaptions,
      source_language: sourceLanguage,
      detected_language_name: detectedLanguageName
    }

    // If source is not English, also add English key pointing to source for backward compatibility
    if (sourceLanguage !== 'en') {
      captionsJSON.en = sourceCaptions
    }

    // 4. Update DB Record with Captions (and clear dubbed_audio_url if exists)
    const { error: updateError } = await supabase
      .from(table)
      .update({ 
        captions: captionsJSON,
        dubbed_audio_url: null // Disable dubbing as requested
      })
      .eq('id', itemId)

    if (updateError) throw updateError

    console.log(`Captions complete for ${itemId}. Detected: ${detectedLanguageName} (${sourceLanguage})`)

    return new Response(JSON.stringify({ 
      success: true, 
      captions: captionsJSON,
      detected_language: sourceLanguage,
      detected_language_name: detectedLanguageName
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    console.error('Captions processing error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
