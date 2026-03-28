import twilio from "twilio";

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromNumber = process.env.TWILIO_FROM_NUMBER;

function getClient() {
  if (!accountSid || !authToken || !fromNumber) {
    return null;
  }
  return twilio(accountSid, authToken);
}

export type SlotInfo = {
  locationName: string;
  address: string;
  date: string;
  distance: number;
  times?: string[];
};

/**
 * Send an SMS alert when an appointment slot is found.
 */
export async function sendSlotSMS(
  phone: string,
  slot: SlotInfo,
  subscriberId?: string
): Promise<{ success: boolean; sid?: string; error?: string }> {
  const client = getClient();
  if (!client) {
    console.log(`[SMS-DRY] Would text ${phone}: ${slot.locationName} - ${slot.date}`);
    return { success: true, sid: "dry-run" };
  }

  const timesLine = slot.times?.length
    ? `\nTimes: ${slot.times.slice(0, 5).join(", ")}`
    : "";

  const body =
    `DPS APPOINTMENT FOUND!\n\n` +
    `${slot.locationName}\n` +
    `${slot.address}\n` +
    `${slot.distance} mi away | ${slot.date}` +
    `${timesLine}\n\n` +
    `Book NOW: https://public.txdpsscheduler.com/\n\n` +
    `Got your appointment? Reply CANCEL to stop alerts.\n` +
    `- EmergencyLicense.com`;

  try {
    const msg = await client.messages.create({
      body,
      from: fromNumber,
      to: phone.startsWith("+") ? phone : `+1${phone.replace(/\D/g, "")}`,
    });
    console.log(`[SMS] Sent to ${phone} (SID: ${msg.sid})`);
    return { success: true, sid: msg.sid };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    console.error(`[SMS] Failed to ${phone}: ${error}`);
    return { success: false, error };
  }
}

/**
 * Send a confirmation SMS when a user subscribes.
 */
export async function sendWelcomeSMS(
  phone: string,
  zipCode: string,
  maxDistance: number
): Promise<{ success: boolean; sid?: string; error?: string }> {
  const client = getClient();
  if (!client) {
    console.log(`[SMS-DRY] Would welcome ${phone}`);
    return { success: true, sid: "dry-run" };
  }

  const body =
    `You're signed up for DPS appointment alerts!\n\n` +
    `We're watching all offices within ${maxDistance} mi of ${zipCode}. ` +
    `You'll get a text the moment a slot opens.\n\n` +
    `Got your appointment? Reply CANCEL to stop alerts.\n` +
    `- EmergencyLicense.com`;

  try {
    const msg = await client.messages.create({
      body,
      from: fromNumber,
      to: phone.startsWith("+") ? phone : `+1${phone.replace(/\D/g, "")}`,
    });
    return { success: true, sid: msg.sid };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    console.error(`[SMS] Welcome failed to ${phone}: ${error}`);
    return { success: false, error };
  }
}

/**
 * Send cancel confirmation request.
 */
export async function sendCancelConfirmSMS(
  phone: string
): Promise<{ success: boolean; sid?: string; error?: string }> {
  const client = getClient();
  if (!client) return { success: true, sid: "dry-run" };

  const body =
    `Are you sure you want to cancel your emergency alerts?\n\n` +
    `Reply YES to confirm.\n` +
    `Reply anything else to keep your alerts active.\n` +
    `- EmergencyLicense.com`;

  try {
    const msg = await client.messages.create({
      body,
      from: fromNumber,
      to: phone.startsWith("+") ? phone : `+1${phone.replace(/\D/g, "")}`,
    });
    return { success: true, sid: msg.sid };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    return { success: false, error };
  }
}

/**
 * Send cancel success message.
 */
export async function sendCancelledSMS(
  phone: string
): Promise<{ success: boolean; sid?: string; error?: string }> {
  const client = getClient();
  if (!client) return { success: true, sid: "dry-run" };

  const body =
    `Your emergency alerts have been cancelled. Glad you got your appointment!\n\n` +
    `Need us again? Visit emergencylicense.com\n` +
    `- EmergencyLicense.com`;

  try {
    const msg = await client.messages.create({
      body,
      from: fromNumber,
      to: phone.startsWith("+") ? phone : `+1${phone.replace(/\D/g, "")}`,
    });
    return { success: true, sid: msg.sid };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    return { success: false, error };
  }
}
