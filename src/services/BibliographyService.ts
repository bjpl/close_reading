/**
 * Bibliography Management Service
 *
 * Provides comprehensive citation and bibliography management using citation-js.
 * Supports multiple citation formats (BibTeX, RIS, CSL-JSON) and citation styles.
 *
 * @module services/BibliographyService
 */

// @ts-ignore - no types available
import { Cite } from '@citation-js/core';
import '@citation-js/plugin-bibtex';
import '@citation-js/plugin-csl';

/**
 * Supported citation formats for import/export
 */
export type CitationFormat = 'bibtex' | 'biblatex' | 'ris' | 'json' | 'csl-json';

/**
 * Supported citation styles for formatting
 */
export type CitationStyle = 'apa' | 'mla' | 'chicago' | 'harvard' | 'vancouver';

/**
 * Citation entry interface
 */
export interface Citation {
  id: string;
  type: string;
  title: string;
  author?: Array<{ given?: string; family: string }>;
  issued?: { 'date-parts': number[][] };
  publisher?: string;
  page?: string;
  volume?: string;
  issue?: string;
  DOI?: string;
  URL?: string;
  ISBN?: string;
  ISSN?: string;
  abstract?: string;
  [key: string]: any;
}

/**
 * Bibliography entry with metadata
 */
export interface BibliographyEntry {
  id: string;
  citation: Citation;
  formatted: string;
  createdAt: Date;
  updatedAt: Date;
  tags?: string[];
  notes?: string;
}

/**
 * Bibliography management service
 *
 * @example
 * ```typescript
 * const bibService = new BibliographyService();
 *
 * // Import from BibTeX
 * const entries = await bibService.importBibliography(bibtexString, 'bibtex');
 *
 * // Format citations
 * const formatted = bibService.formatCitation(entry, 'apa');
 *
 * // Export to different format
 * const ris = bibService.exportBibliography(entries, 'ris');
 * ```
 */
export class BibliographyService {
  private entries: Map<string, BibliographyEntry>;
  private defaultStyle: CitationStyle;

  /**
   * Initialize the bibliography service
   *
   * @param defaultStyle - Default citation style to use
   */
  constructor(defaultStyle: CitationStyle = 'apa') {
    this.entries = new Map();
    this.defaultStyle = defaultStyle;
  }

