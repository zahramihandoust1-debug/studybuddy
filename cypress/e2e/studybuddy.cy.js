describe('StudyBuddy E2E Tests', () => {
  beforeEach(() => {
    // Visit the app before each test
    cy.visit('/');
  });

  describe('Authentication Flow', () => {
    it('should display login form for unauthenticated users', () => {
      cy.get('[data-testid="login-form"]').should('be.visible');
      cy.get('input[type="email"]').should('be.visible');
      cy.get('input[type="password"]').should('be.visible');
      cy.get('button[type="submit"]').should('contain', 'Sign In');
    });

    it('should allow user registration', () => {
      cy.get('[data-testid="register-link"]').click();
      cy.get('[data-testid="register-form"]').should('be.visible');
      cy.get('input[name="displayName"]').type('Test User');
      cy.get('input[name="email"]').type('test@example.com');
      cy.get('input[name="password"]').type('password123');
      cy.get('button[type="submit"]').click();
    });

    it('should handle login with valid credentials', () => {
      cy.get('input[type="email"]').type('test@example.com');
      cy.get('input[type="password"]').type('password123');
      cy.get('button[type="submit"]').click();
      
      // Should redirect to dashboard
      cy.url().should('include', '/dashboard');
      cy.get('[data-testid="dashboard"]').should('be.visible');
    });
  });

  describe('Dashboard Functionality', () => {
    beforeEach(() => {
      // Mock authenticated user
      cy.window().then((win) => {
        win.localStorage.setItem('user', JSON.stringify({
          uid: 'test-user-id',
          email: 'test@example.com',
          displayName: 'Test User'
        }));
      });
    });

    it('should display dashboard for authenticated users', () => {
      cy.visit('/dashboard');
      cy.get('[data-testid="dashboard"]').should('be.visible');
      cy.get('h1').should('contain', 'StudyBuddy');
      cy.get('[data-testid="user-profile"]').should('contain', 'Test User');
    });

    it('should navigate between tabs correctly', () => {
      cy.visit('/dashboard');
      
      // Test Study Plans tab
      cy.get('[data-testid="study-plans-tab"]').click();
      cy.get('[data-testid="study-plans-content"]').should('be.visible');
      
      // Test Create Plan tab
      cy.get('[data-testid="create-plan-tab"]').click();
      cy.get('[data-testid="create-plan-content"]').should('be.visible');
      
      // Test Profile tab
      cy.get('[data-testid="profile-tab"]').click();
      cy.get('[data-testid="profile-content"]').should('be.visible');
    });

    it('should display notification bell and settings', () => {
      cy.visit('/dashboard');
      cy.get('[data-testid="notification-bell"]').should('be.visible');
      cy.get('[data-testid="notification-settings"]').should('be.visible');
    });
  });

  describe('Study Plan CRUD Operations', () => {
    beforeEach(() => {
      // Mock authenticated user
      cy.window().then((win) => {
        win.localStorage.setItem('user', JSON.stringify({
          uid: 'test-user-id',
          email: 'test@example.com',
          displayName: 'Test User'
        }));
      });
    });

    it('should create a new study plan', () => {
      cy.visit('/dashboard');
      cy.get('[data-testid="create-plan-tab"]').click();
      
      // Fill in study plan form
      cy.get('input[name="title"]').type('Test Study Plan');
      cy.get('input[name="subject"]').type('Mathematics');
      cy.get('textarea[name="description"]').type('Test description');
      cy.get('input[name="dueDate"]').type('2024-12-31');
      
      // Submit form
      cy.get('button[type="submit"]').click();
      
      // Should show success message or redirect
      cy.get('[data-testid="success-message"]').should('be.visible');
    });

    it('should display study plans in the list', () => {
      cy.visit('/dashboard');
      cy.get('[data-testid="study-plans-tab"]').click();
      
      // Should show study plans list
      cy.get('[data-testid="study-plans-list"]').should('be.visible');
    });

    it('should navigate to study plan detail page', () => {
      cy.visit('/dashboard');
      cy.get('[data-testid="study-plans-tab"]').click();
      
      // Click on first study plan
      cy.get('[data-testid="study-plan-card"]').first().click();
      
      // Should navigate to detail page
      cy.url().should('include', '/study-plan/');
      cy.get('[data-testid="study-plan-detail"]').should('be.visible');
    });

    it('should update study plan progress', () => {
      cy.visit('/study-plan/test-plan-id');
      
      // Complete a task
      cy.get('[data-testid="task-checkbox"]').first().check();
      
      // Should update progress
      cy.get('[data-testid="progress-bar"]').should('contain', '100%');
    });

    it('should add new tasks to study plan', () => {
      cy.visit('/study-plan/test-plan-id');
      
      // Click add task button
      cy.get('[data-testid="add-task-button"]').click();
      
      // Fill task form
      cy.get('input[name="taskTitle"]').type('New Task');
      cy.get('textarea[name="taskDescription"]').type('Task description');
      
      // Submit task
      cy.get('button[type="submit"]').click();
      
      // Should show new task in list
      cy.get('[data-testid="task-list"]').should('contain', 'New Task');
    });
  });

  describe('Notification System', () => {
    beforeEach(() => {
      // Mock authenticated user
      cy.window().then((win) => {
        win.localStorage.setItem('user', JSON.stringify({
          uid: 'test-user-id',
          email: 'test@example.com',
          displayName: 'Test User'
        }));
      });
    });

    it('should display notification bell with unread count', () => {
      cy.visit('/dashboard');
      
      // Should show notification bell
      cy.get('[data-testid="notification-bell"]').should('be.visible');
      
      // Should show unread count if there are notifications
      cy.get('[data-testid="notification-count"]').should('be.visible');
    });

    it('should open notification center when bell is clicked', () => {
      cy.visit('/dashboard');
      
      // Click notification bell
      cy.get('[data-testid="notification-bell"]').click();
      
      // Should open notification center
      cy.get('[data-testid="notification-center"]').should('be.visible');
      cy.get('h2').should('contain', 'Notifications');
    });

    it('should open notification settings when settings button is clicked', () => {
      cy.visit('/dashboard');
      
      // Click notification settings button
      cy.get('[data-testid="notification-settings"]').click();
      
      // Should open settings modal
      cy.get('[data-testid="notification-settings-modal"]').should('be.visible');
      cy.get('h2').should('contain', 'Notification Settings');
    });

    it('should allow users to configure notification preferences', () => {
      cy.visit('/dashboard');
      cy.get('[data-testid="notification-settings"]').click();
      
      // Toggle notification preferences
      cy.get('[data-testid="email-notifications-toggle"]').click();
      cy.get('[data-testid="push-notifications-toggle"]').click();
      cy.get('[data-testid="deadline-reminders-toggle"]').click();
      
      // Save settings
      cy.get('[data-testid="save-settings-button"]').click();
      
      // Should show success message
      cy.get('[data-testid="success-message"]').should('be.visible');
    });
  });

  describe('Responsive Design', () => {
    it('should work correctly on mobile devices', () => {
      cy.viewport(375, 667);
      cy.visit('/dashboard');
      
      // Should show mobile layout
      cy.get('[data-testid="mobile-navigation"]').should('be.visible');
      cy.get('[data-testid="mobile-menu-button"]').should('be.visible');
    });

    it('should work correctly on tablet devices', () => {
      cy.viewport(768, 1024);
      cy.visit('/dashboard');
      
      // Should show tablet layout
      cy.get('[data-testid="tablet-navigation"]').should('be.visible');
    });

    it('should work correctly on desktop devices', () => {
      cy.viewport(1920, 1080);
      cy.visit('/dashboard');
      
      // Should show desktop layout
      cy.get('[data-testid="desktop-navigation"]').should('be.visible');
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors gracefully', () => {
      // Mock network failure
      cy.intercept('GET', '**/api/**', { forceNetworkError: true });
      
      cy.visit('/dashboard');
      
      // Should show error message
      cy.get('[data-testid="error-message"]').should('be.visible');
    });

    it('should handle authentication errors', () => {
      // Mock authentication failure
      cy.intercept('POST', '**/auth/**', { statusCode: 401 });
      
      cy.visit('/');
      cy.get('input[type="email"]').type('test@example.com');
      cy.get('input[type="password"]').type('wrongpassword');
      cy.get('button[type="submit"]').click();
      
      // Should show error message
      cy.get('[data-testid="error-message"]').should('be.visible');
    });
  });

  describe('Performance', () => {
    it('should load dashboard within acceptable time', () => {
      const startTime = Date.now();
      
      cy.visit('/dashboard');
      cy.get('[data-testid="dashboard"]').should('be.visible');
      
      const endTime = Date.now();
      const loadTime = endTime - startTime;
      
      // Should load within 3 seconds
      expect(loadTime).to.be.lessThan(3000);
    });

    it('should handle large datasets efficiently', () => {
      // Mock large dataset
      cy.intercept('GET', '**/studyPlans**', { fixture: 'large-study-plans.json' });
      
      cy.visit('/dashboard');
      cy.get('[data-testid="study-plans-list"]').should('be.visible');
      
      // Should render without performance issues
      cy.get('[data-testid="study-plan-card"]').should('have.length.greaterThan', 10);
    });
  });
});
