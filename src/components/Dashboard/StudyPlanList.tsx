import React from 'react';
import { StudyPlan } from '../../types';
import StudyPlanCard from './StudyPlanCard';

interface StudyPlanListProps {
  studyPlans: StudyPlan[];
}

const StudyPlanList: React.FC<StudyPlanListProps> = ({ studyPlans }) => {
  if (studyPlans.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="mx-auto h-12 w-12 text-gray-400">
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
        </div>
        <h3 className="mt-2 text-sm font-medium text-gray-900">No study plans found</h3>
        <p className="mt-1 text-sm text-gray-500">
          Get started by creating a new study plan.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-8 w-full">
      <h2 className="text-lg font-medium text-gray-900 mb-4">Your Study Plans</h2>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 w-full">
        {studyPlans.map((plan) => (
          <StudyPlanCard key={plan.id} studyPlan={plan} />
        ))}
      </div>
    </div>
  );
};

export default StudyPlanList;
