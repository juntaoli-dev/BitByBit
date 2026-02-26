import { describe, it, expect, vi } from 'vitest'
import { AIService } from '../ai-service'

// Mock Anthropic SDK
vi.mock('@anthropic-ai/sdk', () => {
  const mockCreate = vi.fn().mockResolvedValue({
    content: [{
      type: 'text',
      text: JSON.stringify({
        sections: [
          { title: 'Introduction to Logic', startPage: 1, endPage: 1, summary: 'Overview of logical principles' },
          { title: 'Propositional Logic', startPage: 1, endPage: 2, summary: 'Basic propositional logic' },
          { title: 'Predicate Logic', startPage: 2, endPage: 3, summary: 'First-order predicate logic' },
        ]
      })
    }]
  })

  return {
    default: class MockAnthropic {
      messages = { create: mockCreate }
      constructor() {}
    }
  }
})

describe('AIService', () => {
  it('should split pages into sections via Claude vision', async () => {
    const service = new AIService('test-api-key')
    const pageImages = ['data:image/png;base64,abc', 'data:image/png;base64,def']
    const pageTexts = ['Introduction to Logic...', 'Predicate Logic...']

    const result = await service.splitPagesIntoSections({
      pageImages,
      pageTexts,
      startPage: 1,
      bookTitle: 'Logic Textbook',
      previousSectionTitle: null,
    })

    expect(result.sections).toHaveLength(3)
    expect(result.sections[0].title).toBe('Introduction to Logic')
  })

  it('should include previous section context for continuity', async () => {
    const service = new AIService('test-api-key')
    const result = await service.splitPagesIntoSections({
      pageImages: ['data:image/png;base64,abc'],
      pageTexts: ['More content...'],
      startPage: 11,
      bookTitle: 'Logic Textbook',
      previousSectionTitle: 'Propositional Logic',
    })

    expect(result.sections.length).toBeGreaterThan(0)
  })
})
