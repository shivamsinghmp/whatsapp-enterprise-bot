// ── Types ────────────────────────────────────────────────────────────────────

export type WAResponse = {
  ok: boolean;
  wamid?: string;
  error?: string;
  code?: number;
};

export type PhoneInfo = {
  id: string;
  display_phone_number: string;
  verified_name: string;
  quality_rating: string;
};

// ── Constants ────────────────────────────────────────────────────────────────

const RETRY_DELAYS_MS = [500, 1000, 2000] as const;

// ── Client ───────────────────────────────────────────────────────────────────

export class WhatsAppClient {
  private readonly baseUrl: string;
  private readonly accessToken: string;
  private readonly apiVersion: string;
  private readonly phoneNumberId: string;

  constructor(
    phoneNumberId: string,
    accessToken: string,
    apiVersion = "v21.0"
  ) {
    this.phoneNumberId = phoneNumberId;
    this.accessToken = accessToken;
    this.apiVersion = apiVersion;
    this.baseUrl = `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`;
  }

  /**
   * POSTs a message payload to the Graph API with up to 3 retries
   * using exponential backoff. 4xx errors are NOT retried.
   */
  private async request(payload: object): Promise<WAResponse> {
    let lastError: WAResponse = { ok: false, error: "Unknown error", code: 0 };

    for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
      try {
        const res = await fetch(this.baseUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.accessToken}`,
          },
          body: JSON.stringify(payload),
        });

        const data: {
          messages?: Array<{ id: string }>;
          error?: { message: string; code: number };
        } = await res.json();

        if (res.ok && data?.messages?.[0]?.id) {
          return { ok: true, wamid: data.messages[0].id };
        }

        lastError = {
          ok: false,
          error: data?.error?.message ?? `HTTP ${res.status}`,
          code: data?.error?.code ?? res.status,
        };

        // Client errors are terminal — no point retrying
        if (res.status >= 400 && res.status < 500) break;
      } catch (err) {
        lastError = {
          ok: false,
          error: err instanceof Error ? err.message : "Network error",
          code: 0,
        };
      }

      if (attempt < RETRY_DELAYS_MS.length) {
        await delay(RETRY_DELAYS_MS[attempt]);
      }
    }

    return lastError;
  }

  async sendText(to: string, body: string): Promise<WAResponse> {
    return this.request({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to,
      type: "text",
      text: { preview_url: false, body },
    });
  }

  async sendTemplate(
    to: string,
    templateName: string,
    languageCode: string,
    variables: string[]
  ): Promise<WAResponse> {
    const components =
      variables.length > 0
        ? [
            {
              type: "body",
              parameters: variables.map((text) => ({ type: "text", text })),
            },
          ]
        : [];

    return this.request({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to,
      type: "template",
      template: {
        name: templateName,
        language: { code: languageCode },
        components,
      },
    });
  }

  async sendImage(
    to: string,
    imageUrl: string,
    caption?: string
  ): Promise<WAResponse> {
    return this.request({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to,
      type: "image",
      image: {
        link: imageUrl,
        ...(caption !== undefined ? { caption } : {}),
      },
    });
  }

  async sendDocument(
    to: string,
    docUrl: string,
    filename: string,
    caption?: string
  ): Promise<WAResponse> {
    return this.request({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to,
      type: "document",
      document: {
        link: docUrl,
        filename,
        ...(caption !== undefined ? { caption } : {}),
      },
    });
  }

  /**
   * Verifies the phone number is accessible and returns its metadata.
   */
  async testConnection(): Promise<{
    ok: boolean;
    info?: PhoneInfo;
    error?: string;
  }> {
    try {
      const res = await fetch(
        `https://graph.facebook.com/${this.apiVersion}/${this.phoneNumberId}`,
        {
          headers: { Authorization: `Bearer ${this.accessToken}` },
        }
      );

      const data: PhoneInfo & { error?: { message: string } } =
        await res.json();

      if (!res.ok) {
        return {
          ok: false,
          error: data?.error?.message ?? `HTTP ${res.status}`,
        };
      }

      return {
        ok: true,
        info: {
          id: data.id,
          display_phone_number: data.display_phone_number,
          verified_name: data.verified_name,
          quality_rating: data.quality_rating,
        },
      };
    } catch (err) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : "Network error",
      };
    }
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
