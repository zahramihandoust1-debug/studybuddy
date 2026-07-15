import { initializeTestEnvironment, RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { initializeApp } from 'firebase/app';

describe('Firebase Security Rules', () => {
  let testEnv: RulesTestEnvironment;
  let db: any;
  let auth: any;

  beforeAll(async () => {
    testEnv = await initializeTestEnvironment({
      projectId: 'studybuddy-test',
      firestore: {
        rules: `
          rules_version = '2';
          service cloud.firestore {
            match /databases/{database}/documents {
              match /users/{userId} {
                allow read, write: if request.auth != null && request.auth.uid == userId;
              }
              
              match /studyPlans/{planId} {
                allow read: if request.auth != null && 
                  (resource.data.participants != null && 
                   request.auth.uid in resource.data.participants);
                
                allow create: if request.auth != null && 
                  request.auth.uid == resource.data.ownerId &&
                  request.auth.uid in resource.data.participants;
                
                allow update: if request.auth != null && 
                  (request.auth.uid == resource.data.ownerId ||
                   request.auth.uid in resource.data.participants);
                
                allow delete: if request.auth != null && 
                  request.auth.uid == resource.data.ownerId;
              }
              
              match /notifications/{notificationId} {
                allow read, write: if request.auth != null && 
                  request.auth.uid == resource.data.userId;
              }
            }
          }
        `,
      },
    });
    
    db = testEnv.authenticatedContext('user1').firestore();
    auth = testEnv.authenticatedContext('user1').auth();
  });

  afterAll(async () => {
    await testEnv.cleanup();
  });

  beforeEach(async () => {
    await testEnv.clearFirestore();
  });

  describe('User Documents', () => {
    it('allows users to read their own user document', async () => {
      const userRef = db.collection('users').doc('user1');
      await userRef.set({
        uid: 'user1',
        email: 'user1@example.com',
        displayName: 'User 1',
      });

      const doc = await userRef.get();
      expect(doc.exists).toBe(true);
      expect(doc.data().uid).toBe('user1');
    });

    it('denies users from reading other users documents', async () => {
      const userRef = db.collection('users').doc('user2');
      await userRef.set({
        uid: 'user2',
        email: 'user2@example.com',
        displayName: 'User 2',
      });

      // Try to read as user1
      const user1Context = testEnv.authenticatedContext('user1');
      const user1Db = user1Context.firestore();
      
      await expect(user1Db.collection('users').doc('user2').get()).rejects.toThrow();
    });

    it('allows users to update their own user document', async () => {
      const userRef = db.collection('users').doc('user1');
      await userRef.set({
        uid: 'user1',
        email: 'user1@example.com',
        displayName: 'User 1',
      });

      await userRef.update({
        displayName: 'Updated User 1',
      });

      const doc = await userRef.get();
      expect(doc.data().displayName).toBe('Updated User 1');
    });
  });

  describe('Study Plans', () => {
    it('allows participants to read study plans they are part of', async () => {
      const studyPlanRef = db.collection('studyPlans').doc('plan1');
      await studyPlanRef.set({
        title: 'Test Plan',
        ownerId: 'user1',
        participants: ['user1', 'user2'],
        progress: 0,
        tasks: [],
      });

      const doc = await studyPlanRef.get();
      expect(doc.exists).toBe(true);
      expect(doc.data().title).toBe('Test Plan');
    });

    it('denies access to study plans user is not part of', async () => {
      const studyPlanRef = db.collection('studyPlans').doc('plan2');
      await studyPlanRef.set({
        title: 'Private Plan',
        ownerId: 'user2',
        participants: ['user2'],
        progress: 0,
        tasks: [],
      });

      // Try to read as user1 (not a participant)
      const user1Context = testEnv.authenticatedContext('user1');
      const user1Db = user1Context.firestore();
      
      await expect(user1Db.collection('studyPlans').doc('plan2').get()).rejects.toThrow();
    });

    it('allows study plan owner to create new study plans', async () => {
      const studyPlanRef = db.collection('studyPlans').doc('plan3');
      
      await studyPlanRef.set({
        title: 'New Plan',
        ownerId: 'user1',
        participants: ['user1'],
        progress: 0,
        tasks: [],
      });

      const doc = await studyPlanRef.get();
      expect(doc.exists).toBe(true);
      expect(doc.data().title).toBe('New Plan');
    });

    it('allows participants to update study plans', async () => {
      const studyPlanRef = db.collection('studyPlans').doc('plan4');
      await studyPlanRef.set({
        title: 'Updateable Plan',
        ownerId: 'user1',
        participants: ['user1', 'user2'],
        progress: 0,
        tasks: [],
      });

      // Update as user2 (participant)
      const user2Context = testEnv.authenticatedContext('user2');
      const user2Db = user2Context.firestore();
      
      await user2Db.collection('studyPlans').doc('plan4').update({
        progress: 50,
      });

      const doc = await studyPlanRef.get();
      expect(doc.data().progress).toBe(50);
    });

    it('allows only owner to delete study plans', async () => {
      const studyPlanRef = db.collection('studyPlans').doc('plan5');
      await studyPlanRef.set({
        title: 'Deletable Plan',
        ownerId: 'user1',
        participants: ['user1', 'user2'],
        progress: 0,
        tasks: [],
      });

      // Delete as owner (user1)
      await studyPlanRef.delete();

      const doc = await studyPlanRef.get();
      expect(doc.exists).toBe(false);
    });

    it('denies non-owners from deleting study plans', async () => {
      const studyPlanRef = db.collection('studyPlans').doc('plan6');
      await studyPlanRef.set({
        title: 'Protected Plan',
        ownerId: 'user1',
        participants: ['user1', 'user2'],
        progress: 0,
        tasks: [],
      });

      // Try to delete as user2 (participant but not owner)
      const user2Context = testEnv.authenticatedContext('user2');
      const user2Db = user2Context.firestore();
      
      await expect(user2Db.collection('studyPlans').doc('plan6').delete()).rejects.toThrow();
    });
  });

  describe('Notifications', () => {
    it('allows users to read their own notifications', async () => {
      const notificationRef = db.collection('notifications').doc('notif1');
      await notificationRef.set({
        userId: 'user1',
        title: 'Test Notification',
        message: 'Test message',
        read: false,
      });

      const doc = await notificationRef.get();
      expect(doc.exists).toBe(true);
      expect(doc.data().userId).toBe('user1');
    });

    it('denies users from reading other users notifications', async () => {
      const notificationRef = db.collection('notifications').doc('notif2');
      await notificationRef.set({
        userId: 'user2',
        title: 'Private Notification',
        message: 'Private message',
        read: false,
      });

      // Try to read as user1
      const user1Context = testEnv.authenticatedContext('user1');
      const user1Db = user1Context.firestore();
      
      await expect(user1Db.collection('notifications').doc('notif2').get()).rejects.toThrow();
    });

    it('allows users to update their own notifications', async () => {
      const notificationRef = db.collection('notifications').doc('notif3');
      await notificationRef.set({
        userId: 'user1',
        title: 'Updateable Notification',
        message: 'Updateable message',
        read: false,
      });

      await notificationRef.update({
        read: true,
      });

      const doc = await notificationRef.get();
      expect(doc.data().read).toBe(true);
    });
  });

  describe('Unauthenticated Access', () => {
    it('denies all access when user is not authenticated', async () => {
      const unauthenticatedContext = testEnv.unauthenticatedContext();
      const unauthenticatedDb = unauthenticatedContext.firestore();

      // Try to read user document
      await expect(unauthenticatedDb.collection('users').doc('user1').get()).rejects.toThrow();
      
      // Try to read study plan
      await expect(unauthenticatedDb.collection('studyPlans').doc('plan1').get()).rejects.toThrow();
      
      // Try to read notification
      await expect(unauthenticatedDb.collection('notifications').doc('notif1').get()).rejects.toThrow();
    });
  });
});
