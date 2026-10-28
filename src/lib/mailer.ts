import { APP_NAME, SUPPORT_EMAIL } from './mail-config'

/**
 * Trimitere e-mail pentru codurile de verificare.
 *
 * - Dacă sunt setate variabilele SMTP_* (producție: Vercel + furnizor SMTP,
 *   ex. Gmail cu parolă de aplicație, Brevo, Mailgun), mesajul pleacă real
 *   către utilizator prin nodemailer.
 * - Dacă SMTP NU este configurat (mediu demo/local), aplicația NU se blochează:
 *   codul este returnat în interfață cu mențiunea „Mod demo", astfel fluxul de
 *   înregistrare/resetare poate fi parcurs complet.
 */

export interface MailResult {
  delivered: boolean   // a plecat real prin SMTP
  demoMode: boolean    // SMTP lipsă → codul se afișează în interfață
  error?: string
}

function smtpConfigured(): boolean {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_PORT)
}

/** Trimite un e-mail HTML simplu. Nu aruncă excepții — întoarce mereu un rezultat. */
export async function sendMail(opts: { to: string; subject: string; html: string; text: string }): Promise<MailResult> {
  if (!smtpConfigured()) {
    console.log(`[mailer:demo] către ${opts.to} — subiect: ${opts.subject} (SMTP neconfigurat, codul se afișează în UI)`)
    return { delivered: false, demoMode: true }
  }
  try {
    const nodemailer = await import('nodemailer')
    const port = Number(process.env.SMTP_PORT) || 587
    const transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: port === 465,
      auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
    })
    await transport.sendMail({
      from: process.env.SMTP_FROM || `${APP_NAME} <${SUPPORT_EMAIL}>`,
      to: opts.to,
      subject: opts.subject,
      text: opts.text,
      html: opts.html,
    })
    return { delivered: true, demoMode: false }
  } catch (e) {
    console.error('[mailer] eroare trimitere:', e)
    return { delivered: false, demoMode: false, error: e instanceof Error ? e.message : 'eroare necunoscută' }
  }
}

/** Pagină HTML pentru codul de verificare, în stilul brandului. */
export function codeEmailHtml(code: string, purpose: 'verify_email' | 'reset_password'): string {
  const title = purpose === 'verify_email'
    ? 'Confirmă adresa de e-mail'
    : 'Resetarea parolei'
  const lead = purpose === 'verify_email'
    ? 'Bine ai venit! Pentru activarea contului, introdu în aplicație codul de mai jos:'
    : 'Ai cerut resetarea parolei. Introdu în aplicație codul de mai jos:'
  return `<!doctype html><html lang="ro"><body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;">
  <div style="max-width:520px;margin:24px auto;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0;">
    <div style="background:#1e3a5f;padding:28px 32px;text-align:center;">
      <div style="display:inline-block;background:#f97316;border-radius:10px;padding:8px 14px;color:#ffffff;font-weight:bold;font-size:18px;">🏠 ${APP_NAME}</div>
    </div>
    <div style="padding:32px;">
      <h1 style="margin:0 0 12px;font-size:20px;color:#0f172a;">${title}</h1>
      <p style="margin:0 0 20px;color:#475569;font-size:14px;line-height:1.6;">${lead}</p>
      <div style="text-align:center;margin:24px 0;">
        <span style="display:inline-block;letter-spacing:10px;font-size:34px;font-weight:bold;color:#0f172a;background:#f8fafc;border:1px dashed #94a3b8;border-radius:12px;padding:14px 26px;">${code}</span>
      </div>
      <p style="margin:0 0 6px;color:#475569;font-size:13px;line-height:1.6;">Codul este valabil <b>15 minute</b>. Dacă nu tu ai solicitat acest mesaj, ignoră-l.</p>
    </div>
    <div style="background:#f8fafc;padding:16px 32px;color:#94a3b8;font-size:11px;text-align:center;">${APP_NAME} — calculator inteligent pentru construcții</div>
  </div></body></html>`
}
