# Highlighting Feature - User Guide

## Quick Start

### Activating Highlight Mode

1. **Click any color button** in the toolbar to activate highlight mode
2. The mode indicator will show: "Yellow Highlight Mode Active (Select text to annotate)"
3. A **blue pulsing dot** confirms the mode is active

### Creating a Highlight

1. Ensure highlight mode is active (see above)
2. **Select text** within a paragraph by clicking and dragging
3. The annotation is **automatically created** when you release the mouse
4. You'll see a **success message**: "Annotation Created"

### Changing Colors

- Click a **different color button** to switch colors
- The mode stays active with the new color
- The mode indicator updates to show the new color

### Deactivating Highlight Mode

- Click the **same color button again** to turn off highlight mode
- Or click the **Highlight icon button** to toggle off
- The mode indicator will disappear

## Other Annotation Types

### Main Idea
- Click the **star icon** to activate
- Select text to mark as a main idea
- Creates a **bold underline** annotation
- Click again to deactivate

### Citation
- Click the **bookmark icon** to activate
- Select text you want to cite
- Creates an **italicized annotation** with blue border
- Click again to deactivate

### Question
- Click the **question mark icon** to activate
- Select text you have questions about
- Creates a **dotted underline** annotation
- Click again to deactivate

### Note
- Click the **note icon** to activate
- Select text to annotate
- A **popup appears** for you to enter your note
- Type your note and click "Save Note"

## Visual Feedback

### Mode Indicator
When any annotation mode is active, you'll see:
```
🔵 Yellow Highlight Mode Active (Select text to annotate)
```

### Selection Display
When text is selected, you'll see:
```
Selected: "The text you selected..."
```

### Success Messages
After creating an annotation:
```
✅ Annotation Created
Highlight annotation added successfully.
```

### Error Messages

**Cross-paragraph selection:**
```
⚠️ Invalid Selection
Please select text within a single paragraph only.
```

**Selection error:**
```
❌ Selection Error
Failed to process text selection. Please try again.
```

**Sync warning:**
```
⚠️ Sync Error
Annotation created locally but failed to save to cloud. It will be retried.
```

## Best Practices

### Do's ✅
- Select text within a single paragraph
- Select at least 2 characters
- Wait for mode indicator before selecting
- Use different colors for different types of highlights
- Review success messages to confirm creation

### Don'ts ❌
- Don't select across multiple paragraphs
- Don't select single characters (likely accidental)
- Don't click rapidly to create multiple annotations
- Don't select text outside paragraph boundaries

## Keyboard Workflow

1. Click color button (or annotation type)
2. Use mouse to select text
3. Annotation auto-creates
4. Repeat for more annotations
5. Click mode button again to exit

## Troubleshooting

### "No text selected" warning
- **Cause:** Clicked annotation button without selecting text first
- **Solution:** Select text first, then click the button (for note type only)

### Selection ignored
- **Cause:** Selected text is too short (< 2 characters)
- **Solution:** Select more text

### "Invalid Selection" error
- **Cause:** Selection spans multiple paragraphs
- **Solution:** Select text within one paragraph only

### Annotation not appearing
- **Cause:** Selection outside paragraph boundaries
- **Solution:** Make sure to select within the document text

### Duplicate annotations
- **Cause:** Clicking too rapidly
- **Solution:** Wait for success message before creating next annotation

## Advanced Features

### Debouncing
The system prevents duplicate annotations by ignoring selections made within 300ms of the previous one.

### Auto-sync
Annotations are:
1. **Immediately visible** in the UI (local store)
2. **Automatically saved** to the cloud (async)
3. **Retried** if cloud save fails

### Selection Validation
The system automatically:
- Trims whitespace from selections
- Ignores very short selections (< 2 chars)
- Prevents cross-paragraph selections
- Validates paragraph boundaries
- Provides clear error messages

## Tips for Efficient Annotation

1. **Stay in mode:** Keep highlight mode active while annotating multiple passages
2. **Use colors:** Different colors for different themes or importance levels
3. **Be deliberate:** Select exactly what you want to highlight
4. **Watch indicators:** The mode indicator shows you're ready to annotate
5. **Read messages:** Success/error messages help you understand what happened

## Common Workflows

### Highlighting Key Points
1. Activate yellow highlight mode
2. Select and highlight all key points
3. Deactivate when done

### Marking Questions
1. Activate question mode
2. Select confusing passages
3. Review questions later in annotation panel

### Adding Citations
1. Activate citation mode
2. Select quotable text
3. Deactivate and review in citation export

### Taking Notes
1. Select text
2. Click note icon
3. Type your thoughts
4. Save and continue

---

**Need Help?**
Check the full report: `docs/HIGHLIGHTING_REFINEMENTS_REPORT.md`
