# Firebase Migration Task

## Phase 1: Setup
- [x] Create Firebase project in console (existing: bookea-reads)
- [x] Enable Email/Password authentication (to verify in console)
- [x] Enable Google Sign-In authentication (to verify in console)
- [x] Create Firestore database (to verify in console)
- [x] Install Firebase SDK (`npm install firebase`)
- [x] Create `src/lib/firebaseClient.js`
- [x] Update `.env` with Firebase config
- [ ] Delete `src/lib/supabaseClient.js` (keeping for parallel testing)

## Phase 2: Auth Migration
- [x] Rewrite `src/context/AuthContext.jsx` for Firebase
- [x] Add Google Sign-In button to `Login.jsx`
- [x] Add Google Sign-In button to `Signup.jsx`
- [ ] Test: Email sign up
- [ ] Test: Email sign in
- [ ] Test: Google sign in
- [ ] Test: Sign out

## Phase 3: Database Migration
- [x] Rewrite `loadBooks()` function
- [x] Rewrite `addBook()` function
- [x] Rewrite `updateBook()` function
- [x] Rewrite `deleteBook()` / `bulkDeleteBooks()` functions
- [x] Rewrite `createReadingSession()` function
- [x] Rewrite `getBookSessions()` / `getUserSessions()` functions
- [x] Rewrite `addBookNote()` / `updateBookNote()` / `deleteBookNote()` functions
- [x] Rewrite `getBookNotes()` function
- [x] Rewrite `setReadingGoalDB()` / `getReadingGoalDB()` functions
- [x] Update `src/utils/syncUtils.js`
- [ ] Test all CRUD operations

## Phase 4: Data Migration
- [ ] Export existing data from Supabase
- [ ] Create Firestore import script
- [ ] Import data to Firestore
- [ ] Verify data integrity

## Phase 5: Deployment
- [ ] Create `firebase.json` config
- [ ] Create `firestore.rules`
- [ ] Run `npm run build`
- [ ] Deploy with `firebase deploy`
- [ ] Test production site
- [ ] Verify PWA functionality

## Phase 6: Cleanup
- [ ] Delete `netlify.toml`
- [ ] Delete `supabase_schema_migration.sql`
- [ ] Remove Netlify site from dashboard
- [ ] Update `package.json` (remove Supabase dep)
- [ ] Update README.md

## Deliverables
- [x] Implementation plan
- [x] Agent handoff document
- [ ] Firebase migration complete
- [ ] Walkthrough document

