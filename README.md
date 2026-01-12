# BookTracker App

A premium, mobile-first book tracking application.

## Features
- **Dashboard**: Track current reads with a carousel and monthly calendar view.
- **Library Management**: Organize books by Status (Reading, Read, Owned, Wishlist).
- **Special Lists**: Favorites, Paused, Gave Up (DNF).
- **Detailed Tracking**:
  - Star Ratings (1-5)
  - **Spice Ratings** (1-5 Chili Peppers)
  - Written Reviews
  - Progress Tracking (%)
- **Wishlist**: Track books you want and mark which ones you already own.

## Getting Started

### Prerequisites
- Node.js installed on your machine.

### Installation

1.  Open this folder in your terminal.
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Start the development server:
    ```bash
    npm run dev
    ```
4.  Open the browser using the Local URL provided (usually `http://localhost:5173`).

## Tech Stack
-   **Vite**: Fast build tool.
-   **React**: UI Library.
-   **Tailwind-like CSS**: Custom `index.css` using modern CSS variables and utility classes for a premium feel without the build step overhead of Tailwind (or consistent with it if added later). *Note: The valid CSS classes are defined in `index.css` to mimic utility classes.*
-   **Local Storage**: Your data persists in your browser.
