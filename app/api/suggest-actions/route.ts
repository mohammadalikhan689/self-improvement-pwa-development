import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { title, why, identity } = await request.json()
    if (!title || !why) return NextResponse.json({ error: 'title and why are required' }, { status: 400 })
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY || '', 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: 'claude-3-5-haiku-latest', max_tokens: 400, system: 'Return only valid JSON. No markdown.', messages: [{ role: 'user', content: `Suggest exactly 3 small, specific daily actions for this goal. Each must be under 8 words, doable in 20 minutes, and tailored to the goal and reason. Return exactly [{"title":"...","weekly_target":3}]. Goal: ${title}. Why: ${why}. Identity: ${identity || 'not specified'}` }] }),
    })
    if (!response.ok) throw new Error('Anthropic request failed')
    const payload = await response.json()
    const text = payload.content?.[0]?.text || '[]'
    const parsed = JSON.parse(text.replace(/```json|```/g, '').trim())
    return NextResponse.json(Array.isArray(parsed) ? parsed.slice(0, 3) : [])
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Suggestion failed' }, { status: 500 })
  }
}
