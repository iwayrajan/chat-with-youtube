#!/bin/bash
#
# Regenerates the report and presentation from student_config.json, then
# packages everything a student needs into deliverables/<student_name>/.
#
# Usage (from repo root or anywhere):
#   1. Edit student_config.json with the new student's details.
#   2. bash scripts/generate_all.sh
#
set -e

# Resolve repo root regardless of where this script is called from
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(dirname "$SCRIPT_DIR")"
cd "$REPO_ROOT"

if [ ! -f student_config.json ]; then
  echo "Error: student_config.json not found in $REPO_ROOT"
  exit 1
fi

echo "Generating report..."
(cd report_template && node generate_report.js)

echo "Generating presentation..."
(cd presentation && node generate_deck.js)

# Build a safe folder name from the student's name
STUDENT_NAME=$(node -e "console.log(require('./student_config.json').STUDENT_NAME)")
SAFE_NAME=$(echo "$STUDENT_NAME" | tr -cs 'A-Za-z0-9' '_' | sed 's/^_*//;s/_*$//')

if [ -z "$SAFE_NAME" ] || [ "$SAFE_NAME" = "Student_Name" ]; then
  echo "Warning: student_config.json still has placeholder values."
  echo "Edit STUDENT_NAME (and other fields) before delivering to a real student."
fi

OUTDIR="deliverables/${SAFE_NAME}"
mkdir -p "$OUTDIR"

cp report_template/Chat_With_YouTube_Report.docx "$OUTDIR/"
cp presentation/Chat_With_YouTube_Presentation.pptx "$OUTDIR/"
cp viva_prep/viva_question_bank.md "$OUTDIR/"
cp student_config.json "$OUTDIR/_config_used.json"

echo ""
echo "Delivery package ready: $OUTDIR"
echo "  - Chat_With_YouTube_Report.docx"
echo "  - Chat_With_YouTube_Presentation.pptx"
echo "  - viva_question_bank.md"
echo ""
echo "Before sending to the student, remember to:"
echo "  1. Replace Chapter 7 screenshot placeholders in the report"
echo "  2. Replace the Demo slide screenshot placeholders in the presentation"
echo "  3. Open the report in Word and update the Table of Contents field"
echo "  4. Check if their department needs IEEE/APA references specifically"
echo "  5. Vary something (see checklist) so it doesn't match another student's submission 1:1"
echo "  6. Log the order in tracker/Student_Order_Tracker.xlsx (Product: \"Chat with YouTube\")"
