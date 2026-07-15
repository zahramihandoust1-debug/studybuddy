import React, { useState } from 'react';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '../firebase/config';
import InviteMembers from './InviteMembers';

interface AddMemberProps {
  studyPlanId: string;
  studyPlanTitle: string;
  inviterId: string;
  inviterName: string;
  inviterEmail: string;
  currentParticipants: string[];
  onClose: () => void;
}

const AddMember: React.FC<AddMemberProps> = ({ 
  studyPlanId,
  studyPlanTitle,
  inviterId,
  inviterName,
  inviterEmail,
  currentParticipants, 
  onClose 
}) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [addMode, setAddMode] = useState<'email' | 'invite'>('email');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);

    if (!email.trim()) {
      setError('Please enter an email address');
      setLoading(false);
      return;
    }

    try {
      // For now, we'll add the email as a placeholder
      // In a real app, you'd look up the user by email and get their UID
      const memberEmail = email.trim().toLowerCase();
      
      // Check if user is already a member
      if (currentParticipants.includes(memberEmail)) {
        setError('This user is already a member of the study plan');
        setLoading(false);
        return;
      }

      // Add member to the study plan
      const studyPlanRef = doc(db, 'studyPlans', studyPlanId);
      await updateDoc(studyPlanRef, {
        participants: arrayUnion(memberEmail),
        updatedAt: new Date(),
      });

      setSuccess(true);
      setEmail('');
      
      // Close modal after 2 seconds
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
        <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-auto">
          {/* Header */}
          <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-t-2xl px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="bg-white bg-opacity-20 p-2 rounded-lg">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Add Member</h3>
                  <p className="text-indigo-100 text-sm">Invite friends to your study plan</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="text-white hover:text-indigo-200 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            {/* Mode Selection */}
            <div className="flex bg-gray-100 rounded-lg p-1 mb-6">
              <button
                onClick={() => setAddMode('email')}
                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
                  addMode === 'email'
                    ? 'bg-white text-indigo-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                📧 Add Directly
              </button>
              <button
                onClick={() => setAddMode('invite')}
                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
                  addMode === 'invite'
                    ? 'bg-white text-indigo-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                🔗 Invite with Link
              </button>
            </div>

            {addMode === 'email' ? (
              success ? (
                <div className="text-center py-8">
                  <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-4">
                    <svg className="h-8 w-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Member Added! 🎉</h3>
                  <p className="text-gray-600 mb-6">New member has been successfully added to the study plan</p>
                  <div className="flex space-x-3">
                    <button
                      onClick={() => {
                        setSuccess(false);
                        setEmail('');
                      }}
                      className="flex-1 bg-indigo-600 text-white py-2 px-4 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
                    >
                      Add New Member
                    </button>
                    <button
                      onClick={onClose}
                      className="flex-1 bg-gray-200 text-gray-800 py-2 px-4 rounded-lg text-sm font-medium hover:bg-gray-300 transition-colors"
                    >
                      Close
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                      📧 New Member Email
                    </label>
                    <input
                      type="email"
                      name="email"
                      id="email"
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                      placeholder="friend@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                    <p className="mt-2 text-xs text-gray-500">
                      Email of the person you want to add to the study plan
                    </p>
                  </div>

                  {error && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <div className="flex items-center space-x-2">
                        <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <div className="text-sm text-red-700">{error}</div>
                      </div>
                    </div>
                  )}

                  <div className="flex space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={onClose}
                      className="flex-1 bg-gray-200 text-gray-800 py-3 px-4 rounded-lg text-sm font-medium hover:bg-gray-300 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex-1 bg-indigo-600 text-white py-3 px-4 rounded-lg text-sm font-medium hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 transition-colors"
                    >
                      {loading ? 'Adding...' : 'Add Member'}
                    </button>
                  </div>
                </form>
              )
            ) : (
              <div className="text-center py-8">
                <div className="bg-indigo-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                </div>
                <h4 className="text-lg font-semibold text-gray-900 mb-2">Invite with Link</h4>
                <p className="text-gray-600 text-sm mb-6">
                  Create an invitation link and share it with your friends. This method is easier and faster.
                </p>
                <button
                  onClick={() => setShowInviteModal(true)}
                  className="w-full bg-indigo-600 text-white py-3 px-4 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
                >
                  Create Invitation Link
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <InviteMembers
          studyPlanId={studyPlanId}
          studyPlanTitle={studyPlanTitle}
          inviterId={inviterId}
          inviterName={inviterName}
          inviterEmail={inviterEmail}
          onClose={() => setShowInviteModal(false)}
          initialMode="link"
        />
      )}
    </>
  );
};

export default AddMember;
