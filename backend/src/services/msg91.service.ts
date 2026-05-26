import { env } from '../config/env';
import { logger } from '../config/logger';

function toE164(mobile: string): string {
  const digits = mobile.replace(/\D/g, '');
  if (digits.startsWith('91') && digits.length === 12) return digits;
  if (digits.length === 10) return `91${digits}`;
  return digits;
}

export interface SmsFlowParams {
  mobile: string;
  flowId: string;
  variables: Record<string, string>;
}

export interface WhatsAppTemplateParams {
  mobile: string;
  templateName: string;
  variables: string[];
}

export class Msg91Service {
  static async sendSms({ mobile, flowId, variables }: SmsFlowParams): Promise<void> {
    if (!env.MSG91_AUTH_KEY || !flowId) {
      logger.debug('MSG91 SMS skipped — auth key or flow ID not configured');
      return;
    }

    const body = JSON.stringify({
      flow_id: flowId,
      sender:  env.MSG91_SENDER_ID,
      mobiles: toE164(mobile),
      ...variables,
    });

    const res = await fetch('https://api.msg91.com/api/v5/flow/', {
      method:  'POST',
      headers: { authkey: env.MSG91_AUTH_KEY, 'Content-Type': 'application/json' },
      body,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => res.status.toString());
      throw new Error(`MSG91 SMS error ${res.status}: ${text}`);
    }
  }

  static async sendWhatsApp({ mobile, templateName, variables }: WhatsAppTemplateParams): Promise<void> {
    if (!env.MSG91_AUTH_KEY || !env.MSG91_WA_INTEGRATED_NUMBER || !templateName) {
      logger.debug('MSG91 WhatsApp skipped — not configured');
      return;
    }

    const body = JSON.stringify({
      integrated_number: env.MSG91_WA_INTEGRATED_NUMBER,
      content_type:      'template',
      payload: {
        to:   toE164(mobile),
        type: 'template',
        template: {
          name:     templateName,
          language: { code: 'en' },
          ...(variables.length > 0 && {
            components: [
              {
                type:       'body',
                parameters: variables.map((text) => ({ type: 'text', text })),
              },
            ],
          }),
        },
      },
    });

    const res = await fetch('https://api.msg91.com/api/v5/whatsapp/whatsapp-outbound-message/bulk/', {
      method:  'POST',
      headers: { authkey: env.MSG91_AUTH_KEY, 'Content-Type': 'application/json' },
      body,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => res.status.toString());
      throw new Error(`MSG91 WhatsApp error ${res.status}: ${text}`);
    }
  }
}
