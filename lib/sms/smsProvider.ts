/**
 * SMS Provider Abstraction for SecureAuth Workspace
 * Server-side only module. Never export or use provider keys with NEXT_PUBLIC_ prefix.
 */

export interface SendSmsOptions {
  to: string;
  message: string;
}

export interface SendSmsResult {
  success: boolean;
  provider: string;
  messageId?: string;
  error?: string;
}

export interface ISmsProvider {
  name: string;
  sendSms(options: SendSmsOptions): Promise<SendSmsResult>;
}

/**
 * Twilio SMS Provider implementation using HTTP REST API (no external SDK required)
 */
class TwilioSmsProvider implements ISmsProvider {
  name = 'Twilio';

  async sendSms({ to, message }: SendSmsOptions): Promise<SendSmsResult> {
    const accountSid = process.env.TWILIO_ACCOUNT_SID || process.env.SMS_PROVIDER_API_KEY;
    const authToken = process.env.TWILIO_AUTH_TOKEN || process.env.SMS_PROVIDER_SECRET;
    const fromNumber = process.env.TWILIO_FROM_NUMBER || process.env.SMS_FROM_NUMBER;

    if (!accountSid || !authToken || !fromNumber) {
      return {
        success: false,
        provider: this.name,
        error: 'Twilio SMS credentials (ACCOUNT_SID, AUTH_TOKEN, FROM_NUMBER) are missing from environment.',
      };
    }

    try {
      const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
      const credentials = Buffer.from(`${accountSid}:${authToken}`).toString('base64');

      const body = new URLSearchParams({
        To: to,
        From: fromNumber,
        Body: message,
      });

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: body.toString(),
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          provider: this.name,
          error: data.message || `Twilio HTTP error ${response.status}`,
        };
      }

      return {
        success: true,
        provider: this.name,
        messageId: data.sid,
      };
    } catch (err: any) {
      return {
        success: false,
        provider: this.name,
        error: err.message || 'Failed to connect to Twilio service',
      };
    }
  }
}

/**
 * Generic HTTP REST SMS Provider implementation
 */
class GenericHttpSmsProvider implements ISmsProvider {
  name = 'GenericHTTP';

  async sendSms({ to, message }: SendSmsOptions): Promise<SendSmsResult> {
    const endpoint = process.env.SMS_PROVIDER_URL;
    const apiKey = process.env.SMS_PROVIDER_API_KEY;

    if (!endpoint) {
      return {
        success: false,
        provider: this.name,
        error: 'SMS_PROVIDER_URL is missing from environment',
      };
    }

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
        },
        body: JSON.stringify({ to, message }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        return {
          success: false,
          provider: this.name,
          error: data.error || `HTTP ${response.status}`,
        };
      }

      return {
        success: true,
        provider: this.name,
        messageId: data.id || data.messageId || 'http-msg-sent',
      };
    } catch (err: any) {
      return {
        success: false,
        provider: this.name,
        error: err.message || 'Failed to dispatch HTTP SMS request',
      };
    }
  }
}

/**
 * Server-Side Console / Log SMS Provider (used in local development when no credentials set)
 * Note: Never logs the actual sensitive OTP contents!
 */
class ConsoleSmsProvider implements ISmsProvider {
  name = 'Console';

  async sendSms({ to }: SendSmsOptions): Promise<SendSmsResult> {
    const maskedTo = to.length > 6 ? `${to.slice(0, 3)}******${to.slice(-4)}` : '******';
    console.log(`[SMS PROVIDER: Server Log] Verification SMS dispatched to target: ${maskedTo}`);
    return {
      success: true,
      provider: this.name,
      messageId: `dev-sms-${Date.now()}`,
    };
  }
}

/**
 * Get configured SMS Provider instance
 */
export function getSmsProvider(): ISmsProvider {
  const providerType = (process.env.SMS_PROVIDER || '').toLowerCase();

  if (providerType === 'twilio' || process.env.TWILIO_ACCOUNT_SID) {
    return new TwilioSmsProvider();
  }

  if (providerType === 'http' || process.env.SMS_PROVIDER_URL) {
    return new GenericHttpSmsProvider();
  }

  return new ConsoleSmsProvider();
}

/**
 * High-level helper to send an SMS
 */
export async function sendSms(to: string, message: string): Promise<SendSmsResult> {
  const provider = getSmsProvider();
  return provider.sendSms({ to, message });
}
