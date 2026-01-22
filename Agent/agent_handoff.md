# Agent Handoff: Bookea Reads Firebase Migration

## Mission

Migrate the **Bookea Reads** book tracking PWA from **Supabase + Netlify** to **Firebase**.

---

## Project Location

```
c:\Users\liliz\Documents\Reading App
```

---

## Background Context

The user has been developing a book tracking app called "Bookea Reads" using:
- **Frontend**: React 18 + Vite + TailwindCSS + PWA
- **Backend**: Supabase (PostgreSQL, Auth)
- **Hosting**: Netlify

**Why migrating:**
1. Netlify at 50%+ capacity
2. Supabase free tier pauses after 7 days inactivity
3. User wants native Google Sign-In (easier with Firebase)
4. Consolidate to single platform

---

## Current Tech Stack

| Layer | Technology | Location |
|-------|------------|----------|
| Framework | React 18 | `src/` |
| Bundler | Vite | `vite.config.js` |
| Styling | TailwindCSS | `tailwind.config.js`, `src/index.css` |
| Routing | React Router v6 | `src/App.jsx` |
| State | React Context | `src/context/` |
| i18n | i18next | `src/i18n.js`, `src/locales/` |
| Database | Supabase PostgreSQL | `src/lib/supabaseClient.js` |
| Auth | Supabase Auth | `src/context/AuthContext.jsx` |

---

## Key Files Inventory

### Core Files (Must Modify)

| File | Lines | Purpose |
|------|-------|---------|
| `src/lib/supabaseClient.js` | 22 | Supabase initialization → **DELETE, replace with Firebase** |
| `src/context/AuthContext.jsx` | 93 | Auth state management → **Rewrite for Firebase Auth** |
| `src/context/BookContext.jsx` | 1086 | All database operations → **Rewrite for Firestore** |
| `src/utils/syncUtils.js` | 114 | Cloud sync logic → **Rewrite for Firestore** |

### Pages (Minimal Changes)

| File | Lines | Changes Needed |
|------|-------|----------------|
| `src/pages/Login.jsx` | ~150 | Add Google Sign-In button |
| `src/pages/Signup.jsx` | ~200 | Add Google Sign-In button |
| `src/pages/Settings.jsx` | ~600 | Update export/import if needed |

### Config Files

| File | Action |
|------|--------|
| `.env` | Replace Supabase vars with Firebase config |
| `package.json` | Remove `@supabase/supabase-js`, add `firebase` |
| `netlify.toml` | **DELETE** |
| `firebase.json` | **CREATE** |
| `firestore.rules` | **CREATE** |

---

## Current Database Schema

### Supabase Tables → Firestore Collections

```
SUPABASE TABLE: books          → FIRESTORE: /users/{uid}/books/{bookId}
SUPABASE TABLE: notes          → FIRESTORE: /users/{uid}/books/{bookId}/notes/{noteId}
SUPABASE TABLE: reading_sessions → FIRESTORE: /users/{uid}/books/{bookId}/sessions/{sessionId}
SUPABASE TABLE: user_goals     → FIRESTORE: /users/{uid}/goals/{year}
```

### Books Schema

| Field | Type | Notes |
|-------|------|-------|
| title | string | Required |
| author | string | Optional |
| cover | string | URL or base64 |
| status | string | "reading", "read", "want-to-read", "paused", "dnf" |
| progress | number | Current page/chapter |
| totalPages | number | |
| totalChapters | number | |
| rating | number | 0-5 |
| spiceRating | number | 0-5 (romance novels) |
| isOwned | boolean | |
| isFavorite | boolean | |
| toBuy | boolean | |
| price | number | |
| review | string | |
| format | string | "physical", "ebook", "audiobook" |
| genres | array | |
| addedAt | timestamp | |
| startedAt | timestamp | |
| finishedAt | timestamp | |
| pausedAt | timestamp | |
| dnfAt | timestamp | |
| updatedAt | timestamp | |

---

## Key Functions to Migrate (BookContext.jsx)

### Read Operations
- `loadBooks()` - Line 83-152
- `getBookSessions()` - Line 783-799
- `getUserSessions()` - Line 801-820
- `getBookNotes()` - Line 934-952
- `getReadingGoalDB()` - Line 998-1020

