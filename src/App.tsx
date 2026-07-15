import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './firebase/config';
import { User } from './types';
import AuthWrapper from './components/Auth/AuthWrapper';
import Dashboard from './components/Dashboard/Dashboard';
import StudyPlanDetail from './components/StudyPlan/StudyPlanDetail';
import RedeemInvitation from './components/RedeemInvitation';
import { useParams } from 'react-router-dom';

const RedeemInvitationWrapper = () => {
  const { id } = useParams<{ id: string }>();
  return <RedeemInvitation invitationId={id!} />;
};

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        const userData: User = {
          uid: firebaseUser.uid,
          email: firebaseUser.email!,
          displayName: firebaseUser.displayName || '',
          photoURL: firebaseUser.photoURL || undefined,
          createdAt: new Date(),
        };
        setUser(userData);
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <div className="App">
        <Routes>
          <Route
            path="/"
            element={
              user ? <Dashboard /> : <AuthWrapper />
            }
          />
          <Route
            path="/study-plan/:id"
            element={
              user ? <StudyPlanDetail /> : <Navigate to="/" replace />
            }
          />
          <Route
            path="/invite/:id"
            element={<RedeemInvitationWrapper />}
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
