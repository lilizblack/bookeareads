import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { BookProvider } from './context/BookContext';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';
import Layout from './components/Layout';

// Pages
import Dashboard from './pages/Dashboard';
import Library from './pages/Library';
import BookDetails from './pages/BookDetails';
import AddBook from './pages/AddBook';
import Calendar from './pages/Calendar';
import Settings from './pages/Settings';
import AnnualReport from './pages/AnnualReport';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Favorites from './pages/Favorites';
import Notes from './pages/Notes';
import InstallPrompt from './components/InstallPrompt';

function App() {
    return (
        <ThemeProvider>
            <AuthProvider>
                <BookProvider>
                    <Router>
                        <Routes>
                            <Route path="/login" element={<Login />} />
                            <Route path="/signup" element={<Signup />} />
                            <Route path="/" element={<Layout />}>
                                <Route index element={<Dashboard />} />
                                <Route path="library" element={<Library />} />
                                <Route path="calendar" element={<Calendar />} />
                                <Route path="add" element={<AddBook />} />
                                <Route path="book/:id" element={<BookDetails />} />
                                <Route path="settings" element={<Settings />} />
                                <Route path="annual" element={<AnnualReport />} />
                                <Route path="favorites" element={<Favorites />} />
                                <Route path="book/:id/notes" element={<Notes />} />
                            </Route>
                        </Routes>
                    </Router>
                </BookProvider>
            </AuthProvider>
            <InstallPrompt />
        </ThemeProvider>
    );
}

export default App;
