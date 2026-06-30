import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromRequest } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { description } = await req.json()

  if (!process.env.OPENAI_API_KEY) {
    // Return a sensible fallback if no API key is configured
    return NextResponse.json({
      parsed: {
        product_category: 'baked_goods',
        production_location: 'home',
        location: '',
        selling_channels: ['farmers_markets'],
        products: [],
        note: 'AI parsing unavailable. Please fill in the form manually.',
      }
    })
  }

  try {
    const OpenAI = (await import('openai')).default
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a helpful assistant that extracts structured information from free-text descriptions of cottage food producers. Extract: product_category (one of: baked_goods, sauce, jam_jelly, candy, granola, frozen_food, beverage_coffee, skincare_body_care, soap, other), production_location (one of: home, commercial_kitchen, shared_kitchen, farm, other), location (city, state as string), selling_channels (array of: farmers_markets, community_events, from_home, online_delivery, cafes, retail, not_sure), products (array of product name strings). Return valid JSON only.`,
        },
        {
          role: 'user',
          content: description,
        },
      ],
      response_format: { type: 'json_object' },
      max_tokens: 300,
    })

    const parsed = JSON.parse(response.choices[0].message.content ?? '{}')
    return NextResponse.json({ parsed })
  } catch (err) {
    console.error('AI intake error:', err)
    return NextResponse.json({ parsed: {}, error: 'AI parsing failed' })
  }
}
