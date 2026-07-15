import React from 'react';
import { Task } from '../../types';

interface TaskListProps {
  tasks: Task[];
  onTaskToggle: (taskId: string, completed: boolean) => void;
  onDeleteTask: (taskId: string) => void;
}

const TaskList: React.FC<TaskListProps> = ({ tasks, onTaskToggle, onDeleteTask }) => {
  const handleCheckboxChange = (taskId: string, checked: boolean) => {
    console.log('🎯 Checkbox clicked:', taskId, 'checked:', checked);
    onTaskToggle(taskId, checked);
  };

  if (tasks.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="mx-auto h-12 w-12 text-gray-400">
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
            />
          </svg>
        </div>
        <h3 className="mt-2 text-sm font-medium text-gray-900">No tasks found</h3>
        <p className="mt-1 text-sm text-gray-500">
          Get started by adding a new task.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {tasks.map((task) => (
        <div
          key={task.id}
          className={`bg-white shadow rounded-lg p-4 border-l-4 ${
            task.completed ? 'border-green-400 bg-green-50' : 'border-gray-200'
          }`}
        >
          <div className="flex items-start">
            <div className="flex-shrink-0 mr-4">
              <input
                type="checkbox"
                checked={task.completed}
                onChange={(e) => handleCheckboxChange(task.id, e.target.checked)}
                className="h-5 w-5 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded cursor-pointer"
              />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className={`text-sm font-medium ${
                task.completed ? 'text-gray-500 line-through' : 'text-gray-900'
              }`}>
                {task.title}
              </h3>
              {task.description && (
                <p className={`mt-1 text-sm ${
                  task.completed ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  {task.description}
                </p>
              )}
              <div className="mt-2 flex items-center text-xs text-gray-500">
                <span>
                  Created: {new Intl.DateTimeFormat('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  }).format(task.createdAt)}
                </span>
                {task.completed && task.completedAt && (
                  <span className="mr-4">
                    Completed: {new Intl.DateTimeFormat('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    }).format(task.completedAt)}
                  </span>
                )}
              </div>
            </div>
            <div className="flex-shrink-0">
              <button
                onClick={() => onDeleteTask(task.id)}
                className="text-red-400 hover:text-red-600 p-1"
                title="Delete Task"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default TaskList;
