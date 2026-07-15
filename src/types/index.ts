export interface User {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  major?: string;
  createdAt: Date;
}

export interface StudyPlan {
  id: string;
  title: string;
  description: string;
  subject: string;
  dueDate: Date;
  createdAt: Date;
  updatedAt: Date;
  ownerId: string;
  isGroup: boolean;
  participants: string[];
  progress: number;
  tasks: Task[];
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  createdAt: Date;
  completedAt?: Date;
  assignedTo?: string;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  planId: string;
  uploadedBy: string;
  fileUrl?: string;
  fileName?: string;
  fileType?: string;
  createdAt: Date;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  earnedAt: Date;
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: 'reminder' | 'invitation' | 'update' | 'achievement';
  read: boolean;
  createdAt: Date;
  userId: string;
}

export interface Invitation {
  id: string;
  studyPlanId: string;
  studyPlanTitle: string;
  inviterId: string;
  inviterName: string;
  inviterEmail: string;
  inviteeEmail?: string;
  token: string;
  expiresAt: Date;
  used: boolean;
  usedAt?: Date;
  usedBy?: string;
  createdAt: Date;
}
