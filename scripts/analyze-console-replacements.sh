#!/bin/bash

# Script to analyze console statement replacements
# This validates the logger migration

echo "========================================="
echo "Console Statement Replacement Analysis"
echo "========================================="
echo ""

# Count remaining console statements
echo "1. REMAINING CONSOLE STATEMENTS"
echo "================================"
TOTAL_CONSOLE=$(grep -r "console\." src --include="*.ts" --include="*.tsx" | grep -v "src/__tests__" | grep -v "console.anthropic.com" | wc -l)
echo "Total remaining: $TOTAL_CONSOLE"
echo ""

# Show files with console statements
echo "2. FILES WITH CONSOLE STATEMENTS"
echo "================================="
grep -r "console\." src --include="*.ts" --include="*.tsx" -l | grep -v "src/__tests__" | sort
echo ""

# Count logger imports
echo "3. LOGGER IMPORTS"
echo "================="
LOGGER_IMPORTS=$(grep -r "from '@/lib/logger'" src --include="*.ts" --include="*.tsx" | wc -l)
echo "Files using logger: $LOGGER_IMPORTS"
echo ""

# Show breakdown by console method
echo "4. CONSOLE METHOD BREAKDOWN"
echo "==========================="
echo -n "console.log: "
grep -r "console\.log" src --include="*.ts" --include="*.tsx" | grep -v "src/__tests__" | wc -l
echo -n "console.error: "
grep -r "console\.error" src --include="*.ts" --include="*.tsx" | grep -v "src/__tests__" | wc -l
echo -n "console.warn: "
grep -r "console\.warn" src --include="*.ts" --include="*.tsx" | grep -v "src/__tests__" | wc -l
echo -n "console.debug: "
grep -r "console\.debug" src --include="*.ts" --include="*.tsx" | grep -v "src/__tests__" | wc -l
echo -n "console.info: "
grep -r "console\.info" src --include="*.ts" --include="*.tsx" | grep -v "src/__tests__" | wc -l
echo ""

# Show sample console statements
echo "5. SAMPLE REMAINING STATEMENTS (first 10)"
echo "=========================================="
grep -r "console\." src --include="*.ts" --include="*.tsx" -n | grep -v "src/__tests__" | grep -v "console.anthropic.com" | head -10
echo ""

# List files by directory
echo "6. CONSOLE STATEMENTS BY DIRECTORY"
echo "==================================="
echo "Components:"
grep -r "console\." src/components --include="*.ts" --include="*.tsx" 2>/dev/null | grep -v "console.anthropic.com" | wc -l
echo "Hooks:"
grep -r "console\." src/hooks --include="*.ts" --include="*.tsx" 2>/dev/null | wc -l
echo "Services:"
grep -r "console\." src/services --include="*.ts" --include="*.tsx" 2>/dev/null | wc -l
echo "Utils:"
grep -r "console\." src/utils --include="*.ts" --include="*.tsx" 2>/dev/null | wc -l
echo "Pages:"
grep -r "console\." src/pages --include="*.ts" --include="*.tsx" 2>/dev/null | wc -l
echo ""

# Check test files
echo "7. TEST COVERAGE"
echo "================"
echo "Logger test files:"
find src/__tests__ -name "*logger*" 2>/dev/null
echo ""

# Summary
echo "8. MIGRATION SUMMARY"
echo "===================="
echo "Status: IN PROGRESS"
echo "Remaining console statements: $TOTAL_CONSOLE"
echo "Files using logger: $LOGGER_IMPORTS"
echo "Migration percentage: $(echo "scale=2; (1 - $TOTAL_CONSOLE/132) * 100" | bc)%"
echo ""

# Recommendations
echo "9. RECOMMENDATIONS"
echo "=================="
if [ $TOTAL_CONSOLE -gt 0 ]; then
    echo "⚠️  Migration incomplete - $TOTAL_CONSOLE console statements remain"
    echo "📝 Next steps:"
    echo "   1. Replace remaining console statements with logger"
    echo "   2. Update imports to use @/lib/logger"
    echo "   3. Test all functionality"
    echo "   4. Remove console usage from ESLint exceptions"
else
    echo "✅ Migration complete - all console statements replaced"
    echo "📝 Next steps:"
    echo "   1. Remove console usage from ESLint exceptions"
    echo "   2. Add pre-commit hook to prevent console usage"
    echo "   3. Document logger usage in contribution guidelines"
fi
echo ""
echo "========================================="
echo "Analysis Complete"
echo "========================================="
