"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendMemberAddedEmail = exports.sendInvitationEmail = exports.updateFCMToken = exports.checkIncompletePlans = exports.checkUpcomingDeadlines = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const nodemailer = __importStar(require("nodemailer"));
// Initialize Firebase Admin
admin.initializeApp();
// Email configuration (you'll need to set up SMTP credentials)
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER || 'your-email@gmail.com',
        pass: process.env.EMAIL_PASS || 'your-app-password',
    },
});
// Scheduled function to check for upcoming deadlines
exports.checkUpcomingDeadlines = functions.pubsub
    .schedule('0 9 * * *') // Run daily at 9 AM
    .timeZone('Asia/Tehran')
    .onRun(async (context) => {
    console.log('Checking for upcoming deadlines...');
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const dayAfterTomorrow = new Date(now.getTime() + 48 * 60 * 60 * 1000);
    try {
        // Get study plans with deadlines in the next 2 days
        const studyPlansRef = admin.firestore().collection('studyPlans');
        const snapshot = await studyPlansRef
            .where('dueDate', '>=', admin.firestore.Timestamp.fromDate(tomorrow))
            .where('dueDate', '<=', admin.firestore.Timestamp.fromDate(dayAfterTomorrow))
            .get();
        for (const doc of snapshot.docs) {
            const studyPlan = Object.assign({ id: doc.id }, doc.data());
            // Get all participants
            const participants = await getParticipants(studyPlan.participants);
            for (const participant of participants) {
                // Send email notification
                await sendDeadlineReminderEmail(participant, studyPlan);
                // Send push notification if FCM token exists
                if (participant.fcmToken) {
                    await sendPushNotification(participant.fcmToken, {
                        title: 'Deadline Reminder',
                        body: `Study plan "${studyPlan.title}" is due ${getDaysUntilDeadline(studyPlan.dueDate.toDate())}`,
                        data: { studyPlanId: studyPlan.id }
                    });
                }
                // Create notification record
                await createNotificationRecord(participant.uid, {
                    title: 'Deadline Reminder',
                    message: `Study plan "${studyPlan.title}" is due ${getDaysUntilDeadline(studyPlan.dueDate.toDate())}`,
                    type: 'reminder',
                    studyPlanId: studyPlan.id
                });
            }
        }
        console.log(`Processed ${snapshot.size} study plans with upcoming deadlines`);
    }
    catch (error) {
        console.error('Error checking upcoming deadlines:', error);
    }
});
// Scheduled function to check for incomplete study plans
exports.checkIncompletePlans = functions.pubsub
    .schedule('0 18 * * *') // Run daily at 6 PM
    .timeZone('Asia/Tehran')
    .onRun(async (context) => {
    console.log('Checking for incomplete study plans...');
    try {
        // Get all study plans
        const studyPlansRef = admin.firestore().collection('studyPlans');
        const snapshot = await studyPlansRef.get();
        for (const doc of snapshot.docs) {
            const studyPlan = Object.assign({ id: doc.id }, doc.data());
            // Check if study plan is incomplete (progress < 100%)
            if (studyPlan.progress < 100) {
                const participants = await getParticipants(studyPlan.participants);
                for (const participant of participants) {
                    // Send email notification
                    await sendIncompletePlanEmail(participant, studyPlan);
                    // Send push notification if FCM token exists
                    if (participant.fcmToken) {
                        await sendPushNotification(participant.fcmToken, {
                            title: 'Study Plan Update',
                            body: `Study plan "${studyPlan.title}" is ${Math.round(studyPlan.progress)}% complete`,
                            data: { studyPlanId: studyPlan.id }
                        });
                    }
                    // Create notification record
                    await createNotificationRecord(participant.uid, {
                        title: 'Study Plan Update',
                        message: `Study plan "${studyPlan.title}" is ${Math.round(studyPlan.progress)}% complete`,
                        type: 'reminder',
                        studyPlanId: studyPlan.id
                    });
                }
            }
        }
        console.log(`Processed ${snapshot.size} study plans for incomplete status`);
    }
    catch (error) {
        console.error('Error checking incomplete plans:', error);
    }
});
// Helper function to get participant details
async function getParticipants(participantIds) {
    const participants = [];
    for (const participantId of participantIds) {
        try {
            const userDoc = await admin.firestore().collection('users').doc(participantId).get();
            if (userDoc.exists) {
                const userData = userDoc.data();
                participants.push({
                    uid: participantId,
                    email: (userData === null || userData === void 0 ? void 0 : userData.email) || '',
                    displayName: (userData === null || userData === void 0 ? void 0 : userData.displayName) || '',
                    fcmToken: userData === null || userData === void 0 ? void 0 : userData.fcmToken
                });
            }
        }
        catch (error) {
            console.error(`Error fetching participant ${participantId}:`, error);
        }
    }
    return participants;
}
// Helper function to send deadline reminder email
async function sendDeadlineReminderEmail(user, studyPlan) {
    const daysUntilDeadline = getDaysUntilDeadline(studyPlan.dueDate.toDate());
    const mailOptions = {
        from: process.env.EMAIL_USER || 'your-email@gmail.com',
        to: user.email,
        subject: `Deadline Reminder: ${studyPlan.title}`,
        html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #4F46E5;">StudyBuddy - Deadline Reminder</h2>
        <p>Hello ${user.displayName},</p>
        <p>This is a reminder that your study plan <strong>"${studyPlan.title}"</strong> is due in ${daysUntilDeadline}.</p>
        <div style="background-color: #F3F4F6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0;">Study Plan Details:</h3>
          <p><strong>Subject:</strong> ${studyPlan.subject}</p>
          <p><strong>Due Date:</strong> ${studyPlan.dueDate.toDate().toLocaleDateString('fa-IR')}</p>
          <p><strong>Progress:</strong> ${Math.round(studyPlan.progress)}%</p>
          <p><strong>Description:</strong> ${studyPlan.description}</p>
        </div>
        <p>Please make sure to complete your tasks and stay on track!</p>
        <p>Best regards,<br>StudyBuddy Team</p>
      </div>
    `
    };
    try {
        await transporter.sendMail(mailOptions);
        console.log(`Deadline reminder email sent to ${user.email}`);
    }
    catch (error) {
        console.error(`Error sending deadline reminder email to ${user.email}:`, error);
    }
}
// Helper function to send incomplete plan email
async function sendIncompletePlanEmail(user, studyPlan) {
    const mailOptions = {
        from: process.env.EMAIL_USER || 'your-email@gmail.com',
        to: user.email,
        subject: `Study Plan Update: ${studyPlan.title}`,
        html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #4F46E5;">StudyBuddy - Study Plan Update</h2>
        <p>Hello ${user.displayName},</p>
        <p>Your study plan <strong>"${studyPlan.title}"</strong> is currently ${Math.round(studyPlan.progress)}% complete.</p>
        <div style="background-color: #F3F4F6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0;">Study Plan Details:</h3>
          <p><strong>Subject:</strong> ${studyPlan.subject}</p>
          <p><strong>Due Date:</strong> ${studyPlan.dueDate.toDate().toLocaleDateString('fa-IR')}</p>
          <p><strong>Progress:</strong> ${Math.round(studyPlan.progress)}%</p>
          <p><strong>Description:</strong> ${studyPlan.description}</p>
        </div>
        <p>Keep up the great work and stay motivated!</p>
        <p>Best regards,<br>StudyBuddy Team</p>
      </div>
    `
    };
    try {
        await transporter.sendMail(mailOptions);
        console.log(`Incomplete plan email sent to ${user.email}`);
    }
    catch (error) {
        console.error(`Error sending incomplete plan email to ${user.email}:`, error);
    }
}
// Helper function to send push notification
async function sendPushNotification(fcmToken, notification) {
    const message = {
        token: fcmToken,
        notification: {
            title: notification.title,
            body: notification.body,
        },
        data: notification.data || {},
    };
    try {
        await admin.messaging().send(message);
        console.log(`Push notification sent to ${fcmToken}`);
    }
    catch (error) {
        console.error(`Error sending push notification to ${fcmToken}:`, error);
    }
}
// Helper function to create notification record
async function createNotificationRecord(userId, notification) {
    try {
        await admin.firestore().collection('notifications').add({
            userId,
            title: notification.title,
            message: notification.message,
            type: notification.type,
            read: false,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            studyPlanId: notification.studyPlanId || null,
        });
        console.log(`Notification record created for user ${userId}`);
    }
    catch (error) {
        console.error(`Error creating notification record for user ${userId}:`, error);
    }
}
// Helper function to get days until deadline
function getDaysUntilDeadline(dueDate) {
    const now = new Date();
    const diffTime = dueDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays === 0) {
        return 'today';
    }
    else if (diffDays === 1) {
        return 'tomorrow';
    }
    else {
        return `in ${diffDays} days`;
    }
}
// Function to handle FCM token updates
exports.updateFCMToken = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }
    const { fcmToken } = data;
    const userId = context.auth.uid;
    try {
        await admin.firestore().collection('users').doc(userId).set({
            fcmToken,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
        console.log(`FCM token updated for user ${userId}`);
        return { success: true };
    }
    catch (error) {
        console.error('Error updating FCM token:', error);
        throw new functions.https.HttpsError('internal', 'Failed to update FCM token');
    }
});
// Function to send invitation emails
exports.sendInvitationEmail = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }
    const { inviteeEmail, studyPlanTitle, inviterName, invitationUrl } = data;
    const mailOptions = {
        from: process.env.EMAIL_USER || 'your-email@gmail.com',
        to: inviteeEmail,
        subject: `You've been invited to join "${studyPlanTitle}" on StudyBuddy`,
        html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #4F46E5;">StudyBuddy - You're Invited!</h2>
        <p>Hello!</p>
        <p><strong>${inviterName}</strong> has invited you to join their study plan <strong>"${studyPlanTitle}"</strong> on StudyBuddy.</p>
        <div style="background-color: #F3F4F6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0;">Study Plan Details:</h3>
          <p><strong>Title:</strong> ${studyPlanTitle}</p>
          <p><strong>Invited by:</strong> ${inviterName}</p>
        </div>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${invitationUrl}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold;">
            Accept Invitation
          </a>
        </div>
        <p>Click the button above to join the study plan and start collaborating with your team!</p>
        <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
        <p style="word-break: break-all; color: #4F46E5;">${invitationUrl}</p>
        <p>Best regards,<br>StudyBuddy Team</p>
      </div>
    `
    };
    try {
        await transporter.sendMail(mailOptions);
        console.log(`Invitation email sent to ${inviteeEmail}`);
        // Create in-app notification for the inviter
        await createNotificationRecord(context.auth.uid, {
            title: 'Invitation Sent',
            message: `Invitation sent to ${inviteeEmail} for "${studyPlanTitle}"`,
            type: 'invitation'
        });
        return { success: true };
    }
    catch (error) {
        console.error(`Error sending invitation email to ${inviteeEmail}:`, error);
        throw new functions.https.HttpsError('internal', 'Failed to send invitation email');
    }
});
// Function to send member added notification emails
exports.sendMemberAddedEmail = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }
    const { memberEmail, studyPlanTitle, inviterName, studyPlanUrl } = data;
    const mailOptions = {
        from: process.env.EMAIL_USER || 'your-email@gmail.com',
        to: memberEmail,
        subject: `You've been added to "${studyPlanTitle}" on StudyBuddy`,
        html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #4F46E5;">StudyBuddy - Welcome to the Team!</h2>
        <p>Hello!</p>
        <p><strong>${inviterName}</strong> has added you to their study plan <strong>"${studyPlanTitle}"</strong> on StudyBuddy.</p>
        <div style="background-color: #F3F4F6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0;">Study Plan Details:</h3>
          <p><strong>Title:</strong> ${studyPlanTitle}</p>
          <p><strong>Added by:</strong> ${inviterName}</p>
        </div>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${studyPlanUrl}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold;">
            View Study Plan
          </a>
        </div>
        <p>Click the button above to access the study plan and start collaborating with your team!</p>
        <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
        <p style="word-break: break-all; color: #4F46E5;">${studyPlanUrl}</p>
        <p>Best regards,<br>StudyBuddy Team</p>
      </div>
    `
    };
    try {
        await transporter.sendMail(mailOptions);
        console.log(`Member added email sent to ${memberEmail}`);
        // Create in-app notification for the inviter
        await createNotificationRecord(context.auth.uid, {
            title: 'Member Added',
            message: `${memberEmail} has been added to "${studyPlanTitle}"`,
            type: 'member_added'
        });
        return { success: true };
    }
    catch (error) {
        console.error(`Error sending member added email to ${memberEmail}:`, error);
        throw new functions.https.HttpsError('internal', 'Failed to send member added email');
    }
});
//# sourceMappingURL=index.js.map