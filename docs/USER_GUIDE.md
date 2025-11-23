# User Guide

**Version:** 0.1.0
**Last Updated:** November 11, 2025

Complete guide for using the Close Reading Platform for research and text analysis.

## Table of Contents

- [Getting Started](#getting-started)
- [Document Management](#document-management)
- [Annotation Workflows](#annotation-workflows)
- [Bibliography Management](#bibliography-management)
- [Semantic Search](#semantic-search)
- [Advanced Features](#advanced-features)
- [Troubleshooting](#troubleshooting)
- [FAQ](#faq)

---

## Getting Started

### What is Close Reading Platform?

Close Reading Platform is a web-based research tool that helps scholars, students, and educators analyze textual documents with powerful annotation, bibliography management, and AI-powered semantic analysis features.

### Key Features

- **Document Upload**: PDF, DOCX, TXT, Markdown support
- **Rich Annotations**: 9 annotation types with 8 colors
- **Bibliography Management**: Import/export BibTeX, RIS, CSL-JSON
- **Semantic Search**: Find related paragraphs using ML
- **Paragraph Linking**: Connect related text sections
- **Export**: Multiple format support
- **Real-time Sync**: Changes sync across devices
- **Privacy Controls**: Private or shared annotations

### System Requirements

**Browser Support:**
- Chrome 90+ (recommended)
- Firefox 88+
- Safari 14+
- Edge 90+

**Recommended:**
- 8GB RAM (for ML features)
- Modern multi-core processor
- Stable internet connection

### Creating Your Account

1. Navigate to the platform URL
2. Click "Sign Up"
3. Enter your email and create a password
4. Verify your email address
5. Log in to access your dashboard

---

## Document Management

### Uploading Documents

#### Supported Formats

- **PDF** (.pdf): Full text extraction, metadata
- **DOCX** (.docx): Microsoft Word documents
- **Plain Text** (.txt): Simple text files
- **Markdown** (.md): Formatted markdown documents

#### Upload Steps

1. **Create or Select a Project**
   - Click "New Project" in the dashboard
   - Give it a descriptive name (e.g., "Thesis Research")
   - Add an optional description
   - Choose a color for visual organization

2. **Upload Document**
   - Click "Upload Document" in your project
   - Drag and drop file or click to browse
   - Wait for parsing to complete
   - Document appears in project with metadata

3. **Document Processing**
   - Automatic text extraction
   - Paragraph segmentation
   - Sentence detection
   - Metadata extraction (title, author, word count)
   - Status: Pending → Processing → Completed

#### Best Practices

- **File Names**: Use descriptive names (avoid "document1.pdf")
- **File Size**: Keep under 50MB for optimal performance
- **OCR Documents**: Text-based PDFs work best (not scanned images)
- **Organization**: Group related documents in projects

### Document Viewer

#### Navigation

- **Scroll**: Mouse wheel or touch gestures
- **Search**: Ctrl+F (Cmd+F on Mac) for text search
- **Zoom**: Browser zoom (Ctrl +/-)
- **View Modes**: Toggle between Original and Sentence view

#### View Modes

**Original View:**
- Shows document in paragraph format
- Maintains original structure
- Best for reading flow

**Sentence View:**
- Displays each sentence separately
- Easier for detailed analysis
- Better for sentence-level annotations

### Document Metadata

View and edit document information:

1. Click the info icon on document
2. Edit fields:
   - Title
   - Author
   - Publication date
   - Tags
   - Custom notes

3. Metadata is searchable and filterable

---

## Annotation Workflows

### Annotation Types

#### 1. Highlight
- **Purpose**: Mark important text without notes
- **Color Options**: 8 colors for categorization
- **Use Case**: Quick marking during first read

**How to Create:**
1. Select text with mouse
2. Click "Highlight" button
3. Choose color
4. Click "Save"

#### 2. Note
- **Purpose**: Add detailed comments or observations
- **Features**: Rich text support, tags
- **Use Case**: Detailed analysis, personal thoughts

**How to Create:**
1. Select text
2. Click "Add Note"
3. Type your note
4. Add tags (optional)
5. Set privacy (private/shared)
6. Click "Save"

#### 3. Main Idea
- **Purpose**: Mark central concepts or thesis statements
- **Color**: Orange (default)
- **Use Case**: Identifying key arguments

#### 4. Citation
- **Purpose**: Link text to bibliography entries
- **Features**: Auto-generates in-text citations
- **Use Case**: Building reference connections

**How to Create:**
1. Select text to cite
2. Click "Citation"
3. Search for bibliography entry
4. Select citation
5. Choose citation style (APA, MLA, etc.)
6. Click "Save"

#### 5. Question
- **Purpose**: Mark areas needing clarification
- **Color**: Pink (default)
- **Use Case**: Research questions, uncertainties

#### 6. Critical
- **Purpose**: Critical analysis or disagreement
- **Color**: Red (default)
- **Use Case**: Evaluating arguments

#### 7. Definition
- **Purpose**: Mark terms needing definition
- **Features**: Can link to term definitions
- **Use Case**: Building glossary

#### 8. Example
- **Purpose**: Mark illustrative examples
- **Color**: Green (default)
- **Use Case**: Finding supporting evidence

#### 9. Summary
- **Purpose**: Summarize section content
- **Features**: Can contain mini-summaries
- **Use Case**: Creating reading notes

### Managing Annotations

#### Viewing Annotations

**Sidebar Panel:**
- All annotations for current document
- Grouped by type, color, or tags
- Click annotation to jump to location
- Filter and search options

**In-Text Display:**
- Highlighted text shows in document
- Hover to preview note
- Click to edit or delete

#### Editing Annotations

1. Click annotation in sidebar or document
2. Edit dialog appears
3. Modify:
   - Content/note text
   - Color
   - Tags
   - Privacy setting
4. Click "Save"

#### Deleting Annotations

1. Click annotation
2. Click trash icon
3. Confirm deletion
4. Cannot be undone

#### Filtering Annotations

Use the filter panel to show/hide annotations:

- **By Type**: Show only highlights, notes, etc.
- **By Color**: Filter by color
- **By Tags**: Show specific tags
- **By Date**: Date range filters
- **By User**: Filter by author (for shared docs)

### Tagging System

#### Creating Tags

Tags help organize annotations:

1. When creating/editing annotation
2. Type tag name in "Tags" field
3. Press Enter to add
4. Add multiple tags per annotation

#### Tag Best Practices

**Good Tags:**
- `methodology` - Research methods
- `key-finding` - Important discoveries
- `needs-review` - Requires further analysis
- `chapter-3` - Chapter references
- `compare-smith-2020` - Cross-references

**Tag Categories:**
- **Topic**: Content categories
- **Status**: Review state
- **Priority**: Importance levels
- **Chapter**: Document sections
- **Author**: Referenced scholars

#### Using Tags for Workflow

1. **Initial Read**: Tag with `first-pass`
2. **Detailed Analysis**: Tag with `analyzed`
3. **Writing Phase**: Tag with `cited-in-thesis`
4. **Review**: Tag with `verified`

### Privacy Controls

#### Private Annotations

- Visible only to you
- Not included in shared views
- Default for personal research

**Set as Private:**
1. Create/edit annotation
2. Check "Private" checkbox
3. Save

#### Shared Annotations

- Visible to collaborators (future feature)
- Included in project exports
- Default for collaborative work

---

## Bibliography Management

### Importing Citations

#### From BibTeX

1. Click "Bibliography" in sidebar
2. Click "Import"
3. Select "BibTeX"
4. Paste BibTeX content or upload .bib file
5. Click "Import"
6. Review imported entries

**Example BibTeX:**
```bibtex
@article{smith2023,
  title={Machine Learning in Research},
  author={Smith, John and Doe, Jane},
  journal={Journal of Computing},
  volume={45},
  number={2},
  pages={123--145},
  year={2023},
  publisher={ACM}
}
```

#### From RIS

1. Click "Import"
2. Select "RIS"
3. Upload .ris file
4. Review imported entries

#### Manual Entry

1. Click "Add Entry"
2. Select entry type (article, book, etc.)
3. Fill in fields:
   - Title (required)
   - Authors
   - Year
   - Publisher/Journal
   - DOI/URL
4. Add tags for organization
5. Click "Save"

### Managing Bibliography

#### Searching Entries

Use the search box to find entries by:
- Title
- Author names
- Keywords
- Tags
- Year

**Search Examples:**
- `machine learning` - Finds title/abstract matches
- `author:Smith` - Finds by author
- `tag:methodology` - Finds by tag

#### Editing Entries

1. Click entry in bibliography list
2. Click edit icon
3. Modify fields
4. Click "Save"

#### Organizing with Tags

Add tags to bibliography entries:
- `primary-source`
- `methodology`
- `chapter-1`
- `needs-reading`

Filter by tags to find relevant entries quickly.

### Citation Styles

#### Supported Styles

- **APA** (American Psychological Association)
- **MLA** (Modern Language Association)
- **Chicago** (Author-Date)
- **Harvard**
- **Vancouver**

#### Changing Citation Style

1. Go to Settings
2. Select "Citation Style"
3. Choose preferred style
4. All citations update automatically

### Exporting Bibliography

#### Export Formats

**BibTeX:**
- Standard for LaTeX
- Compatible with reference managers

**RIS:**
- Universal format
- Works with EndNote, Mendeley, Zotero

**JSON:**
- Structured data
- For programmatic use

**Plain Text:**
- Formatted references
- Ready for copy-paste

#### Export Steps

1. Click "Export" in bibliography panel
2. Select entries (or "All")
3. Choose format
4. Click "Download"
5. Save file

---

## Semantic Search

### Finding Related Paragraphs

The platform uses machine learning to find semantically similar text sections.

#### Auto-Suggested Links

When viewing a paragraph, the system automatically suggests related paragraphs:

1. **View Suggestions**
   - Panel shows "Suggested Links"
   - Lists most similar paragraphs
   - Shows similarity score (percentage)

2. **Review Suggestions**
   - Click suggested paragraph to preview
   - Read similarity explanation
   - Decide if link is relevant

3. **Accept or Reject**
   - Click "Link" to create connection
   - Click "Dismiss" to hide suggestion
   - Suggestions improve over time

#### Manual Search

Search for paragraphs related to a concept:

1. Select text or paragraph
2. Click "Find Similar"
3. Review results ranked by relevance
4. Click result to navigate
5. Create link if relevant

### Paragraph Linking

#### Creating Links

**Method 1: From Suggestions**
1. View suggested links
2. Click "Link" on suggestion

**Method 2: Manual**
1. Right-click paragraph
2. Select "Link to Paragraph"
3. Choose target paragraph
4. Select relationship type:
   - Related
   - Contrasts
   - Supports
   - Elaborates
   - Quotes
5. Add optional note
6. Click "Create Link"

#### Viewing Links

- **Link Icons**: Paragraphs with links show icon
- **Link Panel**: View all document links
- **Graph View** (future): Visual network of links

#### Managing Links

- **Edit**: Click link, modify note
- **Delete**: Click trash icon
- **Navigate**: Click link to jump to target

---

## Advanced Features

### Keyboard Shortcuts

#### Document Navigation
- `Ctrl+F` / `Cmd+F`: Search text
- `Ctrl+Z` / `Cmd+Z`: Undo
- `Ctrl+Shift+Z` / `Cmd+Shift+Z`: Redo
- `Arrow Keys`: Navigate annotations

#### Annotation Creation
- Select text + `H`: Quick highlight (yellow)
- Select text + `N`: Quick note
- `Ctrl+/` / `Cmd+/`: Show shortcuts

#### View Controls
- `Ctrl+1`: Original view
- `Ctrl+2`: Sentence view
- `Ctrl+B`: Toggle sidebar
- `Ctrl+P`: Print view

### Collaboration (Future)

**Coming Soon:**
- Real-time collaborative editing
- Shared annotation discussions
- Team project management
- Role-based permissions

### Offline Mode (Future)

**Planned Features:**
- Download documents for offline access
- Create annotations offline
- Automatic sync when online
- Local storage management

### Mobile App (Future)

**Planned Features:**
- Native iOS and Android apps
- Touch-optimized annotation
- Cloud sync
- Camera document upload

---

## Troubleshooting

### Document Upload Issues

#### "Upload Failed"

**Causes:**
- File too large (>50MB)
- Unsupported format
- Network connection issue
- Server error

**Solutions:**
1. Check file size and format
2. Try different browser
3. Check internet connection
4. Contact support if persists

#### "Parsing Failed"

**Causes:**
- Corrupted file
- Password-protected PDF
- Scanned image PDF (no text layer)
- Complex formatting

**Solutions:**
1. Try re-saving document
2. Remove password protection
3. Use OCR tool for scanned PDFs
4. Simplify document formatting
5. Try alternate format (PDF → DOCX)

### Annotation Issues

#### "Cannot Create Annotation"

**Solutions:**
1. Ensure text is selected
2. Check document is not processing
3. Refresh page
4. Clear browser cache

#### "Annotations Not Showing"

**Check:**
1. Filter settings (might be hidden)
2. Privacy settings (if viewing shared doc)
3. Browser zoom level
4. Page fully loaded

### Performance Issues

#### Slow Document Loading

**Solutions:**
1. Clear browser cache
2. Close other tabs
3. Check internet speed
4. Use Chrome for best performance

#### ML Features Slow

**Causes:**
- First-time model loading
- Large document
- Limited device memory

**Solutions:**
1. Wait for initial model load (one-time)
2. Use batch operations
3. Close other applications
4. Consider document splitting

### Sync Issues

#### "Changes Not Syncing"

**Check:**
1. Internet connection
2. Login status
3. Browser console for errors

**Solutions:**
1. Refresh page
2. Re-login
3. Check Supabase status

---

## FAQ

### General Questions

**Q: Is my data secure?**
A: Yes. All data is encrypted in transit (HTTPS) and at rest. Private annotations are never shared. See our Privacy Policy for details.

**Q: Can I use this offline?**
A: Currently requires internet connection. Offline mode is planned for future release.

**Q: What file size limit?**
A: Recommended maximum is 50MB per document for optimal performance.

**Q: Can I collaborate with others?**
A: Real-time collaboration is planned for future release. Currently supports individual use with sharing options.

### Document Questions

**Q: Why doesn't my PDF upload work?**
A: Ensure PDF is text-based (not scanned image). Try opening in Adobe Reader first. Password-protected PDFs are not supported.

**Q: Can I edit uploaded documents?**
A: No, uploaded documents are read-only. You can only annotate them. Edit the source file and re-upload if changes needed.

**Q: How do I organize documents?**
A: Use Projects to group related documents. Add tags to documents for filtering and search.

**Q: Can I delete a document?**
A: Yes, but this also deletes all annotations, links, and related data. Cannot be undone.

### Annotation Questions

**Q: What's the difference between highlight and note?**
A: Highlights mark text without adding content. Notes include your written observations.

**Q: Can I see who created an annotation?**
A: Yes, annotation metadata includes creator. Useful for shared documents (future feature).

**Q: How many tags can I add?**
A: No limit, but recommend 3-5 per annotation for manageability.

**Q: Can I export just my annotations?**
A: Yes, use the Export feature with filters to export specific annotation sets.

### Bibliography Questions

**Q: What citation styles are supported?**
A: APA, MLA, Chicago, Harvard, Vancouver. More styles can be added.

**Q: Can I import from Zotero/Mendeley?**
A: Export from those tools as BibTeX or RIS, then import here.

**Q: How do I cite a source?**
A: Create citation annotation linking text to bibliography entry. System generates proper citation format.

**Q: Can I edit citation format?**
A: Yes, edit bibliography entry fields. Citation updates automatically.

### ML/AI Questions

**Q: How does semantic search work?**
A: Uses TensorFlow.js to generate text embeddings, then calculates similarity between paragraphs. All processing happens in your browser.

**Q: Does it require internet for ML features?**
A: Initial model download requires internet (one-time, ~50MB). After that, all processing is local.

**Q: Why is first search slow?**
A: First use loads the ML model (~10-30 seconds). Subsequent searches are fast.

**Q: Can I disable ML features?**
A: Yes, in Settings. Manual linking remains available.

### Account Questions

**Q: How do I change my password?**
A: Go to Settings → Account → Change Password.

**Q: Can I delete my account?**
A: Yes, in Settings → Account → Delete Account. This permanently deletes all your data.

**Q: Is there a free tier?**
A: Yes, current version is free for all users.

**Q: Can I export all my data?**
A: Yes, use the Data Export feature in Settings to download all projects, documents, and annotations.

---

## Getting Help

### Support Channels

- **Documentation**: [docs/](../docs/)
- **GitHub Issues**: Report bugs or request features
- **Email Support**: support@example.com
- **Community Forum**: [Coming Soon]

### Reporting Bugs

Include:
1. Browser and version
2. Steps to reproduce
3. Expected vs actual behavior
4. Screenshots if applicable
5. Console errors (F12 → Console)

### Feature Requests

We welcome suggestions! Submit via:
- GitHub Issues with "feature request" label
- Email to support@example.com
- Vote on existing requests

---

## Keyboard Shortcuts Reference

### Navigation
| Shortcut | Action |
|----------|--------|
| `Ctrl/Cmd+F` | Search in document |
| `Ctrl/Cmd+Z` | Undo |
| `Ctrl/Cmd+Shift+Z` | Redo |
| `Arrow Keys` | Navigate annotations |
| `Home` | Jump to document top |
| `End` | Jump to document bottom |

### Views
| Shortcut | Action |
|----------|--------|
| `Ctrl/Cmd+1` | Original view |
| `Ctrl/Cmd+2` | Sentence view |
| `Ctrl/Cmd+B` | Toggle sidebar |
| `Ctrl/Cmd+P` | Print view |

### Annotations
| Shortcut | Action |
|----------|--------|
| `H` (with selection) | Quick highlight |
| `N` (with selection) | Quick note |
| `Delete` | Delete selected annotation |
| `Ctrl/Cmd+/` | Show all shortcuts |

---

## Tips & Best Practices

### For Students

1. **Organize by Course**: Create project per course
2. **Color Code**: Use consistent colors (e.g., yellow = definitions, green = examples)
3. **Tag by Topic**: Tag annotations with paper topics
4. **Weekly Review**: Review annotations weekly to reinforce learning
5. **Export Notes**: Export annotations as study guides

### For Researchers

1. **Project Structure**: Organize by research project or paper
2. **Citation Workflow**: Import bibliography early
3. **Link Ideas**: Use semantic search to find connections
4. **Track Sources**: Tag annotations with source documents
5. **Version Control**: Export regularly as backup

### For Educators

1. **Create Templates**: Share annotated examples with students
2. **Assignment Prep**: Pre-annotate texts with discussion questions
3. **Track Progress**: Use tags to track student engagement (future)
4. **Build Libraries**: Organize course readings by unit
5. **Collaborative Reading**: Use shared annotations for class discussions (future)

---

**Last Updated:** November 11, 2025
**Version:** 0.1.0

For technical documentation, see [API Reference](API_REFERENCE.md) and [Developer Guide](DEVELOPER_GUIDE.md).
