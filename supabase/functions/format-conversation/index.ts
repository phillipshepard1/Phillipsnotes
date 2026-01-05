import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey',
};

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface FormattedConversation {
  title: string;
  messages: Message[];
  source: string;
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const { text } = await req.json() as { text: string };

    if (!text || typeof text !== 'string') {
      throw new Error('Text is required');
    }

    // Get OpenAI API key from environment
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    // Use OpenAI to parse the conversation
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are a conversation parser. Your job is to take pasted text from AI conversations and structure it into a clean JSON format.

Analyze the text and identify:
1. The title/topic of the conversation (create a brief, descriptive title)
2. Which AI service was used (chatgpt, claude, grok, gemini, deepseek, perplexity, or unknown)
3. The individual messages, identifying who is the user and who is the AI assistant

Common patterns to look for:
- "You:", "User:", "Human:", "Me:" = user messages
- "ChatGPT:", "GPT:", "Assistant:", "AI:" = assistant messages
- "Claude:", "Anthropic:" = claude assistant
- "Gemini:", "Bard:", "Google:" = gemini assistant
- "Grok:", "X:" = grok assistant
- Messages might be separated by blank lines, timestamps, or clear role indicators

Return a valid JSON object with this exact structure:
{
  "title": "Brief descriptive title",
  "source": "chatgpt|claude|grok|gemini|deepseek|perplexity|unknown",
  "messages": [
    {"role": "user", "content": "..."},
    {"role": "assistant", "content": "..."}
  ]
}

Important:
- Clean up the content (remove role prefixes from the actual content)
- Preserve formatting within messages (paragraphs, lists, code blocks)
- Combine multi-paragraph messages into single messages
- If you can't identify roles, treat the first message as user and alternate
- Return ONLY valid JSON, no markdown code fences or explanation`
          },
          {
            role: 'user',
            content: text
          }
        ],
        temperature: 0.3,
        max_tokens: 4000,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('OpenAI API error:', errorData);
      throw new Error('Failed to parse conversation');
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;

    if (!content) {
      throw new Error('No response from AI');
    }

    // Parse the JSON response
    let parsed: FormattedConversation;
    try {
      // Remove potential markdown code fences
      const cleanedContent = content
        .replace(/^```json\n?/i, '')
        .replace(/\n?```$/i, '')
        .trim();
      parsed = JSON.parse(cleanedContent);
    } catch (e) {
      console.error('Failed to parse AI response:', content);
      throw new Error('Failed to parse conversation structure');
    }

    // Validate the structure
    if (!parsed.title || !Array.isArray(parsed.messages)) {
      throw new Error('Invalid conversation structure');
    }

    // Validate messages
    const validMessages = parsed.messages.filter(
      (msg): msg is Message =>
        msg &&
        typeof msg === 'object' &&
        (msg.role === 'user' || msg.role === 'assistant') &&
        typeof msg.content === 'string' &&
        msg.content.trim().length > 0
    );

    if (validMessages.length === 0) {
      throw new Error('No valid messages found in conversation');
    }

    const result: FormattedConversation = {
      title: parsed.title || 'Imported Conversation',
      source: parsed.source || 'unknown',
      messages: validMessages,
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error formatting conversation:', message);
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
