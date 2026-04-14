import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

export interface OutboundMessage {
  from: string;
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  text: string;
  html?: string;
  attachments?: Array<{ filename: string; path: string }>;
  inReplyTo?: string;
  references?: string;
}

export interface SmtpClientOptions {
  host: string;
  port: number;
  email: string;
  password: string;
}

export interface SentMessageInfo {
  messageId: string;
  accepted: string[];
  rejected: string[];
  response: string;
}

export class SmtpClient {
  private transporter: Transporter;

  constructor(opts: SmtpClientOptions) {
    this.transporter = nodemailer.createTransport({
      host: opts.host,
      port: opts.port,
      secure: false,
      auth: { user: opts.email, pass: opts.password },
      tls: { rejectUnauthorized: false },
      requireTLS: true,
    });
  }

  async send(msg: OutboundMessage): Promise<SentMessageInfo> {
    const info = await this.transporter.sendMail({
      from: msg.from,
      to: msg.to.join(', '),
      cc: msg.cc?.join(', '),
      bcc: msg.bcc?.join(', '),
      subject: msg.subject,
      text: msg.text,
      html: msg.html,
      attachments: msg.attachments,
      inReplyTo: msg.inReplyTo,
      references: msg.references,
    });

    return {
      messageId: info.messageId,
      accepted: info.accepted as string[],
      rejected: info.rejected as string[],
      response: info.response,
    };
  }

  async verify(): Promise<void> {
    await this.transporter.verify();
  }
}
