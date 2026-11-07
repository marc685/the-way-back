/** FamJam days follow South African time, on the phone and on the server. */
export const TZ = 'Africa/Johannesburg';
export const todayIn = (now: Date = new Date()) => now.toLocaleDateString('en-CA', { timeZone: TZ }); // YYYY-MM-DD
