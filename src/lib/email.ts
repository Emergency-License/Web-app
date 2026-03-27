import { Resend } from "resend";

const resendKey = process.env.RESEND_API_KEY;
const fromEmail = process.env.RESEND_FROM_EMAIL || "alerts@emergencylicense.com";

function getClient() {
  if (!resendKey) return null;
  return new Resend(resendKey);
}

export type SlotInfo = {
  locationName: string;
  address: string;
  date: string;
  distance: number;
  times?: string[];
};

/**
 * Send an email alert when an appointment slot is found.
 */
export async function sendSlotEmail(
  email: string,
  slot: SlotInfo
): Promise<{ success: boolean; id?: string; error?: string }> {
  const client = getClient();
  if (!client) {
    console.log(`[EMAIL-DRY] Would email ${email}: ${slot.locationName} - ${slot.date}`);
    return { success: true, id: "dry-run" };
  }

  const timesHtml = slot.times?.length
    ? `<div style="margin-top:16px">
        <div style="color:#64748B;font-size:13px;margin-bottom:8px">Available times:</div>
        <div>${slot.times
          .slice(0, 8)
          .map(
            (t) =>
              `<span style="display:inline-block;padding:6px 12px;margin:3px;background:#EFF6FF;color:#0284C7;border-radius:6px;font-size:14px;font-weight:500">${t}</span>`
          )
          .join("")}</div>
      </div>`
    : "";

  const html = `
    <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto">
      <div style="background:linear-gradient(135deg,#0284C7,#0369A1);padding:28px 24px;border-radius:12px 12px 0 0">
        <h1 style="color:white;margin:0;font-size:22px;font-weight:700">
          DPS Appointment Found!
        </h1>
        <p style="color:rgba(255,255,255,0.8);margin:6px 0 0;font-size:14px">
          Act fast — slots get taken within minutes
        </p>
      </div>
      <div style="background:white;padding:24px;border:1px solid #E0F0F8;border-top:none">
        <div style="display:inline-block;background:#D1FAE5;color:#059669;padding:5px 14px;border-radius:20px;font-weight:700;font-size:13px;margin-bottom:16px">
          Available Now
        </div>
        <h2 style="color:#0F172A;margin:8px 0 4px;font-size:20px">${slot.locationName}</h2>
        <p style="color:#64748B;margin:0 0 16px;font-size:14px">${slot.address}</p>
        <table style="margin-bottom:20px" cellpadding="0" cellspacing="0">
          <tr>
            <td style="padding-right:32px">
              <div style="color:#64748B;font-size:12px">Distance</div>
              <div style="color:#0F172A;font-weight:600;font-size:20px">${slot.distance} mi</div>
            </td>
            <td>
              <div style="color:#64748B;font-size:12px">Next Available</div>
              <div style="color:#0284C7;font-weight:600;font-size:20px">${slot.date}</div>
            </td>
          </tr>
        </table>
        ${timesHtml}
        <div style="margin-top:24px">
          <a href="https://public.txdpsscheduler.com/" style="display:inline-block;background:#EA580C;color:white;padding:14px 36px;border-radius:10px;text-decoration:none;font-weight:700;font-size:16px">
            Book This Appointment
          </a>
        </div>
        <p style="color:#94A3B8;font-size:12px;margin-top:20px;line-height:1.5">
          This link goes to the official Texas DPS scheduler. Log in with your
          info and select this location to claim the slot.
        </p>
      </div>
      <div style="padding:16px 24px;color:#94A3B8;font-size:11px;text-align:center;background:#F8FAFC;border-radius:0 0 12px 12px;border:1px solid #E0F0F8;border-top:none">
        EmergencyLicense.com &mdash; Not affiliated with Texas DPS<br>
        <a href="https://emergencylicense.com/unsubscribe" style="color:#94A3B8">Unsubscribe</a>
      </div>
    </div>`;

  try {
    const result = await client.emails.send({
      from: fromEmail,
      to: [email],
      subject: `DPS Appointment Available — ${slot.locationName} (${slot.date})`,
      html,
    });
    if (result.error) {
      console.error(`[EMAIL] Failed to ${email}: ${result.error.message}`);
      return { success: false, error: result.error.message };
    }
    console.log(`[EMAIL] Sent to ${email} (ID: ${result.data?.id})`);
    return { success: true, id: result.data?.id };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    console.error(`[EMAIL] Failed to ${email}: ${error}`);
    return { success: false, error };
  }
}

/**
 * Send a welcome email when a user subscribes.
 */
export async function sendWelcomeEmail(
  email: string,
  zipCode: string,
  maxDistance: number
): Promise<{ success: boolean; id?: string; error?: string }> {
  const client = getClient();
  if (!client) {
    console.log(`[EMAIL-DRY] Would welcome ${email}`);
    return { success: true, id: "dry-run" };
  }

  const html = `
    <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto">
      <div style="background:linear-gradient(135deg,#0284C7,#0369A1);padding:28px 24px;border-radius:12px 12px 0 0">
        <h1 style="color:white;margin:0;font-size:22px;font-weight:700">
          You're Signed Up!
        </h1>
      </div>
      <div style="background:white;padding:24px;border:1px solid #E0F0F8;border-top:none">
        <p style="color:#0F172A;font-size:16px;line-height:1.6;margin:0 0 16px">
          We're now monitoring <strong>every DPS office</strong> within
          <strong>${maxDistance} miles</strong> of <strong>${zipCode}</strong>.
        </p>
        <p style="color:#64748B;font-size:14px;line-height:1.6;margin:0 0 16px">
          The moment an appointment opens up, you'll get an email with the
          location, date, available times, and a direct link to book on the
          official DPS site.
        </p>
        <div style="background:#F0F9FF;border-radius:8px;padding:16px;margin:20px 0">
          <p style="color:#0284C7;font-size:14px;font-weight:600;margin:0 0 4px">
            What to expect:
          </p>
          <ul style="color:#64748B;font-size:14px;margin:0;padding-left:20px;line-height:1.8">
            <li>Most users find an appointment within 24-48 hours</li>
            <li>Wider search radius = faster results</li>
            <li>Alerts come as soon as a cancellation happens</li>
          </ul>
        </div>
        <p style="color:#94A3B8;font-size:12px;margin-top:20px">
          In the meantime, you can search anytime at
          <a href="https://emergencylicense.com/#search" style="color:#0284C7">emergencylicense.com</a>
        </p>
      </div>
      <div style="padding:16px 24px;color:#94A3B8;font-size:11px;text-align:center;background:#F8FAFC;border-radius:0 0 12px 12px;border:1px solid #E0F0F8;border-top:none">
        EmergencyLicense.com &mdash; Not affiliated with Texas DPS<br>
        <a href="https://emergencylicense.com/unsubscribe" style="color:#94A3B8">Unsubscribe</a>
      </div>
    </div>`;

  try {
    const result = await client.emails.send({
      from: fromEmail,
      to: [email],
      subject: "You're signed up for DPS appointment alerts!",
      html,
    });
    if (result.error) {
      return { success: false, error: result.error.message };
    }
    return { success: true, id: result.data?.id };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    return { success: false, error };
  }
}
