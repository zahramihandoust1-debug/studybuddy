import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '../firebase/config';
import { Invitation, StudyPlan, User } from '../types';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '../firebase/config';

interface RedeemInvitationProps {
  invitationId: string;
}

const RedeemInvitation: React.FC<RedeemInvitationProps> = ({ invitationId }) => {
  const [user, loading, error] = useAuthState(auth);
  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [studyPlan, setStudyPlan] = useState<StudyPlan | null>(null);
  const [loadingInvitation, setLoadingInvitation] = useState(true);
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState('');
  const [joinSuccess, setJoinSuccess] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchInvitation = async () => {
      try {
        const invitationDoc = await getDoc(doc(db, 'invitations', invitationId));
        if (invitationDoc.exists()) {
          const invitationData = {
            id: invitationDoc.id,
            ...invitationDoc.data(),
            createdAt: invitationDoc.data().createdAt.toDate(),
            expiresAt: invitationDoc.data().expiresAt.toDate(),
            usedAt: invitationDoc.data().usedAt?.toDate(),
          } as Invitation;
          
          setInvitation(invitationData);

          // Fetch study plan details
          const studyPlanDoc = await getDoc(doc(db, 'studyPlans', invitationData.studyPlanId));
          if (studyPlanDoc.exists()) {
            const studyPlanData = {
              id: studyPlanDoc.id,
              ...studyPlanDoc.data(),
              createdAt: studyPlanDoc.data().createdAt.toDate(),
              updatedAt: studyPlanDoc.data().updatedAt.toDate(),
              dueDate: studyPlanDoc.data().dueDate.toDate(),
            } as StudyPlan;
            setStudyPlan(studyPlanData);
          }
        }
      } catch (err) {
        console.error('Error fetching invitation:', err);
      } finally {
        setLoadingInvitation(false);
      }
    };

    fetchInvitation();
  }, [invitationId]);

  const handleJoinStudyPlan = async () => {
    if (!user || !invitation || !studyPlan) return;

    setJoining(true);
    setJoinError('');

    try {
      // Check if invitation is still valid
      if (invitation.used) {
        setJoinError('This invitation has already been used');
        setJoining(false);
        return;
      }

      if (new Date() > invitation.expiresAt) {
        setJoinError('This invitation has expired');
        setJoining(false);
        return;
      }

      // Check if user is already a member
      if (studyPlan.participants.includes(user.uid)) {
        setJoinError('You are already a member of this study plan');
        setJoining(false);
        return;
      }

      // Add user to study plan
      const studyPlanRef = doc(db, 'studyPlans', studyPlan.id);
      await updateDoc(studyPlanRef, {
        participants: arrayUnion(user.uid),
        updatedAt: new Date(),
      });

      // Mark invitation as used
      const invitationRef = doc(db, 'invitations', invitation.id);
      await updateDoc(invitationRef, {
        used: true,
        usedAt: new Date(),
        usedBy: user.uid,
      });

      setJoinSuccess(true);
      
      // Redirect to study plan after 2 seconds
      setTimeout(() => {
        navigate(`/study-plan/${studyPlan.id}`);
      }, 2000);
    } catch (err: any) {
      setJoinError(err.message);
    } finally {
      setJoining(false);
    }
  };

  if (loading || loadingInvitation) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="bg-red-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Authentication Error</h2>
          <p className="text-gray-600 mb-6">Please log in to your account first</p>
          <button
            onClick={() => navigate('/')}
            className="bg-indigo-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-indigo-700 transition-colors"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  if (!invitation || !studyPlan) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="bg-yellow-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Invitation Not Found</h2>
          <p className="text-gray-600 mb-6">This invitation link is invalid or has expired</p>
          <button
            onClick={() => navigate('/')}
            className="bg-indigo-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-indigo-700 transition-colors"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  if (joinSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="bg-green-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">🎉 Welcome!</h2>
          <p className="text-gray-600 mb-6">
            You have successfully joined the study plan <strong>{studyPlan.title}</strong>
          </p>
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <p className="text-sm text-gray-600">
              Redirecting to study plan...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 px-8 py-6">
          <div className="text-center">
            <div className="bg-white bg-opacity-20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Study Plan Invitation</h1>
            <p className="text-indigo-100">You have been invited to join a group study plan</p>
          </div>
        </div>

        {/* Content */}
        <div className="p-8">
          {/* Invitation Details */}
          <div className="bg-gray-50 rounded-xl p-6 mb-6">
            <div className="flex items-start space-x-4">
              <div className="bg-indigo-100 p-3 rounded-lg">
                <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{studyPlan.title}</h3>
                <p className="text-gray-600 text-sm mb-3">{studyPlan.description}</p>
                <div className="flex items-center space-x-4 text-sm text-gray-500">
                  <div className="flex items-center space-x-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                    <span>{studyPlan.subject}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span>{new Date(studyPlan.dueDate).toLocaleDateString('en-US')}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Inviter Info */}
          <div className="bg-blue-50 rounded-xl p-4 mb-6">
            <div className="flex items-center space-x-3">
              <div className="bg-blue-100 p-2 rounded-lg">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-blue-800 font-medium">Invited by:</p>
                <p className="text-blue-900 font-semibold">{invitation.inviterName}</p>
              </div>
            </div>
          </div>

          {/* Status Checks */}
          {invitation.used && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <div className="flex items-center space-x-2">
                <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="text-sm text-red-700">This invitation has already been used</div>
              </div>
            </div>
          )}

          {new Date() > invitation.expiresAt && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <div className="flex items-center space-x-2">
                <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="text-sm text-red-700">This invitation has expired</div>
              </div>
            </div>
          )}

          {studyPlan.participants.includes(user.uid) && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
              <div className="flex items-center space-x-2">
                <svg className="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <div className="text-sm text-yellow-700">You are already a member of this study plan</div>
              </div>
            </div>
          )}

          {joinError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <div className="flex items-center space-x-2">
                <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="text-sm text-red-700">{joinError}</div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex space-x-3">
            <button
              onClick={() => navigate('/')}
              className="flex-1 bg-gray-200 text-gray-800 py-3 px-4 rounded-lg text-sm font-medium hover:bg-gray-300 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleJoinStudyPlan}
              disabled={joining || invitation.used || new Date() > invitation.expiresAt || studyPlan.participants.includes(user.uid)}
              className="flex-1 bg-indigo-600 text-white py-3 px-4 rounded-lg text-sm font-medium hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {joining ? 'Joining...' : 'Join Plan'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RedeemInvitation;