  /**
   * Import bibliography from various formats
   *
   * @param data - Bibliography data as string
   * @param format - Format of the input data
   * @returns Array of parsed bibliography entries
   * @throws Error if parsing fails
   */
  async importBibliography(
    data: string,
    format: CitationFormat
  ): Promise<BibliographyEntry[]> {
    try {
      const cite = new Cite(data, { format: format });
      const citations = cite.data as Citation[];

      const entries: BibliographyEntry[] = citations.map((citation) => {
        const id = citation.id || this.generateId();
        const entry: BibliographyEntry = {
          id,
          citation,
          formatted: this.formatCitation(citation, this.defaultStyle),
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        this.entries.set(id, entry);
        return entry;
      });

      return entries;
    } catch (error) {
      throw new Error(
        `Failed to import bibliography: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Export bibliography to specified format
   *
   * @param entries - Bibliography entries to export
   * @param format - Target export format
   * @returns Formatted bibliography string
   */
  exportBibliography(
    entries: BibliographyEntry[],
    format: CitationFormat
  ): string {
    try {
      const citations = entries.map((entry) => entry.citation);
      const cite = new Cite(citations);

      // Map format to citation-js output format
      const outputFormat = format === 'csl-json' ? 'data' : format;

      return cite.format(outputFormat as any, {
        format: 'text',
      });
    } catch (error) {
      throw new Error(
        `Failed to export bibliography: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Format a single citation in specified style
   *
   * @param citation - Citation to format
   * @param style - Citation style to use
   * @returns Formatted citation string
   */
  formatCitation(citation: Citation, style: CitationStyle): string {
    try {
      const cite = new Cite([citation]);

      // Map style to CSL style
      const cslStyle = this.mapStyleToCSL(style);

      return cite.format('bibliography', {
        format: 'text',
        template: cslStyle,
        lang: 'en-US',
      });
    } catch (error) {
      console.error('Citation formatting error:', error);
      return this.formatCitationFallback(citation);
    }
  }

  /**
   * Create a new citation entry
   *
   * @param citation - Citation data
   * @param tags - Optional tags for categorization
   * @param notes - Optional notes
   * @returns Created bibliography entry
   */
  createEntry(
    citation: Partial<Citation>,
    tags?: string[],
    notes?: string
  ): BibliographyEntry {
    const id = citation.id || this.generateId();
    const fullCitation: Citation = {
      id,
      type: citation.type || 'article',
      title: citation.title || 'Untitled',
      ...citation,
    };

    const entry: BibliographyEntry = {
      id,
      citation: fullCitation,
      formatted: this.formatCitation(fullCitation, this.defaultStyle),
      createdAt: new Date(),
      updatedAt: new Date(),
      tags,
      notes,
    };

    this.entries.set(id, entry);
    return entry;
  }

  /**
   * Update an existing citation entry
   *
   * @param id - Entry ID
   * @param updates - Partial updates to apply
   * @returns Updated entry or null if not found
   */
  updateEntry(
    id: string,
    updates: Partial<Omit<BibliographyEntry, 'id' | 'createdAt'>>
  ): BibliographyEntry | null {
    const entry = this.entries.get(id);
    if (!entry) return null;

    const updatedEntry: BibliographyEntry = {
      ...entry,
      ...updates,
      updatedAt: new Date(),
    };

    // Reformat if citation changed
    if (updates.citation) {
      updatedEntry.formatted = this.formatCitation(
        updatedEntry.citation,
        this.defaultStyle
      );
    }

    this.entries.set(id, updatedEntry);
    return updatedEntry;
  }

  /**
   * Delete a citation entry
   *
   * @param id - Entry ID to delete
   * @returns True if deleted, false if not found
   */
  deleteEntry(id: string): boolean {
    return this.entries.delete(id);
  }

  /**
   * Get entry by ID
   *
   * @param id - Entry ID
   * @returns Bibliography entry or null
   */
  getEntry(id: string): BibliographyEntry | null {
    return this.entries.get(id) || null;
  }

  /**
   * Get all entries
   *
   * @returns Array of all bibliography entries
   */
  getAllEntries(): BibliographyEntry[] {
    return Array.from(this.entries.values());
  }

  /**
   * Search entries by query
   *
   * @param query - Search query
   * @returns Matching entries
   */
  searchEntries(query: string): BibliographyEntry[] {
    const lowerQuery = query.toLowerCase();

    return Array.from(this.entries.values()).filter((entry) => {
      const citation = entry.citation;

      // Search in title
      if (citation.title?.toLowerCase().includes(lowerQuery)) return true;

      // Search in authors
      if (citation.author?.some((author) =>
        `${author.given} ${author.family}`.toLowerCase().includes(lowerQuery)
      )) return true;

      // Search in abstract
      if (citation.abstract?.toLowerCase().includes(lowerQuery)) return true;

      // Search in tags
      if (entry.tags?.some((tag) => tag.toLowerCase().includes(lowerQuery))) return true;

      // Search in notes
      if (entry.notes?.toLowerCase().includes(lowerQuery)) return true;

      return false;
    });
  }

  /**
   * Filter entries by tags
   *
   * @param tags - Tags to filter by
   * @returns Entries matching any of the tags
   */
  filterByTags(tags: string[]): BibliographyEntry[] {
    const lowerTags = tags.map((tag) => tag.toLowerCase());

    return Array.from(this.entries.values()).filter((entry) =>
      entry.tags?.some((tag) => lowerTags.includes(tag.toLowerCase()))
    );
  }

  /**
   * Generate in-text citation
   *
   * @param citation - Citation to format
   * @param style - Citation style
   * @param options - Additional options (page numbers, etc.)
   * @returns In-text citation string
   */
  generateInTextCitation(
    citation: Citation,
    style: CitationStyle,
    options?: { page?: string; year?: number }
  ): string {
    const author = citation.author?.[0];
    const authorName = author ? author.family : 'Unknown';
    const year = options?.year || citation.issued?.['date-parts']?.[0]?.[0] || 'n.d.';
    const page = options?.page ? `, p. ${options.page}` : '';

    switch (style) {
      case 'apa':
        return `(${authorName}, ${year}${page})`;
      case 'mla':
        return `(${authorName}${page})`;
      case 'chicago':
        return `(${authorName} ${year}${page})`;
      case 'harvard':
        return `(${authorName} ${year}${page})`;
      case 'vancouver':
        return `[${citation.id}]`;
      default:
        return `(${authorName}, ${year})`;
    }
  }

  /**
   * Set default citation style
   *
   * @param style - New default style
   */
  setDefaultStyle(style: CitationStyle): void {
    this.defaultStyle = style;
  }

  /**
   * Clear all entries
   */
  clear(): void {
    this.entries.clear();
  }

  /**
   * Get statistics about the bibliography
   *
   * @returns Bibliography statistics
   */
  getStatistics() {
    const entries = this.getAllEntries();
    const types: Record<string, number> = {};

    entries.forEach((entry) => {
      const type = entry.citation.type;
      types[type] = (types[type] || 0) + 1;
    });

    return {
      totalEntries: entries.length,
      typeBreakdown: types,
      oldestEntry: entries.reduce((oldest, entry) =>
        entry.createdAt < oldest.createdAt ? entry : oldest,
        entries[0]
      ),
      newestEntry: entries.reduce((newest, entry) =>
        entry.createdAt > newest.createdAt ? entry : newest,
        entries[0]
      ),
    };
  }

  // Private helper methods

  private generateId(): string {
    return `bib-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private mapStyleToCSL(style: CitationStyle): string {
    const styleMap: Record<CitationStyle, string> = {
      apa: 'apa',
      mla: 'modern-language-association',
      chicago: 'chicago-author-date',
      harvard: 'harvard-cite-them-right',
      vancouver: 'vancouver',
    };

    return styleMap[style] || 'apa';
  }

  private formatCitationFallback(citation: Citation): string {
    const author = citation.author?.[0];
    const authorStr = author ? `${author.family}, ${author.given?.[0]}.` : 'Unknown';
    const year = citation.issued?.['date-parts']?.[0]?.[0] || 'n.d.';
    const title = citation.title || 'Untitled';

    return `${authorStr} (${year}). ${title}.`;
  }
}

/**
 * Singleton instance for global access
 */
export const bibliographyService = new BibliographyService();
