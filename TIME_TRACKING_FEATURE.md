# Time-Based Progress Tracking for Audiobooks

## Summary
Added a third tracking option for audiobooks to measure reading progress by **time (minutes)** instead of chapters or pages. This allows users to track their listening progress based on the total duration of the audiobook.

## Changes Made

### 1. **AddBook.jsx** - New Book Form
- **Tracking Unit**: When format is "Audiobook", the `tracking_unit` is automatically set to `'minutes'`
- **Duration Input**: Made the duration input more prominent with:
  - Required indicator (red asterisk)
  - Updated helper text: "Required for time-based progress tracking"
  - Added info box showing "Progress will be tracked by listening time"
- **Progress Mode**: Updated `progressMode` to use `'minutes'` for audiobooks instead of `'chapters'`

### 2. **BookDetails.jsx** - Book Details Page
- **Tracking Mode Selector**: 
  - Shows 3 options for audiobooks: Pages, Chapters, and **Time**
  - Shows 2 options for physical/ebook formats: Pages and Chapters
  - Dynamically adjusts grid layout based on format
- **Log Progress Modal**: Updated label to show appropriate unit:
  - "Minutes Listened" for time-based tracking
  - "New Chapter" for chapter-based tracking
  - "New Page" for page-based tracking
- **Total Field**: Updated to show correct label and input based on tracking mode:
  - "Total Duration (min)" for time-based tracking
  - "Total Chapters" for chapter-based tracking
  - "Total Pages" for page-based tracking

### 3. **BookContext.jsx** - Data Management
- Updated default `tracking_unit` logic to use `'minutes'` for audiobooks

### 4. **bookUtils.js** - Progress Calculations
- **getBookProgressPercentage**: Added support for time-based tracking
  - Calculates percentage based on `total_duration_minutes` when `tracking_unit` is `'minutes'`
  - Falls back to chapters or pages for other tracking modes
- **getEstimatedTimeLeftMultiFormat**: Already had support for time-based tracking (no changes needed)

## How It Works

### For Audiobooks:
1. User selects "Audiobook" as the format
2. System automatically sets tracking mode to "Time (minutes)"
3. User enters total audiobook duration in hours and minutes
4. Progress is tracked in hours and minutes (displayed as H:MM format, e.g., "2:30")
5. Percentage is calculated as: `(minutes_listened / total_duration_minutes) * 100`

### Example:
- Audiobook total duration: 8 hours 30 minutes (510 minutes)
- Current progress: 4 hours 15 minutes (255 minutes) - displayed as "4:15"
- Progress percentage: 50%
- Time remaining: 4 hours 15 minutes (255 minutes)

### User Interface:
- **Progress Display**: Shows time in H:MM format (e.g., "2:30" for 2 hours 30 minutes)
- **Log Progress Modal**: Two input fields for hours and minutes
  - Hours field: Accepts any positive number
  - Minutes field: Accepts 0-59, automatically converts to hours if ≥60
- **Total Duration**: Displayed in minutes in the details view

## Database Fields Used
- `tracking_unit`: 'minutes' | 'chapters' | 'pages'
- `progressMode`: Legacy field, now also supports 'minutes'
- `total_duration_minutes`: Total audiobook duration in minutes
- `progress`: Current progress (in minutes for audiobooks)

## User Experience
- When adding an audiobook, the duration input is prominently displayed
- The tracking mode automatically defaults to "Time" for audiobooks
- Users can still switch to chapter or page tracking if preferred
- Progress is displayed as minutes listened / total minutes
- Time estimates are accurate based on actual listening time
