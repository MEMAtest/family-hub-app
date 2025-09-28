import { Resend } from 'resend';
import { CalendarEvent, Person } from '@/types/calendar.types';
import { InAppNotification } from '@/types/notification.types';

// Initialize Resend client
const resend = new Resend(process.env.RESEND_API_KEY);

export interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

export interface EmailRecipient {
  email: string;
  name: string;
}

export interface ConflictData {
  conflictingEvents: CalendarEvent[];
  newEvent: CalendarEvent;
  conflictType: 'time_overlap' | 'double_booking' | 'location_conflict';
  severity: 'minor' | 'major' | 'critical';
}

class EmailService {
  private readonly fromEmail = 'Family Hub <onboarding@resend.dev>';
  private readonly defaultEmail = 'onboarding@resend.dev'; // Fallback for testing

  /**
   * Send event reminder email
   */
  async sendEventReminder(
    event: CalendarEvent,
    recipient: EmailRecipient,
    reminderTime: number // minutes before event
  ): Promise<boolean> {
    try {
      const template = this.generateEventReminderTemplate(event, reminderTime);

      const response = await resend.emails.send({
        from: this.fromEmail,
        to: recipient.email,
        subject: template.subject,
        html: template.html,
        text: template.text,
      });

      console.log('Event reminder email sent:', response);
      return true;
    } catch (error) {
      console.error('Failed to send event reminder email:', error);
      return false;
    }
  }

  /**
   * Send conflict detection notification
   */
  async sendConflictAlert(
    conflictData: ConflictData,
    recipients: EmailRecipient[]
  ): Promise<boolean> {
    try {
      const template = this.generateConflictAlertTemplate(conflictData);

      const emailPromises = recipients.map(recipient =>
        resend.emails.send({
          from: this.fromEmail,
          to: recipient.email,
          subject: template.subject,
          html: template.html,
          text: template.text,
        })
      );

      const responses = await Promise.all(emailPromises);
      console.log('Conflict alert emails sent:', responses);
      return true;
    } catch (error) {
      console.error('Failed to send conflict alert emails:', error);
      return false;
    }
  }

  /**
   * Send daily digest email
   */
  async sendDailyDigest(
    events: CalendarEvent[],
    notifications: InAppNotification[],
    recipient: EmailRecipient,
    date: Date
  ): Promise<boolean> {
    try {
      const template = this.generateDailyDigestTemplate(events, notifications, date);

      const response = await resend.emails.send({
        from: this.fromEmail,
        to: recipient.email,
        subject: template.subject,
        html: template.html,
        text: template.text,
      });

      console.log('Daily digest email sent:', response);
      return true;
    } catch (error) {
      console.error('Failed to send daily digest email:', error);
      return false;
    }
  }

  /**
   * Send weekly summary email
   */
  async sendWeeklySummary(
    events: CalendarEvent[],
    people: Person[],
    recipient: EmailRecipient,
    weekStart: Date
  ): Promise<boolean> {
    try {
      const template = this.generateWeeklySummaryTemplate(events, people, weekStart);

      const response = await resend.emails.send({
        from: this.fromEmail,
        to: recipient.email,
        subject: template.subject,
        html: template.html,
        text: template.text,
      });

      console.log('Weekly summary email sent:', response);
      return true;
    } catch (error) {
      console.error('Failed to send weekly summary email:', error);
      return false;
    }
  }

  /**
   * Generate event reminder email template
   */
  private generateEventReminderTemplate(event: CalendarEvent, reminderTime: number): EmailTemplate {
    const eventDate = new Date(`${event.date}T${event.time}`);
    const formattedDate = eventDate.toLocaleDateString('en-GB', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    const formattedTime = eventDate.toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit'
    });

    const timeText = reminderTime < 60
      ? `${reminderTime} minutes`
      : reminderTime < 1440
        ? `${Math.floor(reminderTime / 60)} hours`
        : `${Math.floor(reminderTime / 1440)} days`;

