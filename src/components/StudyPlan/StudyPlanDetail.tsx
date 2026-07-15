import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, onSnapshot, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { db, auth } from '../../firebase/config';
import { StudyPlan, Task, User } from '../../types';
import TaskList from './TaskList';
import NoteList from './NoteList';
import AddTask from './AddTask';
import AddNote from './AddNote';
import AddMember from '../AddMember';

const StudyPlanDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [studyPlan, setStudyPlan] = useState<StudyPlan | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'tasks' | 'notes' | 'members'>('tasks');
  const [showAddTask, setShowAddTask] = useState(false);
  const [showAddNote, setShowAddNote] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [members, setMembers] = useState<User[]>([]);
  const [localProgress, setLocalProgress] = useState<number | null>(null);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
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
    });

    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!id) return;

    const unsubscribe = onSnapshot(doc(db, 'studyPlans', id), (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        setStudyPlan({
          id: doc.id,
          ...data,
          createdAt: data.createdAt.toDate(),
          updatedAt: data.updatedAt.toDate(),
          dueDate: data.dueDate.toDate(),
        } as StudyPlan);
      } else {
        navigate('/');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [id, navigate]);

  // Fetch member details when studyPlan changes
  useEffect(() => {
    if (studyPlan && studyPlan.participants.length > 0) {
      const fetchMembers = async () => {
        try {
          const memberPromises = studyPlan.participants.map(async (participantId) => {
            // Check if it's an email (for new members) or UID
            if (participantId.includes('@')) {
              return {
                uid: participantId,
                email: participantId,
                displayName: participantId.split('@')[0],
                photoURL: undefined,
                createdAt: new Date(),
              } as User;
            }
            
            // If it's a UID, fetch user details
            const userDoc = await getDocs(query(collection(db, 'users'), where('uid', '==', participantId)));
            if (!userDoc.empty) {
              const userData = userDoc.docs[0].data();
              return {
                uid: participantId,
                email: userData.email,
                displayName: userData.displayName || userData.email?.split('@')[0] || 'Unknown User',
                photoURL: userData.photoURL,
                major: userData.major,
                createdAt: userData.createdAt?.toDate() || new Date(),
              } as User;
            } else {
              // Fallback if user not found in Firestore
              return {
                uid: participantId,
                email: 'unknown@example.com',
                displayName: 'Unknown User',
                photoURL: undefined,
                createdAt: new Date(),
              } as User;
            }
          });
          
          const memberData = await Promise.all(memberPromises);
          setMembers(memberData);
        } catch (error) {
          console.error('Error fetching members:', error);
        }
      };
      
      fetchMembers();
    }
  }, [studyPlan]);

  // Reset local progress when studyPlan updates from server
  useEffect(() => {
    if (studyPlan) {
      setLocalProgress(null);
    }
  }, [studyPlan?.updatedAt]);

  const handleTaskToggle = async (taskId: string, completed: boolean) => {
    if (!studyPlan) return;

    console.log('🔄 Toggling task:', taskId, 'to completed:', completed);

    // Find the task and update it
    const updatedTasks = studyPlan.tasks.map(task => {
      if (task.id === taskId) {
        return {
          ...task,
          completed,
          completedAt: completed ? new Date() : undefined
        };
      }
      return task;
    });

    // Calculate progress
    const completedTasks = updatedTasks.filter(task => task.completed).length;
    const progress = updatedTasks.length > 0 ? (completedTasks / updatedTasks.length) * 100 : 0;

    console.log('📊 Updated progress:', progress + '%');
    console.log('📊 Completed tasks:', completedTasks, 'Total tasks:', updatedTasks.length);

    // Update local progress immediately for instant UI feedback
    setLocalProgress(progress);

    // Update Firestore directly - let the listener handle the UI update
    try {
      await updateDoc(doc(db, 'studyPlans', studyPlan.id), {
        tasks: updatedTasks,
        progress,
        updatedAt: new Date(),
      });
      console.log('✅ Firestore updated successfully');
    } catch (error) {
      console.error('❌ Error updating task:', error);
      // Revert local progress on error
      setLocalProgress(null);
    }
  };

  const handleAddTask = async (taskData: Omit<Task, 'id' | 'createdAt'>) => {
    if (!studyPlan) return;

    const newTask: Task = {
      ...taskData,
      id: Date.now().toString(),
      createdAt: new Date(),
    };

    const updatedTasks = [...studyPlan.tasks, newTask];
    const completedTasks = updatedTasks.filter(task => task.completed).length;
    const progress = updatedTasks.length > 0 ? (completedTasks / updatedTasks.length) * 100 : 0;

    await updateDoc(doc(db, 'studyPlans', studyPlan.id), {
      tasks: updatedTasks,
      progress,
      updatedAt: new Date(),
    });

    setShowAddTask(false);
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!studyPlan) return;

    const updatedTasks = studyPlan.tasks.filter(task => task.id !== taskId);
    const completedTasks = updatedTasks.filter(task => task.completed).length;
    const progress = updatedTasks.length > 0 ? (completedTasks / updatedTasks.length) * 100 : 0;

    await updateDoc(doc(db, 'studyPlans', studyPlan.id), {
      tasks: updatedTasks,
      progress,
      updatedAt: new Date(),
    });
  };


  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!studyPlan) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900">Plan not found</h2>
          <button
            onClick={() => navigate('/')}
            className="mt-4 bg-indigo-600 text-white px-4 py-2 rounded-md"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <button
                onClick={() => navigate('/')}
                className="mr-4 text-gray-500 hover:text-gray-700"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div className="min-w-0 flex-1">
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 truncate" title={studyPlan.title}>{studyPlan.title}</h1>
                <p className="text-gray-600 truncate" title={studyPlan.subject}>{studyPlan.subject}</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              {studyPlan.isGroup && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  Group
                </span>
              )}
              <span className="text-sm text-gray-500">
                {studyPlan.participants.length} members
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Progress Bar */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Progress</span>
            <span className="text-sm font-medium text-gray-700">
              {Math.round(localProgress !== null ? localProgress : studyPlan.progress)}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${localProgress !== null ? localProgress : studyPlan.progress}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Description */}
      {studyPlan.description && (
        <div className="bg-white border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <p className="text-gray-700 break-words" title={studyPlan.description}>{studyPlan.description}</p>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            <button
              onClick={() => setActiveTab('tasks')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'tasks'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Tasks
            </button>
            <button
              onClick={() => setActiveTab('notes')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'notes'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Notes
            </button>
            <button
              onClick={() => setActiveTab('members')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'members'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Members
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {activeTab === 'tasks' && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-medium text-gray-900">Tasks</h2>
                <button
                  onClick={() => setShowAddTask(true)}
                  className="bg-indigo-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-indigo-700"
                >
                  Add Task
                </button>
              </div>
              <TaskList
                tasks={studyPlan.tasks}
                onTaskToggle={handleTaskToggle}
                onDeleteTask={handleDeleteTask}
              />
            </div>
          )}

          {activeTab === 'notes' && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-medium text-gray-900">Notes</h2>
                <button
                  onClick={() => setShowAddNote(true)}
                  className="bg-indigo-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-indigo-700"
                >
                  Add Note
                </button>
              </div>
              <NoteList studyPlanId={studyPlan.id} />
            </div>
          )}

          {activeTab === 'members' && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-medium text-gray-900">Group Members</h2>
                {studyPlan.isGroup && (
                  <button
                    onClick={() => setShowAddMember(true)}
                    className="bg-indigo-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-indigo-700"
                  >
                    Add Member
                  </button>
                )}
              </div>
              <div className="bg-white shadow rounded-lg p-6">
                <div className="space-y-3">
                  {members.length > 0 ? (
                    members.map((member, index) => (
                      <div key={member.uid} className="flex items-center space-x-3">
                        <div className="flex-shrink-0">
                          {member.photoURL ? (
                            <img
                              className="h-8 w-8 rounded-full object-cover"
                              src={member.photoURL}
                              alt=""
                            />
                          ) : (
                            <div className="h-8 w-8 rounded-full bg-gray-300 flex items-center justify-center">
                              <span className="text-sm font-medium text-gray-700">
                                {member.displayName.charAt(0).toUpperCase()}
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate" title={member.displayName}>
                            {member.displayName}
                          </p>
                          <p className="text-sm text-gray-500 truncate" title={member.email}>{member.email}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-4">
                      <p className="text-gray-500">Loading members...</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Modals */}
      {showAddTask && (
        <AddTask
          onClose={() => setShowAddTask(false)}
          onAddTask={handleAddTask}
        />
      )}

      {showAddNote && (
        <AddNote
          onClose={() => setShowAddNote(false)}
          studyPlanId={studyPlan.id}
        />
      )}

      {showAddMember && studyPlan && (
        <AddMember
          studyPlanId={studyPlan.id}
          studyPlanTitle={studyPlan.title}
          inviterId={studyPlan.ownerId}
          inviterName={user?.displayName || 'کاربر'}
          inviterEmail={user?.email || ''}
          currentParticipants={studyPlan.participants}
          onClose={() => setShowAddMember(false)}
        />
      )}
    </div>
  );
};

export default StudyPlanDetail;
