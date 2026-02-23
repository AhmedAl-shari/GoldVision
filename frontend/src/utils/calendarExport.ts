/**
 * Calendar Export Utilities
 * Generate ICS files and Google Calendar links for alerts
 */

import { createEvent, EventAttributes } from 'ics';

interface AlertEvent {
  id: number;
  asset: string;
  currency: string;
  ruleType: string;
  threshold: number;
  direction: string;
  createdAt: string;
}

/**
 * Convert Gregorian date to approximate Hijri date
 * Note: This is a simplified calculation. For production, use a proper Hijri calendar library.
 */
function getHijriDate(gregorianDate: Date): string {
  const hijriYear = Math.floor((gregorianDate.getFullYear() - 622) * 1.030684);
  const hijriMonth = (gregorianDate.getMonth() + 1) % 12 || 12;
  const hijriDay = gregorianDate.getDate();
  return `${hijriDay}/${hijriMonth}/${hijriYear + 622}`;
}

/**
 * Generate ICS file for an alert reminder
 */
export function generateAlertICS(alert: AlertEvent, locale: string = 'en'): Promise<string> {
  return new Promise((resolve, reject) => {
    const isArabic = locale === 'ar';
    const reminderDate = new Date();
    reminderDate.setHours(reminderDate.getHours() + 1); // 1 hour from now
    
    const hijriDate = getHijriDate(reminderDate);
    
    const title = isArabic
      ? `تنبيه الذهب: ${alert.asset} ${alert.direction === 'above' ? 'أعلى من' : 'أقل من'} ${alert.threshold} ${alert.currency}`
      : `Gold Alert: ${alert.asset} ${alert.direction} $${alert.threshold} ${alert.currency}`;
    
    const description = isArabic
      ? `تنبيه سعر الذهب\n` +
        `الأصل: ${alert.asset}\n` +
        `الاتجاه: ${alert.direction === 'above' ? 'فوق' : 'تحت'}\n` +
        `السعر: ${alert.threshold} ${alert.currency}\n` +
        `التاريخ الهجري: ${hijriDate}\n\n` +
        `تم الإنشاء بواسطة GoldVision`
      : `Gold Price Alert\n` +
        `Asset: ${alert.asset}\n` +
        `Direction: ${alert.direction}\n` +
        `Threshold: $${alert.threshold} ${alert.currency}\n` +
        `Hijri Date: ${hijriDate}\n\n` +
        `Created by GoldVision`;

    const event: EventAttributes = {
      start: [
        reminderDate.getFullYear(),
        reminderDate.getMonth() + 1,
        reminderDate.getDate(),
        reminderDate.getHours(),
        reminderDate.getMinutes()
      ],
      duration: { minutes: 15 },
      title,
      description,
      location: 'GoldVision App',
      url: 'http://localhost:5173/alerts',
      status: 'CONFIRMED',
      busyStatus: 'FREE',
      organizer: { name: 'GoldVision Alerts', email: 'alerts@goldvision.com' },
      alarms: [
        { action: 'display', trigger: { minutes: 5, before: true }, description: isArabic ? 'تنبيه قبل 5 دقائق' : '5 minute reminder' }
      ]
    };

    createEvent(event, (error, value) => {
      if (error) {
        reject(error);
      } else {
        resolve(value);
      }
    });
  });
}

/**
 * Download ICS file to user's device
 */
export async function downloadAlertICS(alert: AlertEvent, locale: string = 'en'): Promise<void> {
  try {
    const icsContent = await generateAlertICS(alert, locale);
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    
    link.href = URL.createObjectURL(blob);
    link.download = `goldvision-alert-${alert.id}.ics`;
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  } catch (error) {
    console.error('Failed to generate ICS:', error);
    throw error;
  }
}

/**
 * Generate Google Calendar link for an alert
 */
