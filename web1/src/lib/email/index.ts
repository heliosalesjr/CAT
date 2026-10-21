import "server-only";

/**
 * Everything this product sends goes through here.
 *
 * Behind an interface for the same reason CLAUDE.md puts the AI provider
 * behind one: the choice of sender is a reversible decision, and it should
 * stay reversible. Today there is one implementation that prints to the
 * terminal; the day a domain is verified with a provider, that is a second
 * file and one environment variable, with nothing else in the application
 * changing.
 *
 * Three things will use it: the magic link that logs people in, the invite a
 * school sends a colleague, and the one-time link a referee answers through.
 * The third is the one that decides whether the sender setup was done
 * properly — it goes to a stranger at a school with corporate filtering, and
 * when it fails nobody finds out, because the referee simply never replies.
 */

export type OutgoingEmail = {
  to: string;
  subject: string;
  /** Always required. Some recipients, and every spam filter, read this one. */
  text: string;
  html?: string;
  /** Where a human reply should land. Never the no-reply address. */
  replyTo?: string;
};

export interface EmailSender {
  readonly name: string;
  send(message: OutgoingEmail): Promise<void>;
}

/**
 * Printing a login link to the terminal is the right thing in development —
 * no inbox round-trip while testing a sign-in flow thirty times — and a
 * serious hole anywhere else, because a magic link is a credential and this
 * puts it in a log. So production without a configured transport fails at
 * startup rather than quietly logging credentials.
 */
function selectSender(): EmailSender {
  const configured = process.env.EMAIL_TRANSPORT ?? "console";

  if (configured === "console") {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "EMAIL_TRANSPORT is 'console' in production. That prints magic links " +
          "and referee links to the logs. Configure a real transport.",
      );
    }
    // Lazily required so the dev-only module never reaches a production bundle.
    return consoleSender();
  }

  throw new Error(
    `Unknown EMAIL_TRANSPORT: ${configured}. ` +
      "Add the provider in src/lib/email/ and select it here.",
  );
}

let sender: EmailSender | undefined;

export function emailSender(): EmailSender {
  return (sender ??= selectSender());
}

export async function sendEmail(message: OutgoingEmail): Promise<void> {
  await emailSender().send(message);
}

/* ------------------------------------------------------------------------ */

function consoleSender(): EmailSender {
  return {
    name: "console",
    async send(message) {
      const rule = "─".repeat(72);
      process.stderr.write(
        `\n${rule}\n` +
          `EMAIL (not sent — console transport)\n` +
          `  to:      ${message.to}\n` +
          `  subject: ${message.subject}\n` +
          (message.replyTo ? `  reply-to: ${message.replyTo}\n` : "") +
          `${rule}\n${message.text.trim()}\n${rule}\n\n`,
      );
    },
  };
}
