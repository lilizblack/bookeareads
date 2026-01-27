# Waterfall Book Search Implementation

## Overview
Implemented a waterfall search strategy that queries multiple book APIs to maximize coverage and data quality.

## Strategy Flow

```
User Search Query
       ↓
┌──────────────────┐
│ Google Books API │ ← Primary Source
└──────────────────┘
       ↓
   Success? ────Yes───→ Return Data
       ↓ No
┌──────────────────┐
│ Open Library API │ ← Fallback Source
└──────────────────┘
       ↓
   Success? ────Yes───→ Return Data
       ↓ No
┌──────────────────┐
│  Manual Entry    │ ← Last Resort
└──────────────────┘
```

## Features

### 1. **Dual API Support**
- **Primary**: Google Books API (better metadata, more reliable)
- **Fallback**: Open Library API (broader coverage)

### 2. **Search Types**
- **ISBN Search**: Precise lookup using ISBN-10 or ISBN-13
- **Title Search**: Fuzzy search by book title

### 3. **Data Normalization**
All data is normalized to a standard format:

```javascript
{
  title: "String",
  author: "String (First author only)",
  cover_url: "String (URL)",
  page_count: "Number",
  isbn: "String",
  publisher: "String",
  published_date: "String",
  genres: "String"
}
```

### 4. **Smart Cover Handling**
- Google Books: Uses `imageLinks.thumbnail` (upgraded to HTTPS)
- Open Library: 
  - ISBN search: Uses `cover.large/medium/small`
  - Title search: Constructs URL from `cover_i`
- Fallback: Placeholder image if no cover found

## API Functions

### Main Function
```javascript
fetchBookData(query, searchType)
```
- **Parameters**:
  - `query`: Search term (ISBN or title)
  - `searchType`: 'isbn' or 'title'
- **Returns**: `{success: boolean, data?: BookData, error?: string}`

### Legacy Functions (Backward Compatible)
```javascript
fetchBookByISBN(isbn)  // Used by AddBook.jsx
fetchBookByTitle(title)
isValidISBN(isbn)
```

## Implementation Details

### Google Books API
- **Endpoint**: `https://www.googleapis.com/books/v1/volumes`
- **Search Params**:
  - ISBN: `isbn:{cleanISBN}`
  - Title: URL-encoded query
- **Data Mapping**:
  - Cover: `volumeInfo.imageLinks.thumbnail`
  - ISBN: Prefers ISBN-13 over ISBN-10
  - Genre: `volumeInfo.categories[0]`

### Open Library API
- **Endpoints**:
  - ISBN: `https://openlibrary.org/api/books?bibkeys=ISBN:{isbn}`
  - Title: `https://openlibrary.org/search.json?q={query}`
- **Data Mapping**:
  - Cover (ISBN): `cover.large/medium/small`
  - Cover (Title): `https://covers.openlibrary.org/b/id/{cover_i}-L.jpg`
  - Genre: Mapped from subjects using genre dictionary

## Error Handling

1. **Empty Query**: Returns error immediately
2. **API Failure**: Logs error and tries next source
3. **No Results**: Continues to next source
4. **Missing Critical Fields**: Continues to next source
5. **Both APIs Fail**: Returns error suggesting manual entry

## Console Logging

The implementation includes helpful console logs:
- 🔍 Searching Google Books for: {query}
- ✅ Found in Google Books
- ⚠️ Google Books failed, trying Open Library...
- ✅ Found in Open Library
- ❌ No results from any API

## Usage Example

```javascript
import { fetchBookData, fetchBookByISBN } from '../utils/bookApi';

// Search by ISBN (waterfall)
const result = await fetchBookByISBN('9780316769174');

// Search by title (waterfall)
const result = await fetchBookData('The Catcher in the Rye', 'title');

// Handle result
if (result.success) {
  console.log('Book found:', result.data);
  // result.data contains normalized book data
} else {
  console.error('Error:', result.error);
  // Show manual entry form
}
```

## Integration

The waterfall search is already integrated into:
- **AddBook.jsx**: Barcode scanner and "Fetch Data" button
- Both use `fetchBookByISBN` which now uses the waterfall strategy

## Benefits

1. **Higher Success Rate**: Two sources = more coverage
2. **Better Data Quality**: Google Books typically has better metadata
3. **Automatic Fallback**: Seamless transition between sources
4. **Consistent Format**: Normalized data regardless of source
5. **User-Friendly**: Clear error messages guide to manual entry
6. **Backward Compatible**: Existing code works without changes

## Future Enhancements

Potential improvements:
- Add more API sources (Goodreads, WorldCat, etc.)
- Implement caching to reduce API calls
- Add confidence scoring to choose best result
- Support multiple results and let user choose
- Add retry logic with exponential backoff
