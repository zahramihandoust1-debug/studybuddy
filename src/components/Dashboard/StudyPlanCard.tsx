import React from 'react';
import { StudyPlan } from '../../types';
import { useNavigate } from 'react-router-dom';

interface StudyPlanCardProps {
  studyPlan: StudyPlan;
}

const StudyPlanCard: React.FC<StudyPlanCardProps> = ({ studyPlan }) => {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate(`/study-plan/${studyPlan.id}`);
  };

  const completedTasks = studyPlan.tasks.filter(task => task.completed).length;
  const totalTasks = studyPlan.tasks.length;
  const progressPercentage = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(date);
  };

  return (
    <div
      onClick={handleClick}
      className="bg-white overflow-hidden shadow rounded-lg hover:shadow-lg transition-shadow cursor-pointer w-full mobile-card"
    >
      <div className="px-4 py-5 sm:p-6">
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-medium text-gray-900 truncate" title={studyPlan.title}>
              {studyPlan.title}
            </h3>
            <p className="text-sm text-gray-500 mt-1 truncate" title={studyPlan.subject}>
              {studyPlan.subject}
            </p>
          </div>
          {studyPlan.isGroup && (
            <div className="flex-shrink-0">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                Group
              </span>
            </div>
          )}
        </div>

        <div className="mt-4">
          <p className="text-sm text-gray-600 line-clamp-2" title={studyPlan.description}>
            {studyPlan.description}
          </p>
        </div>

        <div className="mt-4">
          <div className="flex items-center justify-between text-sm text-gray-500">
            <span>Due: {formatDate(studyPlan.dueDate)}</span>
            <span>{completedTasks}/{totalTasks} tasks</span>
          </div>
          
          <div className="mt-2">
            <div className="flex items-center">
              <div className="flex-1 bg-gray-200 rounded-full h-2">
                <div
                  className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progressPercentage}%` }}
                ></div>
              </div>
              <span className="ml-2 text-sm font-medium text-gray-700">
                {Math.round(progressPercentage)}%
              </span>
            </div>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between">
            <div className="flex items-center text-sm text-gray-500">
              <svg className="flex-shrink-0 mr-1.5 h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
              </svg>
              {studyPlan.participants.length} members
            </div>
          <div className="text-sm text-gray-500">
            {formatDate(studyPlan.createdAt)}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudyPlanCard;
