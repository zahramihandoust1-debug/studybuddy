import { collection, addDoc, query, where, getDocs, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/config';
import { StudyPlan, Task } from '../types';

export interface Reminder {
  id: string;
  studyPlanId: string;
  studyPlanTitle: string;
  type: 'deadline' | 'task' | 'progress';
  message: string;
  scheduledFor: Date;
  isActive: boolean;
  createdAt: Date;
}

// Create a reminder for a study plan
export const createReminder = async (
  studyPlanId: string,
  studyPlanTitle: string,
  type: 'deadline' | 'task' | 'progress',
  message: string,
  scheduledFor: Date
): Promise<string> => {
  try {
    const reminderData = {
      studyPlanId,
      studyPlanTitle,
      type,
      message,
      scheduledFor,
      isActive: true,
      createdAt: new Date(),
    };

    const docRef = await addDoc(collection(db, 'reminders'), reminderData);
    console.log('Reminder created with ID:', docRef.id);
    return docRef.id;
  } catch (error) {
    console.error('Error creating reminder:', error);
    throw error;
  }
};

// Get reminders for a study plan
export const getRemindersForStudyPlan = async (studyPlanId: string): Promise<Reminder[]> => {
  try {
    const q = query(
      collection(db, 'reminders'),
      where('studyPlanId', '==', studyPlanId),
      orderBy('scheduledFor', 'asc')
    );

    const snapshot = await getDocs(q);
    const reminders: Reminder[] = [];
    
    snapshot.forEach((doc) => {
      reminders.push({
        id: doc.id,
        ...doc.data(),
        scheduledFor: doc.data().scheduledFor.toDate(),
        createdAt: doc.data().createdAt.toDate(),
      } as Reminder);
    });

    return reminders;
  } catch (error) {
    console.error('Error getting reminders:', error);
    return [];
  }
};

// Listen to reminders for a study plan
export const listenToReminders = (
  studyPlanId: string,
  callback: (reminders: Reminder[]) => void
) => {
  const q = query(
    collection(db, 'reminders'),
    where('studyPlanId', '==', studyPlanId),
    orderBy('scheduledFor', 'asc')
  );

  return onSnapshot(q, (snapshot) => {
    const reminders: Reminder[] = [];
    snapshot.forEach((doc) => {
      reminders.push({
        id: doc.id,
        ...doc.data(),
        scheduledFor: doc.data().scheduledFor.toDate(),
        createdAt: doc.data().createdAt.toDate(),
      } as Reminder);
    });
    callback(reminders);
  });
};

// Check if a study plan needs reminders
export const checkStudyPlanReminders = (studyPlan: StudyPlan): { needsDeadlineReminder: boolean; needsProgressReminder: boolean } => {
  const now = new Date();
  const dueDate = studyPlan.dueDate;
  const timeUntilDeadline = dueDate.getTime() - now.getTime();
  const daysUntilDeadline = Math.ceil(timeUntilDeadline / (1000 * 60 * 60 * 24));

  // Check if deadline reminder is needed (within 3 days)
  const needsDeadlineReminder = daysUntilDeadline <= 3 && daysUntilDeadline > 0;

  // Check if progress reminder is needed (less than 50% complete and more than 1 day old)
  const planAge = now.getTime() - studyPlan.createdAt.getTime();
  const daysSinceCreation = Math.floor(planAge / (1000 * 60 * 60 * 24));
  const needsProgressReminder = studyPlan.progress < 50 && daysSinceCreation >= 1;

  return {
    needsDeadlineReminder,
    needsProgressReminder,
  };
};

// Create automatic reminders for a study plan
export const createAutomaticReminders = async (studyPlan: StudyPlan): Promise<void> => {
  const { needsDeadlineReminder, needsProgressReminder } = checkStudyPlanReminders(studyPlan);

  try {
    const now = new Date();
    
    // Create deadline reminder if needed
    if (needsDeadlineReminder) {
      const dueDate = studyPlan.dueDate;
      const timeUntilDeadline = dueDate.getTime() - now.getTime();
      const daysUntilDeadline = Math.ceil(timeUntilDeadline / (1000 * 60 * 60 * 24));

      let reminderMessage = '';
      let scheduledFor = new Date();

      if (daysUntilDeadline === 1) {
        reminderMessage = `Study plan "${studyPlan.title}" is due tomorrow!`;
        scheduledFor = new Date(now.getTime() + 24 * 60 * 60 * 1000); // Tomorrow
      } else if (daysUntilDeadline === 2) {
        reminderMessage = `Study plan "${studyPlan.title}" is due in 2 days`;
        scheduledFor = new Date(now.getTime() + 24 * 60 * 60 * 1000); // Tomorrow
      } else if (daysUntilDeadline === 3) {
        reminderMessage = `Study plan "${studyPlan.title}" is due in 3 days`;
        scheduledFor = new Date(now.getTime() + 24 * 60 * 60 * 1000); // Tomorrow
      }

      if (reminderMessage) {
        await createReminder(
          studyPlan.id,
          studyPlan.title,
          'deadline',
          reminderMessage,
          scheduledFor
        );
      }
    }

    // Create progress reminder if needed
    if (needsProgressReminder) {
      const reminderMessage = `Study plan "${studyPlan.title}" is ${Math.round(studyPlan.progress)}% complete. Keep up the good work!`;
      const scheduledFor = new Date(now.getTime() + 24 * 60 * 60 * 1000); // Tomorrow

      await createReminder(
        studyPlan.id,
        studyPlan.title,
        'progress',
        reminderMessage,
        scheduledFor
      );
    }
  } catch (error) {
    console.error('Error creating automatic reminders:', error);
  }
};

// Create task-specific reminders
export const createTaskReminder = async (
  studyPlan: StudyPlan,
  task: Task,
  scheduledFor: Date
): Promise<string> => {
  const message = `Don't forget to complete "${task.title}" in study plan "${studyPlan.title}"`;
  
  return await createReminder(
    studyPlan.id,
    studyPlan.title,
    'task',
    message,
    scheduledFor
  );
};

// Get upcoming reminders for a user
export const getUpcomingReminders = async (userId: string, limit: number = 10): Promise<Reminder[]> => {
  try {
    // Get all active reminders first (simpler query)
    const q = query(
      collection(db, 'reminders'),
      where('isActive', '==', true)
    );

    const snapshot = await getDocs(q);
    const reminders: Reminder[] = [];
    
    snapshot.forEach((doc) => {
      const data = doc.data();
      reminders.push({
        id: doc.id,
        ...data,
        scheduledFor: data.scheduledFor.toDate(),
        createdAt: data.createdAt.toDate(),
      } as Reminder);
    });

    // Sort and filter on the client side to avoid index issues
    const now = new Date();
    const upcomingReminders = reminders
      .filter(reminder => reminder.scheduledFor > now)
      .sort((a, b) => a.scheduledFor.getTime() - b.scheduledFor.getTime())
      .slice(0, limit);

    return upcomingReminders;
  } catch (error) {
    console.error('Error getting upcoming reminders:', error);
    return [];
  }
};
