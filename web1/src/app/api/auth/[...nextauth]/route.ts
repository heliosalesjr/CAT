import { handlers } from "@/auth";

/**
 * `pg` opens TCP sockets, which the edge runtime does not have. Stated rather
 * than inherited: the default is already nodejs, and a future change to that
 * default would break sign-in in a way whose error message points at the
 * wrong place.
 */
export const runtime = "nodejs";

export const { GET, POST } = handlers;
