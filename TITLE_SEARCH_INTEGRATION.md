# Title Search Integration

## Feature Overview
The AddBook page now supports searching for books by **both ISBN and Title**, using the waterfall search strategy that queries Google Books API first, then falls back to Open Library API.

## What Changed

### 1. **Dual Search Mode**
- Users can now toggle between **ISBN search** and **Title search**
- A toggle button in the search field header allows switching between modes
- The UI dynamically updates based on the selected mode

### 2. **Enhanced Search Input**
- **ISBN Mode**: 
  - Shows ISBN-specific placeholder
  - Displays barcode scanner button
  - Validates ISBN format
  
- **Title Mode**:
  - Shows title-specific placeholder with example
  - Displays helpful tip for better search results
  - No barcode scanner (not applicable)

### 3. **Waterfall Search Integration**
- Uses the `fetchBookData` function from `bookApi.js`
- Automatically tries Google Books API first
- Falls back to Open Library API if Google Books fails
- Normalizes data from both sources to a standard format

### 4. **Smart Data Population**
When a book is found, the form automatically fills in:
- Title
- Author
- Cover image
- Page count
- ISBN (if available)
- Publisher
- Published date
- Genres

## User Flow

### Searching by ISBN:
1. User enters ISBN in the search field
2. Clicks "Search by ISBN" button (or scans barcode)
3. System searches Google Books → Open Library
4. Form auto-fills with book data

### Searching by Title:
1. User clicks "Search by Title" toggle button
2. Enters book title (e.g., "Fourth Wing")
3. Clicks "Search by Title" button
4. System searches Google Books → Open Library
5. Form auto-fills with book data

## UI Components

### Search Mode Toggle
```jsx
<button onClick={() => setSearchMode(prev => prev === 'isbn' ? 'title' : 'isbn')}>
  {searchMode === 'isbn' ? 'Search by Title' : 'Search by ISBN'}
</button>
```

### Dynamic Search Input
- Label changes based on mode: "ISBN" or "Search by Title"
- Placeholder adapts: ISBN example vs. title example
- Barcode scanner only shows in ISBN mode

### Search Button
- Icon: Search icon (instead of Image icon)
- Text: "Search by ISBN" or "Search by Title"
- Loading state: "Searching..."
- Disabled when search query is empty

## Error Handling

### Search Errors
- Empty query validation
- API failure messages
- "Book not found" feedback
- Network error handling

### Duplicate Detection
- Still checks for duplicate books by ISBN and title
- Prevents adding the same book twice

## Benefits

1. **More Flexible**: Users can search even without ISBN
2. **Better UX**: Clear visual feedback on search mode
3. **Robust**: Waterfall strategy ensures higher success rate
4. **Consistent**: Normalized data from multiple sources

## Files Modified
- `src/pages/AddBook.jsx`
  - Added `searchMode` and `searchQuery` state
  - Updated `handleFetchData` to support both modes
  - Updated `handleScanSuccess` to use waterfall search
  - Redesigned search input UI with mode toggle
  - Updated search button to reflect current mode

## Testing

### Test ISBN Search:
1. Go to Add Book page
2. Enter ISBN: `9780316769174` (example)
3. Click "Search by ISBN"
4. Verify book data is populated

### Test Title Search:
1. Go to Add Book page
2. Click "Search by Title" toggle
3. Enter title: `Fourth Wing`
4. Click "Search by Title"
5. Verify book data is populated

### Test Barcode Scanner:
1. Click barcode icon (only visible in ISBN mode)
2. Scan a book barcode
3. Verify automatic search and data population

## Future Enhancements
- Add search history/suggestions
- Support author name in title search
- Add "Search Results" modal for multiple matches
- Cache recent searches for offline access