    const subject = `Reminder: ${event.title} in ${timeText}`;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Event Reminder</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background-color: #f9fafb; }
            .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); }
            .header { background: linear-gradient(135deg, #3b82f6, #1d4ed8); color: white; padding: 24px; text-align: center; }
            .content { padding: 24px; }
            .event-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 20px; margin: 16px 0; }
            .event-title { font-size: 20px; font-weight: 600; color: #1e293b; margin-bottom: 8px; }
            .event-details { color: #64748b; line-height: 1.6; }
            .detail-row { display: flex; align-items: center; margin: 8px 0; }
            .detail-icon { width: 16px; height: 16px; margin-right: 8px; color: #3b82f6; }
            .footer { background: #f8fafc; padding: 16px 24px; text-align: center; color: #64748b; font-size: 12px; }
            .button { display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 500; margin: 16px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0; font-size: 24px;">📅 Event Reminder</h1>
              <p style="margin: 8px 0 0 0; opacity: 0.9;">Your event is coming up in ${timeText}</p>
            </div>

            <div class="content">
              <div class="event-card">
                <div class="event-title">${event.title}</div>
                <div class="event-details">
                  <div class="detail-row">
                    <span class="detail-icon">🗓️</span>
                    <span>${formattedDate}</span>
                  </div>
                  <div class="detail-row">
                    <span class="detail-icon">⏰</span>
                    <span>${formattedTime} (${event.duration} minutes)</span>
                  </div>
                  ${event.location ? `
                  <div class="detail-row">
                    <span class="detail-icon">📍</span>
                    <span>${event.location}</span>
                  </div>` : ''}
                  ${event.notes ? `
                  <div class="detail-row">
                    <span class="detail-icon">📝</span>
                    <span>${event.notes}</span>
                  </div>` : ''}
                  ${event.cost > 0 ? `
                  <div class="detail-row">
                    <span class="detail-icon">💰</span>
                    <span>£${event.cost}</span>
                  </div>` : ''}
                </div>
              </div>

              <div style="text-align: center;">
                <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001'}" class="button">
                  View in Family Hub
                </a>
              </div>
            </div>

            <div class="footer">
              This reminder was sent by Family Hub. You can manage your notification preferences in the app.
            </div>
          </div>
        </body>
      </html>
    `;

    const text = `
Event Reminder: ${event.title}

Date: ${formattedDate}
Time: ${formattedTime} (${event.duration} minutes)
${event.location ? `Location: ${event.location}` : ''}
${event.notes ? `Notes: ${event.notes}` : ''}
${event.cost > 0 ? `Cost: £${event.cost}` : ''}

This event is coming up in ${timeText}.

View in Family Hub: ${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001'}
    `;

    return { subject, html, text };
  }

  /**
   * Generate conflict alert email template
   */
  private generateConflictAlertTemplate(conflictData: ConflictData): EmailTemplate {
    const { newEvent, conflictingEvents, conflictType, severity } = conflictData;

    const severityColors = {
      minor: '#f59e0b',
      major: '#ef4444',
      critical: '#dc2626'
    };

    const conflictTypeLabels = {
      time_overlap: 'Time Overlap',
      double_booking: 'Double Booking',
      location_conflict: 'Location Conflict'
    };

    const subject = `⚠️ Schedule Conflict Detected: ${newEvent.title}`;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Schedule Conflict Alert</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background-color: #f9fafb; }
            .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); }
            .header { background: ${severityColors[severity]}; color: white; padding: 24px; text-align: center; }
            .content { padding: 24px; }
            .conflict-card { background: #fef2f2; border: 1px solid #fecaca; border-radius: 6px; padding: 20px; margin: 16px 0; }
            .event-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 16px; margin: 12px 0; }
            .event-title { font-size: 16px; font-weight: 600; color: #1e293b; margin-bottom: 4px; }
            .event-time { color: #64748b; font-size: 14px; }
            .severity-badge { display: inline-block; background: ${severityColors[severity]}; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: 500; text-transform: uppercase; }
            .footer { background: #f8fafc; padding: 16px 24px; text-align: center; color: #64748b; font-size: 12px; }
            .button { display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 500; margin: 8px 4px; }
            .button-secondary { background: #6b7280; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0; font-size: 24px;">⚠️ Schedule Conflict Detected</h1>
              <p style="margin: 8px 0 0 0; opacity: 0.9;">${conflictTypeLabels[conflictType]} - ${severity} severity</p>
            </div>

            <div class="content">
              <div class="conflict-card">
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px;">
                  <h3 style="margin: 0; color: #dc2626;">Conflict Details</h3>
                  <span class="severity-badge">${severity}</span>
                </div>

                <div class="event-card">
                  <div class="event-title">📅 New Event: ${newEvent.title}</div>
                  <div class="event-time">${new Date(`${newEvent.date}T${newEvent.time}`).toLocaleString('en-GB')}</div>
                  ${newEvent.location ? `<div class="event-time">📍 ${newEvent.location}</div>` : ''}
                </div>

                <h4 style="color: #dc2626; margin: 16px 0 8px 0;">Conflicts with:</h4>
                ${conflictingEvents.map(event => `
                  <div class="event-card">
                    <div class="event-title">📅 ${event.title}</div>
                    <div class="event-time">${new Date(`${event.date}T${event.time}`).toLocaleString('en-GB')}</div>
                    ${event.location ? `<div class="event-time">📍 ${event.location}</div>` : ''}
                  </div>
                `).join('')}
              </div>

              <div style="text-align: center; margin-top: 24px;">
                <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001'}" class="button">
                  Resolve Conflict
                </a>
                <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001'}" class="button button-secondary">
                  View Calendar
                </a>
              </div>
            </div>

            <div class="footer">
              This conflict alert was sent by Family Hub. Please resolve the conflict to avoid scheduling issues.
            </div>
          </div>
        </body>
      </html>
    `;

    const text = `
Schedule Conflict Detected!

Conflict Type: ${conflictTypeLabels[conflictType]}
Severity: ${severity.toUpperCase()}

New Event: ${newEvent.title}
Date: ${new Date(`${newEvent.date}T${newEvent.time}`).toLocaleString('en-GB')}
${newEvent.location ? `Location: ${newEvent.location}` : ''}

Conflicts with:
${conflictingEvents.map(event => `
- ${event.title}
  ${new Date(`${event.date}T${event.time}`).toLocaleString('en-GB')}
  ${event.location ? `Location: ${event.location}` : ''}
`).join('')}

Please resolve this conflict in Family Hub: ${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001'}
    `;

    return { subject, html, text };
  }

  /**
   * Generate daily digest email template
   */
  private generateDailyDigestTemplate(
    events: CalendarEvent[],
    notifications: InAppNotification[],
    date: Date
  ): EmailTemplate {
    const formattedDate = date.toLocaleDateString('en-GB', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const subject = `Daily Digest for ${formattedDate}`;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Daily Digest</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background-color: #f9fafb; }
            .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); }
            .header { background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 24px; text-align: center; }
            .content { padding: 24px; }
            .section { margin: 24px 0; }
            .section-title { font-size: 18px; font-weight: 600; color: #1e293b; margin-bottom: 12px; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; }
            .event-item { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 16px; margin: 8px 0; }
            .event-time { font-weight: 600; color: #3b82f6; }
            .event-title { font-weight: 500; color: #1e293b; }
            .event-details { color: #64748b; font-size: 14px; margin-top: 4px; }
            .footer { background: #f8fafc; padding: 16px 24px; text-align: center; color: #64748b; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0; font-size: 24px;">📋 Daily Digest</h1>
              <p style="margin: 8px 0 0 0; opacity: 0.9;">${formattedDate}</p>
            </div>

            <div class="content">
              <div class="section">
                <div class="section-title">📅 Today's Events (${events.length})</div>
                ${events.length > 0 ? events.map(event => `
                  <div class="event-item">
                    <div class="event-time">${event.time}</div>
                    <div class="event-title">${event.title}</div>
                    <div class="event-details">
                      ${event.location ? `📍 ${event.location}` : ''}
                      ${event.duration ? `⏱️ ${event.duration} min` : ''}
                      ${event.cost > 0 ? `💰 £${event.cost}` : ''}
                    </div>
                  </div>
                `).join('') : '<p style="color: #64748b; text-align: center; padding: 20px;">No events scheduled for today</p>'}
              </div>

              <div class="section">
                <div class="section-title">🔔 Recent Notifications (${notifications.length})</div>
                ${notifications.length > 0 ? notifications.slice(0, 5).map(notification => `
                  <div class="event-item">
                    <div class="event-title">${notification.title}</div>
                    <div class="event-details">${notification.message}</div>
                  </div>
                `).join('') : '<p style="color: #64748b; text-align: center; padding: 20px;">No recent notifications</p>'}
              </div>
            </div>

            <div class="footer">
              This digest was sent by Family Hub. You can manage your email preferences in the app.
            </div>
          </div>
        </body>
      </html>
    `;

    const text = `
Daily Digest for ${formattedDate}

Today's Events (${events.length}):
${events.length > 0 ? events.map(event => `
${event.time} - ${event.title}
${event.location ? `Location: ${event.location}` : ''}
${event.duration ? `Duration: ${event.duration} minutes` : ''}
${event.cost > 0 ? `Cost: £${event.cost}` : ''}
`).join('\n') : 'No events scheduled for today'}

Recent Notifications (${notifications.length}):
${notifications.length > 0 ? notifications.slice(0, 5).map(notification => `
- ${notification.title}: ${notification.message}
`).join('') : 'No recent notifications'}

View in Family Hub: ${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001'}
    `;

    return { subject, html, text };
  }

  /**
   * Generate weekly summary email template
   */
  private generateWeeklySummaryTemplate(
    events: CalendarEvent[],
    people: Person[],
    weekStart: Date
  ): EmailTemplate {
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);

    const formattedWeek = `${weekStart.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} - ${weekEnd.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`;

    const totalCost = events.reduce((sum, event) => sum + (event.cost || 0), 0);
    const eventsByPerson = people.map(person => ({
      ...person,
      events: events.filter(event => event.person === person.id)
    }));

    const subject = `Weekly Summary: ${formattedWeek}`;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Weekly Summary</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background-color: #f9fafb; }
            .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); }
            .header { background: linear-gradient(135deg, #8b5cf6, #7c3aed); color: white; padding: 24px; text-align: center; }
            .content { padding: 24px; }
            .stats-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin: 24px 0; }
            .stat-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 16px; text-align: center; }
            .stat-number { font-size: 24px; font-weight: 700; color: #3b82f6; }
            .stat-label { color: #64748b; font-size: 14px; }
            .person-section { margin: 20px 0; padding: 16px; background: #f8fafc; border-radius: 6px; }
            .person-header { display: flex; align-items: center; margin-bottom: 12px; }
            .person-color { width: 12px; height: 12px; border-radius: 50%; margin-right: 8px; }
            .person-name { font-weight: 600; color: #1e293b; }
            .event-count { color: #64748b; font-size: 14px; }
            .footer { background: #f8fafc; padding: 16px 24px; text-align: center; color: #64748b; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0; font-size: 24px;">📊 Weekly Summary</h1>
              <p style="margin: 8px 0 0 0; opacity: 0.9;">${formattedWeek}</p>
            </div>

            <div class="content">
              <div class="stats-grid">
                <div class="stat-card">
                  <div class="stat-number">${events.length}</div>
                  <div class="stat-label">Total Events</div>
                </div>
                <div class="stat-card">
                  <div class="stat-number">£${totalCost}</div>
                  <div class="stat-label">Total Cost</div>
                </div>
              </div>

              <h3 style="color: #1e293b; margin: 24px 0 16px 0;">👥 By Family Member</h3>
              ${eventsByPerson.map(person => `
                <div class="person-section">
                  <div class="person-header">
                    <div class="person-color" style="background-color: ${person.color};"></div>
                    <div class="person-name">${person.name}</div>
                    <div class="event-count" style="margin-left: auto;">${person.events.length} events</div>
                  </div>
                  ${person.events.slice(0, 3).map(event => `
                    <div style="margin: 4px 0; color: #64748b; font-size: 14px;">
                      • ${event.title} (${new Date(`${event.date}T${event.time}`).toLocaleDateString('en-GB', { weekday: 'short' })})
                    </div>
                  `).join('')}
                  ${person.events.length > 3 ? `<div style="color: #64748b; font-size: 12px; margin-top: 8px;">... and ${person.events.length - 3} more</div>` : ''}
                </div>
              `).join('')}
            </div>

            <div class="footer">
              This weekly summary was sent by Family Hub. You can view detailed analytics in the app.
            </div>
          </div>
        </body>
      </html>
    `;

    const text = `
Weekly Summary: ${formattedWeek}

Overview:
- Total Events: ${events.length}
- Total Cost: £${totalCost}

By Family Member:
${eventsByPerson.map(person => `
${person.name} (${person.events.length} events):
${person.events.slice(0, 5).map(event => `
- ${event.title} (${new Date(`${event.date}T${event.time}`).toLocaleDateString('en-GB', { weekday: 'short' })})`).join('')}
${person.events.length > 5 ? `... and ${person.events.length - 5} more` : ''}
`).join('')}

View detailed analytics in Family Hub: ${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001'}
    `;

    return { subject, html, text };
  }

  /**
   * Test email sending capability
   */
  async testEmail(recipient: EmailRecipient): Promise<boolean> {
    try {
      const response = await resend.emails.send({
        from: this.fromEmail,
        to: recipient.email,
        subject: 'Family Hub Email Service Test',
        html: `
          <h1>🎉 Email Service Test</h1>
          <p>Hello ${recipient.name},</p>
          <p>This is a test email from Family Hub to confirm that email notifications are working correctly.</p>
          <p>If you received this email, your notification system is properly configured!</p>
          <hr>
          <p style="color: #666; font-size: 12px;">
            This test email was sent from Family Hub.<br>
            Time: ${new Date().toLocaleString()}
          </p>
        `,
        text: `
Family Hub Email Service Test

Hello ${recipient.name},

This is a test email from Family Hub to confirm that email notifications are working correctly.

If you received this email, your notification system is properly configured!

Time: ${new Date().toLocaleString()}
        `
      });

      console.log('Test email sent successfully:', response);
      return true;
    } catch (error) {
      console.error('Test email failed:', error);
      return false;
    }
  }
}

// Export singleton instance
export const emailService = new EmailService();
export default emailService;