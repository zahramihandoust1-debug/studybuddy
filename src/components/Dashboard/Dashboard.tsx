import React, { useState, useEffect } from 'react';
import { User, StudyPlan } from '../../types';
import { auth, db } from '../../firebase/config';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import StudyPlanList from './StudyPlanList';
import CreateStudyPlan from './CreateStudyPlan';
import UserProfile from './UserProfile';
import ProgressOverview from './ProgressOverview';
import NotificationBell from '../Notifications/NotificationBell';
import NotificationSettings from '../Notifications/NotificationSettings';
import { initializeNotifications, onForegroundMessage } from '../../services/notificationService';

const Dashboard: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [studyPlans, setStudyPlans] = useState<StudyPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'plans' | 'create' | 'profile'>('plans');
  const [showNotificationSettings, setShowNotificationSettings] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // User is signed in
        const userData: User = {
          uid: firebaseUser.uid,
          email: firebaseUser.email!,
          displayName: firebaseUser.displayName || '',
          photoURL: firebaseUser.photoURL || undefined,
          createdAt: new Date(),
        };
        setUser(userData);
        setLoading(false);
        
        // Initialize notifications for the user
        initializeNotifications().then((success) => {
          if (success) {
            console.log('Notifications initialized successfully');
          } else {
            console.log('Failed to initialize notifications');
          }
        });
      } else {
        // User is signed out
        setUser(null);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (user) {
      // Listen to user's study plans
      const q = query(
        collection(db, 'studyPlans'),
        where('participants', 'array-contains', user.uid)
      );

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const plans: StudyPlan[] = [];
        snapshot.forEach((doc) => {
          plans.push({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt.toDate(),
            updatedAt: doc.data().updatedAt.toDate(),
            dueDate: doc.data().dueDate.toDate(),
          } as StudyPlan);
        });
        // Sort by creation date (newest first)
        plans.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        setStudyPlans(plans);
      });

      return () => unsubscribe();
    }
  }, [user]);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!user) {
    return null; // This should not happen as AuthWrapper handles this
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-indigo-50 overflow-x-hidden w-full max-w-full">
      {/* Header */}
      <header className="bg-white shadow-lg border-b border-gray-200 w-full max-w-full overflow-x-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full max-w-full">
          <div className="flex justify-between items-center py-4 sm:py-6 w-full max-w-full">
            <div className="flex items-center space-x-2 sm:space-x-3 min-w-0 flex-1">
              <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-1.5 sm:p-2 rounded-xl flex-shrink-0">
                <svg className="w-6 h-6 sm:w-8 sm:h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="text-xl sm:text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent truncate">
                  StudyBuddy
                </h1>
                <p className="text-xs sm:text-sm text-gray-500 hidden sm:block truncate">Smart Study Planning Platform</p>
              </div>
            </div>
            <div className="flex items-center space-x-1 sm:space-x-4 min-w-0 flex-shrink-0 mobile-header">
              <NotificationBell userId={user.uid} />
              <button
                onClick={() => setShowNotificationSettings(true)}
                className="p-1.5 sm:p-2 text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 rounded-full flex-shrink-0"
                aria-label="Notification Settings"
              >
                <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
              
              {/* Desktop User Info */}
              <div className="hidden sm:flex items-center space-x-3 bg-gray-50 px-3 py-2 rounded-full min-w-0 max-w-xs">
                <img
                  className="h-8 w-8 rounded-full ring-2 ring-indigo-200 flex-shrink-0"
                  src={user.photoURL || '/default-avatar.png'}
                  alt=""
                />
                <div className="text-right min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900 truncate" title={user.displayName}>
                    {user.displayName}
                  </p>
                  <p className="text-xs text-gray-500 truncate" title={user.email}>{user.email}</p>
                </div>
              </div>
              
              {/* Mobile User Info - Compact */}
              <div className="sm:hidden flex items-center space-x-2 min-w-0 mobile-user-info">
                <img
                  className="h-7 w-7 rounded-full ring-2 ring-indigo-200 flex-shrink-0"
                  src={user.photoURL || '/default-avatar.png'}
                  alt=""
                />
                <div className="min-w-0 flex-1">
                  <p className="mobile-user-name text-gray-900" title={user.displayName}>
                    {user.displayName}
                  </p>
                </div>
              </div>
              
              <button
                onClick={handleSignOut}
                className="bg-red-500 hover:bg-red-600 text-white px-2 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors flex items-center space-x-1 sm:space-x-2 flex-shrink-0"
              >
                <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white border-b border-gray-200 shadow-sm w-full max-w-full overflow-x-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full max-w-full">
          <div className="flex space-x-1 overflow-x-auto w-full max-w-full mobile-nav">
            <button
              onClick={() => setActiveTab('plans')}
              className={`py-3 sm:py-4 px-3 sm:px-6 font-medium text-xs sm:text-sm rounded-t-lg transition-all flex items-center space-x-1 sm:space-x-2 whitespace-nowrap min-w-0 flex-shrink-0 ${
                activeTab === 'plans'
                  ? 'bg-indigo-50 text-indigo-600 border-b-2 border-indigo-500'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span className="hidden sm:inline truncate">Study Plans</span>
              <span className="sm:hidden truncate">Plans</span>
            </button>
            <button
              onClick={() => setActiveTab('create')}
              className={`py-3 sm:py-4 px-3 sm:px-6 font-medium text-xs sm:text-sm rounded-t-lg transition-all flex items-center space-x-1 sm:space-x-2 whitespace-nowrap min-w-0 flex-shrink-0 ${
                activeTab === 'create'
                  ? 'bg-indigo-50 text-indigo-600 border-b-2 border-indigo-500'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              <span className="hidden sm:inline truncate">Create New Plan</span>
              <span className="sm:hidden truncate">Create</span>
            </button>
            <button
              onClick={() => setActiveTab('profile')}
              className={`py-3 sm:py-4 px-3 sm:px-6 font-medium text-xs sm:text-sm rounded-t-lg transition-all flex items-center space-x-1 sm:space-x-2 whitespace-nowrap min-w-0 flex-shrink-0 ${
                activeTab === 'profile'
                  ? 'bg-indigo-50 text-indigo-600 border-b-2 border-indigo-500'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <span className="truncate">Profile</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-4 sm:py-6 px-4 sm:px-6 lg:px-8 w-full max-w-full overflow-x-hidden">
        <div className="py-4 sm:py-6 w-full max-w-full">
          {activeTab === 'plans' && (
            <div className="space-y-4 sm:space-y-6">
              <ProgressOverview studyPlans={studyPlans} />
              <div className="w-full">
                <StudyPlanList studyPlans={studyPlans} />
              </div>
            </div>
          )}
          {activeTab === 'create' && <CreateStudyPlan user={user} />}
          {activeTab === 'profile' && <UserProfile user={user} />}
        </div>
      </main>

      {/* Notification Settings Modal */}
      {showNotificationSettings && (
        <NotificationSettings
          userId={user.uid}
          onClose={() => setShowNotificationSettings(false)}
        />
      )}
    </div>
  );
};

export default Dashboard;