### Write Operations
- `addBook()` - Line 165-233
- `updateBook()` - Line 239-299
- `deleteBook()` - Line 301-306
- `bulkDeleteBooks()` - Line 308-313
- `createReadingSession()` - Line 758-781
- `addBookNote()` - Line 825-878
- `updateBookNote()` - Line 880-901
- `deleteBookNote()` - Line 903-932
- `setReadingGoalDB()` - Line 958-996

---

## Firestore Query Patterns

### Read All Books
```javascript
import { collection, getDocs, query, orderBy } from 'firebase/firestore';

const booksRef = collection(db, 'users', user.uid, 'books');
const q = query(booksRef, orderBy('updatedAt', 'desc'));
const snapshot = await getDocs(q);
const books = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
```

### Add Book
```javascript
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

const docRef = await addDoc(collection(db, 'users', user.uid, 'books'), {
  ...bookData,
  updatedAt: serverTimestamp()
});
```

### Update Book
```javascript
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';

await updateDoc(doc(db, 'users', user.uid, 'books', bookId), {
  ...updates,
  updatedAt: serverTimestamp()
});
```

### Delete Book
```javascript
import { doc, deleteDoc } from 'firebase/firestore';

await deleteDoc(doc(db, 'users', user.uid, 'books', bookId));
```

---

## Firebase Auth Patterns

### Email/Password Sign In
```javascript
import { signInWithEmailAndPassword } from 'firebase/auth';

const userCredential = await signInWithEmailAndPassword(auth, email, password);
const user = userCredential.user;
```

### Google Sign In
```javascript
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';

const provider = new GoogleAuthProvider();
const result = await signInWithPopup(auth, provider);
const user = result.user;
```

### Auth State Listener
```javascript
import { onAuthStateChanged } from 'firebase/auth';

useEffect(() => {
  const unsubscribe = onAuthStateChanged(auth, (user) => {
    setUser(user);
    setLoading(false);
  });
  return () => unsubscribe();
}, []);
```

---

## Execution Phases

### Phase 1: Setup (Day 1)
1. Create Firebase project in console
2. Enable Authentication (Email/Password + Google)
3. Create Firestore database
4. Install Firebase SDK
5. Create `firebaseClient.js`
6. Update `.env`

### Phase 2: Auth Migration (Day 2-3)
1. Rewrite `AuthContext.jsx`
2. Add Google Sign-In to Login/Signup pages
3. Test auth flow

### Phase 3: Database Migration (Day 4-8)
1. Rewrite `BookContext.jsx` (largest task)
2. Rewrite `syncUtils.js`
3. Test all CRUD operations

### Phase 4: Data Migration (Day 9)
1. Export existing user data from Supabase
2. Import to Firestore
3. Verify data integrity

### Phase 5: Deployment (Day 10)
1. Configure Firebase Hosting
2. Build and deploy
3. Test production site
4. Remove Netlify

---

## Testing Checklist

- [ ] Sign up with email
- [ ] Sign in with email
- [ ] Sign in with Google
- [ ] Sign out
- [ ] Add book
- [ ] Update book (all fields)
- [ ] Delete book
- [ ] Add note to book
- [ ] Delete note
- [ ] Start/stop reading timer
- [ ] Set reading goals
- [ ] Export data
- [ ] Import data
- [ ] Offline mode (localStorage fallback)
- [ ] PWA install prompt
- [ ] Service worker caching

---

## Important Notes

1. **Preserve localStorage fallback** - App should work offline
2. **Preserve PWA functionality** - Service worker, install prompt
3. **Preserve i18n** - Spanish/English translations
4. **Column naming** - Supabase uses snake_case, Firestore can use camelCase
5. **Real-time updates** - Firestore supports `onSnapshot()` for real-time, but not required initially

---

## Resources

- [Firebase Documentation](https://firebase.google.com/docs)
- [Firestore Query Guide](https://firebase.google.com/docs/firestore/query-data/get-data)
- [Firebase Auth Guide](https://firebase.google.com/docs/auth/web/start)
- See `implementation_plan.md` for detailed code examples

