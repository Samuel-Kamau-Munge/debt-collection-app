# TODO: Fix MySQL Prepared Statement Errors in Notification System

## Tasks
- [x] Fix notificationService.js getUserNotifications method to use proper prepared statement parameters for LIMIT and OFFSET
- [ ] Fix routes/notifications.js /type/:type route to use prepared statement parameters
- [ ] Remove priority column reference from /stats route in routes/notifications.js
- [ ] Test notification endpoints after fixes

## Status
- Plan approved by user
- Implementation in progress

## Completed Tasks
- [x] Fix dashboard routing after login - users are directed to a non-existent page. Use the test-dashboard.html file as the main dashboard.
  - STATE: /dashboard route in server.js updated to serve test-dashboard.html
  - TESTS: None performed
  - FILE CREATED AND CODE CHANGES: server.js: Changed '/dashboard' route to serve '/public/test-dashboard.html'
  - DEPS: None modified
  - INTENT: Route users to the correct dashboard file after login to avoid 404 errors

## Completed Tasks
- [x] Route to the right dashboard file after login: Updated server.js to serve '/public/dashboard-old.html' for '/dashboard' route and removed redirect script from dashboard-old.html