export function generateGoogleCalendarLink(alert: AlertEvent, locale: string = 'en'): string {
  const isArabic = locale === 'ar';
  const reminderDate = new Date();
  reminderDate.setHours(reminderDate.getHours() + 1);
  
  const hijriDate = getHijriDate(reminderDate);
  
  const title = isArabic
    ? `تنبيه الذهب: ${alert.asset} ${alert.direction === 'above' ? 'أعلى من' : 'أقل من'} ${alert.threshold} ${alert.currency}`
    : `Gold Alert: ${alert.asset} ${alert.direction} $${alert.threshold} ${alert.currency}`;
  
  const description = isArabic
    ? `تنبيه سعر الذهب - ${alert.asset}\n` +
      `الاتجاه: ${alert.direction === 'above' ? 'فوق' : 'تحت'}\n` +
      `السعر: ${alert.threshold} ${alert.currency}\n` +
      `التاريخ الهجري: ${hijriDate}\n\n` +
      `GoldVision - منصة تحليل أسعار الذهب`
    : `Gold Price Alert - ${alert.asset}\n` +
      `Direction: ${alert.direction}\n` +
      `Threshold: $${alert.threshold} ${alert.currency}\n` +
      `Hijri Date: ${hijriDate}\n\n` +
      `GoldVision - Gold Analysis Platform`;

  // Format: YYYYMMDDTHHmmss
  const startDate = reminderDate.toISOString().replace(/[-:]/g, '').split('.')[0];
  const endDate = new Date(reminderDate.getTime() + 15 * 60000).toISOString().replace(/[-:]/g, '').split('.')[0];

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: title,
    details: description,
    location: 'GoldVision App',
    dates: `${startDate}/${endDate}`,
    trp: 'false', // Don't show guests
    sprop: 'website:goldvision.com',
    sf: 'true' // Add to calendar
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/**
 * Generate WhatsApp share link for alert reminder
 */
export function generateWhatsAppShare(alert: AlertEvent, locale: string = 'en'): string {
  const isArabic = locale === 'ar';
  const reminderDate = new Date();
  reminderDate.setHours(reminderDate.getHours() + 1);
  
  const hijriDate = getHijriDate(reminderDate);
  
  const message = isArabic
    ? `🔔 تذكير: تنبيه الذهب\n\n` +
      `الأصل: ${alert.asset}\n` +
      `العتبة: ${alert.threshold} ${alert.currency}\n` +
      `الاتجاه: ${alert.direction === 'above' ? 'فوق ⬆️' : 'تحت ⬇️'}\n` +
      `التاريخ الهجري: ${hijriDate}\n\n` +
      `تم إنشاؤه في: ${new Date(alert.createdAt).toLocaleDateString('ar-YE')}`
    : `🔔 Reminder: Gold Alert\n\n` +
      `Asset: ${alert.asset}\n` +
      `Threshold: $${alert.threshold} ${alert.currency}\n` +
      `Direction: ${alert.direction} ${alert.direction === 'above' ? '⬆️' : '⬇️'}\n` +
      `Hijri Date: ${hijriDate}\n\n` +
      `Created: ${new Date(alert.createdAt).toLocaleDateString('en-US')}`;

  return `https://wa.me/?text=${encodeURIComponent(message)}`;
}

/**
 * Generate weekly market outlook ICS (recurring)
 */
export async function generateWeeklyOutlookICS(locale: string = 'en'): Promise<string> {
  return new Promise((resolve, reject) => {
    const isArabic = locale === 'ar';
    const nextMonday = new Date();
    nextMonday.setDate(nextMonday.getDate() + ((1 + 7 - nextMonday.getDay()) % 7));
    nextMonday.setHours(9, 0, 0, 0); // 9 AM

    const event: EventAttributes = {
      start: [
        nextMonday.getFullYear(),
        nextMonday.getMonth() + 1,
        nextMonday.getDate(),
        9,
        0
      ],
      duration: { minutes: 30 },
      title: isArabic ? '📊 نظرة أسبوعية للذهب - GoldVision' : '📊 Weekly Gold Market Outlook - GoldVision',
      description: isArabic
        ? 'تذكير أسبوعي لمراجعة تحليل سوق الذهب والتوقعات'
        : 'Weekly reminder to review gold market analysis and forecasts',
      location: 'GoldVision Dashboard',
      url: 'http://localhost:5173/trends',
      status: 'CONFIRMED',
      busyStatus: 'FREE',
      recurrenceRule: 'FREQ=WEEKLY;BYDAY=MO', // Every Monday
      alarms: [
        { action: 'display', trigger: { minutes: 30, before: true } }
      ]
    };

    createEvent(event, (error, value) => {
      if (error) {
        reject(error);
      } else {
        resolve(value);
      }
    });
  });
}

/**
 * Download weekly outlook ICS
 */
export async function downloadWeeklyOutlookICS(locale: string = 'en'): Promise<void> {
  try {
    const icsContent = await generateWeeklyOutlookICS(locale);
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    
    link.href = URL.createObjectURL(blob);
    link.download = `goldvision-weekly-outlook.ics`;
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  } catch (error) {
    console.error('Failed to generate weekly outlook ICS:', error);
    throw error;
  }
}

