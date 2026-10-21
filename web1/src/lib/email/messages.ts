import "server-only";
import type { OutgoingEmail } from "./index.ts";

/**
 * The words that go out, in one file.
 *
 * Two rules these follow, both about a link that is a credential:
 *
 *   * Say what the link does, who asked for it, and when it stops working.
 *     A bare "click here to sign in" is indistinguishable from phishing, and
 *     the people receiving the referee version are being asked to vouch for
 *     somebody's career by a company they have never heard of.
 *   * Say what to do if it was not you. Silence makes a stolen-address
 *     problem invisible.
 *
 * The copy is plain on purpose — plain text lands where HTML sometimes does
 * not, and an auth email that renders in a school's stripped-down client is
 * worth more than a pretty one that does not arrive.
 */

const PRODUCT = "Class Act Talent";

function minutesUntil(expires: Date): number {
  return Math.max(1, Math.round((expires.getTime() - Date.now()) / 60_000));
}

export function magicLinkEmail(params: {
  to: string;
  url: string;
  expires: Date;
}): OutgoingEmail {
  const minutes = minutesUntil(params.expires);
  return {
    to: params.to,
    subject: `Sign in to ${PRODUCT}`,
    text: [
      `Open this link to sign in to ${PRODUCT}:`,
      ``,
      params.url,
      ``,
      `The link works once and expires in ${minutes} minutes.`,
      ``,
      `If you did not ask to sign in, you can ignore this message — nobody`,
      `can use the link without this inbox.`,
    ].join("\n"),
  };
}

/**
 * Sent to somebody a verified colleague named. It says who invited them,
 * because that is the only thing that makes an unexpected invitation
 * trustworthy.
 */
export function schoolInviteEmail(params: {
  to: string;
  url: string;
  schoolName: string;
  invitedByName: string;
  roleLabel: string;
  expiresAt: Date;
}): OutgoingEmail {
  return {
    to: params.to,
    subject: `${params.invitedByName} invited you to ${params.schoolName} on ${PRODUCT}`,
    text: [
      `${params.invitedByName} has invited you to join ${params.schoolName} on`,
      `${PRODUCT} as ${params.roleLabel}.`,
      ``,
      params.url,
      ``,
      `The invitation works once and expires on`,
      `${params.expiresAt.toISOString().slice(0, 10)}.`,
      ``,
      `If you were not expecting this, check with ${params.invitedByName}`,
      `before using it.`,
    ].join("\n"),
  };
}

/**
 * The hardest one to deliver and the easiest to mistake for a scam: it goes
 * to a stranger, about a third person, from a company they do not know. It
 * names the candidate and the school's ask up front for exactly that reason.
 */
export function referenceRequestEmail(params: {
  to: string;
  url: string;
  refereeName: string;
  candidateName: string;
  expiresAt: Date;
}): OutgoingEmail {
  return {
    to: params.to,
    subject: `${params.candidateName} asked you for a reference`,
    text: [
      `Dear ${params.refereeName},`,
      ``,
      `${params.candidateName} is applying for teaching posts through`,
      `${PRODUCT} and listed you as a referee.`,
      ``,
      `You can answer here, without creating an account:`,
      ``,
      params.url,
      ``,
      `It takes a few minutes, the link works once, and it expires on`,
      `${params.expiresAt.toISOString().slice(0, 10)}.`,
      ``,
      `If you would rather not answer, you can decline on the same page and`,
      `${params.candidateName} will be told to name somebody else.`,
    ].join("\n"),
  };
}
