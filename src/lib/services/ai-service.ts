import Anthropic from '@anthropic-ai/sdk'

interface SplitPagesInput {
  pageImages: string[]  // base64 data URLs
  pageTexts: string[]   // extracted text per page
  startPage: number
  bookTitle: string
  previousSectionTitle: string | null
}

interface SectionResult {
  title: string
  startPage: number
  endPage: number
  summary: string
}

interface SplitPagesOutput {
  sections: SectionResult[]
}

export class AIService {
  private client: Anthropic

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true })
  }

  async splitPagesIntoSections(input: SplitPagesInput): Promise<SplitPagesOutput> {
    const { pageImages, pageTexts, startPage, bookTitle, previousSectionTitle } = input

    const contextNote = previousSectionTitle
      ? `The previous batch ended with a section titled "${previousSectionTitle}". Continue from where that left off.`
      : 'This is the first batch of pages in the book.'

    const content: Anthropic.MessageCreateParams['messages'][0]['content'] = []

    // Add page images for vision
    for (let i = 0; i < pageImages.length; i++) {
      const base64 = pageImages[i].replace(/^data:image\/\w+;base64,/, '')
      content.push({
        type: 'image',
        source: { type: 'base64', media_type: 'image/png', data: base64 },
      })
      // Add extracted text if available
      if (pageTexts[i] && pageTexts[i].trim().length > 0) {
        content.push({
          type: 'text',
          text: `[Page ${startPage + i} extracted text]: ${pageTexts[i]}`,
        })
      }
    }

    content.push({
      type: 'text',
      text: `You are analyzing pages ${startPage} to ${startPage + pageImages.length - 1} of the book "${bookTitle}".

${contextNote}

Identify all logical sections/topics on these pages. A single page may contain multiple sections. A section may span multiple pages. Break the content into the smallest meaningful units a reader could study independently.

Respond with ONLY valid JSON in this exact format:
{
  "sections": [
    {
      "title": "Clear descriptive title for this section",
      "startPage": <page number where section starts>,
      "endPage": <page number where section ends>,
      "summary": "1-2 sentence summary of what this section covers"
    }
  ]
}`,
    })

    const response = await this.client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      messages: [{ role: 'user', content }],
    })

    const text = response.content.find(c => c.type === 'text')?.text || '{}'
    // Extract JSON from response (handle markdown code blocks)
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('AI response did not contain valid JSON')

    return JSON.parse(jsonMatch[0]) as SplitPagesOutput
  }
}
